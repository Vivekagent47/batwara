import { describe, expect, it } from "vitest"

import { formatDateAsDayInput, parseDayInputAtUtcMidday } from "@/lib/date-only"
import { canManageExpense } from "@/lib/expense-permissions"

describe("parseDayInputAtUtcMidday", () => {
  it("parses a day input into a stable UTC midday date", () => {
    const result = parseDayInputAtUtcMidday("2026-03-30")

    expect(result?.toISOString()).toBe("2026-03-30T12:00:00.000Z")
  })

  it("returns null when no value is provided", () => {
    expect(parseDayInputAtUtcMidday(undefined)).toBeNull()
  })

  it("formats dates back into the original day input", () => {
    const parsed = parseDayInputAtUtcMidday("2026-03-30")

    expect(parsed).not.toBeNull()
    expect(formatDateAsDayInput(parsed!)).toBe("2026-03-30")
  })
})

describe("canManageExpense", () => {
  it("allows the creator to manage an expense", () => {
    expect(canManageExpense("user-1", "user-1")).toBe(true)
  })

  it("blocks non-creators from managing an expense", () => {
    expect(canManageExpense("user-1", "user-2")).toBe(false)
  })
})
