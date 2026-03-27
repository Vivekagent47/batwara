import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { FormEvent } from "react"

import type { ExpenseSplitMethod } from "@/lib/dashboard-server"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  deleteExpense,
  getExpenseDetailsData,
  updateExpense,
} from "@/lib/dashboard-server"

export const Route = createFileRoute("/expense/$expenseId/edit")({
  loader: ({ params }) =>
    getExpenseDetailsData({ data: { expenseId: params.expenseId } }),
  head: () => ({
    meta: [
      {
        title: "Edit expense | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: ExpenseEditPage,
})

type ParticipantState = {
  enabled: boolean
  value: string
}

type ExpenseDetailsData = {
  context: {
    type: "group" | "friend"
    id: string
    name: string
  }
  expense: {
    id: string
    title: string
    description: string
    totalAmountMinor: number
    splitMethod: ExpenseSplitMethod
    incurredAt: Date
    paidByUserId: string
    paidByName: string
  }
  members: Array<{
    id: string
    name: string
    email: string
  }>
  splitInput: Array<{
    userId: string
    value?: number
  }>
  participants: Array<{
    userId: string
    owedAmountMinor: number
  }>
  permissions: {
    canEdit: boolean
    canDelete: boolean
  }
}

function toDateInputValue(value: Date) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatInitialSplitValue(
  splitMethod: ExpenseSplitMethod,
  value: number | undefined,
  fallbackOwedMinor: number,
  totalAmountMinor: number
) {
  if (splitMethod === "equal") {
    return ""
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (splitMethod === "exact") {
      return (value / 100).toFixed(2)
    }

    return String(value)
  }

  if (splitMethod === "exact") {
    return (fallbackOwedMinor / 100).toFixed(2)
  }

  if (splitMethod === "percentage") {
    if (totalAmountMinor <= 0) {
      return "0"
    }

    return ((fallbackOwedMinor / totalAmountMinor) * 100).toFixed(2)
  }

  return (fallbackOwedMinor / 100).toFixed(2)
}

function buildInitialParticipantState(data: ExpenseDetailsData) {
  const splitInputMap = new Map<string, number | undefined>(
    data.splitInput.map((entry) => [entry.userId, entry.value])
  )
  const includedIds = new Set<string>(
    data.splitInput.length > 0
      ? data.splitInput.map((entry) => entry.userId)
      : data.participants.map((entry) => entry.userId)
  )
  const participantRows = new Map<string, (typeof data.participants)[number]>(
    data.participants.map((entry) => [entry.userId, entry])
  )

  const next: Partial<Record<string, ParticipantState>> = {}

  for (const member of data.members) {
    const enabled = includedIds.has(member.id)
    const participant = participantRows.get(member.id)

    next[member.id] = {
      enabled,
      value: enabled
        ? formatInitialSplitValue(
            data.expense.splitMethod,
            splitInputMap.get(member.id),
            participant?.owedAmountMinor ?? 0,
            data.expense.totalAmountMinor
          )
        : "",
    }
  }

  return next
}

function ExpenseEditPage() {
  const data: ExpenseDetailsData = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const updateExpenseFn = useServerFn(updateExpense)
  const deleteExpenseFn = useServerFn(deleteExpense)

  const [title, setTitle] = useState(data.expense.title)
  const [description, setDescription] = useState(data.expense.description)
  const [amount, setAmount] = useState(
    (data.expense.totalAmountMinor / 100).toFixed(2)
  )
  const [paidByUserId, setPaidByUserId] = useState(data.expense.paidByUserId)
  const [splitMethod, setSplitMethod] = useState<ExpenseSplitMethod>(
    data.expense.splitMethod
  )
  const [incurredDate, setIncurredDate] = useState(
    toDateInputValue(data.expense.incurredAt)
  )
  const [participants, setParticipants] = useState<
    Partial<Record<string, ParticipantState>>
  >(() => buildInitialParticipantState(data))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setTitle(data.expense.title)
    setDescription(data.expense.description)
    setAmount((data.expense.totalAmountMinor / 100).toFixed(2))
    setPaidByUserId(data.expense.paidByUserId)
    setSplitMethod(data.expense.splitMethod)
    setIncurredDate(toDateInputValue(data.expense.incurredAt))
    setParticipants(buildInitialParticipantState(data))
  }, [data])

  const enabledMembers = useMemo(
    () => data.members.filter((entry) => participants[entry.id]?.enabled),
    [data.members, participants]
  )

  const splitSummary = useMemo(() => {
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
  }, [enabledMembers, participants, splitMethod])

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

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

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

    if (!paidByUserId) {
      toast.error("Choose who paid")
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

    const incurredAtIso = incurredDate
      ? new Date(`${incurredDate}T00:00:00`).toISOString()
      : undefined

    setIsSaving(true)
    try {
      await updateExpenseFn({
        data: {
          expenseId: data.expense.id,
          title: trimmedTitle,
          description: description.trim(),
          totalAmountMinor: amountMinor,
          paidByUserId,
          splitMethod,
          participants: payloadParticipants,
          incurredAt: incurredAtIso,
        },
      })

      toast.success("Expense updated")
      await router.invalidate()
      await navigate({
        to: "/expense/$expenseId",
        params: { expenseId: data.expense.id },
      })
    } catch (error) {
      toast.error("Could not update expense", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async () => {
    const shouldDelete = window.confirm(
      `Delete "${data.expense.title}"? This cannot be undone.`
    )

    if (!shouldDelete) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteExpenseFn({ data: { expenseId: data.expense.id } })
      toast.success("Expense deleted")

      if (data.context.type === "group") {
        await navigate({
          to: "/groups/$groupId",
          params: { groupId: data.context.id },
        })
      } else {
        await navigate({ to: "/friends" })
      }
    } catch (error) {
      toast.error("Could not delete expense", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const paidByLabel =
    data.members.find((entry) => entry.id === paidByUserId)?.name ??
    data.expense.paidByName

  return (
    <DashboardShell
      title="Edit expense"
      description={data.expense.title}
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            to="/expense/$expenseId"
            params={{ expenseId: data.expense.id }}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm hover:bg-muted/60"
          >
            Back
          </Link>
          {data.permissions.canDelete ? (
            <Button
              type="button"
              variant="destructive"
              className="h-10 rounded-xl"
              disabled={isDeleting}
              onClick={() => void onDelete()}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>
      }
    >
      {data.permissions.canEdit ? (
        <section className="dashboard-surface mx-auto w-full max-w-3xl space-y-3.5">
          <form className="space-y-3.5" onSubmit={onSave}>
            <label className="space-y-1.5">
              <span className="text-[13px] leading-none text-muted-foreground">
                Expense name
              </span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-xl border-input/80 bg-background/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[13px] leading-none text-muted-foreground">
                Description (optional)
              </span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-24 rounded-xl border-input/80 bg-background/80"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-[13px] leading-none text-muted-foreground">
                  Amount
                </span>
                <Input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="h-11 rounded-xl border-input/80 bg-background/80"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[13px] leading-none text-muted-foreground">
                  Date
                </span>
                <Input
                  type="date"
                  value={incurredDate}
                  onChange={(event) => setIncurredDate(event.target.value)}
                  className="h-11 rounded-xl border-input/80 bg-background/80"
                />
              </label>

              <div className="space-y-1.5">
                <Label className="text-[13px] leading-none text-muted-foreground">
                  Paid by
                </Label>
                <Select
                  value={paidByUserId}
                  onValueChange={(nextValue) => setPaidByUserId(nextValue ?? "")}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-input/80 bg-background/80">
                    <SelectValue placeholder="Choose payer">{paidByLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" sideOffset={6}>
                    {data.members.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] leading-none text-muted-foreground">
                Split method
              </Label>
              <Select
                value={splitMethod}
                onValueChange={(nextValue) =>
                  setSplitMethod(nextValue as ExpenseSplitMethod)
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-input/80 bg-background/80">
                  <SelectValue placeholder="Choose split method">{splitMethod}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start" sideOffset={6}>
                  <SelectItem value="equal">Equal</SelectItem>
                  <SelectItem value="exact">Exact</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="shares">Shares</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <section className="space-y-2 rounded-2xl border border-border/70 bg-background/75 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">
                  Split participants
                </h3>
                <p className="text-xs text-muted-foreground">{splitSummary}</p>
              </div>
              <div className="space-y-2">
                {data.members.map((entry) => {
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
            </section>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="submit" className="h-10 rounded-xl" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </section>
      ) : (
        <section className="dashboard-surface mx-auto w-full max-w-3xl">
          <p className="text-sm text-muted-foreground">
            You don't have permission to edit this expense.
          </p>
        </section>
      )}
    </DashboardShell>
  )
}
