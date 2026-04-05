import { Link, createFileRoute } from "@tanstack/react-router"
import {
  CheckmarkCircle02Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BrandMark } from "@/components/brand-mark"
import { createAbsoluteUrl, siteConfig } from "@/lib/site-config"

const effectiveDate = "April 5, 2026"
const lastUpdated = "April 5, 2026"

const summaryPoints = [
  "Batwara collects the information needed to create accounts, keep people signed in, and run shared expense ledgers.",
  "Shared expense, settlement, group, and invitation data is visible to the other people involved in those shared records.",
  "Batwara uses essential session cookies and one optional interface-preference cookie. It does not use advertising cookies today.",
  "Batwara does not process payment cards or bank accounts today. It records who paid whom, not the payment rail itself.",
  "Batwara does not sell personal information or share it for cross-context behavioral advertising.",
]

const quickFacts = [
  {
    label: "Core product data",
    value: "Accounts, groups, expenses, settlements, activity",
  },
  {
    label: "Cookies today",
    value: "Essential auth cookies and one sidebar preference cookie",
  },
  {
    label: "Payments today",
    value: "No card or bank processing",
  },
  {
    label: "Open-source boundary",
    value: "Hosted Batwara only; self-hosters control their own deployments",
  },
]

const contents = [
  { id: "scope", label: "What this policy covers" },
  { id: "collect", label: "What Batwara collects" },
  { id: "sources", label: "How data reaches Batwara" },
  { id: "use", label: "How Batwara uses data" },
  { id: "cookies", label: "Cookies and similar technologies" },
  { id: "sharing", label: "Who can access or receive data" },
  { id: "retention", label: "How long data is kept" },
  { id: "rights", label: "Your rights and choices" },
  { id: "security", label: "Security and international transfers" },
  { id: "children", label: "Children" },
  { id: "open-source", label: "Open-source and GitHub boundary" },
  { id: "contact", label: "Contact and policy updates" },
]

const collectionRows = [
  {
    category: "Account and profile data",
    items:
      "Name, email address, account identifier, email-verification status, optional profile image, and authentication records tied to your account.",
    why: "To create and maintain your account, authenticate you, and show identity information to the other people you share ledgers with.",
  },
  {
    category: "Session and device data",
    items:
      "Session tokens, expiration timestamps, IP address, user agent, sign-in session history, and request timing information used for security checks.",
    why: "To keep you signed in, detect abuse, troubleshoot issues, and protect the service.",
  },
  {
    category: "Group, friend, and invitation data",
    items:
      "Group names, slugs, logos if added later, membership records, roles, invitation emails, inviter identity, friend-link relationships, and related timestamps.",
    why: "To let people invite one another, manage shared spaces, and control who can view or change group data.",
  },
  {
    category: "Expense and settlement data",
    items:
      "Expense titles, descriptions, amounts, currency, split method, participant allocations, who paid, who owes, settlement notes, settlement allocations, and timestamps.",
    why: "To run the shared ledger, calculate balances, and show a reliable record of what happened.",
  },
  {
    category: "Activity history",
    items:
      "Structured activity records describing actions taken in groups and friend ledgers, including actor identity, action type, summaries, and related metadata.",
    why: "To provide auditability, recent activity views, and understandable change history.",
  },
  {
    category: "Security and abuse-prevention data",
    items:
      "Rate-limit keys, request counters, password-reset and verification records, and operational debugging information generated while protecting the service.",
    why: "To prevent abuse, enforce basic limits, and keep the product stable and secure.",
  },
  {
    category: "Support or direct-contact data",
    items:
      "Any information you send when you contact Batwara about privacy, support, bugs, or account problems.",
    why: "To respond to your request, verify account ownership where necessary, and keep a record of the issue.",
  },
]

const sourceRows = [
  {
    source: "Directly from you",
    details:
      "For example when you create an account, sign in, verify your email, add an expense, record a settlement, edit a group, or contact Batwara.",
  },
  {
    source: "Automatically from your use of the app",
    details:
      "For example session records, IP address, user agent, security checks, and essential cookies needed to keep the app working.",
  },
  {
    source: "From other users",
    details:
      "For example when someone invites you to a group, adds you to a shared ledger, or records a shared expense or settlement that identifies you.",
  },
]

