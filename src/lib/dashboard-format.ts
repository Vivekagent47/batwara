export function formatMoneyMinor(amountMinor: number, currency = "INR") {
  const amount = amountMinor / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
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
