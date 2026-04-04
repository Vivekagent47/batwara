import { useDeferredValue, useEffect, useState } from "react"

export type SettlementPreviewState = {
  outstandingTotal: number
  allocations: Array<{
    scopeType: "group" | "friend"
    scopeId: string
    scopeName: string
    amountMinor: number
    allocationOrder: number
  }>
}

type UseSettlementPreviewOptions = {
  counterpartyUserId: string
  payerUserId: string
  payeeUserId: string
  amount: string
  previewSettlement: (args: {
    data: {
      counterpartyUserId: string
      payerUserId: string
      payeeUserId: string
      amountMinor: number
    }
  }) => Promise<SettlementPreviewState>
}

export function useSettlementPreview({
  counterpartyUserId,
  payerUserId,
  payeeUserId,
  amount,
  previewSettlement,
}: UseSettlementPreviewOptions) {
  const [preview, setPreview] = useState<SettlementPreviewState | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const deferredAmount = useDeferredValue(amount)

  const amountMinor = Math.round(Number.parseFloat(deferredAmount || "0") * 100)
  const parsedAmountMinor = Math.round(Number.parseFloat(amount || "0") * 100)

  useEffect(() => {
    if (
      !counterpartyUserId ||
      !Number.isFinite(amountMinor) ||
      amountMinor <= 0
    ) {
      setPreview(null)
      setPreviewError(null)
      setIsPreviewPending(false)
      return
    }

    let cancelled = false
    setIsPreviewPending(true)
    setPreview(null)
    setPreviewError(null)

    void previewSettlement({
      data: {
        counterpartyUserId,
        payerUserId,
        payeeUserId,
        amountMinor,
      },
    })
      .then((result) => {
        if (cancelled) {
          return
        }

        setPreview({
          outstandingTotal: result.outstandingTotal,
          allocations: result.allocations,
        })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setPreview(null)
        setPreviewError(
          error instanceof Error
            ? error.message
            : "Could not preview settlement."
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreviewPending(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    amountMinor,
    counterpartyUserId,
    payeeUserId,
    payerUserId,
    previewSettlement,
  ])

  return {
    amountMinor,
    parsedAmountMinor,
    preview,
    previewError,
    isPreviewPending,
  }
}
