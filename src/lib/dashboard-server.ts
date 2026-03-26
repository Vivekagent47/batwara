import { and, desc, eq, inArray, or } from "drizzle-orm"
import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { db } from "@/db"
import {
  activityLog,
  expense,
  expenseParticipant,
  friendLink,
  groupSettings,
  member,
  organization,
  settlement,
  user,
} from "@/db/schema"
import { getServerAuthSession } from "@/lib/auth-session"
import { enforceRateLimit } from "@/lib/rate-limit"

export type LedgerContextType = "group" | "friend"
export type ExpenseSplitMethod = "equal" | "exact" | "percentage" | "shares"

type LedgerUser = {
  id: string
  name: string
  email: string
}

type SplitInputLine = {
  userId: string
  value?: number
}

type TransferSuggestion = {
  payerUserId: string
  payeeUserId: string
  amountMinor: number
}

type ActivityItem = {
  id: string
  action: string
  summary: string
  entityType: string
  entityId: string
  createdAt: Date
  actor: {
    id: string
    name: string
  }
}

type GroupInfo = {
  id: string
  name: string
  slug: string
  role: string
  memberCount: number
  simplifyDebts: boolean
  defaultCurrency: string
}

type FriendInfo = {
  id: string
  otherUser: {
    id: string
    name: string
    email: string
  }
  status: string
}

type ContextMember = {
  id: string
  name: string
  email: string
}

type UserLookup = Map<string, LedgerUser>

function safeDate(value: Date | null | undefined) {
  return value ?? new Date()
}

function toCurrencyCode(value: string | undefined) {
  if (!value) {
    return "INR"
  }

  return value.trim().toUpperCase().slice(0, 3)
}

function toMinorUnits(value: number) {
  return Math.round(value)
}

function normalizePairKey(userAId: string, userBId: string) {
  const [a, b] = [userAId, userBId].sort()
  return `${a}:${b}`
}

function createSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 42)

  const seed = Math.random().toString(36).slice(2, 8)
  return `${base || "group"}-${seed}`
}

const MANAGE_GROUP_MEMBER_ROLES = new Set(["owner", "admin"])

function parseMemberRoles(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function getPrimaryMemberRole(value: string) {
  const roles = parseMemberRoles(value)
  if (roles.includes("owner")) {
    return "owner"
  }

  if (roles.includes("admin")) {
    return "admin"
  }

  return roles[0] ?? "member"
}

function canManageGroupMembers(value: string) {
  return parseMemberRoles(value).some((role) =>
    MANAGE_GROUP_MEMBER_ROLES.has(role)
  )
}

function allocateByWeights(totalMinor: number, weights: Array<number>) {
  const sumWeights = weights.reduce((acc, value) => acc + value, 0)
  if (sumWeights <= 0) {
    throw new Error("Split weights must add up to more than zero.")
  }

  const raw = weights.map((weight) => (totalMinor * weight) / sumWeights)
  const allocated = raw.map((value) => Math.floor(value))
  let remainder = totalMinor - allocated.reduce((acc, value) => acc + value, 0)

  const fractions = raw
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
    }))
    .sort((a, b) => b.fraction - a.fraction)

  let pointer = 0
  while (remainder > 0) {
    allocated[fractions[pointer % fractions.length].index] += 1
    remainder -= 1
    pointer += 1
  }

  return allocated
}

