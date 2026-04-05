// Friend and pairwise-ledger reader functions.
import { and, desc, eq, gt, inArray, or } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"

import { getPairwiseOutstandingSummary, getPairwiseSummary } from "./balances"
import { getAccessibleFriendLinkById, requireLedgerUser } from "./access"
import { getUserGroups } from "./groups"
import {
  getPairwiseSettlementContext,
  getSettlementCounterparties,
} from "./settlements"
import { safeDate } from "./core"
import { FRIEND_EXPENSE_PAGE_SIZE as FRIEND_PAGE_SIZE } from "./types"
import type { FriendPairExpenseItem } from "./types"
import { enforceRateLimit } from "@/lib/rate-limit"
import { expense, expenseParticipant, organization, user } from "@/db/schema"
import { db } from "@/db"

export const getFriendsPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `friends-page:${currentUser.id}`,
      windowMs: 60_000,
      max: 100,
    })

    const [groups, counterparties] = await Promise.all([
      getUserGroups(currentUser.id),
      getSettlementCounterparties(currentUser.id),
    ])
    const friendIds = counterparties
      .map((entry) => entry.friendLinkId)
      .filter((entry): entry is string => Boolean(entry))
    const summary = await getPairwiseSummary(
      currentUser.id,
      groups.map((entry) => entry.id),
      friendIds
    )

    const suggestionMap = new Map(
      summary.suggestions.map((entry) => [entry.counterparty.id, entry])
    )

    return {
      user: currentUser,
      friends: counterparties
        .filter((entry) => entry.isFriend || suggestionMap.has(entry.id))
        .map((entry) => ({
          id: entry.id,
          routeKey: entry.friendLinkId ?? entry.id,
          isFriend: entry.isFriend,
          sharedGroupCount: entry.sharedGroupCount,
          otherUser: {
            id: entry.id,
            name: entry.name,
            email: entry.email,
          },
          summary: suggestionMap.get(entry.id)
            ? {
                direction: suggestionMap.get(entry.id)!.direction,
                amountMinor: suggestionMap.get(entry.id)!.amountMinor,
              }
            : null,
        }))
        .sort((left, right) => {
          if (left.summary && !right.summary) {
            return -1
          }

          if (!left.summary && right.summary) {
            return 1
          }

          return left.otherUser.name.localeCompare(right.otherUser.name)
        }),
    }
  }
)

