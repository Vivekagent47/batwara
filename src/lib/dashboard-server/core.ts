// Core ledger utilities shared across dashboard server modules.
import type { ExpenseSplitMethod, SplitInputLine } from "./types"

const SETTLEMENT_ALLOCATION_TABLE = "settlement_allocation"

export function safeDate(value: Date | null | undefined) {
  return value ?? new Date()
}

export function toCurrencyCode(value: string | undefined) {
  if (!value) {
    return "INR"
  }

  return value.trim().toUpperCase().slice(0, 3)
}

export function toMinorUnits(value: number) {
  return Math.round(value)
}

export function normalizePairKey(userAId: string, userBId: string) {
  const [a, b] = [userAId, userBId].sort()
  return `${a}:${b}`
}

export function isMissingSettlementAllocationTableError(error: unknown): boolean {
  const queue: Array<unknown> = [error]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== "object") {
      continue
    }

    const currentRecord = current as Record<string, unknown>
    if (currentRecord.code === "42P01") {
      return true
    }

    const message =
      typeof currentRecord.message === "string" ? currentRecord.message : ""
    if (
      message.includes(SETTLEMENT_ALLOCATION_TABLE) &&
      (message.includes("does not exist") || message.includes("Failed query"))
    ) {
      return true
    }

    if ("cause" in currentRecord) {
      queue.push(currentRecord.cause)
    }
  }

  return false
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

export function resolveSplit(
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

export function parseSettlementDateInput(value: string | undefined) {
  if (!value) {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Settlement date is invalid.")
  }

  // Persist day-only inputs at midday to avoid timezone rollovers.
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Settlement date is invalid.")
  }

  return parsed
}
