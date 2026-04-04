// Group page and group-scoped reader functions.
import { and, desc, eq } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"

import { db } from "@/db"
import {
  expense,
  expenseParticipant,
  member,
  organization,
  user,
} from "@/db/schema"
import { enforceRateLimit } from "@/lib/rate-limit"

import { getAccessibleActivities, getExpenseImpactLookup } from "./activity"
import { buildNetMap, simplifyNetBalances } from "./balances"
import { assertGroupAccess, requireLedgerUser } from "./access"
import { getFriendContextForUser, getUserFriends } from "./friends"
import {
  canManageGroupMembers,
  getGroupMembers,
  getPrimaryMemberRole,
  getUserGroups,
} from "./groups"
import { createFriendCandidateList } from "./reader-shared"
import { getScopedSettlementImpactRows } from "./settlements"
import { safeDate } from "./core"
import { GROUP_EXPENSE_PAGE_SIZE as GROUP_PAGE_SIZE } from "./types"

export const getGroupsPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `groups-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 100,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    return {
      user: currentUser,
      groups,
      friendCandidates: createFriendCandidateList(friends),
    }
  }
)

export const getGroupDetailsData = createServerFn({ method: "GET" })
  .inputValidator((input: { groupId: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `group-details:${currentUser.id}:${data.groupId}`,
      windowMs: 60_000,
      max: 150,
    })

    const [membershipRows, groupRows] = await Promise.all([
      db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, data.groupId),
            eq(member.userId, currentUser.id)
          )
        )
        .limit(1),
      db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .where(eq(organization.id, data.groupId))
        .limit(1),
    ])

    const membership = membershipRows.at(0)
    if (!membership) {
      throw new Error("You are not a member of this group.")
    }

    const group = groupRows.at(0)
    if (!group) {
      throw new Error("Group not found.")
    }

    const [members, expenseRows, settlementRows, recentExpenseRows, friends, activity] =
      await Promise.all([
        getGroupMembers(data.groupId),
        db
          .select({
            paidByUserId: expense.paidByUserId,
            participantUserId: expenseParticipant.userId,
            owedAmountMinor: expenseParticipant.owedAmountMinor,
          })
          .from(expenseParticipant)
          .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
          .where(eq(expense.organizationId, data.groupId)),
        getScopedSettlementImpactRows({ groupIds: [data.groupId] }),
        db
          .select({
            id: expense.id,
            title: expense.title,
            totalAmountMinor: expense.totalAmountMinor,
            currency: expense.currency,
            splitMethod: expense.splitMethod,
            incurredAt: expense.incurredAt,
            paidByUserId: expense.paidByUserId,
            paidByName: user.name,
          })
          .from(expense)
          .innerJoin(user, eq(expense.paidByUserId, user.id))
          .where(eq(expense.organizationId, data.groupId))
          .orderBy(desc(expense.incurredAt), desc(expense.id))
          .limit(GROUP_PAGE_SIZE + 1),
        getUserFriends(currentUser.id),
        getAccessibleActivities([data.groupId], [], 24),
      ])

    const net = buildNetMap(expenseRows, settlementRows)
    const transfers = simplifyNetBalances(net)
    const memberLookup = new Map(members.map((entry) => [entry.id, entry]))

    const hasMoreRecentExpenses = recentExpenseRows.length > GROUP_PAGE_SIZE
    const visibleRecentExpenseRows = recentExpenseRows.slice(0, GROUP_PAGE_SIZE)
    const recentExpenseImpactMap = await getExpenseImpactLookup(
      currentUser.id,
      visibleRecentExpenseRows.map((entry) => entry.id)
    )
    const recentExpenses = visibleRecentExpenseRows.map((entry) => ({
      ...entry,
      incurredAt: safeDate(entry.incurredAt),
      expenseImpact: recentExpenseImpactMap.get(entry.id) ?? null,
    }))

    return {
      user: currentUser,
      group,
      viewerRole: getPrimaryMemberRole(membership.role),
      canManageMembers: canManageGroupMembers(membership.role),
      friendCandidates: createFriendCandidateList(friends),
      members,
      balances: members.map((entry) => ({
        userId: entry.id,
        name: entry.name,
        netMinor: net.get(entry.id) ?? 0,
      })),
      transfers: transfers.map((entry) => ({
        ...entry,
        payerName: memberLookup.get(entry.payerUserId)?.name ?? "Unknown user",
        payeeName: memberLookup.get(entry.payeeUserId)?.name ?? "Unknown user",
      })),
      recentExpenses,
      recentExpensesHasMore: hasMoreRecentExpenses,
      activity,
    }
  })

export const getGroupExpensesPage = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { groupId: string; offset?: number; limit?: number }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `group-expenses-page:${currentUser.id}:${data.groupId}`,
      windowMs: 60_000,
      max: 240,
    })

    const groupId = data.groupId.trim()
    if (!groupId) {
      throw new Error("Group id is required.")
    }

    await assertGroupAccess(currentUser.id, groupId)

    const offset = Math.max(0, Math.floor(data.offset ?? 0))
    const requestedLimit = Math.max(1, Math.min(data.limit ?? GROUP_PAGE_SIZE, 40))

    const rows = await db
      .select({
        id: expense.id,
        title: expense.title,
        totalAmountMinor: expense.totalAmountMinor,
        currency: expense.currency,
        splitMethod: expense.splitMethod,
        incurredAt: expense.incurredAt,
        paidByUserId: expense.paidByUserId,
        paidByName: user.name,
      })
      .from(expense)
      .innerJoin(user, eq(expense.paidByUserId, user.id))
      .where(eq(expense.organizationId, groupId))
      .orderBy(desc(expense.incurredAt), desc(expense.id))
      .limit(requestedLimit + 1)
      .offset(offset)

    const hasMore = rows.length > requestedLimit
    const visibleRows = rows.slice(0, requestedLimit)
    const expenseImpactMap = await getExpenseImpactLookup(
      currentUser.id,
      visibleRows.map((entry) => entry.id)
    )

    return {
      expenses: visibleRows.map((entry) => ({
        ...entry,
        incurredAt: safeDate(entry.incurredAt),
        expenseImpact: expenseImpactMap.get(entry.id) ?? null,
      })),
      hasMore,
    }
  })

export const getGroupSettingsData = createServerFn({ method: "GET" })
  .inputValidator((input: { groupId: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `group-settings:${currentUser.id}:${data.groupId}`,
      windowMs: 60_000,
      max: 120,
    })

    const [membershipRows, groupRows] = await Promise.all([
      db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, data.groupId),
            eq(member.userId, currentUser.id)
          )
        )
        .limit(1),
      db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .where(eq(organization.id, data.groupId))
        .limit(1),
    ])

    const membership = membershipRows.at(0)
    if (!membership) {
      throw new Error("You are not a member of this group.")
    }

    const group = groupRows.at(0)
    if (!group) {
      throw new Error("Group not found.")
    }

    const friends = await getUserFriends(currentUser.id)

    return {
      group,
      viewerRole: getPrimaryMemberRole(membership.role),
      canManageMembers: canManageGroupMembers(membership.role),
      friendCandidates: createFriendCandidateList(friends),
    }
  })

export const getLedgerMembers = createServerFn({ method: "GET" })
  .inputValidator(
    (input: {
      contextType: "group" | "friend"
      contextId: string
    }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `composer-members:${currentUser.id}:${data.contextType}:${data.contextId}`,
      windowMs: 60_000,
      max: 240,
    })

    const contextId = data.contextId.trim()
    if (!contextId) {
      throw new Error("Choose a ledger first.")
    }

    if (data.contextType === "group") {
      await assertGroupAccess(currentUser.id, contextId)
      return {
        members: await getGroupMembers(contextId),
      }
    }

    const { members } = await getFriendContextForUser(currentUser.id, contextId)

    return {
      members,
    }
  })