export const getFriendDetailsData = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { friendId: string; offset?: number; limit?: number }) => input
  )
  .handler(async ({ data }) => {
    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `friend-details:${currentUser.id}:${data.friendId}`,
      windowMs: 60_000,
      max: 240,
    })

    const routeKey = data.friendId.trim()
    if (!routeKey) {
      throw new Error("Ledger id is required.")
    }

    const accessibleFriendLink = await getAccessibleFriendLinkById(
      currentUser.id,
      routeKey
    )
    const counterpartId = accessibleFriendLink
      ? accessibleFriendLink.userAId === currentUser.id
        ? accessibleFriendLink.userBId
        : accessibleFriendLink.userAId
      : routeKey

    if (counterpartId === currentUser.id) {
      throw new Error("Choose another user.")
    }

    const pairwiseContext = await getPairwiseSettlementContext(
      currentUser.id,
      counterpartId
    )
    const counterpart = pairwiseContext.counterparty
    const summary = getPairwiseOutstandingSummary({
      currentUserId: currentUser.id,
      counterpartyUserId: counterpartId,
      debtRows: pairwiseContext.debtRows,
      settlementImpactRows: pairwiseContext.settlementImpactRows,
    })

    const offset = Math.max(0, Math.floor(data.offset ?? 0))
    const requestedLimit = Math.max(
      1,
      Math.min(data.limit ?? FRIEND_PAGE_SIZE, 40)
    )

    const scopeClauses = []
    if (pairwiseContext.activeFriendLink) {
      scopeClauses.push(
        eq(expense.friendLinkId, pairwiseContext.activeFriendLink.id)
      )
    }
    if (pairwiseContext.sharedGroupIds.length > 0) {
      scopeClauses.push(
        inArray(expense.organizationId, pairwiseContext.sharedGroupIds)
      )
    }

    const counterpartOwedExpenseIds = db
      .select({ expenseId: expenseParticipant.expenseId })
      .from(expenseParticipant)
      .where(
        and(
          eq(expenseParticipant.userId, counterpart.id),
          gt(expenseParticipant.owedAmountMinor, 0)
        )
      )

    const currentUserOwedExpenseIds = db
      .select({ expenseId: expenseParticipant.expenseId })
      .from(expenseParticipant)
      .where(
        and(
          eq(expenseParticipant.userId, currentUser.id),
          gt(expenseParticipant.owedAmountMinor, 0)
        )
      )

    const rows = await db
      .select({
        id: expense.id,
        title: expense.title,
        totalAmountMinor: expense.totalAmountMinor,
        incurredAt: expense.incurredAt,
        paidByUserId: expense.paidByUserId,
        paidByName: user.name,
        organizationId: expense.organizationId,
        organizationName: organization.name,
      })
      .from(expense)
      .innerJoin(user, eq(expense.paidByUserId, user.id))
      .leftJoin(organization, eq(expense.organizationId, organization.id))
      .where(
        and(
          scopeClauses.length === 1 ? scopeClauses[0] : or(...scopeClauses),
          or(
            and(
              eq(expense.paidByUserId, currentUser.id),
              inArray(expense.id, counterpartOwedExpenseIds)
            ),
            and(
              eq(expense.paidByUserId, counterpart.id),
              inArray(expense.id, currentUserOwedExpenseIds)
            )
          )
        )
      )
      .orderBy(desc(expense.incurredAt), desc(expense.id))
      .limit(requestedLimit + 1)
      .offset(offset)

    const hasMore = rows.length > requestedLimit
    const visibleRows = rows.slice(0, requestedLimit)
    const expenseIds = visibleRows.map((entry) => entry.id)

    const participantRows =
      expenseIds.length === 0
        ? []
        : await db
            .select({
              expenseId: expenseParticipant.expenseId,
              userId: expenseParticipant.userId,
              owedAmountMinor: expenseParticipant.owedAmountMinor,
            })
            .from(expenseParticipant)
            .where(
              and(
                inArray(expenseParticipant.expenseId, expenseIds),
                inArray(expenseParticipant.userId, [
                  currentUser.id,
                  counterpartId,
                ])
              )
            )

    const owedByExpenseMap = new Map<
      string,
      {
        currentUserOwedMinor: number
        counterpartOwedMinor: number
      }
    >()

    for (const row of participantRows) {
      const current = owedByExpenseMap.get(row.expenseId) ?? {
        currentUserOwedMinor: 0,
        counterpartOwedMinor: 0,
      }

      if (row.userId === currentUser.id) {
        current.currentUserOwedMinor = row.owedAmountMinor
      } else if (row.userId === counterpartId) {
        current.counterpartOwedMinor = row.owedAmountMinor
      }

      owedByExpenseMap.set(row.expenseId, current)
    }

    const expenses: Array<FriendPairExpenseItem> = []

    for (const entry of visibleRows) {
      const owed = owedByExpenseMap.get(entry.id) ?? {
        currentUserOwedMinor: 0,
        counterpartOwedMinor: 0,
      }

      if (
        entry.paidByUserId === currentUser.id &&
        owed.counterpartOwedMinor > 0
      ) {
        expenses.push({
          ...entry,
          incurredAt: safeDate(entry.incurredAt),
          contextType: entry.organizationId ? "group" : "direct",
          contextName: entry.organizationId
            ? (entry.organizationName ?? "Group")
            : "Direct",
          pairImpact: {
            direction: "collect",
            amountMinor: owed.counterpartOwedMinor,
          },
        })
        continue
      }

      if (
        entry.paidByUserId === counterpart.id &&
        owed.currentUserOwedMinor > 0
      ) {
        expenses.push({
          ...entry,
          incurredAt: safeDate(entry.incurredAt),
          contextType: entry.organizationId ? "group" : "direct",
          contextName: entry.organizationId
            ? (entry.organizationName ?? "Group")
            : "Direct",
          pairImpact: {
            direction: "pay",
            amountMinor: owed.currentUserOwedMinor,
          },
        })
      }
    }

    return {
      user: currentUser,
      counterparty: counterpart,
      relationship: {
        isFriend: Boolean(pairwiseContext.activeFriendLink),
        sharedGroupCount: pairwiseContext.sharedGroupIds.length,
      },
      summary,
      expenses,
      hasMore,
    }
  })
