function isValidDayInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function parseDayInputAtUtcMidday(value: string | undefined) {
  if (!value) {
    return null
  }

  if (!isValidDayInput(value)) {
    throw new Error("Date is invalid.")
  }

  const parsed = new Date(`${value}T12:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Date is invalid.")
  }

  return parsed
}

export function formatDateAsDayInput(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error("Date is invalid.")
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}