function resolveSplit(
  totalMinor: number,
  method: ExpenseSplitMethod,
  lines: Array<SplitInputLine>
) {
  if (totalMinor <= 0) {
    throw new Error("Amount must be more than zero.")
  }

  if (lines.length === 0) {
    throw new Error("At least one participant is required.")
  }

  const deduped = new Map<string, SplitInputLine>()
  for (const line of lines) {
    if (!line.userId) {
      continue
    }
    deduped.set(line.userId, line)
  }

  const normalizedLines = Array.from(deduped.values())
  if (normalizedLines.length === 0) {
    throw new Error("At least one participant is required.")
  }

  if (method === "equal") {
    const base = Math.floor(totalMinor / normalizedLines.length)
    const remainder = totalMinor % normalizedLines.length
    return normalizedLines.map((line, index) => ({
      userId: line.userId,
      owedAmountMinor: base + (index < remainder ? 1 : 0),
    }))
  }

  const values = normalizedLines.map((line) => Number(line.value ?? 0))

  if (method === "exact") {
    const owed = values.map((value) => toMinorUnits(value))
    const total = owed.reduce((acc, value) => acc + value, 0)
    if (total !== totalMinor) {
      throw new Error("Exact split must add up to the full expense amount.")
    }

    return normalizedLines.map((line, index) => ({
      userId: line.userId,
      owedAmountMinor: owed[index] ?? 0,
    }))
  }

  if (method === "percentage") {
    const sum = values.reduce((acc, value) => acc + value, 0)
    if (Math.abs(sum - 100) > 0.001) {
      throw new Error("Percentage split must add up to 100.")
    }

    const allocations = allocateByWeights(totalMinor, values)
    return normalizedLines.map((line, index) => ({
      userId: line.userId,
      owedAmountMinor: allocations[index] ?? 0,
    }))
  }

  const allocations = allocateByWeights(totalMinor, values)
  return normalizedLines.map((line, index) => ({
    userId: line.userId,
    owedAmountMinor: allocations[index] ?? 0,
  }))
}

function simplifyNetBalances(netMap: Map<string, number>) {
  const creditors: Array<{ userId: string; amountMinor: number }> = []
  const debtors: Array<{ userId: string; amountMinor: number }> = []

  for (const [userId, net] of netMap.entries()) {
    if (net > 0) {
      creditors.push({ userId, amountMinor: net })
    } else if (net < 0) {
      debtors.push({ userId, amountMinor: Math.abs(net) })
    }
  }

  creditors.sort((a, b) => b.amountMinor - a.amountMinor)
  debtors.sort((a, b) => b.amountMinor - a.amountMinor)

  const transfers: Array<TransferSuggestion> = []
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    const amountMinor = Math.min(creditor.amountMinor, debtor.amountMinor)

    if (amountMinor > 0) {
      transfers.push({
        payerUserId: debtor.userId,
        payeeUserId: creditor.userId,
        amountMinor,
      })
    }

    creditor.amountMinor -= amountMinor
    debtor.amountMinor -= amountMinor

    if (creditor.amountMinor === 0) {
      creditorIndex += 1
    }

    if (debtor.amountMinor === 0) {
      debtorIndex += 1
    }
  }

  return transfers
}

async function requireLedgerUser() {
  const session = await getServerAuthSession()
  if (!session?.user) {
    throw redirect({ to: "/login" })
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  } as LedgerUser
}

async function getUserLookup(userIds: Array<string>) {
  if (userIds.length === 0) {
    return new Map() as UserLookup
  }

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(inArray(user.id, Array.from(new Set(userIds))))

  return new Map(rows.map((entry) => [entry.id, entry])) as UserLookup
}

async function getUserGroups(userId: string) {
  const groupRows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(organization.name)

  if (groupRows.length === 0) {
    return [] as Array<GroupInfo>
  }

  const groupIds = groupRows.map((entry) => entry.id)

  const memberCountRows = await db
    .select({
      organizationId: member.organizationId,
      count: member.userId,
    })
    .from(member)
    .where(inArray(member.organizationId, groupIds))

  const groupSettingsRows = await db
    .select({
      organizationId: groupSettings.organizationId,
      simplifyDebts: groupSettings.simplifyDebts,
      defaultCurrency: groupSettings.defaultCurrency,
    })
    .from(groupSettings)
    .where(inArray(groupSettings.organizationId, groupIds))

  const memberCountMap = new Map<string, number>()
  for (const row of memberCountRows) {
    memberCountMap.set(
      row.organizationId,
      (memberCountMap.get(row.organizationId) ?? 0) + 1
    )
  }

  const settingMap = new Map(
    groupSettingsRows.map((entry) => [entry.organizationId, entry])
  )

  return groupRows.map((entry) => ({
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    role: entry.role,
    memberCount: memberCountMap.get(entry.id) ?? 1,
    simplifyDebts: settingMap.get(entry.id)?.simplifyDebts ?? true,
    defaultCurrency: settingMap.get(entry.id)?.defaultCurrency ?? "INR",
  }))
}

