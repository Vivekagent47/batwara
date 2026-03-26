import { Link, createFileRoute } from "@tanstack/react-router"
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock03Icon,
  HandHelpingIcon,
  ReceiptTextIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { formatMoneyMinor, formatRelativeDate } from "@/lib/dashboard-format"
import { getDashboardHomeData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/dashboard/")({
  loader: async () => getDashboardHomeData(),
  head: () => ({
    meta: [
      {
        title: "Dashboard | Batwara",
      },
      {
        name: "description",
        content:
          "Track balances, settlements, groups, and friend ledgers from one calm Batwara dashboard.",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: DashboardPage,
})

function DashboardPage() {
  const data = Route.useLoaderData()
  const netLabel =
    data.summary.netMinor >= 0
      ? `${formatMoneyMinor(data.summary.netMinor)} net positive`
      : `${formatMoneyMinor(Math.abs(data.summary.netMinor))} net payable`

  return (
    <DashboardShell
      title={`Welcome back, ${data.user.name.split(" ")[0] || "there"}.`}
      description="One place for shared balances across groups and direct friend ledgers."
      headerActions={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/expense/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <HugeiconsIcon
              icon={ReceiptTextIcon}
              className="size-4"
              strokeWidth={1.7}
            />
            Add expense
          </Link>
          <Link
            to="/settle/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="size-4"
              strokeWidth={1.7}
            />
            Settle up
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <article className="dashboard-surface">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            You owe
          </p>
          <p className="mt-2 font-heading text-2xl">
            {formatMoneyMinor(data.summary.youOweMinor)}
          </p>
        </article>
        <article className="dashboard-surface">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            You are owed
          </p>
          <p className="mt-2 font-heading text-2xl">
            {formatMoneyMinor(data.summary.youAreOwedMinor)}
          </p>
        </article>
        <article className="dashboard-surface">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Net
          </p>
          <p className="mt-2 font-heading text-2xl">{netLabel}</p>
        </article>
        <article className="dashboard-surface">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Active ledgers
          </p>
          <p className="mt-2 font-heading text-2xl">
            {data.groups.length + data.friends.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.groups.length} groups · {data.friends.length} friends
          </p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="dashboard-surface">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-xl">Settlement suggestions</h2>
            <span className="text-xs text-muted-foreground">
              Cross-group netting
            </span>
          </div>
          <div className="space-y-2">
            {data.suggestions.length === 0 ? (
              <p className="dashboard-empty">
                No pending cross-ledger suggestions. You are balanced for now.
              </p>
            ) : (
              data.suggestions.map((entry) => (
                <div
                  key={`${entry.payerUserId}-${entry.payeeUserId}`}
                  className="dashboard-list-item flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {entry.direction === "pay"
                        ? `Pay ${entry.counterparty.name}`
                        : `Collect from ${entry.counterparty.name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pairwise net across all your active ledgers
                    </p>
                  </div>
                  <p className="font-medium text-foreground">
                    {formatMoneyMinor(entry.amountMinor)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="dashboard-surface">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-xl">Quick access</h2>
            <HugeiconsIcon
              icon={SparklesIcon}
              className="size-4 text-primary"
              strokeWidth={1.6}
            />
          </div>
          <div className="space-y-2">
            <Link
              to="/groups"
              className="dashboard-list-item flex items-center justify-between text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon
                  icon={HandHelpingIcon}
                  className="size-4"
                  strokeWidth={1.7}
                />
                Open groups
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={1.7}
              />
            </Link>
            <Link
              to="/friends"
              className="dashboard-list-item flex items-center justify-between text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon
                  icon={HandHelpingIcon}
                  className="size-4"
                  strokeWidth={1.7}
                />
                Open friend ledgers
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={1.7}
              />
            </Link>
            <Link
              to="/activity"
              className="dashboard-list-item flex items-center justify-between text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon
                  icon={Clock03Icon}
                  className="size-4"
                  strokeWidth={1.7}
                />
                Recent activity
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={1.7}
              />
            </Link>
          </div>
        </section>
      </div>

      <section className="dashboard-surface mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl">Latest activity</h2>
          <Link
            to="/activity"
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {data.activity.length === 0 ? (
            <p className="dashboard-empty">
              Activity appears here once you add groups, expenses, or
              settlements.
            </p>
          ) : (
            data.activity.map((item) => (
              <div
                key={item.id}
                className="dashboard-list-item flex items-start justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.summary}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.actor.name} ·{" "}
                    {formatRelativeDate(new Date(item.createdAt))}
                  </p>
                </div>
                <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                  {item.entityType}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </DashboardShell>
  )
}
