import { Link, createFileRoute } from "@tanstack/react-router"
import {
  ArrowRight01Icon,
  ReceiptTextIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  formatMoneyMinor,
  formatRelativeDate,
  getBalanceToneByNetMinor,
} from "@/lib/dashboard-format"
import { getDashboardHomeData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/dashboard/")({
  loader: () => getDashboardHomeData(),
  head: () => ({
    meta: [
      {
        title: "Dashboard | Batwara",
      },
      {
        name: "description",
        content:
          "Track balances, groups, and friend ledgers from one calm Batwara dashboard.",
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
  const netToneClass = getBalanceToneByNetMinor(netMinor)
  const netStatusLabel =
    netMinor === 0 ? "Balanced" : netMinor > 0 ? "Receivable" : "Payable"

  const totalLedgers = data.groups.length + data.friends.length
  const activityPreview = data.activity.slice(0, 4)
  const hasPendingInvites = data.pendingInvitationCount > 0

  return (
    <DashboardShell
      title="Home"
      headerActions={
        <div className="flex items-center gap-2">
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
        </div>
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <section className="dashboard-surface">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Net balance
            </p>
            <span className={`text-xs font-medium ${netToneClass}`}>
              {netStatusLabel}
            </span>
          </div>
          <p className={`mt-2 font-heading text-[2.3rem] leading-none ${netToneClass}`}>
            {netAmountLabel}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">You owe </span>
              <span className="balance-owe font-medium [font-variant-numeric:tabular-nums]">
                {formatMoneyMinor(data.summary.youOweMinor)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">You are owed </span>
              <span className="balance-owed font-medium [font-variant-numeric:tabular-nums]">
                {formatMoneyMinor(data.summary.youAreOwedMinor)}
              </span>
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{data.groups.length} group{data.groups.length === 1 ? "" : "s"}</span>
            <span>{data.friends.length} friend ledger{data.friends.length === 1 ? "" : "s"}</span>
            <span>{totalLedgers} active ledgers</span>
          </div>
          {hasPendingInvites ? (
            <Link
              to="/account"
              hash="group-invitations"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              {data.pendingInvitationCount} pending invitation
              {data.pendingInvitationCount === 1 ? "" : "s"}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-3.5"
                strokeWidth={1.7}
              />
            </Link>
          ) : null}
        </section>

        <section className="dashboard-surface">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-heading text-xl">Recent activity</h2>
            <Link
              to="/activity"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              View all
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-3.5"
                strokeWidth={1.7}
              />
            </Link>
          </div>

          {activityPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Activity appears here once you add expenses.
            </p>
          ) : (
            <div className="divide-y divide-border/70">
              {activityPreview.map((item) =>
                item.entityType === "expense" && item.action !== "deleted" ? (
                  <Link
                    key={item.id}
                    to="/expense/$expenseId"
                    params={{ expenseId: item.entityId }}
                    className="block py-2.5 first:pt-0 last:pb-0"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {item.summary}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.actor.name} ·{" "}
                      {formatRelativeDate(new Date(item.createdAt))}
                    </p>
                  </Link>
                ) : (
                  <div key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.summary}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.actor.name} ·{" "}
                      {formatRelativeDate(new Date(item.createdAt))}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}
