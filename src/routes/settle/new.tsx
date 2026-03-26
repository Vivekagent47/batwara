import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useState } from "react"
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
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: Array<FormSelectOption>
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="dashboard-label">{label}</Label>
      <Select
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
      >
        <SelectTrigger className="h-11 w-full rounded-xl border-input/80 bg-background/75">
          <SelectValue placeholder={placeholder} />
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

  useEffect(() => {
    if (contexts.length === 0) {
      setContextId("")
      return
    }

    if (!contexts.some((entry) => entry.id === contextId)) {
      setContextId(contexts[0].id)
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
    if (!activeMembers.some((entry) => entry.id === payerUserId)) {
      setPayerUserId(activeMembers[0]?.id ?? "")
    }

    if (!activeMembers.some((entry) => entry.id === payeeUserId)) {
      const fallback =
        activeMembers.find((entry) => entry.id !== payerUserId)?.id ?? ""
      setPayeeUserId(fallback)
    }
  }, [activeMembers, payeeUserId, payerUserId])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPending(true)

    const parsedAmount = Math.round(Number.parseFloat(amount || "0") * 100)
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Settlement amount is invalid", {
        description: "Enter a positive amount to record this payment.",
      })
      setIsPending(false)
      return
    }

    try {
      await createSettlementFn({
        data: {
          contextType,
          contextId,
          payerUserId,
          payeeUserId,
          amountMinor: parsedAmount,
          currency,
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
            icon={CheckmarkCircle02Icon}
            className="mr-1.5 size-3.5"
            strokeWidth={1.7}
          />
          Settlement logs are server-validated
        </div>
      }
    >
      <form
        className="grid gap-4 xl:grid-cols-[1fr_0.75fr]"
        onSubmit={onSubmit}
      >
        <section className="dashboard-surface space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardSelect
              label="Ledger type"
              value={contextType}
              onValueChange={(value) =>
                setContextType(value as "group" | "friend")
              }
              options={[
                { value: "group", label: "Group" },
                { value: "friend", label: "Friend" },
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

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="dashboard-label">Amount</span>
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="500.00"
                inputMode="decimal"
                className="h-11 rounded-xl border-input/80 bg-background/75"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="dashboard-label">Currency</span>
              <Input
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value.toUpperCase())
                }
                maxLength={3}
                className="h-11 rounded-xl border-input/80 bg-background/75 uppercase"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="dashboard-label">Note (optional)</span>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="UPI payment for cab and snacks"
              className="min-h-28 rounded-xl border-input/80 bg-background/75"
            />
          </label>
        </section>

        <section className="dashboard-surface">
          <h2 className="font-heading text-xl">Review</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div className="dashboard-list-item">
              <p className="text-xs text-muted-foreground uppercase">From</p>
              <p className="mt-1">
                {activeMembers.find((entry) => entry.id === payerUserId)
                  ?.name ?? "-"}
              </p>
            </div>
            <div className="dashboard-list-item">
              <p className="text-xs text-muted-foreground uppercase">To</p>
              <p className="mt-1">
                {activeMembers.find((entry) => entry.id === payeeUserId)
                  ?.name ?? "-"}
              </p>
            </div>
            <div className="dashboard-list-item">
              <p className="text-xs text-muted-foreground uppercase">Amount</p>
              <p className="mt-1">
                {amount || "0.00"} {currency}
              </p>
            </div>
          </div>
          <Button
            type="submit"
            disabled={isPending || isMembersPending}
            className="mt-4 h-11 w-full gap-2 rounded-xl text-sm"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
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
