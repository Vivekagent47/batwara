import { Link, createFileRoute } from "@tanstack/react-router"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { settlementsDisabledMessage } from "@/lib/feature-flags-shared"

export const Route = createFileRoute("/settle/new")({
  head: () => ({
    meta: [
      {
        title: "Settle Up | Batwara",
      },
      {
        name: "robots",
        content: "noindex,nofollow",
      },
    ],
  }),
  component: SettleDisabledPage,
})

function SettleDisabledPage() {
  return (
    <DashboardShell title="Settle up">
      <section className="dashboard-surface mx-auto w-full max-w-2xl">
        <p className="text-sm text-muted-foreground">{settlementsDisabledMessage}</p>
        <div className="mt-3">
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm hover:bg-muted/60"
          >
            Back to home
          </Link>
        </div>
      </section>
    </DashboardShell>
  )
}
