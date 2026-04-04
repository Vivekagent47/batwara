import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { ReceiptTextIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { FormEvent } from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ExpenseComposerModal } from "@/components/expense/expense-composer-modal"
import { ExpenseSelectField } from "@/components/expense/expense-select-field"
import { SplitParticipantsEditor } from "@/components/expense/split-participants-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createExpense,
  getComposerData,
  getLedgerMembers,
} from "@/lib/dashboard-server"
import type { ExpenseSplitMethod } from "@/lib/dashboard-server/types"
import {
  buildParticipantPayload,
  getSplitSummary,
  getSplitValidationError,
  participantStatesEqual,
  splitMethodLabels,
  type ParticipantState,
} from "@/lib/expense-form"

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

type LedgerMember = {
  id: string
  name: string
  email: string
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

  const splitSummary = useMemo(
    () =>
      getSplitSummary({
        splitMethod,
        enabledMembers,
        participants,
        isMembersPending,
        activeMembersCount: activeMembers.length,
      }),
    [activeMembers.length, enabledMembers, isMembersPending, participants, splitMethod]
  )

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

    const splitValidationError = getSplitValidationError({
      splitMethod,
      enabledMembers,
      participants,
      amountMinor,
    })
    if (splitValidationError) {
      toast.error(splitValidationError.title, {
        description: splitValidationError.description,
      })
      return
    }

    const payloadParticipants = buildParticipantPayload({
      splitMethod,
      enabledMembers,
      participants,
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
          <ExpenseSelectField
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

          <ExpenseSelectField
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

        <ExpenseSelectField
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

      <ExpenseComposerModal
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
        <SplitParticipantsEditor
          members={activeMembers}
          participants={participants}
          splitMethod={splitMethod}
          onEnabledChange={setParticipantEnabled}
          onValueChange={setParticipantValue}
        />
      </ExpenseComposerModal>
    </DashboardShell>
  )
}