async function getUserFriends(userId: string) {
  const rows = await db
    .select({
      id: friendLink.id,
      userAId: friendLink.userAId,
      userBId: friendLink.userBId,
      status: friendLink.status,
    })
    .from(friendLink)
    .where(
      and(
        eq(friendLink.status, "active"),
        or(eq(friendLink.userAId, userId), eq(friendLink.userBId, userId))
      )
    )
    .orderBy(desc(friendLink.createdAt))

  if (rows.length === 0) {
    return [] as Array<FriendInfo>
  }

  const otherIds = rows.map((entry) =>
    entry.userAId === userId ? entry.userBId : entry.userAId
  )
  const userLookup = await getUserLookup(otherIds)

  return rows.map((entry) => {
    const otherUserId = entry.userAId === userId ? entry.userBId : entry.userAId
    const otherUser = userLookup.get(otherUserId)
    return {
      id: entry.id,
      status: entry.status,
      otherUser: {
        id: otherUser?.id ?? otherUserId,
        name: otherUser?.name ?? "Unknown user",
        email: otherUser?.email ?? "",
      },
    }
  })
}

async function assertGroupAccess(userId: string, groupId: string) {
  const membership = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(and(eq(member.organizationId, groupId), eq(member.userId, userId)))
    .limit(1)

  if (!membership[0]) {
    throw new Error("You are not a member of this group.")
  }
}

async function assertFriendAccess(userId: string, friendLinkId: string) {
  const entry = await db
    .select({
      id: friendLink.id,
      userAId: friendLink.userAId,
      userBId: friendLink.userBId,
      status: friendLink.status,
    })
    .from(friendLink)
    .where(eq(friendLink.id, friendLinkId))
    .limit(1)

  const link = entry.at(0)
  if (!link || link.status !== "active") {
    throw new Error("Friend ledger is unavailable.")
  }

  if (link.userAId !== userId && link.userBId !== userId) {
    throw new Error("You are not part of this friend ledger.")
  }
}

async function getGroupMembers(groupId: string) {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, groupId))
    .orderBy(user.name)

  return rows as Array<ContextMember>
}

async function getFriendMembers(friendLinkId: string) {
  const rows = await db
    .select({
      userAId: friendLink.userAId,
      userBId: friendLink.userBId,
    })
    .from(friendLink)
    .where(eq(friendLink.id, friendLinkId))
    .limit(1)

  const link = rows.at(0)
  if (!link) {
    return [] as Array<ContextMember>
  }

  const userLookup = await getUserLookup([link.userAId, link.userBId])
  return [link.userAId, link.userBId]
    .map((id) => userLookup.get(id))
    .filter((entry): entry is LedgerUser => Boolean(entry))
}

async function getAccessibleActivities(
  groupIds: Array<string>,
  friendLinkIds: Array<string>,
  limit = 30
) {
  const accessClauses = []
  if (groupIds.length > 0) {
    accessClauses.push(inArray(activityLog.organizationId, groupIds))
  }

  if (friendLinkIds.length > 0) {
    accessClauses.push(inArray(activityLog.friendLinkId, friendLinkIds))
  }

  if (accessClauses.length === 0) {
    return [] as Array<ActivityItem>
  }

  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      summary: activityLog.summary,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      createdAt: activityLog.createdAt,
      actorUserId: activityLog.actorUserId,
    })
    .from(activityLog)
    .where(accessClauses.length === 1 ? accessClauses[0] : or(...accessClauses))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)

  const actorLookup = await getUserLookup(
    rows.map((entry) => entry.actorUserId)
  )

  return rows.map((entry) => ({
    id: entry.id,
    action: entry.action,
    summary: entry.summary,
    entityType: entry.entityType,
    entityId: entry.entityId,
    createdAt: safeDate(entry.createdAt),
    actor: {
      id: entry.actorUserId,
      name: actorLookup.get(entry.actorUserId)?.name ?? "Unknown user",
    },
  }))
}

