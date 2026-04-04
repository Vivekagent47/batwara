// Settlement and pairwise-ledger helpers shared across reads and writes.
import { and, eq, gt, inArray, or } from "drizzle-orm"

import type {
  PairwiseDebtRow,
  SettlementImpactRow,
  SettlementScopeType,
} from "@/lib/settlement-ledger"
import { db } from "@/db"
import {
  expense,
  expenseParticipant,
  member,
  organization,
  settlement,
  settlementAllocation,
  user,
} from "@/db/schema"
import { buildPairwiseSettlementPlan } from "@/lib/settlement-ledger"

import { getUserLookup } from "./access"
import {
  isMissingSettlementAllocationTableError,
  safeDate,
  toMinorUnits,
} from "./core"
import {
  getActiveFriendLinkBetweenUsers,
  getSharedGroupIdsBetweenUsers,
  getUserFriends,
} from "./friends"
import type { SettlementCounterparty } from "./types"

export async function getScopedSettlementImpactRows(args: {
  groupIds?: Array<string>
  friendLinkIds?: Array<string>
}) {
  type ScopedImpactSourceRow = {
    organizationId: string | null
    friendLinkId: string | null
    payerUserId: string
    payeeUserId: string
    amountMinor: number
  }

  const groupIds = Array.from(new Set(args.groupIds ?? []))
  const friendLinkIds = Array.from(new Set(args.friendLinkIds ?? []))
  const scopeClauses = []

  if (groupIds.length > 0) {
    scopeClauses.push(inArray(settlementAllocation.organizationId, groupIds))
  }

  if (friendLinkIds.length > 0) {
    scopeClauses.push(inArray(settlementAllocation.friendLinkId, friendLinkIds))
  }

  const legacyScopeClauses = []
  if (groupIds.length > 0) {
    legacyScopeClauses.push(inArray(settlement.organizationId, groupIds))
  }

  if (friendLinkIds.length > 0) {
    legacyScopeClauses.push(inArray(settlement.friendLinkId, friendLinkIds))
  }

  if (scopeClauses.length === 0 && legacyScopeClauses.length === 0) {
    return [] as Array<SettlementImpactRow>
  }

  const legacyRows: Array<ScopedImpactSourceRow> =
    legacyScopeClauses.length === 0
      ? []
      : await db
          .select({
            organizationId: settlement.organizationId,
            friendLinkId: settlement.friendLinkId,
            payerUserId: settlement.payerUserId,
            payeeUserId: settlement.payeeUserId,
            amountMinor: settlement.amountMinor,
          })
          .from(settlement)
          .where(
            legacyScopeClauses.length === 1
              ? legacyScopeClauses[0]
              : or(...legacyScopeClauses)
          )

  let allocationRows: Array<ScopedImpactSourceRow> = []
  if (scopeClauses.length > 0) {
    try {
      allocationRows = await db
        .select({
          organizationId: settlementAllocation.organizationId,
          friendLinkId: settlementAllocation.friendLinkId,
          payerUserId: settlementAllocation.payerUserId,
          payeeUserId: settlementAllocation.payeeUserId,
          amountMinor: settlementAllocation.amountMinor,
        })
        .from(settlementAllocation)
        .where(
          scopeClauses.length === 1 ? scopeClauses[0] : or(...scopeClauses)
        )
    } catch (error) {
      if (!isMissingSettlementAllocationTableError(error)) {
        throw error
      }
    }
  }

  const impactRows: Array<SettlementImpactRow> = []
  for (const row of [...allocationRows, ...legacyRows]) {
    if (row.organizationId) {
      impactRows.push({
        scopeType: "group",
        scopeId: row.organizationId,
        payerUserId: row.payerUserId,
        payeeUserId: row.payeeUserId,
        amountMinor: row.amountMinor,
      })
      continue
    }

    if (row.friendLinkId) {
      impactRows.push({
        scopeType: "friend",
        scopeId: row.friendLinkId,
        payerUserId: row.payerUserId,
        payeeUserId: row.payeeUserId,
        amountMinor: row.amountMinor,
      })
    }
  }

  return impactRows
}

