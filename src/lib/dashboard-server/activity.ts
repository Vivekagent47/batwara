import { and, desc, eq, inArray, or } from "drizzle-orm"

import { db } from "@/db"
import { activityLog, expense, expenseParticipant } from "@/db/schema"

// Activity feed queries and expense-impact decoration for activity rows.
import type { ActivityItem, PairwiseBalanceSummary } from "./types"
import { getUserLookup, safeDate } from "./helpers"

export async function getAccessibleActivities(
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
    expenseImpact: null,
  }))
}

export async function attachExpenseActivityImpacts(
  activity: Array<ActivityItem>,
  userId: string
) {
  const expenseIds = Array.from(
    new Set(
      activity
        .filter((entry) => entry.entityType === "expense")
        .map((entry) => entry.entityId)
    )
  )

  if (expenseIds.length === 0) {
    return activity
  }

  const rows = await db
    .select({
      expenseId: expense.id,
      paidAmountMinor: expenseParticipant.paidAmountMinor,
      owedAmountMinor: expenseParticipant.owedAmountMinor,
    })
    .from(expenseParticipant)
    .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
    .where(
      and(
        eq(expenseParticipant.userId, userId),
        inArray(expense.id, expenseIds)
      )
    )

  const impactMap = new Map<string, PairwiseBalanceSummary>()

  for (const row of rows) {
    const netMinor = row.paidAmountMinor - row.owedAmountMinor
    if (netMinor > 0) {
      impactMap.set(row.expenseId, {
        direction: "collect",
        amountMinor: netMinor,
      })
    } else if (netMinor < 0) {
      impactMap.set(row.expenseId, {
        direction: "pay",
        amountMinor: Math.abs(netMinor),
      })
    }
  }

  return activity.map((entry) =>
    entry.entityType === "expense"
      ? {
          ...entry,
          expenseImpact: impactMap.get(entry.entityId) ?? null,
        }
      : entry
  )
}

export async function getExpenseImpactLookup(
  userId: string,
  expenseIds: Array<string>
) {
  const impactMap = new Map<string, PairwiseBalanceSummary>()

  if (expenseIds.length === 0) {
    return impactMap
  }

  const rows = await db
    .select({
      expenseId: expenseParticipant.expenseId,
      paidAmountMinor: expenseParticipant.paidAmountMinor,
      owedAmountMinor: expenseParticipant.owedAmountMinor,
    })
    .from(expenseParticipant)
    .where(
      and(
        eq(expenseParticipant.userId, userId),
        inArray(expenseParticipant.expenseId, expenseIds)
      )
    )

  for (const row of rows) {
    const netMinor = row.paidAmountMinor - row.owedAmountMinor
    if (netMinor > 0) {
      impactMap.set(row.expenseId, {
        direction: "collect",
        amountMinor: netMinor,
      })
    } else if (netMinor < 0) {
      impactMap.set(row.expenseId, {
        direction: "pay",
        amountMinor: Math.abs(netMinor),
      })
    }
  }

  return impactMap
}
