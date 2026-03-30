import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { ReceiptTextIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { FormEvent, ReactNode } from "react"

import type { ExpenseSplitMethod } from "@/lib/dashboard-server"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  createExpense,
  getComposerData,
  getLedgerMembers,
} from "@/lib/dashboard-server"

export const Route = createFileRoute("/expense/new")({
  loader: () => getComposerData(),
  head: () => ({
    meta: [
      {
        title: "Add Expense | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: CreateExpensePage,
})

type ParticipantState = {
  enabled: boolean
  value: string
}

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

const splitMethodLabels: Record<ExpenseSplitMethod, string> = {
  equal: "Equal",
  exact: "Exact",
  percentage: "Percentage",
  shares: "Shares",
}

function participantStatesEqual(
  previous: Partial<Record<string, ParticipantState>>,
  next: Partial<Record<string, ParticipantState>>
) {
  const previousKeys = Object.keys(previous)
  const nextKeys = Object.keys(next)
  if (previousKeys.length !== nextKeys.length) {
    return false
  }

  for (const key of previousKeys) {
    const previousEntry = previous[key]
    const nextEntry = next[key]
    if (!previousEntry || !nextEntry) {
      return false
    }

    if (
      previousEntry.enabled !== nextEntry.enabled ||
      previousEntry.value !== nextEntry.value
    ) {
      return false
    }
  }

  return true
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
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] leading-none text-muted-foreground">
        {label}
      </Label>
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
    </div>
  )
}

function ComposerModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90svh] rounded-t-3xl border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,236,0.95))]">
          <DrawerHeader className="items-start px-4 pb-2 text-left">
            <DrawerTitle className="text-xl">{title}</DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            {children}
          </div>
          <DrawerFooter className="border-t border-border/70 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)]">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 rounded-3xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,236,0.94))] p-0 shadow-[0_24px_56px_rgba(24,30,23,0.18)]"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="max-h-[62vh] overflow-y-auto px-6 py-4">{children}</div>
        <DialogFooter className="border-t border-border/70 px-6 py-4">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateExpensePage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const createExpenseFn = useServerFn(createExpense)
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
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [splitMethod, setSplitMethod] = useState<ExpenseSplitMethod>("equal")
  const [participants, setParticipants] = useState<
    Partial<Record<string, ParticipantState>>
  >({})
  const [memberCache, setMemberCache] = useState<
    Partial<Record<string, Array<LedgerMember>>>
  >({})
  const [splitSetupOpen, setSplitSetupOpen] = useState(false)
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

  const activeMemberIdsKey = useMemo(
    () => activeMembers.map((entry) => entry.id).join("|"),
    [activeMembers]
  )

  useEffect(() => {
    setParticipants((previous) => {
      const next: Partial<Record<string, ParticipantState>> = {}
      for (const entry of activeMembers) {
        const previousEntry = previous[entry.id]
        next[entry.id] = {
          enabled: previousEntry?.enabled ?? true,
          value: previousEntry?.value ?? "",
        }
      }

      if (participantStatesEqual(previous, next)) {
        return previous
      }

      return next
    })
  }, [activeMemberIdsKey])

  const activeContextName = useMemo(() => {
    const selected = contexts.find((entry) => entry.id === contextId)
    if (!selected) {
      return ""
    }

    return "name" in selected ? selected.name : selected.otherUser.name
  }, [contextId, contexts])

  const enabledMembers = useMemo(
    () => activeMembers.filter((entry) => participants[entry.id]?.enabled),
    [activeMembers, participants]
  )

  const splitSummary = useMemo(() => {
    if (isMembersPending && activeMembers.length === 0) {
      return "Loading members..."
    }

    if (splitMethod === "equal") {
      return `${enabledMembers.length} people`
    }

    const total = enabledMembers.reduce((sum, entry) => {
      const value = Number.parseFloat(participants[entry.id]?.value ?? "0")
      return Number.isFinite(value) ? sum + value : sum
    }, 0)

    if (splitMethod === "percentage") {
      return `${total.toFixed(2)}% entered`
    }

    if (splitMethod === "shares") {
      return `${total.toFixed(2)} shares entered`
    }

    return `${enabledMembers.length} values entered`
  }, [
    activeMembers.length,
    enabledMembers,
    isMembersPending,
    participants,
    splitMethod,
  ])

  const setParticipantEnabled = (userId: string, enabled: boolean) => {
    setParticipants((previous) => ({
      ...previous,
      [userId]: {
        enabled,
        value: previous[userId]?.value ?? "",
      },
    }))
  }

  const setParticipantValue = (userId: string, value: string) => {
    setParticipants((previous) => ({
      ...previous,
      [userId]: {
        enabled: previous[userId]?.enabled ?? true,
        value,
      },
    }))
  }

  const validateSplit = (amountMinor: number) => {
    if (enabledMembers.length === 0) {
      toast.error("Pick participants", {
        description: "At least one participant is required.",
      })
      return false
    }

    if (splitMethod === "equal") {
      return true
    }

    const values = enabledMembers.map((entry) =>
      Number.parseFloat(participants[entry.id]?.value ?? "")
    )
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      toast.error("Split values are incomplete", {
        description: "Enter valid values for selected participants.",
      })
      return false
    }

    if (splitMethod === "exact") {
      const exactTotal = values.reduce(
        (sum, value) => sum + Math.round(value * 100),
        0
      )
      if (exactTotal !== amountMinor) {
        toast.error("Exact split must match amount", {
          description: "Exact values should add up to the expense amount.",
        })
        return false
      }
      return true
    }

    if (splitMethod === "percentage") {
      const percentTotal = values.reduce((sum, value) => sum + value, 0)
      if (Math.abs(percentTotal - 100) > 0.001) {
        toast.error("Percentage split must add up to 100")
        return false
      }
      return true
    }

    const shareTotal = values.reduce((sum, value) => sum + value, 0)
    if (shareTotal <= 0) {
      toast.error("Shares must add up to more than zero")
      return false
    }

    return true
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!contextId) {
      toast.error("Select a group or friend first")
      return
    }

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error("Expense name is required")
      return
    }

    const amountMinor = Math.round(Number.parseFloat(amount || "0") * 100)
    if (Number.isNaN(amountMinor) || amountMinor <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    if (!validateSplit(amountMinor)) {
      return
    }

    const payloadParticipants = enabledMembers.map((entry) => {
      const rawValue = participants[entry.id]?.value ?? ""

      if (splitMethod === "equal") {
        return { userId: entry.id }
      }

      if (splitMethod === "exact") {
        return {
          userId: entry.id,
          value: Math.round(Number.parseFloat(rawValue || "0") * 100),
        }
      }

      return {
        userId: entry.id,
        value: Number.parseFloat(rawValue || "0"),
      }
    })

    setIsPending(true)
    try {
      await createExpenseFn({
        data: {
          contextType,
          contextId,
          title: trimmedTitle,
          totalAmountMinor: amountMinor,
          paidByUserId: data.user.id,
          splitMethod,
          participants: payloadParticipants,
        },
      })

      toast.success("Expense added")
      if (contextType === "group") {
        await navigate({
          to: "/groups/$groupId",
          params: { groupId: contextId },
        })
      } else {
        await navigate({
          to: "/friends/$friendId",
          params: { friendId: contextId },
        })
      }
    } catch (error) {
      toast.error("Could not add expense", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <DashboardShell
      title="Add expense"
      description="Name, amount, ledger, and split."
    >
      <form
        className="dashboard-surface mx-auto w-full max-w-2xl space-y-3.5 sm:space-y-4"
        onSubmit={onSubmit}
      >
        <label className="space-y-1.5">
          <span className="text-[13px] leading-none text-muted-foreground">
            Expense name
          </span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Dinner at Candolim"
            className="h-11 rounded-xl border-input/80 bg-background/75"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-[13px] leading-none text-muted-foreground">
            Amount
          </span>
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="1200.00"
            inputMode="decimal"
            className="h-11 rounded-xl border-input/80 bg-background/75"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
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
            placeholder="Choose ledger"
            options={contexts.map((entry) => ({
              value: entry.id,
              label: "name" in entry ? entry.name : entry.otherUser.name,
            }))}
          />
        </div>

        <DashboardSelect
          label="Split method"
          value={splitMethod}
          onValueChange={(value) => setSplitMethod(value as ExpenseSplitMethod)}
          options={[
            { value: "equal", label: "Equal" },
            { value: "exact", label: "Exact amounts" },
            { value: "percentage", label: "Percentages" },
            { value: "shares", label: "Shares" },
          ]}
        />

        <div className="dashboard-list-item flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {activeContextName || "No ledger selected"}
            </p>
            <p className="text-xs text-muted-foreground">
              {splitMethodLabels[splitMethod]} split - {splitSummary}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-xl"
            onClick={() => setSplitSetupOpen(true)}
            disabled={
              !contextId || activeMembers.length === 0 || isMembersPending
            }
          >
            Configure
          </Button>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-xl text-sm"
        >
          <HugeiconsIcon
            icon={ReceiptTextIcon}
            className="size-4"
            strokeWidth={1.8}
          />
          {isPending ? "Saving..." : "Save expense"}
        </Button>
      </form>

      <ComposerModal
        open={splitSetupOpen}
        onOpenChange={setSplitSetupOpen}
        title="Split participants"
        description="Uncheck people you want to exclude. Add values only for non-equal split."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setSplitSetupOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl"
              onClick={() => setSplitSetupOpen(false)}
            >
              Apply
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          {activeMembers.map((entry) => {
            const enabled = participants[entry.id]?.enabled ?? false
            return (
              <div
                key={entry.id}
                className="dashboard-list-item grid grid-cols-[auto_1fr_auto] items-center gap-2"
              >
                <Checkbox
                  checked={enabled}
                  onCheckedChange={(checked) =>
                    setParticipantEnabled(entry.id, checked === true)
                  }
                  className="size-4"
                />
                <span className="text-sm">{entry.name}</span>
                {splitMethod === "equal" ? null : (
                  <Input
                    value={participants[entry.id]?.value ?? ""}
                    onChange={(event) =>
                      setParticipantValue(entry.id, event.target.value)
                    }
                    inputMode="decimal"
                    placeholder={
                      splitMethod === "exact"
                        ? "0.00"
                        : splitMethod === "percentage"
                          ? "%"
                          : "shares"
                    }
                    className="h-9 w-24 rounded-lg border-input/80 bg-background/80 text-right"
                    disabled={!enabled}
                  />
                )}
              </div>
            )
          })}
        </div>
      </ComposerModal>
    </DashboardShell>
  )
}
