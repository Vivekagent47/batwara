import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useState } from "react"
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
import {
  createSettlement,
  getComposerData,
  getLedgerMembers,
} from "@/lib/dashboard-server"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/settle/new")({
  loader: async () => getComposerData(),
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
  component: CreateSettlementPage,
})

type FormSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type LedgerMember = {
  id: string
  name: string
  email: string
}

function DashboardSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  description,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: Array<FormSelectOption>
  placeholder?: string
  description?: string
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <div className="space-y-1.5">
      <Label className="dashboard-label">{label}</Label>
      <Select
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
      >
        <SelectTrigger className="h-11 w-full rounded-xl border-input/80 bg-background/75">
          <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" sideOffset={6}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

function CreateSettlementPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const createSettlementFn = useServerFn(createSettlement)
  const getLedgerMembersFn = useServerFn(getLedgerMembers)
  const initialContextType: "group" | "friend" =
    data.groups.length > 0 ? "group" : "friend"
  const initialContextId =
    data.groups.length > 0
      ? data.groups[0].id
      : data.friends.length > 0
        ? data.friends[0].id
        : ""

  const [contextType, setContextType] = useState<"group" | "friend">(
    initialContextType
  )
  const [contextId, setContextId] = useState(initialContextId)
  const [payerUserId, setPayerUserId] = useState(data.user.id)
  const [payeeUserId, setPayeeUserId] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [note, setNote] = useState("")
  const [memberCache, setMemberCache] = useState<
    Partial<Record<string, Array<LedgerMember>>>
  >({})
  const [isMembersPending, setIsMembersPending] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const contexts = contextType === "group" ? data.groups : data.friends
  const contextKey = contextId ? `${contextType}:${contextId}` : ""
  const cachedMembers = contextKey ? memberCache[contextKey] : undefined
  const activeMembers = cachedMembers ?? []

  const activeContextName = useMemo(() => {
    const selected = contexts.find((entry) => entry.id === contextId)
    if (!selected) {
      return ""
    }

    return "name" in selected ? selected.name : selected.otherUser.name
  }, [contextId, contexts])

  const payerMember = useMemo(
    () => activeMembers.find((entry) => entry.id === payerUserId),
    [activeMembers, payerUserId]
  )
  const payeeMember = useMemo(
    () => activeMembers.find((entry) => entry.id === payeeUserId),
    [activeMembers, payeeUserId]
  )

  useEffect(() => {
    if (contexts.length === 0) {
      setContextId("")
      return
    }

    if (!contexts.some((entry) => entry.id === contextId)) {
      setContextId(contexts[0]?.id ?? "")
    }
  }, [contextId, contexts])

  useEffect(() => {
    if (!contextId || !contextKey || cachedMembers) {
      return
    }

    let isActive = true
    setIsMembersPending(true)

    void getLedgerMembersFn({
      data: { contextType, contextId },
    })
      .then((result) => {
        if (!isActive) {
          return
        }

        setMemberCache((previous) => {
          if (previous[contextKey]) {
            return previous
          }

          return {
            ...previous,
            [contextKey]: result.members,
          }
        })
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        toast.error("Could not load ledger members", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        })
      })
      .finally(() => {
        if (isActive) {
          setIsMembersPending(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [cachedMembers, contextId, contextKey, contextType, getLedgerMembersFn])

  useEffect(() => {
    const nextPayerId = activeMembers.some((entry) => entry.id === payerUserId)
      ? payerUserId
      : activeMembers[0]?.id ?? ""

    if (nextPayerId !== payerUserId) {
      setPayerUserId(nextPayerId)
    }

    const nextPayeeId =
      activeMembers.some((entry) => entry.id === payeeUserId) &&
      payeeUserId !== nextPayerId
        ? payeeUserId
        : activeMembers.find((entry) => entry.id !== nextPayerId)?.id ?? ""

    if (nextPayeeId !== payeeUserId) {
      setPayeeUserId(nextPayeeId)
    }
  }, [activeMembers, payeeUserId, payerUserId])

  const normalizedCurrency = useMemo(() => {
    const cleaned = currency.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 3)
    return cleaned || "INR"
  }, [currency])

  const parsedAmountMinor = useMemo(() => {
    const parsed = Math.round(Number.parseFloat(amount || "0") * 100)
    return Number.isFinite(parsed) ? parsed : 0
  }, [amount])

  const hasEnoughMembers = activeMembers.length >= 2
  const hasDifferentParties =
    payerUserId.length > 0 &&
    payeeUserId.length > 0 &&
    payerUserId !== payeeUserId
  const hasValidAmount = parsedAmountMinor > 0
  const canSubmit =
    contextId.length > 0 && hasEnoughMembers && hasDifferentParties && hasValidAmount

  const amountPreview =
    parsedAmountMinor > 0
      ? `${(parsedAmountMinor / 100).toFixed(2)} ${normalizedCurrency}`
      : `0.00 ${normalizedCurrency}`

  const helperMessage = useMemo(() => {
    if (!contextId) {
      return "Choose a ledger to continue."
    }

    if (isMembersPending) {
      return "Loading members for this ledger."
    }

    if (!hasEnoughMembers) {
      return "At least two members are required to record a settlement."
    }

    if (!hasDifferentParties) {
      return "Payer and payee must be different people."
    }

    if (!hasValidAmount) {
      return "Enter an amount greater than zero."
    }

    return "Ready to record this settlement."
  }, [
    contextId,
    hasDifferentParties,
    hasEnoughMembers,
    hasValidAmount,
    isMembersPending,
  ])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!contextId) {
      toast.error("Select a ledger first")
      return
    }

    if (isMembersPending) {
      toast.error("Members are still loading", {
        description: "Try again in a moment.",
      })
      return
    }

    if (!hasEnoughMembers) {
      toast.error("Need at least two members", {
        description: "Invite another member or choose a different ledger.",
      })
      return
    }

    if (!hasDifferentParties) {
      toast.error("Payer and payee should be different")
      return
    }

    if (!hasValidAmount) {
      toast.error("Settlement amount is invalid", {
        description: "Enter a positive amount to record this payment.",
      })
      return
    }

    setIsPending(true)

    try {
      await createSettlementFn({
        data: {
          contextType,
          contextId,
          payerUserId,
          payeeUserId,
          amountMinor: parsedAmountMinor,
          currency: normalizedCurrency,
          note,
        },
      })

      toast.success("Settlement recorded", {
        description: "Balances were updated from this payment.",
      })

      if (contextType === "group") {
        await navigate({
          to: "/groups/$groupId",
          params: { groupId: contextId },
        })
      } else {
        await navigate({ to: "/friends" })
      }
    } catch (error) {
      toast.error("Could not record settlement", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <DashboardShell
      title="Settle up"
      description="Record real-world payments so balances stay accurate across groups and friend ledgers."
      headerActions={
        <div className="dashboard-pill">
          <HugeiconsIcon
            icon={isMembersPending ? Loading03Icon : CheckmarkCircle02Icon}
            className="mr-1.5 size-3.5"
            strokeWidth={1.7}
          />
          {isMembersPending
            ? "Syncing ledger members"
            : "Settlement logs are server-validated"}
        </div>
      }
    >
      <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" onSubmit={onSubmit}>
        <section className="dashboard-surface space-y-4 sm:space-y-5">
          <div className="rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(26,107,60,0.12),rgba(255,255,255,0.94)_45%,rgba(26,107,60,0.04))] px-3 py-3 sm:px-4">
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              Settlement flow
            </p>
            <p className="mt-1 font-heading text-xl leading-none">
              {activeContextName || "Choose ledger"}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {contextType === "group"
                ? "Group ledger settlement"
                : "Friend ledger settlement"}
              {activeMembers.length > 0
                ? ` • ${activeMembers.length} member${
                    activeMembers.length === 1 ? "" : "s"
                  }`
                : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardSelect
              label="Ledger type"
              value={contextType}
              onValueChange={(value) => {
                const nextType = value as "group" | "friend"
                setContextType(nextType)
                const nextContexts =
                  nextType === "group" ? data.groups : data.friends
                setContextId(nextContexts[0]?.id ?? "")
              }}
              options={[
                {
                  value: "group",
                  label: "Group",
                  disabled: data.groups.length === 0,
                },
                {
                  value: "friend",
                  label: "Friend",
                  disabled: data.friends.length === 0,
                },
              ]}
            />
            <DashboardSelect
              label="Ledger"
              value={contextId}
              onValueChange={setContextId}
              placeholder="Choose a ledger"
              options={contexts.map((entry) => ({
                value: entry.id,
                label: "name" in entry ? entry.name : entry.otherUser.name,
              }))}
              description={
                contextType === "group"
                  ? "Settlement is saved to this group ledger."
                  : "Settlement is saved to this friend ledger."
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardSelect
              label="Payer"
              value={payerUserId}
              onValueChange={setPayerUserId}
              placeholder="Choose payer"
              options={activeMembers.map((entry) => ({
                value: entry.id,
                label: entry.name,
              }))}
            />
            <DashboardSelect
              label="Payee"
              value={payeeUserId}
              onValueChange={setPayeeUserId}
              placeholder="Choose payee"
              options={activeMembers.map((entry) => ({
                value: entry.id,
                label: entry.name,
                disabled: entry.id === payerUserId,
              }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <label className="space-y-1.5 text-sm">
              <span className="dashboard-label">Amount</span>
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="500.00"
                inputMode="decimal"
                className="h-11 rounded-xl border-input/80 bg-background/75 [font-variant-numeric:tabular-nums]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="dashboard-label">Currency</span>
              <Input
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                maxLength={3}
                className="h-11 rounded-xl border-input/80 bg-background/75 font-mono-ui uppercase"
              />
            </label>
          </div>

          <label className="space-y-1.5 text-sm">
            <span className="dashboard-label">Note (optional)</span>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="UPI payment for cab and snacks"
              className="min-h-28 rounded-xl border-input/80 bg-background/75"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Keep notes short so activity logs remain easy to scan.
            </p>
          </label>
        </section>

        <section className="dashboard-surface space-y-3.5 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,244,236,0.86))] px-3 py-3">
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              Review
            </p>
            <p className="mt-1 font-heading text-2xl leading-none [font-variant-numeric:tabular-nums]">
              {amountPreview}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {activeContextName || "No ledger selected"}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="dashboard-list-item">
              <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                From
              </p>
              <p className="mt-1 font-medium">{payerMember?.name ?? "-"}</p>
            </div>
            <div className="dashboard-list-item">
              <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                To
              </p>
              <p className="mt-1 font-medium">{payeeMember?.name ?? "-"}</p>
            </div>
            <div className="dashboard-list-item">
              <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                Ledger type
              </p>
              <p className="mt-1 font-medium capitalize">{contextType}</p>
            </div>
          </div>

          <div
            aria-live="polite"
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-5",
              canSubmit
                ? "border-primary/30 bg-primary/8 text-foreground"
                : "border-border/80 bg-muted/50 text-muted-foreground"
            )}
          >
            <HugeiconsIcon
              icon={canSubmit ? CheckmarkCircle02Icon : AlertCircleIcon}
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={1.8}
            />
            <p>{helperMessage}</p>
          </div>

          <Button
            type="submit"
            disabled={isPending || isMembersPending || !canSubmit}
            className="h-11 w-full gap-2 rounded-xl text-sm"
          >
            <HugeiconsIcon
              icon={isPending ? Loading03Icon : CheckmarkCircle02Icon}
              className="size-4"
              strokeWidth={1.8}
            />
            {isPending ? "Saving settlement..." : "Save settlement"}
          </Button>
        </section>
      </form>
    </DashboardShell>
  )
}
