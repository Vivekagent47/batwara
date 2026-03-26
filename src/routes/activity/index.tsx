import { createFileRoute } from "@tanstack/react-router"
import { Clock03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { formatRelativeDate } from "@/lib/dashboard-format"
import { getActivityPageData } from "@/lib/dashboard-server"

export const Route = createFileRoute("/activity/")({
  loader: async () => getActivityPageData(),
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

  return (
    <DashboardShell
      title="Activity"
      description="A merged timeline of groups, friend ledgers, expenses, and settlements."
      headerActions={
        <div className="inline-flex items-center rounded-xl border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
          <HugeiconsIcon
            icon={Clock03Icon}
            className="mr-1.5 size-3.5"
            strokeWidth={1.7}
          />
          {data.activity.length} recent events
        </div>
      }
    >
      <section className="rounded-2xl border border-border/80 bg-background/95 p-4">
        {data.activity.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
            Activity is empty. Start by creating a group or adding your first
            expense.
          </p>
        ) : (
          <div className="space-y-2">
            {data.activity.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-border/70 px-3 py-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {entry.summary}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.actor.name} ·{" "}
                  {formatRelativeDate(new Date(entry.createdAt))}
                </p>
                <div className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-1 text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  {entry.entityType} · {entry.action}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  )
}
