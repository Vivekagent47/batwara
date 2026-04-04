// Pairwise balance helpers for summaries, suggestions, and net-map math.
import { eq, inArray, or } from "drizzle-orm"

import type {
  PairwiseDebtRow,
  SettlementImpactRow,
} from "@/lib/settlement-ledger"
import { db } from "@/db"
import { expense, expenseParticipant } from "@/db/schema"
import { resolveOutstandingPairwiseDebtRows } from "@/lib/settlement-ledger"

import { getUserLookup } from "./access"
import { getScopedSettlementImpactRows } from "./settlements"
import type { PairwiseSuggestion, TransferSuggestion } from "./types"

export function simplifyNetBalances(netMap: Map<string, number>) {
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

export async function getPairwiseSummary(
  userId: string,
  groupIds: Array<string>,
  friendIds: Array<string>
) {
  const expenseScopeClauses = []
  if (groupIds.length > 0) {
    expenseScopeClauses.push(inArray(expense.organizationId, groupIds))
  }

  if (friendIds.length > 0) {
    expenseScopeClauses.push(inArray(expense.friendLinkId, friendIds))
  }

  if (expenseScopeClauses.length === 0) {
    return {
      youOweMinor: 0,
      youAreOwedMinor: 0,
      suggestions: [] as Array<PairwiseSuggestion>,
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

  const settlementRows = await getScopedSettlementImpactRows({
    groupIds,
    friendLinkIds: friendIds,
  })

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
  const suggestions: Array<PairwiseSuggestion> = []

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

export function getPairwiseOutstandingSummary(args: {
  currentUserId: string
  counterpartyUserId: string
  debtRows: Array<PairwiseDebtRow>
  settlementImpactRows: Array<SettlementImpactRow>
}) {
  const outstandingRows = resolveOutstandingPairwiseDebtRows(
    args.debtRows,
    args.settlementImpactRows
  )

  let youOweMinor = 0
  let youAreOwedMinor = 0

  for (const row of outstandingRows) {
    if (
      row.creditorUserId === args.currentUserId &&
      row.debtorUserId === args.counterpartyUserId
    ) {
      youAreOwedMinor += row.amountMinor
      continue
    }

    if (
      row.creditorUserId === args.counterpartyUserId &&
      row.debtorUserId === args.currentUserId
    ) {
      youOweMinor += row.amountMinor
    }
  }

  const netMinor = youAreOwedMinor - youOweMinor
  if (netMinor > 0) {
    return {
      direction: "collect" as const,
      amountMinor: netMinor,
    }
  }

  if (netMinor < 0) {
    return {
      direction: "pay" as const,
      amountMinor: Math.abs(netMinor),
    }
  }

  return null
}

export function buildNetMap(
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