async function getPairwiseSummary(
  userId: string,
  groupIds: Array<string>,
  friendIds: Array<string>
) {
  const expenseScopeClauses = []
  const settlementScopeClauses = []
  if (groupIds.length > 0) {
    expenseScopeClauses.push(inArray(expense.organizationId, groupIds))
    settlementScopeClauses.push(inArray(settlement.organizationId, groupIds))
  }

  if (friendIds.length > 0) {
    expenseScopeClauses.push(inArray(expense.friendLinkId, friendIds))
    settlementScopeClauses.push(inArray(settlement.friendLinkId, friendIds))
  }

  if (expenseScopeClauses.length === 0) {
    return {
      youOweMinor: 0,
      youAreOwedMinor: 0,
      suggestions: [] as Array<
        TransferSuggestion & {
          counterparty: {
            id: string
            name: string
          }
          direction: "pay" | "collect"
        }
      >,
    }
  }

  const expenseRows = await db
    .select({
      paidByUserId: expense.paidByUserId,
      participantUserId: expenseParticipant.userId,
      owedAmountMinor: expenseParticipant.owedAmountMinor,
    })
    .from(expenseParticipant)
    .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
    .where(
      expenseScopeClauses.length === 1
        ? expenseScopeClauses[0]
        : or(...expenseScopeClauses)
    )

  const settlementRows = await db
    .select({
      payerUserId: settlement.payerUserId,
      payeeUserId: settlement.payeeUserId,
      amountMinor: settlement.amountMinor,
    })
    .from(settlement)
    .where(
      settlementScopeClauses.length === 1
        ? settlementScopeClauses[0]
        : or(...settlementScopeClauses)
    )

  const pairMap = new Map<string, number>()

  for (const row of expenseRows) {
    if (row.participantUserId === row.paidByUserId) {
      continue
    }

    const key = `${row.paidByUserId}|${row.participantUserId}`
    pairMap.set(key, (pairMap.get(key) ?? 0) + row.owedAmountMinor)
  }

  for (const row of settlementRows) {
    const key = `${row.payeeUserId}|${row.payerUserId}`
    pairMap.set(key, (pairMap.get(key) ?? 0) - row.amountMinor)
  }

  const counterparties = new Set<string>()
  for (const key of pairMap.keys()) {
    const [creditorId, debtorId] = key.split("|")
    if (creditorId === userId) {
      counterparties.add(debtorId)
    }
    if (debtorId === userId) {
      counterparties.add(creditorId)
    }
  }

  const userLookup = await getUserLookup(Array.from(counterparties))

  let youOweMinor = 0
  let youAreOwedMinor = 0
  const suggestions: Array<
    TransferSuggestion & {
      counterparty: {
        id: string
        name: string
      }
      direction: "pay" | "collect"
    }
  > = []

  for (const counterpartyId of counterparties) {
    const theyOweYou = pairMap.get(`${userId}|${counterpartyId}`) ?? 0
    const youOweThem = pairMap.get(`${counterpartyId}|${userId}`) ?? 0
    const net = theyOweYou - youOweThem

    if (net > 0) {
      youAreOwedMinor += net
      suggestions.push({
        payerUserId: counterpartyId,
        payeeUserId: userId,
        amountMinor: net,
        counterparty: {
          id: counterpartyId,
          name: userLookup.get(counterpartyId)?.name ?? "Unknown user",
        },
        direction: "collect",
      })
    } else if (net < 0) {
      youOweMinor += Math.abs(net)
      suggestions.push({
        payerUserId: userId,
        payeeUserId: counterpartyId,
        amountMinor: Math.abs(net),
        counterparty: {
          id: counterpartyId,
          name: userLookup.get(counterpartyId)?.name ?? "Unknown user",
        },
        direction: "pay",
      })
    }
  }

  suggestions.sort((a, b) => b.amountMinor - a.amountMinor)

  return {
    youOweMinor,
    youAreOwedMinor,
    suggestions,
  }
}

