import { Link, createFileRoute } from "@tanstack/react-router"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { formatMoneyMinor, formatRelativeDate } from "@/lib/dashboard-format"
import { getActivityPageData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/activity/")({
  loader: () => getActivityPageData(),
  head: () => ({
    meta: [
      {
        title: "Activity | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: ActivityPage,
})

function ActivityPage() {
  const data = Route.useLoaderData()

  const getActivityBadge = (entry: (typeof data.activity)[number]) => {
    if (entry.expenseImpact) {
      return {
        label:
          entry.expenseImpact.direction === "pay"
            ? `You owe ${formatMoneyMinor(entry.expenseImpact.amountMinor)}`
            : `You are owed ${formatMoneyMinor(entry.expenseImpact.amountMinor)}`,
        tone:
          entry.expenseImpact.direction === "pay"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-primary/30 bg-primary/10 text-primary",
      }
    }

    if (entry.entityType === "settlement") {
      return {
        label: "Settlement",
        tone: "border-border bg-muted/70 text-muted-foreground",
      }
    }

    if (entry.entityType === "expense" && entry.action === "deleted") {
      return {
        label: "Deleted expense",
        tone: "border-border bg-muted/70 text-muted-foreground",
      }
    }

    if (entry.entityType === "group_member" && entry.action === "left") {
      return {
        label: "Member left",
        tone: "border-border bg-muted/70 text-muted-foreground",
      }
    }

    if (entry.entityType === "group" && entry.action === "created") {
      return {
        label: "New group",
        tone: "border-border bg-muted/70 text-muted-foreground",
      }
    }

    if (entry.entityType === "friend_link" && entry.action === "created") {
      return {
        label: "New friend",
        tone: "border-border bg-muted/70 text-muted-foreground",
      }
    }

    return {
      label: "Activity",
      tone: "border-border bg-muted/70 text-muted-foreground",
    }
  }

  return (
    <DashboardShell title="Activity">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-border/80 bg-background/95 p-3.5 sm:p-4">
        {data.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activity yet. Add an expense to get started.
          </p>
        ) : (
          <div className="space-y-2.5">
            {data.activity.map((entry) => {
              const badge = getActivityBadge(entry)

              return entry.entityType === "expense" && entry.action !== "deleted" ? (
                <Link
                  key={entry.id}
                  to="/expense/$expenseId"
                  params={{ expenseId: entry.entityId }}
                  className="dashboard-list-item block transition-shadow hover:shadow-[0_8px_18px_rgba(17,24,39,0.06)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-medium text-foreground">
                      {entry.summary}
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium [font-variant-numeric:tabular-nums] ${badge.tone}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {entry.actor.name} ·{" "}
                    {formatRelativeDate(new Date(entry.createdAt))}
                  </p>
                </Link>
              ) : (
                <article key={entry.id} className="dashboard-list-item">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-medium text-foreground">
                      {entry.summary}
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${badge.tone}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {entry.actor.name} ·{" "}
                    {formatRelativeDate(new Date(entry.createdAt))}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  )
}
