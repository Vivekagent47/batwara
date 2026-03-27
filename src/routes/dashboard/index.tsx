import { Link, createFileRoute } from "@tanstack/react-router"
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock03Icon,
  HandHelpingIcon,
  ReceiptTextIcon,
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

  const netMinor = data.summary.netMinor
  const netAmountLabel =
    netMinor === 0
      ? formatMoneyMinor(0)
      : netMinor > 0
        ? formatMoneyMinor(netMinor)
        : formatMoneyMinor(Math.abs(netMinor))
  const netDescriptor =
    netMinor === 0
      ? "You are fully balanced across active ledgers."
      : netMinor > 0
        ? "You are net positive across groups and friends."
        : "You have a net payable balance across active ledgers."

  const totalLedgers = data.groups.length + data.friends.length
  const suggestionPreview = data.suggestions.slice(0, 3)
  const activityPreview = data.activity.slice(0, 4)

  return (
    <DashboardShell
      title={`Welcome back, ${data.user.name.split(" ")[0] || "there"}.`}
      description="Your shared-money snapshot, without the noise."
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
      <section className="dashboard-surface relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-24 bg-[radial-gradient(circle_at_top,rgba(26,107,60,0.16),transparent_70%)]" />
        <div className="relative grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Net position
            </p>
            <p className="mt-2 font-heading text-[2.2rem] leading-none sm:text-[2.6rem]">
              {netAmountLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {netDescriptor}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="dashboard-pill">
                {data.groups.length} group{data.groups.length === 1 ? "" : "s"}
              </span>
              <span className="dashboard-pill">
                {data.friends.length} friend ledger
                {data.friends.length === 1 ? "" : "s"}
              </span>
              <span className="dashboard-pill">{totalLedgers} active ledgers</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-xl border border-border/75 bg-background/90 px-3 py-3">
              <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                You owe
              </p>
              <p className="mt-1.5 font-heading text-2xl leading-none [font-variant-numeric:tabular-nums]">
                {formatMoneyMinor(data.summary.youOweMinor)}
              </p>
            </article>
            <article className="rounded-xl border border-border/75 bg-background/90 px-3 py-3">
              <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                You are owed
              </p>
              <p className="mt-1.5 font-heading text-2xl leading-none [font-variant-numeric:tabular-nums]">
                {formatMoneyMinor(data.summary.youAreOwedMinor)}
              </p>
            </article>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="dashboard-surface">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-xl">Next steps</h2>
            <span className="text-xs text-muted-foreground">Primary actions</span>
          </div>

          <div className="space-y-2">
            <Link
              to="/expense/new"
              className="dashboard-list-item flex min-h-11 items-center justify-between gap-2 text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon
                  icon={ReceiptTextIcon}
                  className="size-4"
                  strokeWidth={1.7}
                />
                Add a new expense
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={1.7}
              />
            </Link>

            <Link
              to="/settle/new"
              className="dashboard-list-item flex min-h-11 items-center justify-between gap-2 text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-4"
                  strokeWidth={1.7}
                />
                Record a settlement
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={1.7}
              />
            </Link>

            <Link
              to="/groups"
              className="dashboard-list-item flex min-h-11 items-center justify-between gap-2 text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon
                  icon={HandHelpingIcon}
                  className="size-4"
                  strokeWidth={1.7}
                />
                Open groups and friend ledgers
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={1.7}
              />
            </Link>
          </div>
        </section>

        <section className="dashboard-surface">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-xl">Settlement suggestions</h2>
            <span className="text-xs text-muted-foreground">
              {data.suggestions.length === 0
                ? "No pending suggestions"
                : `${data.suggestions.length} pending`}
            </span>
          </div>

          <div className="space-y-2">
            {suggestionPreview.length === 0 ? (
              <p className="dashboard-empty">
                You are balanced right now. New settlement suggestions will
                appear here when needed.
              </p>
            ) : (
              suggestionPreview.map((entry) => (
                <div
                  key={`${entry.payerUserId}-${entry.payeeUserId}`}
                  className="dashboard-list-item flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {entry.direction === "pay"
                        ? `Pay ${entry.counterparty.name}`
                        : `Collect from ${entry.counterparty.name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Suggested from netted balances
                    </p>
                  </div>
                  <p className="font-medium [font-variant-numeric:tabular-nums]">
                    {formatMoneyMinor(entry.amountMinor)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="dashboard-surface mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl">Latest activity</h2>
          <Link
            to="/activity"
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/8"
          >
            <HugeiconsIcon icon={Clock03Icon} className="size-3.5" />
            View all
          </Link>
        </div>

        <div className="space-y-2">
          {activityPreview.length === 0 ? (
            <p className="dashboard-empty">
              Activity appears here once you add groups, expenses, or
              settlements.
            </p>
          ) : (
            activityPreview.map((item) => (
              <div
                key={item.id}
                className="dashboard-list-item flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.summary}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.actor.name} · {formatRelativeDate(new Date(item.createdAt))}
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
