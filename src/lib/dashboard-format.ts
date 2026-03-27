export function formatMoneyMinor(amountMinor: number, _currency?: string) {
  const amount = amountMinor / 100
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getBalanceToneByDirection(direction: "pay" | "collect") {
  return direction === "pay" ? "balance-owe" : "balance-owed"
}

export function getBalanceToneByNetMinor(amountMinor: number) {
  if (amountMinor > 0) {
    return "balance-owed"
  }

  if (amountMinor < 0) {
    return "balance-owe"
  }

  return "balance-neutral"
}

export function formatRelativeDate(input: Date) {
  const now = Date.now()
  const diffMs = now - input.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) {
    return "just now"
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}m ago`
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`
  }

  return input.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
