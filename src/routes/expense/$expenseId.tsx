import {
  Link,
  Outlet,
  createFileRoute,
  useMatchRoute,
  useNavigate,
} from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useState } from "react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import {
  formatMoneyMinor,
  formatRelativeDate,
  getBalanceToneByNetMinor,
} from "@/lib/dashboard-format"
import { deleteExpense, getExpenseDetailsData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/expense/$expenseId")({
  loader: ({ params }) =>
    getExpenseDetailsData({ data: { expenseId: params.expenseId } }),
  head: () => ({
    meta: [
      {
        title: "Expense details | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: ExpenseDetailsPage,
})

function ExpenseDetailsPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const deleteExpenseFn = useServerFn(deleteExpense)
  const [isDeleting, setIsDeleting] = useState(false)

  const isEditRoute = Boolean(
    matchRoute({
      to: "/expense/$expenseId/edit",
      params: { expenseId: data.expense.id },
    })
  )

  if (isEditRoute) {
    return <Outlet />
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

  return (
    <DashboardShell
      title={data.expense.title}
      truncateTitle
      description={`Ledger: ${data.context.name}`}
      headerActions={
        <div className="flex items-center gap-2">
          {data.context.type === "group" ? (
            <Link
              to="/groups/$groupId"
              params={{ groupId: data.context.id }}
              className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm hover:bg-muted/60"
            >
              Back
            </Link>
          ) : (
            <Link
              to="/friends"
              className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm hover:bg-muted/60"
            >
              Back
            </Link>
          )}
          <Link
            to="/expense/$expenseId/edit"
            params={{ expenseId: data.expense.id }}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm hover:bg-muted/60"
          >
            Edit
          </Link>
          <Button
            type="button"
            variant="destructive"
            className="h-10 rounded-xl"
            disabled={isDeleting}
            onClick={() => void onDelete()}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      }
    >
      <section className="dashboard-surface mx-auto w-full max-w-3xl">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="mt-1 text-lg font-medium">
              {formatMoneyMinor(data.expense.totalAmountMinor)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid by</p>
            <p className="mt-1 text-sm font-medium">{data.expense.paidByName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Split</p>
            <p className="mt-1 text-sm font-medium capitalize">
              {data.expense.splitMethod}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="mt-1 text-sm font-medium">
              {formatRelativeDate(new Date(data.expense.incurredAt))}
            </p>
          </div>
        </div>

        {data.expense.description ? (
          <p className="mt-4 text-sm text-muted-foreground">{data.expense.description}</p>
        ) : null}

        <div className="mt-4">
          <h2 className="font-heading text-xl">Participants</h2>
          <div className="mt-2 divide-y divide-border/70">
            {data.participants.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Paid {formatMoneyMinor(entry.paidAmountMinor)} · Owes{" "}
                    {formatMoneyMinor(entry.owedAmountMinor)}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-xs font-medium ${getBalanceToneByNetMinor(
                    entry.netMinor
                  )}`}
                >
                  {entry.netMinor > 0
                    ? `Gets ${formatMoneyMinor(entry.netMinor)}`
                    : entry.netMinor < 0
                      ? `Owes ${formatMoneyMinor(Math.abs(entry.netMinor))}`
                      : "Settled"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DashboardShell>
  )
}
