import type { ExpenseSplitMethod } from "@/lib/dashboard-server/types"

export type ParticipantState = {
  enabled: boolean
  value: string
}

export type SplitValidationError = {
  title: string
  description?: string
}

export const splitMethodLabels: Record<ExpenseSplitMethod, string> = {
  equal: "Equal",
  exact: "Exact",
  percentage: "Percentage",
  shares: "Shares",
}

export function participantStatesEqual(
  previous: Partial<Record<string, ParticipantState>>,
  next: Partial<Record<string, ParticipantState>>
) {
  const previousKeys = Object.keys(previous)
  const nextKeys = Object.keys(next)
  if (previousKeys.length !== nextKeys.length) {
    return false
  }

  for (const key of previousKeys) {
    const previousEntry = previous[key]
    const nextEntry = next[key]
    if (!previousEntry || !nextEntry) {
      return false
    }

    if (
      previousEntry.enabled !== nextEntry.enabled ||
      previousEntry.value !== nextEntry.value
    ) {
      return false
    }
  }

  return true
}

export function formatInitialSplitValue(
  splitMethod: ExpenseSplitMethod,
  value: number | undefined,
  fallbackOwedMinor: number,
  totalAmountMinor: number
) {
  if (splitMethod === "equal") {
    return ""
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (splitMethod === "exact") {
      return (value / 100).toFixed(2)
    }

    return String(value)
  }

  if (splitMethod === "exact") {
    return (fallbackOwedMinor / 100).toFixed(2)
  }

  if (splitMethod === "percentage") {
    if (totalAmountMinor <= 0) {
      return "0"
    }

    return ((fallbackOwedMinor / totalAmountMinor) * 100).toFixed(2)
  }

  return (fallbackOwedMinor / 100).toFixed(2)
}

export function buildInitialParticipantState(args: {
  members: Array<{ id: string }>
  splitInput: Array<{
    userId: string
    value?: number
  }>
  participants: Array<{
    userId: string
    owedAmountMinor: number
  }>
  splitMethod: ExpenseSplitMethod
  totalAmountMinor: number
}) {
  const splitInputMap = new Map<string, number | undefined>(
    args.splitInput.map((entry) => [entry.userId, entry.value])
  )
  const includedIds = new Set<string>(
    args.splitInput.length > 0
      ? args.splitInput.map((entry) => entry.userId)
      : args.participants.map((entry) => entry.userId)
  )
  const participantRows = new Map<string, (typeof args.participants)[number]>(
    args.participants.map((entry) => [entry.userId, entry])
  )

  const next: Partial<Record<string, ParticipantState>> = {}

  for (const member of args.members) {
    const enabled = includedIds.has(member.id)
    const participant = participantRows.get(member.id)

    next[member.id] = {
      enabled,
      value: enabled
        ? formatInitialSplitValue(
            args.splitMethod,
            splitInputMap.get(member.id),
            participant?.owedAmountMinor ?? 0,
            args.totalAmountMinor
          )
        : "",
    }
  }

  return next
}

export function getSplitSummary(args: {
  splitMethod: ExpenseSplitMethod
  enabledMembers: Array<{ id: string }>
  participants: Partial<Record<string, ParticipantState>>
  isMembersPending?: boolean
  activeMembersCount?: number
}) {
  if (args.isMembersPending && (args.activeMembersCount ?? 0) === 0) {
    return "Loading members..."
  }

  if (args.splitMethod === "equal") {
    return `${args.enabledMembers.length} people`
  }

  const total = args.enabledMembers.reduce((sum, entry) => {
    const value = Number.parseFloat(args.participants[entry.id]?.value ?? "0")
    return Number.isFinite(value) ? sum + value : sum
  }, 0)

  if (args.splitMethod === "percentage") {
    return `${total.toFixed(2)}% entered`
  }

  if (args.splitMethod === "shares") {
    return `${total.toFixed(2)} shares entered`
  }

  return `${args.enabledMembers.length} values entered`
}

export function getSplitValidationError(args: {
  splitMethod: ExpenseSplitMethod
  enabledMembers: Array<{ id: string }>
  participants: Partial<Record<string, ParticipantState>>
  amountMinor: number
}): SplitValidationError | null {
  if (args.enabledMembers.length === 0) {
    return {
      title: "Pick participants",
      description: "At least one participant is required.",
    }
  }

  if (args.splitMethod === "equal") {
    return null
  }

  const values = args.enabledMembers.map((entry) =>
    Number.parseFloat(args.participants[entry.id]?.value ?? "")
  )

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return {
      title: "Split values are incomplete",
      description: "Enter valid values for selected participants.",
    }
  }

  if (args.splitMethod === "exact") {
    const exactTotal = values.reduce(
      (sum, value) => sum + Math.round(value * 100),
      0
    )
    if (exactTotal !== args.amountMinor) {
      return {
        title: "Exact split must match amount",
        description: "Exact values should add up to the expense amount.",
      }
    }

    return null
  }

  if (args.splitMethod === "percentage") {
    const percentTotal = values.reduce((sum, value) => sum + value, 0)
    if (Math.abs(percentTotal - 100) > 0.001) {
      return {
        title: "Percentage split must add up to 100",
      }
    }

    return null
  }

  const shareTotal = values.reduce((sum, value) => sum + value, 0)
  if (shareTotal <= 0) {
    return {
      title: "Shares must add up to more than zero",
    }
  }

  return null
}

export function buildParticipantPayload(args: {
  splitMethod: ExpenseSplitMethod
  enabledMembers: Array<{ id: string }>
  participants: Partial<Record<string, ParticipantState>>
}) {
  return args.enabledMembers.map((entry) => {
    const rawValue = args.participants[entry.id]?.value ?? ""

    if (args.splitMethod === "equal") {
      return { userId: entry.id }
    }

    if (args.splitMethod === "exact") {
      return {
        userId: entry.id,
        value: Math.round(Number.parseFloat(rawValue || "0") * 100),
      }
    }

    return {
      userId: entry.id,
      value: Number.parseFloat(rawValue || "0"),
    }
  })
}

export function getSplitInputPlaceholder(splitMethod: ExpenseSplitMethod) {
  if (splitMethod === "exact") {
    return "0.00"
  }

  if (splitMethod === "percentage") {
    return "%"
  }

  return "shares"
}
