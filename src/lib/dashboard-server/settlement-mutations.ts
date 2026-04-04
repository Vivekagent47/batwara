// Settlement recording write functions.
import { createServerFn } from "@tanstack/react-start"

import { db } from "@/db"
import { activityLog, settlement, settlementAllocation } from "@/db/schema"
import {
  settlementsDisabledMessage,
  settlementsEnabled,
} from "@/lib/feature-flags-server"
import { enforceRateLimit } from "@/lib/rate-limit"

import { requireLedgerUser } from "./access"
import {
  isMissingSettlementAllocationTableError,
  parseSettlementDateInput,
  toCurrencyCode,
} from "./core"
import { preparePairwiseSettlementPlan } from "./settlements"

export const createSettlement = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      counterpartyUserId: string
      payerUserId: string
      payeeUserId: string
      amountMinor: number
      currency?: string
      note?: string
      settledAt?: string
    }) => input
  )
  .handler(async ({ data }) => {
    if (!settlementsEnabled) {
      throw new Error(settlementsDisabledMessage)
    }

    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `create-settlement:${currentUser.id}`,
      windowMs: 60_000,
      max: 35,
    })

    const plan = await preparePairwiseSettlementPlan({
      currentUserId: currentUser.id,
      counterpartyUserId: data.counterpartyUserId,
      payerUserId: data.payerUserId,
      payeeUserId: data.payeeUserId,
      amountMinor: data.amountMinor,
    })

    try {
      await db.transaction(async (tx) => {
        const settlementId = crypto.randomUUID()
        const now = new Date()
        const normalizedCurrency = toCurrencyCode(data.currency)
        const normalizedSettledAt =
          parseSettlementDateInput(data.settledAt) ?? now

        await tx.insert(settlement).values({
          id: settlementId,
          payerUserId: data.payerUserId,
          payeeUserId: data.payeeUserId,
          currency: normalizedCurrency,
          amountMinor: plan.amountMinor,
          note: data.note?.trim() || null,
          settledAt: normalizedSettledAt,
          createdByUserId: currentUser.id,
          createdAt: now,
        })

        await tx.insert(settlementAllocation).values(
          plan.allocations.map((entry) => ({
            id: crypto.randomUUID(),
            settlementId,
            organizationId: entry.scopeType === "group" ? entry.scopeId : null,
            friendLinkId: entry.scopeType === "friend" ? entry.scopeId : null,
            payerUserId: data.payerUserId,
            payeeUserId: data.payeeUserId,
            amountMinor: entry.amountMinor,
            allocationOrder: entry.allocationOrder,
            createdAt: now,
          }))
        )

        await tx.insert(activityLog).values(
          plan.allocations.map((entry) => ({
            id: crypto.randomUUID(),
            organizationId: entry.scopeType === "group" ? entry.scopeId : null,
            friendLinkId: entry.scopeType === "friend" ? entry.scopeId : null,
            actorUserId: currentUser.id,
            entityType: "settlement",
            entityId: settlementId,
            action: "created",
            summary:
              entry.scopeType === "group"
                ? `${currentUser.name} recorded a ${entry.scopeName} settlement.`
                : `${currentUser.name} recorded a direct settlement with ${plan.counterparty.name}.`,
            metadata: JSON.stringify({
              payerUserId: data.payerUserId,
              payeeUserId: data.payeeUserId,
              counterpartyUserId: plan.counterparty.id,
              amountMinor: plan.amountMinor,
              allocatedAmountMinor: entry.amountMinor,
              allocationOrder: entry.allocationOrder,
              currency: normalizedCurrency,
              scopeType: entry.scopeType,
              scopeName: entry.scopeName,
            }),
            createdAt: now,
          }))
        )
      })
    } catch (error) {
      if (isMissingSettlementAllocationTableError(error)) {
        throw new Error(
          'Database migration missing for settlements. Run "bun run db:migrate" and try again.'
        )
      }

      throw error
    }

    return {
      amountMinor: plan.amountMinor,
      allocations: plan.allocations,
    }
  })