const purposeRows = [
  {
    purpose: "Provide the service",
    basis: "Performance of a contract or steps taken at your request",
    details:
      "Creating accounts, signing users in, verifying email addresses, running groups and friend ledgers, recording expenses and settlements, and showing balances and activity.",
  },
  {
    purpose: "Keep the service secure and reliable",
    basis: "Legitimate interests",
    details:
      "Preventing abuse, rate limiting, debugging errors, keeping sessions secure, and protecting Batwara and its users.",
  },
  {
    purpose: "Respond to legal or compliance obligations",
    basis: "Legal obligation and legitimate interests",
    details:
      "Complying with lawful requests, resolving disputes, maintaining records required to operate responsibly, and defending legal claims.",
  },
  {
    purpose: "Communicate with you",
    basis:
      "Performance of a contract, legitimate interests, or consent where required",
    details:
      "Sending verification emails, password-reset emails, service notices, and responding to messages you send Batwara.",
  },
]

const visibilityRows = [
  {
    recipient: "Other Batwara users in your shared context",
    details:
      "People in the same group, invitation flow, or direct ledger may see the identity and ledger information needed to understand who is involved and what happened.",
  },
  {
    recipient: "Service providers and infrastructure vendors",
    details:
      "Providers used to host the Batwara-operated service, database, email delivery, and similar core operations may process personal data on Batwara’s behalf.",
  },
  {
    recipient: "Professional advisers or authorities",
    details:
      "Batwara may disclose data if reasonably necessary to comply with law, protect users, investigate abuse, or enforce the project’s legal rights.",
  },
]

const providerRows = [
  {
    provider: "Hosting and application infrastructure",
    purpose:
      "Running the Batwara-hosted site and app, storing server-side data, and keeping the service available.",
    data: "Account, session, ledger, and operational data relevant to the deployment.",
    notes:
      "Deployment-specific provider name should be published here before public production launch.",
  },
  {
    provider: "Database hosting",
    purpose:
      "Persisting application data for accounts, groups, expenses, settlements, and activity history.",
    data: "Most product data categories listed in this notice.",
    notes:
      "Deployment-specific provider name should be published here before public production launch.",
  },
  {
    provider: "Transactional email delivery",
    purpose: "Sending verification and password-reset messages.",
    data: "Email address, message content, and delivery metadata.",
    notes:
      "Production email delivery is not configured in this repository today. Local development or unconfigured environments may log auth-email content to the console instead.",
  },
]

const retentionRows = [
  {
    category: "Account profile and shared-ledger records",
    retention:
      "Usually kept while your account remains active and afterward for as long as needed to preserve ledger integrity, resolve disputes, or comply with law.",
  },
  {
    category: "Session records",
    retention:
      "Kept until they expire, are revoked, or are otherwise no longer needed for security and account management.",
  },
  {
    category: "Verification and password-reset records",
    retention:
      "Kept until they expire and for any additional short period reasonably needed to prevent abuse and investigate security issues.",
  },
  {
    category: "Rate-limit and short-lived security counters",
    retention:
      "Stored only for the active enforcement window or current process lifetime, whichever is shorter in practice.",
  },
  {
    category: "Support messages",
    retention:
      "Kept for as long as needed to answer the request, maintain a support record, and protect the project if the issue later needs review.",
  },
]

const rightsRows = [
  {
    title: "Access",
    body: "You can ask what personal data Batwara holds about you and request a copy where applicable.",
  },
  {
    title: "Correction",
    body: "You can ask Batwara to correct inaccurate account or request-related information, and some shared-ledger information can already be edited in the product.",
  },
  {
    title: "Deletion",
    body: "You can ask Batwara to delete personal data, but some shared-ledger records may need to be retained or de-identified to preserve other users’ records and ledger integrity.",
  },
  {
    title: "Restriction or objection",
    body: "Depending on your location, you may be able to object to or restrict certain processing, especially processing based on legitimate interests.",
  },
  {
    title: "Portability",
    body: "Depending on applicable law, you may request a copy of certain data in a portable format.",
  },
  {
    title: "Complaint",
    body: "You may complain to your local data protection or privacy regulator if you think Batwara handled your data unlawfully.",
  },
]

