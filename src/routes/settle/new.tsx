import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useDeferredValue, useEffect, useState } from "react"
import { toast } from "sonner"
import type { FormEvent } from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatMoneyMinor } from "@/lib/dashboard-format"
import { cn } from "@/lib/utils"
import {
  createSettlement,
  getSettlementComposerData,
  previewSettlement,
} from "@/lib/dashboard-server"

type SettleSearch = {
  counterpartyUserId?: string
  payerUserId?: string
  payeeUserId?: string
  amountMinor?: number
  sourceGroupId?: string
  sourceFriendId?: string
}

type PaymentDirection = "you_pay" | "you_receive"

const paymentDirectionLabels: Record<PaymentDirection, string> = {
  you_pay: "You pay",
  you_receive: "You receive",
}

type PreviewState = {
  outstandingTotal: number
  allocations: Array<{
    scopeType: "group" | "friend"
    scopeId: string
    scopeName: string
    amountMinor: number
    allocationOrder: number
  }>
}

function getInitialDirection(
  search: SettleSearch,
  userId: string
): PaymentDirection {
  if (search.payeeUserId === userId) {
    return "you_receive"
  }

  return "you_pay"
}

function formatAmountInput(amountMinor: number | undefined) {
  if (typeof amountMinor !== "number" || !Number.isFinite(amountMinor)) {
    return ""
  }

  return (amountMinor / 100).toFixed(2)
}

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export const Route = createFileRoute("/settle/new")({
  validateSearch: (search: Record<string, unknown>): SettleSearch => ({
    counterpartyUserId:
      typeof search.counterpartyUserId === "string"
        ? search.counterpartyUserId
        : undefined,
    payerUserId:
      typeof search.payerUserId === "string" ? search.payerUserId : undefined,
    payeeUserId:
      typeof search.payeeUserId === "string" ? search.payeeUserId : undefined,
    amountMinor:
      typeof search.amountMinor === "number"
        ? search.amountMinor
        : typeof search.amountMinor === "string"
          ? Number.parseInt(search.amountMinor, 10)
          : undefined,
    sourceGroupId:
      typeof search.sourceGroupId === "string"
        ? search.sourceGroupId
        : undefined,
    sourceFriendId:
      typeof search.sourceFriendId === "string"
        ? search.sourceFriendId
        : undefined,
  }),
  loader: () => getSettlementComposerData(),
  head: () => ({
    meta: [
      {
        title: "Settle Up | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: SettleNewPage,
})

function SettleNewPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const createSettlementFn = useServerFn(createSettlement)
  const previewSettlementFn = useServerFn(previewSettlement)
  const [counterpartyUserId, setCounterpartyUserId] = useState(
    search.counterpartyUserId ?? ""
  )
  const [direction, setDirection] = useState<PaymentDirection>(
    getInitialDirection(search, data.user.id)
  )
  const [amount, setAmount] = useState(formatAmountInput(search.amountMinor))
  const [note, setNote] = useState("")
  const [settledAt] = useState(getTodayInputValue)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const deferredAmount = useDeferredValue(amount)

  const amountMinor = Math.round(Number.parseFloat(deferredAmount || "0") * 100)
  const parsedAmountMinor = Math.round(Number.parseFloat(amount || "0") * 100)
  const isOutgoingSettlement = direction === "you_pay"
  const payerUserId =
    direction === "you_pay" ? data.user.id : counterpartyUserId
  const payeeUserId =
    direction === "you_pay" ? counterpartyUserId : data.user.id

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

    void previewSettlementFn({
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
    previewSettlementFn,
  ])

  const counterparty = data.counterparties.find(
    (entry) => entry.id === counterpartyUserId
  )

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!counterpartyUserId) {
      toast.error("Choose who this settlement is with")
      return
    }

    if (Number.isNaN(parsedAmountMinor) || parsedAmountMinor <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    if (!preview) {
      toast.error("Wait for the allocation preview", {
        description:
          previewError ??
          "Batwara needs a valid preview before saving this payment.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createSettlementFn({
        data: {
          counterpartyUserId,
          payerUserId,
          payeeUserId,
          amountMinor: parsedAmountMinor,
          note,
          settledAt,
        },
      })

      toast.success("Settlement recorded", {
        description:
          result.allocations.length === 1
            ? "The payment was applied to 1 balance scope."
            : `The payment was applied to ${result.allocations.length} balance scopes.`,
      })

      await router.invalidate()

      if (search.sourceGroupId) {
        await navigate({
          to: "/groups/$groupId",
          params: { groupId: search.sourceGroupId },
        })
        return
      }

      if (search.sourceFriendId) {
        await navigate({
          to: "/friends/$friendId",
          params: { friendId: search.sourceFriendId },
        })
        return
      }

      await navigate({ to: "/activity" })
    } catch (error) {
      toast.error("Could not record settlement", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardShell
      title="Settle up"
      description="Record one payment between two people. Batwara applies it to the oldest shared balances first across direct and group ledgers."
    >
      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <form
          onSubmit={onSubmit}
          className="dashboard-surface space-y-4 rounded-2xl"
        >
          <div className="space-y-1.5">
            <Label className="text-[13px] leading-none text-muted-foreground">
              With
            </Label>
            <Select
              value={counterpartyUserId}
              onValueChange={(nextValue) =>
                setCounterpartyUserId(nextValue ?? "")
              }
            >
              <SelectTrigger className="h-11 rounded-xl border-input/80 bg-background/75">
                <SelectValue placeholder="Choose a friend or shared member">
                  {counterparty
                    ? `${counterparty.name} · ${counterparty.email}`
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" sideOffset={6}>
                {data.counterparties.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name} · {entry.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {counterparty ? (
              <p className="text-xs text-muted-foreground">
                {counterparty.isFriend
                  ? "Direct friend ledger"
                  : "Shared groups only"}
                {counterparty.sharedGroupCount > 0
                  ? ` · ${counterparty.sharedGroupCount} shared group${counterparty.sharedGroupCount === 1 ? "" : "s"}`
                  : ""}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] leading-none text-muted-foreground">
                Payment direction
              </Label>
              <Select
                value={direction}
                onValueChange={(nextValue) =>
                  setDirection(nextValue as PaymentDirection)
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-input/80 bg-background/75">
                  <SelectValue>{paymentDirectionLabels[direction]}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start" sideOffset={6}>
                  <SelectItem value="you_pay">
                    {paymentDirectionLabels.you_pay}
                  </SelectItem>
                  <SelectItem value="you_receive">
                    {paymentDirectionLabels.you_receive}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] leading-none text-muted-foreground">
                Amount
              </Label>
              <Input
                inputMode="decimal"
                placeholder="1200.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-11 rounded-xl border-input/80 bg-background/75"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] leading-none text-muted-foreground">
                Payer
              </Label>
              <div className="flex h-11 items-center rounded-xl border border-input/80 bg-background/75 px-3 text-sm">
                {direction === "you_pay"
                  ? "You"
                  : (counterparty?.name ?? "Choose a user first")}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] leading-none text-muted-foreground">
                Payee
              </Label>
              <div className="flex h-11 items-center rounded-xl border border-input/80 bg-background/75 px-3 text-sm">
                {direction === "you_pay"
                  ? (counterparty?.name ?? "Choose a user first")
                  : "You"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] leading-none text-muted-foreground">
                Settled on
              </Label>
              <div className="flex h-11 items-center rounded-xl border border-input/80 bg-background/75 px-3 text-sm">
                {formatDateLabel(settledAt)}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] leading-none text-muted-foreground">
                Suggested matches
              </Label>
              <div className="flex min-h-11 flex-wrap gap-2 rounded-xl border border-dashed border-border/80 bg-background/60 p-2">
                {data.suggestions.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-muted-foreground">
                    No outstanding pair suggestions right now.
                  </p>
                ) : (
                  data.suggestions.slice(0, 3).map((entry) => (
                    <button
                      key={entry.counterparty.id}
                      type="button"
                      onClick={() => {
                        setCounterpartyUserId(entry.counterparty.id)
                        setDirection(
                          entry.direction === "pay" ? "you_pay" : "you_receive"
                        )
                        setAmount((entry.amountMinor / 100).toFixed(2))
                      }}
                      className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted/60"
                    >
                      {entry.counterparty.name} ·{" "}
                      {formatMoneyMinor(entry.amountMinor)}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] leading-none text-muted-foreground">
              Note
            </Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note about this payment"
              className="min-h-24 rounded-xl border-input/80 bg-background/75"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => void navigate({ to: "/dashboard" })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl"
              disabled={isSubmitting || isPreviewPending || !preview}
            >
              {isSubmitting ? "Recording..." : "Record settlement"}
            </Button>
          </div>
        </form>

        <aside className="dashboard-surface rounded-2xl">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Allocation preview
          </p>
          <h2 className="mt-2 font-heading text-2xl">
            Where this payment lands
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Batwara applies pairwise settlements to the oldest shared balances
            first. Group balances can change even when you do not choose a group
            explicitly.
          </p>

          {isPreviewPending ? (
            <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Previewing allocation...
            </p>
          ) : previewError ? (
            <p className="mt-4 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
              {previewError}
            </p>
          ) : preview ? (
            <div className="mt-4 space-y-3">
              <div
                className={cn(
                  "rounded-2xl border p-3",
                  isOutgoingSettlement
                    ? "border-destructive/25 bg-destructive/5"
                    : "border-primary/25 bg-primary/5"
                )}
              >
                <p
                  className={cn(
                    "text-xs uppercase",
                    isOutgoingSettlement
                      ? "text-destructive/80"
                      : "text-primary/80"
                  )}
                >
                  Net outstanding for this direction
                </p>
                <p
                  className={cn(
                    "mt-1 font-heading text-2xl",
                    isOutgoingSettlement ? "text-destructive" : "text-primary"
                  )}
                >
                  {formatMoneyMinor(preview.outstandingTotal)}
                </p>
              </div>

              <div className="space-y-2">
                {preview.allocations.map((entry) => (
                  <div
                    key={`${entry.scopeType}-${entry.scopeId}`}
                    className="dashboard-list-item flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {entry.scopeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.scopeType === "group"
                          ? "Group balance"
                          : "Direct balance"}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatMoneyMinor(entry.amountMinor)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Choose a counterparty and amount to preview how the payment will
              be distributed.
            </p>
          )}
        </aside>
      </div>
    </DashboardShell>
  )
}
