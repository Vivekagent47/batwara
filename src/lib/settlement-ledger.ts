export type SettlementScopeType = "group" | "friend"

export type PairwiseDebtRow = {
  scopeType: SettlementScopeType
  scopeId: string
  scopeName: string
  creditorUserId: string
  debtorUserId: string
  amountMinor: number
  incurredAt: Date
  expenseId: string
}

export type SettlementImpactRow = {
  scopeType: SettlementScopeType
  scopeId: string
  payerUserId: string
  payeeUserId: string
  amountMinor: number
}

export type SettlementAllocationPlan = {
  scopeType: SettlementScopeType
  scopeId: string
  scopeName: string
  amountMinor: number
  allocationOrder: number
}

function createDebtKey(row: {
  scopeType: SettlementScopeType
  scopeId: string
  creditorUserId: string
  debtorUserId: string
}) {
  return [
    row.scopeType,
    row.scopeId,
    row.creditorUserId,
    row.debtorUserId,
  ].join(":")
}

function sortDebtRows(rows: Array<PairwiseDebtRow>) {
  return [...rows].sort((a, b) => {
    const timeDiff = a.incurredAt.getTime() - b.incurredAt.getTime()
    if (timeDiff !== 0) {
      return timeDiff
    }

    return a.expenseId.localeCompare(b.expenseId)
  })
}

export function resolveOutstandingPairwiseDebtRows(
  debtRows: Array<PairwiseDebtRow>,
  settlementImpactRows: Array<SettlementImpactRow>
) {
  const sortedRows = sortDebtRows(debtRows)
  const remainingImpactByDebtKey = new Map<string, number>()

  for (const row of settlementImpactRows) {
    const key = createDebtKey({
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      creditorUserId: row.payeeUserId,
      debtorUserId: row.payerUserId,
    })

    remainingImpactByDebtKey.set(
      key,
      (remainingImpactByDebtKey.get(key) ?? 0) + row.amountMinor
    )
  }

  const outstandingRows: Array<PairwiseDebtRow> = []

  for (const row of sortedRows) {
    const key = createDebtKey(row)
    const remainingImpact = remainingImpactByDebtKey.get(key) ?? 0

    if (remainingImpact <= 0) {
      outstandingRows.push({ ...row })
      continue
    }

    const reducedAmount = Math.max(0, row.amountMinor - remainingImpact)
    remainingImpactByDebtKey.set(
      key,
      Math.max(0, remainingImpact - row.amountMinor)
    )

    if (reducedAmount > 0) {
      outstandingRows.push({
        ...row,
        amountMinor: reducedAmount,
      })
    }
  }

  return outstandingRows
}

export function buildPairwiseSettlementPlan(args: {
  debtRows: Array<PairwiseDebtRow>
  settlementImpactRows: Array<SettlementImpactRow>
  payerUserId: string
  payeeUserId: string
  amountMinor: number
}) {
  const amountMinor = Math.round(args.amountMinor)
  if (amountMinor <= 0) {
    throw new Error("Settlement amount must be more than zero.")
  }

  const resolvedOutstandingRows = resolveOutstandingPairwiseDebtRows(
    args.debtRows,
    args.settlementImpactRows
  )

  const payableRows = resolvedOutstandingRows.filter(
    (row) =>
      row.creditorUserId === args.payeeUserId &&
      row.debtorUserId === args.payerUserId
  )

  const payableTotal = payableRows.reduce(
    (sum, row) => sum + row.amountMinor,
    0
  )
  const receivableTotal = resolvedOutstandingRows
    .filter(
      (row) =>
        row.creditorUserId === args.payerUserId &&
        row.debtorUserId === args.payeeUserId
    )
    .reduce((sum, row) => sum + row.amountMinor, 0)
  const outstandingTotal = Math.max(0, payableTotal - receivableTotal)

  if (payableTotal <= 0 || outstandingTotal <= 0) {
    throw new Error("No outstanding balance matches this payment direction.")
  }

  if (amountMinor > outstandingTotal) {
    throw new Error("Settlement amount cannot exceed the outstanding balance.")
  }

  let remaining = amountMinor
  const allocations: Array<SettlementAllocationPlan> = []
  const allocationIndexByScopeKey = new Map<string, number>()

  for (const row of payableRows) {
    if (remaining <= 0) {
      break
    }

    const appliedAmount = Math.min(remaining, row.amountMinor)
    if (appliedAmount <= 0) {
      continue
    }

    const scopeKey = `${row.scopeType}:${row.scopeId}`
    const existingIndex = allocationIndexByScopeKey.get(scopeKey)

    if (typeof existingIndex === "number") {
      allocations[existingIndex].amountMinor += appliedAmount
    } else {
      allocationIndexByScopeKey.set(scopeKey, allocations.length)
      allocations.push({
        scopeType: row.scopeType,
        scopeId: row.scopeId,
        scopeName: row.scopeName,
        amountMinor: appliedAmount,
        allocationOrder: allocations.length,
      })
    }

    remaining -= appliedAmount
  }

  return {
    outstandingTotal,
    allocations,
  }
}
