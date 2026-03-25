import { Link, createFileRoute } from "@tanstack/react-router"
import {
  Clock03Icon,
  LegalHammerIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { requireAuthSession } from "@/lib/auth-guards"

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    await requireAuthSession()
  },
  head: () => ({
    meta: [
      {
        title: "Dashboard | Batwara",
      },
      {
        name: "description",
        content:
          "Batwara dashboard is currently in progress. Core shared expense workflows are being built.",
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
  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="paper-grid absolute inset-0 opacity-[0.12]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(26,107,60,0.09),transparent_58%)]" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(204,184,150,0.24),transparent_70%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl items-center justify-center">
        <section className="glass-panel w-full max-w-3xl rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(245,239,230,0.97))] p-7 shadow-[0_24px_56px_rgba(28,28,24,0.08)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/82 px-4 py-2 text-xs font-medium tracking-[0.14em] text-foreground/80 uppercase">
            <HugeiconsIcon
              icon={LegalHammerIcon}
              className="size-3.5 text-primary"
              strokeWidth={1.5}
            />
            Work in progress
          </div>

          <h1 className="mt-5 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
            Dashboard is under construction.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
            Batwara auth is live and the core dashboard experience is being
            implemented next. Group creation, expense logging, balances, and
            settlement workflows are coming soon.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.1rem] border border-border/70 bg-white/80 px-4 py-3">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Status
              </p>
              <p className="mt-2 text-sm text-foreground">Auth integrated</p>
            </div>
            <div className="rounded-[1.1rem] border border-border/70 bg-white/80 px-4 py-3">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Next
              </p>
              <p className="mt-2 text-sm text-foreground">Groups + expenses</p>
            </div>
            <div className="rounded-[1.1rem] border border-border/70 bg-white/80 px-4 py-3">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                ETA
              </p>
              <p className="mt-2 text-sm text-foreground">In active build</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex h-12 items-center justify-center rounded-[1rem] bg-primary px-5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/92"
            >
              Back to home
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-[1rem] border border-border bg-white/82 px-5 text-base text-foreground transition-colors hover:bg-white"
            >
              Switch account
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Clock03Icon} className="size-4" strokeWidth={1.5} />
            <HugeiconsIcon
              icon={SparklesIcon}
              className="size-4 text-primary"
              strokeWidth={1.5}
            />
            Fresh updates are being pushed continuously.
          </div>
        </section>
      </div>
    </main>
  )
}
