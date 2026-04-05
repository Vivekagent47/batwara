import {
  Link,
  Outlet,
  createFileRoute,
  useMatchRoute,
} from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { ArrowRight01Icon, Settings01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  formatMoneyMinor,
  getBalanceToneByDirection,
} from "@/lib/dashboard-format"
import {
  getGroupDetailsData,
  getGroupExpensesPage,
} from "@/lib/dashboard-server"

const actionBaseClass =
  "inline-flex size-9 items-center justify-center rounded-xl border text-center transition-colors"
const actionSecondaryClass = `${actionBaseClass} border-border bg-background hover:bg-muted/60`

export const Route = createFileRoute("/groups/$groupId")({
  loader: ({ params }) =>
    getGroupDetailsData({ data: { groupId: params.groupId } }),
  head: () => ({
    meta: [
      {
        title: "Group Ledger | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: GroupDetailsPage,
})

function GroupDetailsPage() {
  const data = Route.useLoaderData()
  const getGroupExpensesPageFn = useServerFn(getGroupExpensesPage)
  const [expenses, setExpenses] = useState(data.recentExpenses)
  const [hasMoreExpenses, setHasMoreExpenses] = useState(
    data.recentExpensesHasMore
  )
  const [isLoadingMoreExpenses, setIsLoadingMoreExpenses] = useState(false)
  const settlementPreview = data.transfers.slice(0, 2)
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null)
  const matchRoute = useMatchRoute()
  const isSettingsRoute = Boolean(
    matchRoute({
      to: "/groups/$groupId/settings",
      params: { groupId: data.group.id },
    })
  )

  useEffect(() => {
    setExpenses(data.recentExpenses)
    setHasMoreExpenses(data.recentExpensesHasMore)
    setIsLoadingMoreExpenses(false)
  }, [data.recentExpenses, data.recentExpensesHasMore])

  const loadMoreExpenses = useCallback(async () => {
    if (isLoadingMoreExpenses || !hasMoreExpenses) {
      return
    }

    setIsLoadingMoreExpenses(true)
    try {
      const result = await getGroupExpensesPageFn({
        data: {
          groupId: data.group.id,
          offset: expenses.length,
        },
      })

      setExpenses((previous) => [...previous, ...result.expenses])
      setHasMoreExpenses(result.hasMore)
    } catch (error) {
      toast.error("Could not load more expenses", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsLoadingMoreExpenses(false)
    }
  }, [
    data.group.id,
    expenses.length,
    getGroupExpensesPageFn,
    hasMoreExpenses,
    isLoadingMoreExpenses,
  ])

  useEffect(() => {
    const anchor = loadMoreAnchorRef.current
    if (!anchor || !hasMoreExpenses) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreExpenses()
        }
      },
      { rootMargin: "220px 0px" }
    )

    observer.observe(anchor)
    return () => observer.disconnect()
  }, [hasMoreExpenses, loadMoreExpenses])

  if (isSettingsRoute) {
    return <Outlet />
  }

  return (
    <DashboardShell
      title={data.group.name}
      truncateTitle
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            to="/groups/$groupId/settings"
            params={{ groupId: data.group.id }}
            className={actionSecondaryClass}
            aria-label="Edit group details"
            title="Edit group details"
          >
            <HugeiconsIcon
              icon={Settings01Icon}
              className="size-4"
              strokeWidth={1.7}
            />
          </Link>
        </div>
      }
    >
      <section className="dashboard-surface">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-pill">{data.members.length} members</span>
          <span className="dashboard-pill">
            {expenses.length} expense{expenses.length === 1 ? "" : "s"}
          </span>
          <span className="dashboard-pill">
            {data.transfers.length === 0
              ? "Balanced right now"
              : `${data.transfers.length} payment suggestion${data.transfers.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {data.transfers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Everyone is currently balanced. Add an expense to keep the ledger
            updated.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {settlementPreview.map((entry) => (
              <div
                key={`${entry.payerUserId}-${entry.payeeUserId}`}
                className="dashboard-list-item flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{entry.payerName}</span> pays{" "}
                    <span className="font-medium">{entry.payeeName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Batwara will settle this pair across their oldest shared
                    balances first.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {formatMoneyMinor(entry.amountMinor)}
                  </p>
                  {entry.payerUserId === data.user.id ||
                  entry.payeeUserId === data.user.id ? (
                    <Link
                      to="/settle/new"
                      search={{
                        counterpartyUserId:
                          entry.payerUserId === data.user.id
                            ? entry.payeeUserId
                            : entry.payerUserId,
                        payerUserId: entry.payerUserId,
                        payeeUserId: entry.payeeUserId,
                        amountMinor: entry.amountMinor,
                        sourceGroupId: data.group.id,
                      }}
                      className="inline-flex h-9 items-center rounded-xl border border-border bg-background px-3 text-xs font-medium hover:bg-muted/60"
                    >
                      Settle
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border/80 bg-background/95 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-xl">Recent expenses</h2>
          <Link
            to="/activity"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            Activity
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-3.5"
              strokeWidth={1.7}
            />
          </Link>
        </div>
        <div className="space-y-2">
          {expenses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
              Add the first expense in this group to start the ledger.
            </p>
          ) : (
            expenses.map((entry) => {
              const incurred = new Date(entry.incurredAt)
              const monthLabel = incurred.toLocaleDateString(undefined, {
                month: "short",
              })
              const dayLabel = incurred.getDate()

              return (
                <Link
                  key={entry.id}
                  to="/expense/$expenseId"
                  params={{ expenseId: entry.id }}
                  className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border/70 bg-background/75 px-2.5 py-2 transition-colors hover:bg-muted/45"
                >
                  <div className="text-center leading-none">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {monthLabel}
                    </p>
                    <p className="mt-0.5 font-heading text-base">{dayLabel}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm leading-tight font-medium text-foreground">
                      {entry.title}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {entry.paidByName} paid
                    </p>
                  </div>
                  <div className="text-right leading-tight">
                    {entry.expenseImpact ? (
                      <div className="text-right leading-tight">
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {entry.expenseImpact.direction === "pay"
                            ? "You owe"
                            : "You get"}
                        </p>
                        <p
                          className={`mt-0.5 text-sm font-medium ${getBalanceToneByDirection(entry.expenseImpact.direction)}`}
                        >
                          {formatMoneyMinor(entry.expenseImpact.amountMinor)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Balanced</p>
                    )}
                  </div>
                </Link>
              )
            })
          )}

          {isLoadingMoreExpenses ? (
            <p className="py-1 text-center text-xs text-muted-foreground">
              Loading more...
            </p>
          ) : null}

          <div ref={loadMoreAnchorRef} className="h-1" />

          {!hasMoreExpenses && expenses.length > 0 ? (
            <p className="py-1 text-center text-xs text-muted-foreground">
              End of expenses
            </p>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  )
}
