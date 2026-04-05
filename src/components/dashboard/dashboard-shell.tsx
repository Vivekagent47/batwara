import { Link, useRouterState } from "@tanstack/react-router"
import {
  Clock03Icon,
  HandHelpingIcon,
  PackageIcon,
  ReceiptTextIcon,
  SecurityCheckIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { ReactNode } from "react"

import { BrandMark } from "@/components/brand-mark"
import { cn } from "@/lib/utils"

type DashboardShellProps = {
  title: string
  description?: string
  children: ReactNode
  headerActions?: ReactNode
  truncateTitle?: boolean
}

const desktopLinks = [
  {
    to: "/dashboard",
    label: "Home",
    icon: PackageIcon,
    matchPrefix: "/dashboard",
  },
  {
    to: "/groups",
    label: "Groups",
    icon: HandHelpingIcon,
    matchPrefix: "/groups",
  },
  {
    to: "/friends",
    label: "Friends",
    icon: UserMultipleIcon,
    matchPrefix: "/friends",
  },
  {
    to: "/activity",
    label: "Activity",
    icon: Clock03Icon,
    matchPrefix: "/activity",
  },
  {
    to: "/account",
    label: "Account",
    icon: SecurityCheckIcon,
    matchPrefix: "/account",
  },
] as const

const mobileLinks = [
  {
    to: "/dashboard",
    label: "Home",
    icon: PackageIcon,
    matchPrefix: "/dashboard",
  },
  {
    to: "/groups",
    label: "Groups",
    icon: HandHelpingIcon,
    matchPrefix: "/groups",
  },
  {
    to: "/friends",
    label: "Friends",
    icon: UserMultipleIcon,
    matchPrefix: "/friends",
  },
  {
    to: "/activity",
    label: "Activity",
    icon: Clock03Icon,
    matchPrefix: "/activity",
  },
  {
    to: "/account",
    label: "Account",
    icon: SecurityCheckIcon,
    matchPrefix: "/account",
  },
] as const

export function DashboardShell({
  title,
  description,
  children,
  headerActions,
  truncateTitle = false,
}: DashboardShellProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const showQuickAdd =
    !pathname.startsWith("/expense/new") && !pathname.startsWith("/settle/new")

  return (
    <main className="relative min-h-svh px-2 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:px-3 md:px-6 md:pb-8 lg:px-8">
      <div className="paper-grid absolute inset-0 opacity-[0.12]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(26,107,60,0.12),transparent_58%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl gap-6 pt-2 sm:pt-3 md:pt-8">
        <aside className="sticky top-6 hidden h-[calc(100svh-4rem)] w-64 shrink-0 rounded-3xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,244,236,0.86))] p-5 shadow-sm backdrop-blur md:flex md:flex-col">
          <div className="mb-5 rounded-2xl border border-border/80 bg-background/90 px-3 py-3">
            <BrandMark
              size="sm"
              iconContainerClassName="rounded-2xl bg-primary/12 text-primary shadow-none"
              labelClassName="text-lg"
              strokeWidth={1.6}
            />
            <p className="mt-3 text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Workspace
            </p>
            <p className="mt-1 font-heading text-xl leading-none text-foreground">
              Dashboard
            </p>
          </div>
          <nav className="space-y-2">
            {desktopLinks.map((entry) => {
              const active =
                pathname === entry.to || pathname.startsWith(entry.matchPrefix)
              return (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-primary/30 bg-primary/12 text-foreground"
                      : "text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={entry.icon}
                    className="size-4"
                    strokeWidth={1.6}
                  />
                  <span>{entry.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="dashboard-pill mt-auto block rounded-2xl px-3 py-3 leading-5">
            Cross-group balances are server-computed and shared in one place.
          </div>
        </aside>

        <section className="min-w-0 flex-1 rounded-3xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,244,236,0.82))] p-3 shadow-[0_16px_36px_rgba(28,28,24,0.08)] backdrop-blur sm:p-5 md:p-6">
          <header className="mb-4 border-b border-border/70 pb-3 sm:mb-5 sm:pb-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1
                  className={cn(
                    "font-heading text-[1.85rem] leading-tight text-foreground sm:text-[2rem]",
                    truncateTitle ? "truncate" : ""
                  )}
                >
                  {title}
                </h1>
              </div>

              {headerActions ? (
                <div className="shrink-0 self-start">{headerActions}</div>
              ) : null}
            </div>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </header>

          {children}
        </section>
      </div>

      {showQuickAdd ? (
        <Link
          to="/expense/new"
          className="fixed right-1/2 bottom-20 z-30 inline-flex h-14 w-14 translate-x-1/2 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-[0_20px_40px_rgba(26,107,60,0.35)] transition-transform hover:scale-[1.03] active:scale-95 md:hidden"
          aria-label="Add expense"
        >
          <HugeiconsIcon
            icon={ReceiptTextIcon}
            className="size-6"
            strokeWidth={1.8}
          />
        </Link>
      ) : null}

      <nav className="fixed inset-x-1.5 bottom-[max(0.4rem,env(safe-area-inset-bottom))] z-20 grid grid-cols-5 rounded-2xl border border-border/70 bg-white/92 p-1.5 shadow-lg backdrop-blur md:hidden">
        {mobileLinks.map((entry) => {
          const active =
            pathname === entry.to || pathname.startsWith(entry.matchPrefix)
          return (
            <Link
              key={entry.to}
              to={entry.to}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium",
                active
                  ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_rgba(26,107,60,0.2)]"
                  : "text-muted-foreground"
              )}
            >
              <HugeiconsIcon
                icon={entry.icon}
                className="size-4"
                strokeWidth={1.8}
              />
              <span>{entry.label}</span>
            </Link>
          )
        })}
      </nav>
    </main>
  )
}
