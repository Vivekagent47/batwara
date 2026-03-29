import { describe, expect, it } from "vitest"

import type {
  PairwiseDebtRow,
  SettlementImpactRow,
} from "@/lib/settlement-ledger"
import {
  buildPairwiseSettlementPlan,
  resolveOutstandingPairwiseDebtRows,
} from "@/lib/settlement-ledger"

const baseDate = new Date("2026-03-01T00:00:00.000Z")

function createDebtRow(
  expenseId: string,
  offsetDays: number,
  overrides: Partial<PairwiseDebtRow> = {}
): PairwiseDebtRow {
  return {
    scopeType: "group",
    scopeId: "group-a",
    scopeName: "Goa Trip",
    creditorUserId: "user-b",
    debtorUserId: "user-a",
    amountMinor: 1000,
    incurredAt: new Date(baseDate.getTime() + offsetDays * 86_400_000),
    expenseId,
    ...overrides,
  }
}

describe("resolveOutstandingPairwiseDebtRows", () => {
  it("applies prior settlement impacts oldest-first within the same scope and direction", () => {
    const debtRows = [
      createDebtRow("exp-1", 0, { amountMinor: 3000 }),
      createDebtRow("exp-2", 3, { amountMinor: 2500 }),
    ]
    const priorImpacts: Array<SettlementImpactRow> = [
      {
        scopeType: "group",
        scopeId: "group-a",
        payerUserId: "user-a",
        payeeUserId: "user-b",
        amountMinor: 3500,
      },
    ]

    expect(resolveOutstandingPairwiseDebtRows(debtRows, priorImpacts)).toEqual([
      createDebtRow("exp-2", 3, { amountMinor: 2000 }),
    ])
  })
})

describe("buildPairwiseSettlementPlan", () => {
  it("allocates across scopes oldest-first after accounting for prior impacts", () => {
    const debtRows = [
      createDebtRow("exp-1", 0, {
        scopeType: "group",
        scopeId: "group-a",
        scopeName: "Goa Trip",
        amountMinor: 6000,
      }),
      createDebtRow("exp-2", 2, {
        scopeType: "friend",
        scopeId: "friend-link-1",
        scopeName: "Direct",
        amountMinor: 2000,
      }),
      createDebtRow("exp-3", 4, {
        scopeType: "group",
        scopeId: "group-b",
        scopeName: "House Rent",
        amountMinor: 5000,
      }),
    ]
    const priorImpacts: Array<SettlementImpactRow> = [
      {
        scopeType: "group",
        scopeId: "group-a",
        payerUserId: "user-a",
        payeeUserId: "user-b",
        amountMinor: 3000,
      },
    ]

    expect(
      buildPairwiseSettlementPlan({
        debtRows,
        settlementImpactRows: priorImpacts,
        payerUserId: "user-a",
        payeeUserId: "user-b",
        amountMinor: 7000,
      })
    ).toEqual({
      outstandingTotal: 10000,
      allocations: [
        {
          scopeType: "group",
          scopeId: "group-a",
          scopeName: "Goa Trip",
          amountMinor: 3000,
          allocationOrder: 0,
        },
        {
          scopeType: "friend",
          scopeId: "friend-link-1",
          scopeName: "Direct",
          amountMinor: 2000,
          allocationOrder: 1,
        },
        {
          scopeType: "group",
          scopeId: "group-b",
          scopeName: "House Rent",
          amountMinor: 2000,
          allocationOrder: 2,
        },
      ],
    })
  })

  it("rejects overpayment against the current outstanding balance", () => {
    expect(() =>
      buildPairwiseSettlementPlan({
        debtRows: [createDebtRow("exp-1", 0, { amountMinor: 1500 })],
        settlementImpactRows: [],
        payerUserId: "user-a",
        payeeUserId: "user-b",
        amountMinor: 1600,
      })
    ).toThrow("Settlement amount cannot exceed the outstanding balance.")
  })

  it("nets reverse-direction balances when reporting and validating the outstanding total", () => {
    const debtRows = [
      createDebtRow("exp-1", 0, {
        scopeType: "friend",
        scopeId: "friend-link-1",
        scopeName: "Direct",
        amountMinor: 500,
      }),
      createDebtRow("exp-2", 1, {
        scopeType: "group",
        scopeId: "group-a",
        scopeName: "Trip to Coding",
        amountMinor: 6000,
      }),
      createDebtRow("exp-3", 2, {
        scopeType: "group",
        scopeId: "group-b",
        scopeName: "Counter expenses",
        creditorUserId: "user-a",
        debtorUserId: "user-b",
        amountMinor: 5000,
      }),
    ]

    expect(
      buildPairwiseSettlementPlan({
        debtRows,
        settlementImpactRows: [],
        payerUserId: "user-a",
        payeeUserId: "user-b",
        amountMinor: 1500,
      })
    ).toEqual({
      outstandingTotal: 1500,
      allocations: [
        {
          scopeType: "friend",
          scopeId: "friend-link-1",
          scopeName: "Direct",
          amountMinor: 500,
          allocationOrder: 0,
        },
        {
          scopeType: "group",
          scopeId: "group-a",
          scopeName: "Trip to Coding",
          amountMinor: 1000,
          allocationOrder: 1,
        },
      ],
    })

    expect(() =>
      buildPairwiseSettlementPlan({
        debtRows,
        settlementImpactRows: [],
        payerUserId: "user-a",
        payeeUserId: "user-b",
        amountMinor: 1501,
      })
    ).toThrow("Settlement amount cannot exceed the outstanding balance.")
  })
})