export async function getSettlementCounterparties(userId: string) {
  const [friends, groupRows] = await Promise.all([
    getUserFriends(userId),
    db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId)),
  ])

  const groupIds = Array.from(
    new Set(groupRows.map((entry) => entry.organizationId))
  )
  const groupMemberRows =
    groupIds.length === 0
      ? []
      : await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            organizationId: member.organizationId,
          })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(inArray(member.organizationId, groupIds))

  const sharedGroupCountByUserId = new Map<string, number>()
  for (const row of groupMemberRows) {
    if (row.id === userId) {
      continue
    }

    sharedGroupCountByUserId.set(
      row.id,
      (sharedGroupCountByUserId.get(row.id) ?? 0) + 1
    )
  }

  const counterparties = new Map<string, SettlementCounterparty>()

  for (const friend of friends) {
    counterparties.set(friend.otherUser.id, {
      id: friend.otherUser.id,
      name: friend.otherUser.name,
      email: friend.otherUser.email,
      isFriend: true,
      sharedGroupCount: sharedGroupCountByUserId.get(friend.otherUser.id) ?? 0,
      friendLinkId: friend.id,
    })
  }

  for (const row of groupMemberRows) {
    if (row.id === userId) {
      continue
    }

    const current = counterparties.get(row.id)
    counterparties.set(row.id, {
      id: row.id,
      name: current?.name ?? row.name,
      email: current?.email ?? row.email,
      isFriend: current?.isFriend ?? false,
      sharedGroupCount: sharedGroupCountByUserId.get(row.id) ?? 0,
      friendLinkId: current?.friendLinkId ?? null,
    })
  }

  return Array.from(counterparties.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

export async function getPairwiseSettlementContext(
  userId: string,
  counterpartyUserId: string
) {
  const [userLookup, activeFriendLink, sharedGroupIds] = await Promise.all([
    getUserLookup([counterpartyUserId]),
    getActiveFriendLinkBetweenUsers(userId, counterpartyUserId),
    getSharedGroupIdsBetweenUsers(userId, counterpartyUserId),
  ])

  const counterparty = userLookup.get(counterpartyUserId)
  if (!counterparty) {
    throw new Error("Counterparty is unavailable.")
  }

  if (!activeFriendLink && sharedGroupIds.length === 0) {
    throw new Error("You do not share any accessible balance with this user.")
  }

  const expenseScopeClauses = []
  if (activeFriendLink) {
    expenseScopeClauses.push(eq(expense.friendLinkId, activeFriendLink.id))
  }

  if (sharedGroupIds.length > 0) {
    expenseScopeClauses.push(inArray(expense.organizationId, sharedGroupIds))
  }

  const expenseRows =
    expenseScopeClauses.length === 0
      ? []
      : await db
          .select({
            id: expense.id,
            organizationId: expense.organizationId,
            friendLinkId: expense.friendLinkId,
            organizationName: organization.name,
            incurredAt: expense.incurredAt,
            paidByUserId: expense.paidByUserId,
            participantUserId: expenseParticipant.userId,
            owedAmountMinor: expenseParticipant.owedAmountMinor,
          })
          .from(expenseParticipant)
          .innerJoin(expense, eq(expenseParticipant.expenseId, expense.id))
          .leftJoin(organization, eq(expense.organizationId, organization.id))
          .where(
            and(
              gt(expenseParticipant.owedAmountMinor, 0),
              expenseScopeClauses.length === 1
                ? expenseScopeClauses[0]
                : or(...expenseScopeClauses),
              inArray(expense.paidByUserId, [userId, counterpartyUserId]),
              inArray(expenseParticipant.userId, [userId, counterpartyUserId])
            )
          )

  const debtRows: Array<PairwiseDebtRow> = []
  for (const row of expenseRows) {
    if (row.participantUserId === row.paidByUserId) {
      continue
    }

    const scopeType: SettlementScopeType = row.organizationId
      ? "group"
      : "friend"
    const scopeId = row.organizationId ?? row.friendLinkId
    if (!scopeId) {
      continue
    }

    debtRows.push({
      scopeType,
      scopeId,
      scopeName: row.organizationId
        ? (row.organizationName ?? "Group")
        : "Direct",
      creditorUserId: row.paidByUserId,
      debtorUserId: row.participantUserId,
      amountMinor: row.owedAmountMinor,
      incurredAt: safeDate(row.incurredAt),
      expenseId: row.id,
    })
  }

  const settlementImpactRows = (
    await getScopedSettlementImpactRows({
      groupIds: sharedGroupIds,
      friendLinkIds: activeFriendLink ? [activeFriendLink.id] : [],
    })
  ).filter(
    (row) =>
      (row.payerUserId === userId || row.payerUserId === counterpartyUserId) &&
      (row.payeeUserId === userId || row.payeeUserId === counterpartyUserId)
  )

  return {
    counterparty,
    activeFriendLink,
    sharedGroupIds,
    debtRows,
    settlementImpactRows,
  }
}

export async function preparePairwiseSettlementPlan(args: {
  currentUserId: string
  counterpartyUserId: string
  payerUserId: string
  payeeUserId: string
  amountMinor: number
}) {
  const counterpartyUserId = args.counterpartyUserId.trim()
  if (!counterpartyUserId) {
    throw new Error("Choose who this settlement is with.")
  }

  if (counterpartyUserId === args.currentUserId) {
    throw new Error("Choose another user to settle with.")
  }

  if (args.payerUserId === args.payeeUserId) {
    throw new Error("Payer and payee must be different.")
  }

  const allowedUserIds = new Set([args.currentUserId, counterpartyUserId])
  if (
    !allowedUserIds.has(args.payerUserId) ||
    !allowedUserIds.has(args.payeeUserId)
  ) {
    throw new Error(
      "Settlement users must match you and the selected counterparty."
    )
  }

  const amountMinor = toMinorUnits(args.amountMinor)
  if (amountMinor <= 0) {
    throw new Error("Settlement amount must be more than zero.")
  }

  const context = await getPairwiseSettlementContext(
    args.currentUserId,
    counterpartyUserId
  )
  const plan = buildPairwiseSettlementPlan({
    debtRows: context.debtRows,
    settlementImpactRows: context.settlementImpactRows,
    payerUserId: args.payerUserId,
    payeeUserId: args.payeeUserId,
    amountMinor,
  })

  return {
    amountMinor,
    counterparty: context.counterparty,
    activeFriendLink: context.activeFriendLink,
    allocations: plan.allocations,
    outstandingTotal: plan.outstandingTotal,
  }
}