function buildNetMap(
  expenseRows: Array<{
    paidByUserId: string
    participantUserId: string
    owedAmountMinor: number
  }>,
  settlementRows: Array<{
    payerUserId: string
    payeeUserId: string
    amountMinor: number
  }>
) {
  const net = new Map<string, number>()

  for (const row of expenseRows) {
    net.set(
      row.paidByUserId,
      (net.get(row.paidByUserId) ?? 0) + row.owedAmountMinor
    )
    net.set(
      row.participantUserId,
      (net.get(row.participantUserId) ?? 0) - row.owedAmountMinor
    )
  }

  for (const row of settlementRows) {
    net.set(row.payerUserId, (net.get(row.payerUserId) ?? 0) + row.amountMinor)
    net.set(row.payeeUserId, (net.get(row.payeeUserId) ?? 0) - row.amountMinor)
  }

  return net
}

export const getDashboardHomeData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `dashboard-home:${currentUser.id}`,
      windowMs: 60_000,
      max: 120,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    const groupIds = groups.map((entry) => entry.id)
    const friendIds = friends.map((entry) => entry.id)

    const [summary, activity] = await Promise.all([
      getPairwiseSummary(currentUser.id, groupIds, friendIds),
      getAccessibleActivities(groupIds, friendIds, 14),
    ])

    return {
      user: currentUser,
      groups,
      friends,
      summary: {
        youOweMinor: summary.youOweMinor,
        youAreOwedMinor: summary.youAreOwedMinor,
        netMinor: summary.youAreOwedMinor - summary.youOweMinor,
      },
      suggestions: summary.suggestions.slice(0, 8),
      activity,
    }
  }
)

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

    const friendCandidateMap = new Map<
      string,
      {
        id: string
        name: string
        email: string
      }
    >()

    for (const friend of friends) {
      if (!friendCandidateMap.has(friend.otherUser.id)) {
        friendCandidateMap.set(friend.otherUser.id, {
          id: friend.otherUser.id,
          name: friend.otherUser.name,
          email: friend.otherUser.email,
        })
      }
    }

    return {
      user: currentUser,
      groups,
      friendCandidates: Array.from(friendCandidateMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
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

    const membershipRows = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, data.groupId),
          eq(member.userId, currentUser.id)
        )
      )
      .limit(1)

    const membership = membershipRows.at(0)
    if (!membership) {
      throw new Error("You are not a member of this group.")
    }

    const groupRows = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(eq(organization.id, data.groupId))
      .limit(1)

    const group = groupRows.at(0)
    if (!group) {
      throw new Error("Group not found.")
    }

    const [members, expenseRows, settlementRows, recentExpenses, friends] =
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
        db
          .select({
            payerUserId: settlement.payerUserId,
            payeeUserId: settlement.payeeUserId,
            amountMinor: settlement.amountMinor,
          })
          .from(settlement)
          .where(eq(settlement.organizationId, data.groupId)),
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
          .orderBy(desc(expense.incurredAt))
          .limit(20),
        getUserFriends(currentUser.id),
      ])

    const net = buildNetMap(expenseRows, settlementRows)
    const transfers = simplifyNetBalances(net)
    const memberLookup = new Map(members.map((entry) => [entry.id, entry]))
    const friendCandidateMap = new Map<
      string,
      {
        id: string
        name: string
        email: string
      }
    >()

    for (const friend of friends) {
      if (!friendCandidateMap.has(friend.otherUser.id)) {
        friendCandidateMap.set(friend.otherUser.id, {
          id: friend.otherUser.id,
          name: friend.otherUser.name,
          email: friend.otherUser.email,
        })
      }
    }

    return {
      group,
      viewerRole: getPrimaryMemberRole(membership.role),
      canManageMembers: canManageGroupMembers(membership.role),
      friendCandidates: Array.from(friendCandidateMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
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
      recentExpenses: recentExpenses.map((entry) => ({
        ...entry,
        incurredAt: safeDate(entry.incurredAt),
      })),
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

    const membershipRows = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, data.groupId),
          eq(member.userId, currentUser.id)
        )
      )
      .limit(1)

    const membership = membershipRows.at(0)
    if (!membership) {
      throw new Error("You are not a member of this group.")
    }

    const groupRows = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(eq(organization.id, data.groupId))
      .limit(1)

    const group = groupRows.at(0)
    if (!group) {
      throw new Error("Group not found.")
    }

    const friends = await getUserFriends(currentUser.id)

    const friendCandidateMap = new Map<
      string,
      {
        id: string
        name: string
        email: string
      }
    >()

    for (const friend of friends) {
      if (!friendCandidateMap.has(friend.otherUser.id)) {
        friendCandidateMap.set(friend.otherUser.id, {
          id: friend.otherUser.id,
          name: friend.otherUser.name,
          email: friend.otherUser.email,
        })
      }
    }

    return {
      group,
      viewerRole: getPrimaryMemberRole(membership.role),
      canManageMembers: canManageGroupMembers(membership.role),
      friendCandidates: Array.from(friendCandidateMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }
  })

