import { Link, createFileRoute } from "@tanstack/react-router"
import {
  ArrowRight01Icon,
  BookOpenTextIcon,
  BrainIcon,
  CheckmarkCircle02Icon,
  GithubIcon,
  Globe02Icon,
  HandHelpingIcon,
  HelpCircleIcon,
  PackageIcon,
  ReceiptTextIcon,
  Search01Icon,
  SecurityCheckIcon,
  SparklesIcon,
  WalletCardsIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { HeroSceneFallback } from "@/components/landing/hero-scene-fallback"
import { getLandingPageAuthState } from "@/lib/auth-session"
import {
  createFaqSchema,
  createOrganizationSchema,
  createSoftwareApplicationSchema,
} from "@/lib/seo"
import { createAbsoluteUrl, siteConfig } from "@/lib/site-config"

const highlights = [
  {
    title: "Split bills with clarity",
    body: "Batwara is a shared expense tracker that shows who paid, who owes, and how to settle with fewer awkward follow-ups.",
    icon: WalletCardsIcon,
  },
  {
    title: "Built for real group spending",
    body: "Use it as a trip expense tracker, roommate expense tracker, or group expense app for shared homes, couples, and ongoing plans.",
    icon: ReceiptTextIcon,
  },
  {
    title: "Open source and transparent",
    body: "Batwara is designed as an open-source alternative to closed expense tools, so teams can inspect the logic, understand the product direction, and contribute in public.",
    icon: GithubIcon,
  },
]

const featureRows = [
  {
    eyebrow: "Features",
    title: "An expense splitting app that explains the math",
    body: "Batwara is an open-source expense splitting app with a ledger-style interface. It handles shared expenses clearly, so users can understand balances instead of trusting a black box.",
    items: [
      "Track group expenses without spreadsheet overhead",
      "Handle equal, exact, percentage, and share-based splits",
      "See suggested settlements with fewer payments",
      "Review recent activity across trips, homes, and ongoing shared costs",
    ],
  },
  {
    eyebrow: "Why it ranks",
    title: "Built for search intent, not just visual polish",
    body: "The homepage explains what Batwara is, who it serves, and how it differs from spreadsheets and closed tools. That makes it easier for both search engines and AI engines to cite it correctly.",
    items: [
      "Clear entity definition for shared expense tracking",
      "Direct language for split bills, roommates, trips, and couples",
      "Open-source positioning without hiding the product value",
      "Citation-friendly FAQ content for AI Overviews and assistants",
    ],
  },
]

const workflow = [
  {
    step: "01",
    title: "Create a group",
    body: "Start a trip, home, roommate, or couple space and invite everyone into the same shared expense tracker.",
  },
  {
    step: "02",
    title: "Add the expense",
    body: "Log dinner, fuel, rent, groceries, tickets, or utilities and choose the split method that matches what actually happened.",
  },
  {
    step: "03",
    title: "Settle with less friction",
    body: "Batwara calculates balances and suggests the fewest payments needed to settle the group cleanly.",
  },
]

const useCases = [
  {
    title: "Trips and travel",
    body: "Use Batwara as a trip expense tracker for hotels, taxis, meals, tickets, and every shared spend that appears during group travel.",
  },
  {
    title: "Roommates and shared homes",
    body: "Track rent splits, groceries, internet, electricity, and recurring apartment costs with a roommate expense tracker that keeps everyone on the same page.",
  },
  {
    title: "Couples and recurring plans",
    body: "Manage ongoing shared expenses with a simple split bills app that works for everyday spending, subscriptions, and monthly routines.",
  },
]

const comparisonPoints = [
  "Batwara is easier to audit than a spreadsheet and easier to own than a closed SaaS expense app.",
  "It is being built as an open-source alternative to Splitwise-style tools, while keeping category-first messaging for broad search demand.",
  "Transparent split logic and a single full-stack codebase make it a better fit for users who care about clarity and control.",
]

const proofPoints = [
  "Single-repo TanStack Start architecture using server functions instead of a separate backend.",
  "Planned Better Auth, Drizzle ORM, PostgreSQL, and Zod for a clean full-stack foundation.",
  "Transparent balance and settlement logic so users can inspect how amounts are derived.",
]

const heroStats = [
  { label: "Split types", value: "4 supported" },
  { label: "Best use cases", value: "Trips, roommates, couples" },
  { label: "Model", value: "Open source and transparent" },
]

const faqItems = [
  {
    question: "What is Batwara?",
    answer:
      "Batwara is an open-source expense splitting app and shared expense tracker for trips, roommates, couples, and group expenses. It helps users track who paid, who owes, and how to settle balances clearly.",
  },
  {
    question: "Is Batwara open source?",
    answer:
      "Yes. Batwara is being built as an open-source expense splitting app so teams can inspect the logic, follow the product direction, and contribute in public.",
  },
  {
    question: "Is Batwara a Splitwise alternative?",
    answer:
      "Yes. Batwara is intended to be an open-source alternative to Splitwise-style expense apps, while focusing on transparent calculations and a calm group-first interface.",
  },
  {
    question: "Can Batwara split bills for roommates?",
    answer:
      "Yes. Batwara is designed to work as a roommate expense tracker for rent, groceries, utilities, subscriptions, and other shared home costs.",
  },
  {
    question: "Can Batwara track trip expenses?",
    answer:
      "Yes. Batwara works as a trip expense tracker for travel groups, helping users capture meals, fuel, stays, tickets, and day-to-day group spending during a trip.",
  },
  {
    question: "Can Batwara handle unequal splits?",
    answer:
      "Yes. Batwara is designed to support equal, exact, percentage-based, and share-based expense splits so the split method can match the real situation.",
  },
  {
    question: "Can Batwara be self-hosted?",
    answer:
      "Not right now. Batwara is still early, and the current focus is on building the core product experience in public before making deployment promises.",
  },
]

const socialImageUrl = createAbsoluteUrl(siteConfig.socialImagePath)
const homeUrl = createAbsoluteUrl("/")

export const Route = createFileRoute("/")({
  ssr: true,
  loader: () => getLandingPageAuthState(),
  head: () => ({
    meta: [
      {
        title: "Open-source expense splitting app for groups | Batwara",
      },
      {
        name: "description",
        content:
          "Batwara is an open-source expense splitting app for trips, roommates, couples, and shared life. Track group expenses, split bills, and settle balances with fewer payments.",
      },
      {
        property: "og:title",
        content: "Open-source expense splitting app for groups | Batwara",
      },
      {
        property: "og:description",
        content: siteConfig.description,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: homeUrl,
      },
      {
        property: "og:image",
        content: socialImageUrl,
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "Open-source expense splitting app for groups | Batwara",
      },
      {
        name: "twitter:description",
        content: siteConfig.description,
      },
      {
        name: "twitter:image",
        content: socialImageUrl,
      },
      {
        name: "robots",
        content:
          "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
      },
      {
        "script:ld+json": createOrganizationSchema(),
      },
      {
        "script:ld+json": createSoftwareApplicationSchema(),
      },
      {
        "script:ld+json": createFaqSchema(faqItems),
      },
    ],
    links: [
      {
        rel: "canonical",
        href: homeUrl,
      },
    ],
  }),
  component: LandingPage,
})

function LandingPage() {
  const { isAuthenticated } = Route.useLoaderData()

  return (
    <main className="relative overflow-hidden">
      <section className="relative mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 pt-5 pb-16 sm:px-8 lg:px-10">
        <header className="glass-panel shadow-batwara sticky top-4 z-30 mx-auto mb-12 flex w-full max-w-6xl items-center justify-between rounded-full border border-white/60 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-3 text-sm font-medium tracking-[0.12em] text-foreground/90 uppercase"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <HugeiconsIcon icon={BookOpenTextIcon} className="size-4" />
            </span>
            <span className="font-heading text-xl tracking-normal normal-case">
              Batwara
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#use-cases"
              className="transition-colors hover:text-foreground"
            >
              Use cases
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden rounded-full border border-border bg-white/70 px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-white md:inline-flex"
            >
              View on GitHub
            </a>
            <a
              href="#features"
              className="hidden h-10 items-center gap-2 rounded-full border border-border bg-white/75 px-5 text-sm font-medium text-foreground transition-colors hover:bg-white sm:inline-flex"
            >
              Explore
            </a>
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isAuthenticated ? "Go to dashboard" : "Log in"}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={1.5}
              />
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
          <div className="relative z-10 max-w-2xl lg:max-w-xl">
            <div className="animate-batwara-float inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-4 py-2 text-sm text-foreground/75 shadow-[0_8px_24px_rgba(26,107,60,0.08)] backdrop-blur">
              <HugeiconsIcon
                icon={SparklesIcon}
                className="size-4 text-primary"
                strokeWidth={1.5}
              />
              Open-source split bills app for groups and shared life
            </div>

            <h1 className="mt-8 max-w-3xl font-heading text-5xl leading-[0.94] font-light tracking-[-0.03em] text-foreground sm:text-6xl lg:text-7xl">
              Open-source expense splitting app for trips, roommates, couples,
              and group expenses.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Batwara is a shared expense tracker and split bills app that helps
              people track group expenses, understand balances, and settle with
              fewer payments. It is being built for users who want clarity,
              better UX, and open-source control.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={isAuthenticated ? "/dashboard" : "/login"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {isAuthenticated ? "Go to dashboard" : "Log in"}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-4"
                  strokeWidth={1.5}
                />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-white/75 px-6 text-base text-foreground transition-colors hover:bg-white"
              >
                Explore the product
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass-panel rounded-3xl border border-white/70 px-4 py-4 shadow-[0_14px_30px_rgba(28,28,24,0.06)]"
                >
                  <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {stat.label}
                  </p>
                  <p className="font-mono-ui mt-2 text-lg text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[28rem] sm:min-h-[31rem] lg:min-h-[38rem]">
            <div className="animate-batwara-drift absolute top-5 left-4 z-10 rounded-[1.7rem] border border-white/75 bg-white/84 px-4 py-3 shadow-[0_16px_40px_rgba(28,28,24,0.08)] backdrop-blur sm:left-6 lg:-left-4">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Shared expense tracker
              </p>
              <p className="mt-2 font-heading text-3xl leading-none text-primary">
                split, track, settle
              </p>
            </div>

            <div className="absolute inset-0 rounded-[2rem] border border-white/60 bg-white/30 p-3 shadow-[0_24px_70px_rgba(26,107,60,0.14)] lg:translate-y-2">
              <HeroSceneFallback />
            </div>

            <div className="animate-batwara-float absolute right-6 bottom-5 z-10 hidden w-60 rounded-[1.75rem] border border-white/75 bg-[#f7f2e8]/90 p-4 shadow-[0_18px_42px_rgba(28,28,24,0.1)] backdrop-blur lg:block">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Search-ready use cases
              </p>
              <div className="mt-4 space-y-3 text-sm text-foreground">
                <p>Trips and travel groups</p>
                <p>Roommates and shared homes</p>
                <p>Couples and recurring expenses</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,241,232,0.94))] p-7 shadow-[0_20px_44px_rgba(28,28,24,0.06)]">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            What is Batwara?
          </p>
          <h2 className="mt-4 font-heading text-3xl leading-tight text-foreground sm:text-4xl">
            Batwara is an open-source expense splitting app and shared expense
            tracker for group spending.
          </h2>
          <p className="mt-5 max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base">
            People use Batwara to split bills, track shared expenses, and settle
            balances across trips, homes, roommate setups, couples, and
            recurring group costs. The goal is to make shared money easier to
            understand, easier to trust, and easier to act on.
          </p>
        </div>
      </section>

      <section
        id="features"
        className="content-visibility-auto scroll-mt-28 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {highlights.map(({ icon, title, body }) => (
            <article
              key={title}
              className="glass-panel rounded-[1.75rem] border border-white/70 p-6 shadow-[0_18px_40px_rgba(28,28,24,0.06)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.5} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-foreground">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-20 grid gap-8 lg:grid-cols-2">
          {featureRows.map((row) => (
            <article
              key={row.title}
              className="rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(246,241,232,0.9))] p-7 shadow-[0_20px_44px_rgba(28,28,24,0.06)]"
            >
              <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                {row.eyebrow}
              </p>
              <h3 className="mt-4 font-heading text-3xl leading-tight text-foreground">
                {row.title}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                {row.body}
              </p>
              <div className="mt-8 space-y-3">
                {row.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/60 px-4 py-3"
                  >
                    <HugeiconsIcon
                      icon={SecurityCheckIcon}
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm leading-6 text-foreground/85">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="use-cases"
        className="content-visibility-auto scroll-mt-28 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Use cases
          </p>
          <h2 className="mt-4 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
            Built for the ways people actually share expenses.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {useCases.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.9rem] border border-border/70 bg-white/70 p-6 shadow-[0_18px_38px_rgba(28,28,24,0.05)]"
            >
              <h3 className="text-2xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="workflow"
        className="content-visibility-auto scroll-mt-28 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Workflow
          </p>
          <h2 className="mt-4 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
            A simple flow from “who paid?” to “we’re settled.”
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {workflow.map((item) => (
            <article
              key={item.step}
              className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[#f8f4eb]/90 p-6 shadow-[0_18px_40px_rgba(28,28,24,0.05)]"
            >
              <div className="animate-batwara-pulse absolute -top-8 -right-8 h-28 w-28 rounded-full bg-primary/8 blur-2xl" />
              <p className="font-mono-ui text-sm text-primary">{item.step}</p>
              <h3 className="mt-4 text-2xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-visibility-auto mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-8 rounded-[2.2rem] border border-border/70 bg-[#1d241e] px-6 py-8 text-[#f5f1e8] sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-12">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-[#bfd6c7] uppercase">
              Why it exists
            </p>
            <h2 className="mt-4 font-heading text-4xl leading-tight text-white sm:text-5xl">
              More trust, less awkward math.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#d6d2c9]">
              Most expense apps either feel cold and corporate or overloaded
              with startup polish. Batwara is aiming for something more
              grounded: a shared expense tracker with transparent logic, calmer
              UX, and a structure that users can understand at a glance.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <HugeiconsIcon
                icon={BrainIcon}
                className="size-5 text-[#9ad0ae]"
                strokeWidth={1.5}
              />
              <h3 className="mt-4 text-lg font-semibold text-white">
                Settlement logic
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#d6d2c9]">
                Transparent debt simplification reduces the number of payments a
                group needs to make.
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <HugeiconsIcon
                icon={HandHelpingIcon}
                className="size-5 text-[#f0bf8d]"
                strokeWidth={1.5}
              />
              <h3 className="mt-4 text-lg font-semibold text-white">
                Human-first UX
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#d6d2c9]">
                Built for tired users who need the right answer quickly, not
                more admin.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-visibility-auto mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,241,232,0.94))] p-7 shadow-[0_20px_44px_rgba(28,28,24,0.06)]">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Comparison
            </p>
            <h2 className="mt-4 font-heading text-3xl leading-tight text-foreground">
              Why Batwara instead of spreadsheets or closed expense apps?
            </h2>
            <div className="mt-6 space-y-3">
              {comparisonPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="mt-1 size-4 shrink-0 text-primary"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm leading-7 text-muted-foreground">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-border/70 bg-white/70 p-7 shadow-[0_20px_44px_rgba(28,28,24,0.06)]">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Trust signals
            </p>
            <h2 className="mt-4 font-heading text-3xl leading-tight text-foreground">
              Batwara is being structured for long-term control.
            </h2>
            <div className="mt-6 space-y-3">
              {proofPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-white/70 bg-[#f8f4eb]/75 px-4 py-3"
                >
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm leading-6 text-foreground/85">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section
        id="open-source"
        className="content-visibility-auto scroll-mt-28 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Open source
            </p>
            <h2 className="mt-4 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
              Built in the open, with a transparent product direction.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
              Batwara is being built as an open-source alternative to closed
              expense trackers. The goal is a codebase people can inspect,
              understand, and improve without fighting a fragmented
              architecture.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={siteConfig.githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex rounded-full border border-border bg-white/75 px-4 py-2 text-sm text-foreground/85 transition-colors hover:bg-white"
              >
                View repository
              </a>
              <span className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm text-foreground/85">
                Open-source product direction
              </span>
              <span className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm text-foreground/85">
                Single-repo full-stack setup
              </span>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-[0_20px_48px_rgba(28,28,24,0.06)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-border/70 bg-white/70 p-5">
                <HugeiconsIcon
                  icon={PackageIcon}
                  className="size-5 text-primary"
                  strokeWidth={1.5}
                />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Single project
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  TanStack Start handles UI, routing, and server functions in
                  one repo.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-border/70 bg-white/70 p-5">
                <HugeiconsIcon
                  icon={Globe02Icon}
                  className="size-5 text-primary"
                  strokeWidth={1.5}
                />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Built in public
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Public code, visible product direction, and a single codebase
                  make it easier to follow and contribute.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {proofPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-white/70 bg-[#f8f4eb]/70 px-4 py-3"
                >
                  <HugeiconsIcon
                    icon={GithubIcon}
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm leading-6 text-foreground/85">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="content-visibility-auto scroll-mt-28 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            FAQ
          </p>
          <h2 className="mt-4 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
            Questions people ask when they search for split bills apps and
            shared expense trackers.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {faqItems.map((item) => (
            <article
              key={item.question}
              className="rounded-[1.8rem] border border-border/70 bg-white/75 p-6 shadow-[0_18px_38px_rgba(28,28,24,0.05)]"
            >
              <div className="flex items-start gap-3">
                <HugeiconsIcon
                  icon={HelpCircleIcon}
                  className="mt-1 size-5 shrink-0 text-primary"
                  strokeWidth={1.5}
                />
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {item.question}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.answer}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="cta"
        className="content-visibility-auto scroll-mt-28 mx-auto max-w-7xl px-5 pt-8 pb-20 sm:px-8 lg:px-10"
      >
        <div className="grid gap-8 rounded-[2.1rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(244,239,228,0.95))] px-6 py-8 shadow-[0_20px_48px_rgba(28,28,24,0.07)] sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Ready when the group chat gets confusing
            </p>
            <h2 className="mt-4 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
              Batwara is built for shared life, not spreadsheet people.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
              Use it for trips, homes, flatmates, couples, and ongoing shared
              costs. The goal is simple: capture what happened, show the truth
              clearly, and make settling up feel lighter.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-3">
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isAuthenticated ? "Go to dashboard" : "Log in"}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4"
                strokeWidth={1.5}
              />
            </Link>
            <a
              href="#workflow"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-white/75 px-6 text-base text-foreground transition-colors hover:bg-white"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 pb-12 text-sm text-muted-foreground sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <HugeiconsIcon icon={BookOpenTextIcon} className="size-4" />
          </span>
          <div>
            <p className="font-heading text-xl text-foreground">Batwara</p>
            <p>
              Open-source expense splitting for groups, trips, roommates, and
              shared life.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#use-cases"
            className="transition-colors hover:text-foreground"
          >
            Use cases
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
        </div>
      </footer>
    </main>
  )
}
