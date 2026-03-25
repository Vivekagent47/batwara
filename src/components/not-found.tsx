import { Link } from "@tanstack/react-router"
import {
  ArrowLeft01Icon,
  Compass01Icon,
  Home01Icon,
  ReceiptTextIcon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const quickLinks = [
  {
    title: "Back to home",
    body: "Return to the main Batwara landing page and start from the core product story.",
    icon: Home01Icon,
    href: "/",
  },
  {
    title: "Explore features",
    body: "Jump straight into the feature section and see what Batwara is built to handle.",
    icon: Search01Icon,
    href: "/#features",
  },
  {
    title: "Read the flow",
    body: "See the three-step usage pattern for trips, homes, and shared expenses.",
    icon: ReceiptTextIcon,
    href: "/#workflow",
  },
]

export function NotFoundPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(26,107,60,0.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(201,142,45,0.14),transparent_24%),radial-gradient(circle_at_62%_78%,rgba(109,115,135,0.14),transparent_22%)]" />

      <section className="relative mx-auto flex min-h-svh w-full max-w-7xl items-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative order-1">
            <div className="glass-panel shadow-batwara relative overflow-hidden rounded-[2.2rem] border border-white/70 p-6 sm:p-8">
              <div className="paper-grid pointer-events-none absolute inset-0 opacity-30" />
              <div className="animate-batwara-pulse absolute -top-12 -right-10 h-36 w-36 rounded-full bg-primary/8 blur-3xl" />
              <div className="animate-batwara-drift absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-[rgba(191,90,54,0.10)] blur-3xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-4 py-2 text-sm text-foreground/75 backdrop-blur">
                  <HugeiconsIcon
                    icon={Compass01Icon}
                    className="size-4 text-primary"
                    strokeWidth={1.5}
                  />
                  Route not found
                </div>

                <div className="mt-6 flex items-end gap-4">
                  <div className="font-heading text-7xl leading-none font-light tracking-[-0.06em] text-primary sm:text-8xl">
                    404
                  </div>
                  <div className="animate-batwara-float rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-right backdrop-blur">
                    <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      Ledger status
                    </p>
                    <p className="font-mono-ui mt-2 text-base text-foreground">
                      missing entry
                    </p>
                  </div>
                </div>

                <h1 className="mt-8 max-w-xl font-heading text-4xl leading-tight text-foreground sm:text-5xl">
                  This page slipped out of the shared ledger.
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                  The link may be outdated, incomplete, or pointing to a route
                  that does not exist yet. Batwara itself is fine. This
                  particular path is not.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <HugeiconsIcon
                      icon={ArrowLeft01Icon}
                      className="size-4"
                      strokeWidth={1.5}
                    />
                    Go home
                  </Link>
                  <a
                    href="/#features"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-white/75 px-6 text-base text-foreground transition-colors hover:bg-white"
                  >
                    Browse features
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="order-2">
            <div className="space-y-4">
              {quickLinks.map(({ title, body, icon, href }) => (
                <a
                  key={title}
                  href={href}
                  className="glass-panel group block rounded-[1.8rem] border border-white/70 p-5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <HugeiconsIcon
                        icon={icon}
                        className="size-5"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">
                          {title}
                        </h2>
                        <HugeiconsIcon
                          icon={SparklesIcon}
                          className="size-4 text-primary/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          strokeWidth={1.5}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {body}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-6 rounded-[1.8rem] border border-border/70 bg-[#1d241e] p-6 text-[#f5f1e8] shadow-[0_18px_42px_rgba(28,28,24,0.08)]">
              <p className="text-xs font-medium tracking-[0.18em] text-[#bfd6c7] uppercase">
                Suggested next step
              </p>
              <h2 className="mt-4 font-heading text-3xl leading-tight text-white">
                Start from the Batwara home route and move back into the product
                flow.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#d6d2c9]">
                If this route should exist, it means we have a broken internal
                link or an unfinished page. If not, the fastest recovery is to
                go back to the landing page and continue from there.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