export const getFriendsPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `friends-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 100,
    })

    const friends = await getUserFriends(currentUser.id)
    const friendIds = friends.map((entry) => entry.id)
    const summary = await getPairwiseSummary(currentUser.id, [], friendIds)

    const suggestionMap = new Map(
      summary.suggestions.map((entry) => [entry.counterparty.id, entry])
    )

    return {
      user: currentUser,
      friends: friends.map((entry) => ({
        ...entry,
        summary: suggestionMap.get(entry.otherUser.id)
          ? {
              direction: suggestionMap.get(entry.otherUser.id)!.direction,
              amountMinor: suggestionMap.get(entry.otherUser.id)!.amountMinor,
            }
          : null,
      })),
    }
  }
)

export const getActivityPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `activity-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 120,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    const activity = await getAccessibleActivities(
      groups.map((entry) => entry.id),
      friends.map((entry) => entry.id),
      50
    )

    return {
      user: currentUser,
      activity,
    }
  }
)

export const getAccountPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `account-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 100,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    return {
      user: currentUser,
      stats: {
        groupCount: groups.length,
        friendCount: friends.length,
      },
    }
  }
)

export const getComposerData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `composer-data:${currentUser.id}`,
      windowMs: 60_000,
      max: 120,
    })

    const [groups, friends] = await Promise.all([
      getUserGroups(currentUser.id),
      getUserFriends(currentUser.id),
    ])

    return {
      user: currentUser,
      groups,
      friends,
    }
  }
)

export const getLedgerMembers = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { contextType: LedgerContextType; contextId: string }) => input
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

    await assertFriendAccess(currentUser.id, contextId)
    return {
      members: await getFriendMembers(contextId),
    }
  })

export const createGroup = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      name: string
      defaultCurrency?: string
      memberUserIds?: Array<string>
    }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-group:${currentUser.id}`,
      windowMs: 60_000,
      max: 12,
    })

    const name = data.name.trim()
    if (name.length < 2) {
      throw new Error("Group name must be at least 2 characters.")
    }

    const requestedMemberIds = Array.from(
      new Set(
        (data.memberUserIds ?? []).map((entry) => entry.trim()).filter(Boolean)
      )
    ).filter((entry) => entry !== currentUser.id)

    if (requestedMemberIds.length > 50) {
      throw new Error("You can add up to 50 members while creating a group.")
    }

    let extraMemberIds: Array<string> = []
    if (requestedMemberIds.length > 0) {
      const matchedUsers = await db
        .select({
          id: user.id,
        })
        .from(user)
        .where(inArray(user.id, requestedMemberIds))

      extraMemberIds = matchedUsers.map((entry) => entry.id)
      if (extraMemberIds.length !== requestedMemberIds.length) {
        throw new Error(
          "One or more selected members are unavailable. Refresh and try again."
        )
      }
    }

    const organizationId = crypto.randomUUID()
    const now = new Date()
    const memberRows = [currentUser.id, ...extraMemberIds].map((userId) => ({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      role: userId === currentUser.id ? "owner" : "member",
      createdAt: now,
    }))

    await db.transaction(async (tx) => {
      await tx.insert(organization).values({
        id: organizationId,
        name,
        slug: createSlug(name),
        createdAt: now,
      })

      await tx.insert(member).values(memberRows)

      await tx.insert(groupSettings).values({
        organizationId,
        defaultCurrency: toCurrencyCode(data.defaultCurrency),
        simplifyDebts: true,
        createdAt: now,
        updatedAt: now,
      })

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        organizationId,
        actorUserId: currentUser.id,
        entityType: "group",
        entityId: organizationId,
        action: "created",
        summary:
          extraMemberIds.length > 0
            ? `${currentUser.name} created ${name} with ${extraMemberIds.length + 1} members.`
            : `${currentUser.name} created ${name}.`,
        createdAt: now,
      })
    })

    return {
      groupId: organizationId,
      memberCount: memberRows.length,
    }
  })