export const Route = createFileRoute("/privacy/")({
  head: () => {
    const url = createAbsoluteUrl("/privacy/")

    return {
      meta: [
        {
          title: "Privacy Policy | Batwara",
        },
        {
          name: "description",
          content:
            "Read how the Batwara-hosted service handles account data, shared expense records, session data, cookies, and privacy rights.",
        },
        {
          property: "og:title",
          content: "Privacy Policy | Batwara",
        },
        {
          property: "og:description",
          content:
            "A detailed, plain-language privacy policy for the Batwara-hosted service.",
        },
        {
          property: "og:type",
          content: "article",
        },
        {
          property: "og:url",
          content: url,
        },
        {
          name: "robots",
          content:
            "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
        },
      ],
      links: [
        {
          rel: "canonical",
          href: url,
        },
      ],
    }
  },
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  return (
    <main className="relative isolate px-5 py-6 sm:px-8 lg:px-10">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(26,107,60,0.1),transparent_58%)]" />
      <div className="pointer-events-none absolute top-32 -right-36 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(204,184,150,0.18),transparent_65%)]" />

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="glass-panel rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(245,239,230,0.96))] p-6 shadow-[0_24px_56px_rgba(28,28,24,0.08)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-white/85 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-white"
            >
              <BrandMark
                size="md"
                iconContainerClassName="shadow-none"
                labelClassName="text-primary"
              />
            </Link>

            <div className="flex flex-wrap gap-2 text-xs font-medium tracking-[0.14em] uppercase">
              <span className="rounded-full border border-border/70 bg-white/80 px-3 py-2 text-foreground/75">
                Effective {effectiveDate}
              </span>
              <span className="rounded-full border border-border/70 bg-white/80 px-3 py-2 text-foreground/75">
                Updated {lastUpdated}
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                Privacy policy
              </p>
              <h1 className="mt-4 max-w-4xl font-heading text-5xl leading-[0.95] font-light tracking-[-0.03em] text-foreground sm:text-6xl">
                Plain-language privacy terms for the Batwara-hosted service.
              </h1>
              <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                Batwara is an open-source expense splitting app. This notice
                explains what the Batwara-operated website and app collect, why
                that information is needed, who can see shared-ledger data, and
                what rights users may have.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,248,236,0.96),rgba(250,241,221,0.92))] p-5 shadow-[0_14px_34px_rgba(138,104,38,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-900">
                    <HugeiconsIcon
                      icon={SecurityCheckIcon}
                      className="size-4"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl text-foreground">
                      Early-stage project notice
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-foreground/80">
                      Batwara is still early-stage. This page is written to be
                      accurate about the current repository and the intended
                      hosted-service baseline. Before public production launch,
                      Batwara should replace the temporary contact guidance
                      below with a monitored privacy inbox and publish the
                      actual deployment providers used to host the service.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {summaryPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-[1.4rem] border border-white/80 bg-white/78 px-4 py-4 shadow-[0_12px_28px_rgba(28,28,24,0.04)]"
                  >
                    <div className="flex items-start gap-3">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        strokeWidth={1.5}
                      />
                      <p className="text-sm leading-6 text-foreground/85">
                        {point}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="glass-panel h-full rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(250,247,241,0.88),rgba(243,236,224,0.96))] p-6 shadow-[0_20px_48px_rgba(28,28,24,0.06)]">
              <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                Quick facts
              </p>
              <div className="mt-5 space-y-3">
                {quickFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-[1.3rem] border border-white/80 bg-white/80 px-4 py-4"
                  >
                    <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/85">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.4rem] border border-border/70 bg-[#f7f2e8] p-5">
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  Need the short version?
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground/85">
                  If you only read one thing, read the summary cards above and
                  the sections on shared-ledger visibility, retention, and the
                  open-source boundary.
                </p>
              </div>
            </aside>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-6 lg:h-fit lg:self-start">
            <div className="glass-panel rounded-[1.8rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_42px_rgba(28,28,24,0.06)] lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto">
              <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
                On this page
              </p>
              <nav className="mt-4 space-y-2">
                {contents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex rounded-[1rem] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-5">
            <PolicySection
              id="scope"
              title="1. What this policy covers"
              intro="This privacy policy applies to the Batwara-operated website and hosted application that display or link to this notice."
            >
              <p>
                It covers the public site, the authenticated Batwara app, and
                related account-security flows such as sign-in, email
                verification, and password reset.
              </p>
              <p>
                It does not automatically apply to third-party services that may
                link to or mention Batwara, to the public GitHub platform
                itself, or to deployments that other people self-host from the
                open-source code.
              </p>
              <p>
                Batwara coordinates shared expenses and settlements. It does not
                currently process card payments, bank transfers, or payment
                network credentials on behalf of users.
              </p>
            </PolicySection>

            <PolicySection
              id="collect"
              title="2. What Batwara collects"
              intro="Batwara collects information in several categories, depending on how you use the service."
            >
              <DataTable
                columns={[
                  "Category",
                  "What this includes",
                  "Why it is collected",
                ]}
                rows={collectionRows.map((row) => [
                  row.category,
                  row.items,
                  row.why,
                ])}
              />
            </PolicySection>

            <PolicySection
              id="sources"
              title="3. How data reaches Batwara"
              intro="Batwara gets personal data from three main sources."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {sourceRows.map((row) => (
                  <article
                    key={row.source}
                    className="rounded-[1.4rem] border border-white/80 bg-white/80 p-5 shadow-[0_12px_28px_rgba(28,28,24,0.04)]"
                  >
                    <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
                      {row.source}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-foreground/85">
                      {row.details}
                    </p>
                  </article>
                ))}
              </div>
              <p>
                This matters because shared-expense products often involve data
                about more than one person at a time. If another user adds you
                to a group, invites you by email, or includes you in a shared
                expense, Batwara may receive information about you from that
                user before you directly provide it yourself.
              </p>
            </PolicySection>

            <PolicySection
              id="use"
              title="4. How Batwara uses personal data"
              intro="Batwara uses personal data only for purposes tied to running, securing, and improving the hosted service."
            >
              <DataTable
                columns={[
                  "Purpose",
                  "Typical legal basis",
                  "What this means in practice",
                ]}
                rows={purposeRows.map((row) => [
                  row.purpose,
                  row.basis,
                  row.details,
                ])}
              />
              <p>
                Batwara does not currently use personal data for targeted
                advertising, broker-style resale, or automated profiling that
                produces legal or similarly significant effects about users.
              </p>
            </PolicySection>

            <PolicySection
              id="cookies"
              title="5. Cookies and similar technologies"
              intro="Batwara currently uses a narrow set of cookies and similar technologies."
            >
              <ul className="space-y-3 text-sm leading-7 text-foreground/85">
                <li>
                  <strong>Essential authentication cookies.</strong> Batwara’s
                  authentication system uses session cookies or equivalent
                  session mechanisms so the app can recognize a signed-in user
                  across requests.
                </li>
                <li>
                  <strong>Interface preference cookie.</strong> Batwara sets one
                  optional first-party cookie named <code>sidebar_state</code>{" "}
                  to remember whether the app sidebar is open or collapsed.
                </li>
                <li>
                  <strong>No advertising cookies today.</strong> The current
                  repository does not show analytics, ad-tech, or cross-site
                  behavioral advertising cookies in the Batwara-hosted app.
                </li>
              </ul>
              <p>
                If Batwara later adds non-essential analytics, marketing
                technologies, or third-party embedded tools that materially
                change this picture, this policy should be updated before those
                tools are enabled in production.
              </p>
            </PolicySection>

            <PolicySection
              id="sharing"
              title="6. Who can access or receive data"
              intro="Because Batwara is collaborative, some information is intentionally visible to other users in the same shared context."
            >
              <DataTable
                columns={["Who", "What access means"]}
                rows={visibilityRows.map((row) => [row.recipient, row.details])}
              />
              <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-[#f7f2e8] p-5">
                <h3 className="font-heading text-2xl text-foreground">
                  Shared-ledger visibility matters
                </h3>
                <p className="mt-3 text-sm leading-7 text-foreground/85">
                  Batwara is designed so the relevant people in a shared group
                  or direct ledger can understand what happened. That means
                  names, invitation emails, participant lists, expense titles,
                  amounts, payer/payee details, and activity history may be
                  visible to other affected users.
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground/85">
                  If you do not want information to be visible to the other
                  people in a shared ledger, do not add it to that ledger. Avoid
                  placing unnecessary sensitive personal information in expense
                  descriptions, notes, or titles.
                </p>
              </div>

              <div className="mt-5">
                <h3 className="font-heading text-2xl text-foreground">
                  Deployment-specific service providers
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Batwara should publish the actual provider list for the hosted
                  deployment before public production launch. The current
                  repository does not lock those vendor names.
                </p>
                <div className="mt-4">
                  <DataTable
                    columns={[
                      "Provider category",
                      "Purpose",
                      "Data involved",
                      "Notes",
                    ]}
                    rows={providerRows.map((row) => [
                      row.provider,
                      row.purpose,
                      row.data,
                      row.notes,
                    ])}
                  />
                </div>
              </div>
            </PolicySection>

            <PolicySection
              id="retention"
              title="7. How long data is kept"
              intro="Batwara keeps personal data for different periods depending on the type of information and why it exists."
            >
              <DataTable
                columns={["Category", "Retention approach"]}
                rows={retentionRows.map((row) => [row.category, row.retention])}
              />
              <p>
                Shared-ledger products create one important constraint: a record
                about you may also be part of someone else’s legitimate record.
                If Batwara receives an erasure request, it may need to retain or
                de-identify limited data needed to preserve other users’
                expense, balance, settlement, or activity history.
              </p>
              <p>
                Batwara should publish a tighter operational retention schedule
                once account-deletion tooling and production infrastructure are
                finalized.
              </p>
            </PolicySection>

            <PolicySection
              id="rights"
              title="8. Your rights and choices"
              intro="Depending on where you live, you may have rights over your personal data."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {rightsRows.map((row) => (
                  <article
                    key={row.title}
                    className="rounded-[1.4rem] border border-white/80 bg-white/80 p-5 shadow-[0_12px_28px_rgba(28,28,24,0.04)]"
                  >
                    <h3 className="font-heading text-xl text-foreground">
                      {row.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-foreground/85">
                      {row.body}
                    </p>
                  </article>
                ))}
              </div>
              <p>
                Batwara may need to verify your identity before acting on a
                privacy request, especially if the request could expose,
                transfer, or delete account data. If a request would interfere
                with another user’s data or with shared-ledger integrity,
                Batwara may need to narrow, delay, or deny part of the request
                as allowed by law.
              </p>
              <p>
                California residents may have additional rights under applicable
                California privacy law, including rights to know, delete,
                correct, and opt out of sale or sharing if those laws apply to
                Batwara’s operations.
              </p>
            </PolicySection>

            <PolicySection
              id="security"
              title="9. Security and international transfers"
              intro="Batwara uses reasonable technical and organizational measures intended to protect the data it processes."
            >
              <ul className="space-y-3 text-sm leading-7 text-foreground/85">
                <li>
                  Session management, request validation, and rate limiting are
                  used to reduce abuse and unauthorized access.
                </li>
                <li>
                  Batwara limits public access to authenticated ledger data and
                  uses server-side checks before returning protected records.
                </li>
                <li>
                  No system can promise perfect security, so users should choose
                  strong passwords and avoid putting unnecessary sensitive data
                  into shared-ledger notes or descriptions.
                </li>
              </ul>
              <p>
                Depending on how the hosted service is deployed, personal data
                may be processed in countries other than your own. Where
                required by applicable law, Batwara should use appropriate
                transfer safeguards for those cross-border transfers.
              </p>
            </PolicySection>

            <PolicySection
              id="children"
              title="10. Children"
              intro="Batwara is intended for adults and older teens who can responsibly manage shared expense records."
            >
              <p>
                Batwara is not designed for children under 13, and the project
                does not knowingly collect personal data from children under 13
                through the hosted service.
              </p>
              <p>
                If you believe a child under 13 has created an account or been
                entered into the service in a way that should not have happened,
                use the contact guidance below so the issue can be reviewed.
              </p>
            </PolicySection>

            <PolicySection
              id="open-source"
              title="11. Open-source, GitHub, and self-hosting boundary"
              intro="Batwara is open source, but that does not mean one privacy policy automatically governs every place the code or community appears."
            >
              <p>
                This privacy policy applies to the Batwara-operated hosted
                website and application only.
              </p>
              <p>
                If someone else downloads the open-source code and runs their
                own Batwara deployment, that operator decides how personal data
                is handled on their system and is responsible for their own
                privacy disclosures and legal compliance.
              </p>
              <p>
                If you interact with the public source code, issues,
                discussions, or pull requests on GitHub, GitHub processes that
                activity under its own privacy terms. See the{" "}
                <a
                  href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80"
                >
                  GitHub General Privacy Statement
                </a>{" "}
                for details about GitHub’s platform-level handling of that data.
              </p>
            </PolicySection>

            <PolicySection
              id="contact"
              title="12. Contact and policy updates"
              intro="Batwara should offer a direct privacy contact before public production launch."
            >
              <p>
                At the time of this page’s last update on {lastUpdated}, the
                repository does not publish a dedicated privacy inbox for the
                Batwara-hosted service. Before production launch, Batwara should
                replace this temporary guidance with a monitored privacy or
                support email address.
              </p>
              <p>
                Until then, project-level questions can be directed through the{" "}
                <a
                  href={siteConfig.githubUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80"
                >
                  Batwara GitHub repository
                </a>
                . Do not post sensitive personal data in public issues or
                discussions.
              </p>
              <p>
                Batwara may update this policy as the hosted service evolves,
                especially if the project adds production email delivery,
                analytics, new processors, account-deletion tools, or additional
                public trust pages. Material updates should change the visible
                “Last updated” date on this page.
              </p>
            </PolicySection>

            <section className="rounded-[2rem] border border-border/70 bg-[#1d241e] px-6 py-8 text-[#f5f1e8] shadow-[0_20px_48px_rgba(28,28,24,0.07)] sm:px-8">
              <div className="flex flex-wrap items-center gap-3">
                <BrandMark
                  showLabel={false}
                  size="lg"
                  iconContainerClassName="bg-white/10 text-white shadow-none"
                  iconClassName="size-5"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-xs font-medium tracking-[0.16em] text-[#bfd6c7] uppercase">
                    Batwara
                  </p>
                  <h2 className="font-heading text-3xl text-white">
                    Privacy should be readable.
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d6d2c9]">
                Batwara is finance-adjacent software, so the privacy notice
                should stay honest, specific, and easy to scan. If the product
                changes in ways that affect data collection or sharing, this
                page should change with it.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-[#1d241e] transition-colors hover:bg-[#f1ede4]"
                >
                  Back to home
                </Link>
                <a
                  href={siteConfig.githubUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/6"
                >
                  View repository
                </a>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}

function PolicySection({
  id,
  title,
  intro,
  children,
}: {
  id: string
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,241,232,0.94))] p-6 shadow-[0_18px_40px_rgba(28,28,24,0.05)] sm:p-7"
    >
      <h2 className="font-heading text-3xl leading-tight text-foreground">
        {title}
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
        {intro}
      </p>
      <div className="mt-6 space-y-4 text-sm leading-7 text-foreground/85">
        {children}
      </div>
    </section>
  )
}

function DataTable({
  columns,
  rows,
}: {
  columns: Array<string>
  rows: Array<Array<string>>
}) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-border/70 bg-white/78 shadow-[0_12px_28px_rgba(28,28,24,0.04)]">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-[#f7f2e8] text-foreground">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-border/70 px-4 py-3 font-medium"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="align-top">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${row[0]}-${cellIndex}`}
                  className="border-b border-border/60 px-4 py-3.5 leading-7 text-foreground/85 last:border-b-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
