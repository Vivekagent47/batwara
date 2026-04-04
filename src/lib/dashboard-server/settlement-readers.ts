// Settlement composer and preview reader functions.
import { createServerFn } from "@tanstack/react-start"

import {
  settlementsDisabledMessage,
  settlementsEnabled,
} from "@/lib/feature-flags-server"
import { enforceRateLimit } from "@/lib/rate-limit"

import { getPairwiseSummary } from "./balances"
import { requireLedgerUser } from "./access"
import { getUserFriends } from "./friends"
import { getUserGroups } from "./groups"
import {
  getSettlementCounterparties,
  preparePairwiseSettlementPlan,
} from "./settlements"

export const getSettlementComposerData = createServerFn({
  method: "GET",
}).handler(async () => {
  if (!settlementsEnabled) {
    throw new Error(settlementsDisabledMessage)
  }

  const currentUser = await requireLedgerUser()
  enforceRateLimit({
    key: `settlement-composer:${currentUser.id}`,
    windowMs: 60_000,
    max: 120,
  })

  const [groups, friends, counterparties] = await Promise.all([
    getUserGroups(currentUser.id),
    getUserFriends(currentUser.id),
    getSettlementCounterparties(currentUser.id),
  ])

  const summary = await getPairwiseSummary(
    currentUser.id,
    groups.map((entry) => entry.id),
    friends.map((entry) => entry.id)
  )

  return {
    user: currentUser,
    counterparties,
    suggestions: summary.suggestions.slice(0, 8),
  }
})

export const previewSettlement = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      counterpartyUserId: string
      payerUserId: string
      payeeUserId: string
      amountMinor: number
    }) => input
  )
  .handler(async ({ data }) => {
    if (!settlementsEnabled) {
      throw new Error(settlementsDisabledMessage)
    }

    const currentUser = await requireLedgerUser()
    enforceRateLimit({
      key: `preview-settlement:${currentUser.id}`,
      windowMs: 60_000,
      max: 80,
    })

    const plan = await preparePairwiseSettlementPlan({
      currentUserId: currentUser.id,
      counterpartyUserId: data.counterpartyUserId,
      payerUserId: data.payerUserId,
      payeeUserId: data.payeeUserId,
      amountMinor: data.amountMinor,
    })

    return {
      counterparty: plan.counterparty,
      outstandingTotal: plan.outstandingTotal,
      allocations: plan.allocations,
    }
  })