export const lookupGroupMemberByEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `group-member-lookup:${currentUser.id}`,
      windowMs: 60_000,
      max: 50,
    })

    const email = data.email.trim().toLowerCase()
    if (!email) {
      throw new Error("Email is required.")
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

    const targetUser = users.at(0)
    if (!targetUser) {
      throw new Error("No Batwara user was found for this email.")
    }

    if (targetUser.id === currentUser.id) {
      throw new Error("You are already included in every group you create.")
    }

    const pairKey = normalizePairKey(currentUser.id, targetUser.id)
    const friendRows = await db
      .select({
        id: friendLink.id,
      })
      .from(friendLink)
      .where(
        and(eq(friendLink.pairKey, pairKey), eq(friendLink.status, "active"))
      )
      .limit(1)

    return {
      user: targetUser,
      alreadyFriend: Boolean(friendRows[0]),
    }
  })

export const createFriendLedger = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-friend:${currentUser.id}`,
      windowMs: 60_000,
      max: 18,
    })

    const email = data.email.trim().toLowerCase()
    if (!email) {
      throw new Error("Email is required.")
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

    const targetUser = users.at(0)
    if (!targetUser) {
      throw new Error("No Batwara user was found for this email.")
    }

    if (targetUser.id === currentUser.id) {
      throw new Error(
        "You cannot create a friend ledger with your own account."
      )
    }

    const pairKey = normalizePairKey(currentUser.id, targetUser.id)
    const existing = await db
      .select({
        id: friendLink.id,
      })
      .from(friendLink)
      .where(eq(friendLink.pairKey, pairKey))
      .limit(1)

    if (existing[0]) {
      return {
        friendLinkId: existing[0].id,
        alreadyExists: true,
      }
    }

    const friendLinkId = crypto.randomUUID()
    await db.transaction(async (tx) => {
      await tx.insert(friendLink).values({
        id: friendLinkId,
        pairKey,
        userAId:
          currentUser.id < targetUser.id ? currentUser.id : targetUser.id,
        userBId:
          currentUser.id < targetUser.id ? targetUser.id : currentUser.id,
        status: "active",
        createdByUserId: currentUser.id,
      })

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        friendLinkId,
        actorUserId: currentUser.id,
        entityType: "friend_link",
        entityId: friendLinkId,
        action: "created",
        summary: `${currentUser.name} added ${targetUser.name} to a direct ledger.`,
        createdAt: new Date(),
      })
    })

    return {
      friendLinkId,
      alreadyExists: false,
    }
  })

export const createExpense = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      contextType: LedgerContextType
      contextId: string
      title: string
      description?: string
      currency?: string
      totalAmountMinor: number
      paidByUserId: string
      splitMethod: ExpenseSplitMethod
      participants: Array<SplitInputLine>
      incurredAt?: string
    }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-expense:${currentUser.id}`,
      windowMs: 60_000,
      max: 40,
    })

    const contextType = data.contextType
    const contextId = data.contextId
    const title = data.title.trim()
    const totalAmountMinor = toMinorUnits(data.totalAmountMinor)

    if (!contextId) {
      throw new Error("Choose where this expense belongs.")
    }

    if (!title) {
      throw new Error("Expense title is required.")
    }

    if (totalAmountMinor <= 0) {
      throw new Error("Expense amount must be more than zero.")
    }

    if (contextType === "group") {
      await assertGroupAccess(currentUser.id, contextId)
    } else {
      await assertFriendAccess(currentUser.id, contextId)
    }

    const members =
      contextType === "group"
        ? await getGroupMembers(contextId)
        : await getFriendMembers(contextId)
    const memberIds = new Set(members.map((entry) => entry.id))

    if (!memberIds.has(data.paidByUserId)) {
      throw new Error("Payer must belong to the selected ledger.")
    }

    const splitLines = resolveSplit(
      totalAmountMinor,
      data.splitMethod,
      data.participants
    )

    for (const line of splitLines) {
      if (!memberIds.has(line.userId)) {
        throw new Error("Participant list includes a user outside this ledger.")
      }
    }

    const expenseId = crypto.randomUUID()
    const now = new Date()
    const normalizedCurrency = toCurrencyCode(data.currency)

    await db.transaction(async (tx) => {
      await tx.insert(expense).values({
        id: expenseId,
        organizationId: contextType === "group" ? contextId : null,
        friendLinkId: contextType === "friend" ? contextId : null,
        createdByUserId: currentUser.id,
        paidByUserId: data.paidByUserId,
        title,
        description: data.description?.trim() || null,
        currency: normalizedCurrency,
        totalAmountMinor,
        splitMethod: data.splitMethod,
        splitMeta: JSON.stringify(data.participants),
        incurredAt: data.incurredAt ? new Date(data.incurredAt) : now,
        createdAt: now,
        updatedAt: now,
      })

      await tx.insert(expenseParticipant).values(
        splitLines.map((line) => ({
          id: crypto.randomUUID(),
          expenseId,
          userId: line.userId,
          paidAmountMinor:
            line.userId === data.paidByUserId ? totalAmountMinor : 0,
          owedAmountMinor: line.owedAmountMinor,
          createdAt: now,
        }))
      )

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        organizationId: contextType === "group" ? contextId : null,
        friendLinkId: contextType === "friend" ? contextId : null,
        actorUserId: currentUser.id,
        entityType: "expense",
        entityId: expenseId,
        action: "created",
        summary: `${currentUser.name} added "${title}".`,
        metadata: JSON.stringify({
          totalAmountMinor,
          currency: normalizedCurrency,
          splitMethod: data.splitMethod,
        }),
        createdAt: now,
      })
    })

    return {
      expenseId,
    }
  })

