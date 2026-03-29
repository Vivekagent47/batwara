import { Link, createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  formatMoneyMinor,
  formatRelativeDate,
  getBalanceToneByDirection,
} from "@/lib/dashboard-format"
import { getFriendDetailsData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/friends/$friendId")({
  loader: ({ params }) =>
    getFriendDetailsData({ data: { friendId: params.friendId } }),
  head: () => ({
    meta: [
      {
        title: "Friend Ledger | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: FriendDetailsPage,
})

function FriendDetailsPage() {
  const data = Route.useLoaderData()
  const params = Route.useParams()
  const getFriendDetailsDataFn = useServerFn(getFriendDetailsData)
  const [expenses, setExpenses] = useState(data.expenses)
  const [hasMoreExpenses, setHasMoreExpenses] = useState(data.hasMore)
  const [isLoadingMoreExpenses, setIsLoadingMoreExpenses] = useState(false)
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setExpenses(data.expenses)
    setHasMoreExpenses(data.hasMore)
    setIsLoadingMoreExpenses(false)
  }, [data.expenses, data.hasMore])

  const loadMoreExpenses = useCallback(async () => {
    if (isLoadingMoreExpenses || !hasMoreExpenses) {
      return
    }

    setIsLoadingMoreExpenses(true)
    try {
      const result = await getFriendDetailsDataFn({
        data: {
          friendId: data.friend.id,
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
    data.friend.id,
    expenses.length,
    getFriendDetailsDataFn,
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

  return (
    <DashboardShell
      title={data.friend.name}
      truncateTitle
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            to="/settle/new"
            search={{
              counterpartyUserId: data.friend.id,
              sourceFriendId: params.friendId,
            }}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted/55"
          >
            Settle up
          </Link>
          <Link
            to="/friends"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted/55"
          >
            Back
          </Link>
        </div>
      }
    >
      <section className="dashboard-surface">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-pill">{data.friend.email}</span>
          <span className="dashboard-pill">
            {expenses.length} expense{expenses.length === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border/80 bg-background/95 p-4">
        <h2 className="font-heading text-xl">Between you two</h2>

        <div className="mt-3 space-y-2">
          {expenses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
              No shared expenses between you and {data.friend.name} yet.
            </p>
          ) : (
            expenses.map((entry) => (
              <Link
                key={entry.id}
                to="/expense/$expenseId"
                params={{ expenseId: entry.id }}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-background/75 px-3 py-2.5 transition-colors hover:bg-muted/45"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.title}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {entry.paidByName} paid ·{" "}
                    {formatRelativeDate(new Date(entry.incurredAt))}
                  </p>
                  <span className="mt-1 inline-flex max-w-full rounded-lg border border-border/70 bg-background/85 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {entry.contextName}
                  </span>
                </div>

                <div className="flex min-w-20 flex-col items-end justify-center text-right leading-tight">
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {entry.pairImpact.direction === "pay" ? "You owe" : "You get"}
                  </p>
                  <p
                    className={`mt-0.5 text-sm font-medium ${getBalanceToneByDirection(entry.pairImpact.direction)}`}
                  >
                    {formatMoneyMinor(entry.pairImpact.amountMinor)}
                  </p>
                </div>
              </Link>
            ))
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
