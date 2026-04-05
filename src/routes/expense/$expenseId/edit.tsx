import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { FormEvent } from "react"

import type { ExpenseSplitMethod } from "@/lib/dashboard-server/types"
import type { ParticipantState } from "@/lib/expense-form"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SplitParticipantsEditor } from "@/components/expense/split-participants-editor"
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
import { formatDateAsDayInput } from "@/lib/date-only"
import {
  deleteExpense,
  getExpenseDetailsData,
  updateExpense,
} from "@/lib/dashboard-server"
import {
  buildInitialParticipantState,
  buildParticipantPayload,
  getSplitSummary,
  getSplitValidationError,
} from "@/lib/expense-form"

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
  const [incurredDate, setIncurredDate] = useState(() =>
    formatDateAsDayInput(data.expense.incurredAt)
  )
  const [participants, setParticipants] = useState<
    Partial<Record<string, ParticipantState>>
  >(() =>
    buildInitialParticipantState({
      members: data.members,
      splitInput: data.splitInput,
      participants: data.participants,
      splitMethod: data.expense.splitMethod,
      totalAmountMinor: data.expense.totalAmountMinor,
    })
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setTitle(data.expense.title)
    setDescription(data.expense.description)
    setAmount((data.expense.totalAmountMinor / 100).toFixed(2))
    setPaidByUserId(data.expense.paidByUserId)
    setSplitMethod(data.expense.splitMethod)
    setIncurredDate(formatDateAsDayInput(data.expense.incurredAt))
    setParticipants(
      buildInitialParticipantState({
        members: data.members,
        splitInput: data.splitInput,
        participants: data.participants,
        splitMethod: data.expense.splitMethod,
        totalAmountMinor: data.expense.totalAmountMinor,
      })
    )
  }, [data])

  const enabledMembers = useMemo(
    () => data.members.filter((entry) => participants[entry.id]?.enabled),
    [data.members, participants]
  )

  const splitSummary = useMemo(
    () =>
      getSplitSummary({
        splitMethod,
        enabledMembers,
        participants,
      }),
    [enabledMembers, participants, splitMethod]
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
          incurredAt: incurredDate || undefined,
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
        await navigate({
          to: "/friends/$friendId",
          params: { friendId: data.context.id },
        })
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
  const backTarget =
    data.context.type === "group"
      ? {
          to: "/expense/$expenseId" as const,
          params: { expenseId: data.expense.id },
        }
      : {
          to: "/friends/$friendId" as const,
          params: { friendId: data.context.id },
        }

  return (
    <DashboardShell
      title="Edit expense"
      description={data.expense.title}
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            to={backTarget.to}
            params={backTarget.params}
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
                  onValueChange={(nextValue) =>
                    setPaidByUserId(nextValue ?? "")
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-input/80 bg-background/80">
                    <SelectValue placeholder="Choose payer">
                      {paidByLabel}
                    </SelectValue>
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
                  <SelectValue placeholder="Choose split method">
                    {splitMethod}
                  </SelectValue>
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
              <SplitParticipantsEditor
                members={data.members}
                participants={participants}
                splitMethod={splitMethod}
                onEnabledChange={setParticipantEnabled}
                onValueChange={setParticipantValue}
              />
            </section>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="submit"
                className="h-10 rounded-xl"
                disabled={isSaving}
              >
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