export const createSettlement = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      contextType: LedgerContextType
      contextId: string
      payerUserId: string
      payeeUserId: string
      amountMinor: number
      currency?: string
      note?: string
      settledAt?: string
    }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-settlement:${currentUser.id}`,
      windowMs: 60_000,
      max: 35,
    })

    if (data.contextType === "group") {
      await assertGroupAccess(currentUser.id, data.contextId)
    } else {
      await assertFriendAccess(currentUser.id, data.contextId)
    }

    if (data.payerUserId === data.payeeUserId) {
      throw new Error("Payer and payee must be different.")
    }

    const members =
      data.contextType === "group"
        ? await getGroupMembers(data.contextId)
        : await getFriendMembers(data.contextId)
    const memberIds = new Set(members.map((entry) => entry.id))

    if (!memberIds.has(data.payerUserId) || !memberIds.has(data.payeeUserId)) {
      throw new Error("Settlement users must belong to the selected ledger.")
    }

    const amountMinor = toMinorUnits(data.amountMinor)
    if (amountMinor <= 0) {
      throw new Error("Settlement amount must be more than zero.")
    }

    const settlementId = crypto.randomUUID()
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx.insert(settlement).values({
        id: settlementId,
        organizationId: data.contextType === "group" ? data.contextId : null,
        friendLinkId: data.contextType === "friend" ? data.contextId : null,
        payerUserId: data.payerUserId,
        payeeUserId: data.payeeUserId,
        currency: toCurrencyCode(data.currency),
        amountMinor,
        note: data.note?.trim() || null,
        settledAt: data.settledAt ? new Date(data.settledAt) : now,
        createdByUserId: currentUser.id,
        createdAt: now,
      })

      await tx.insert(activityLog).values({
        id: crypto.randomUUID(),
        organizationId: data.contextType === "group" ? data.contextId : null,
        friendLinkId: data.contextType === "friend" ? data.contextId : null,
        actorUserId: currentUser.id,
        entityType: "settlement",
        entityId: settlementId,
        action: "created",
        summary: `${currentUser.name} recorded a settlement.`,
        metadata: JSON.stringify({
          amountMinor,
          currency: toCurrencyCode(data.currency),
        }),
        createdAt: now,
      })
    })

    return {
      settlementId,
    }
  })
