# Batwara

![Batwara preview](./public/og-image.svg)

Batwara is an open-source expense splitting app for shared life.

Repository: [github.com/Vivekagent47/batwara](https://github.com/Vivekagent47/batwara)

Batwara is for people who regularly spend together and need a calmer way to track shared expenses, understand balances, and settle fairly. That includes trips, shared homes, couples, friend groups, and small teams managing money together.

## Current Product State

Batwara is no longer just a landing page or app shell. This repository already includes the core authenticated product surface.

Implemented today:

- Email/password authentication flows
- Dashboard with net balance summary and recent activity
- Group creation, group settings, and member management
- Direct friend ledgers
- Expense creation, editing, deletion, and activity logging
- Group balance summaries and settlement suggestions
- Pairwise settlement flow with automatic allocation across direct and shared-group balances
- Postgres schema and server-side data access with Drizzle

Still maturing:

- Settlement rollout is feature-flagged
- Automated test coverage is still light
- Contributor docs and issue templates are incomplete
- Production hardening, observability, and deployment guidance are still ahead

## Settlement Model

Batwara records one payment between two people, then automatically applies that payment to the oldest shared balances first.

That means a single settlement can reduce:

- direct friend-ledger balances
- shared group balances
- both, when both exist between the same pair

To keep the ledger auditable, Batwara stores:

- one parent settlement record for the actual payment
- one or more scoped settlement allocations for the balances that payment reduces

Group activity shows only the portion allocated to that group. Direct balance activity shows only the portion allocated to the direct ledger.

## Quick Start

Batwara runs as a Bun-based local development app.

### Prerequisites

- Bun
- A local Postgres instance or another reachable Postgres database

### Install dependencies

```bash
bun install
```

### Create your local environment file

```bash
cp .env.example .env
```

Important variables:

- `VITE_APP_URL`
  Absolute app URL used for canonical URLs, sitemap generation, and metadata.
- `DATABASE_URL`
  Postgres connection string used by Drizzle and the app.
- `BETTER_AUTH_SECRET`
  Secret used by Better Auth.
- `BATWARA_ENABLE_SETTLEMENTS`
  Server-side settlement feature flag.
- `VITE_ENABLE_SETTLEMENTS`
  Client-visible settlement feature flag fallback.
- `VITE_ENABLE_DEVTOOLS`
  Enables TanStack devtools locally when set to `true`.

The default example values are safe for local development. Settlement stays off unless one of the settlement flags is set to `true`.

### Start the development server

```bash
bun run dev
```

The app runs on `http://localhost:3000`.

## Available Scripts

- `bun run dev`
  Start the local development server.
- `bun run build`
  Create a production build.
- `bun run preview`
  Preview the production build locally.
- `bun run typecheck`
  Run TypeScript without emitting files.
- `bun run lint`
  Run ESLint across the project.
- `bun run test`
  Run the current test suite.
- `bun run db:generate`
  Generate a Drizzle migration from the schema.
- `bun run db:migrate`
  Run database migrations.

## Tech Stack

Batwara currently uses:

- TanStack Start
- React
- TypeScript
- Vite
- Tailwind CSS
- Better Auth
- Drizzle ORM
- PostgreSQL
- Three.js with React Three Fiber for landing-page visuals

## Contributing

Good contribution areas right now:

- settlement UX refinement
- validation and ledger correctness
- automated tests around balances and activity
- onboarding and contributor documentation
- accessibility and mobile polish

If you plan to contribute code, start by running the app locally and reading the routes and server functions under `src/routes` and `src/lib/dashboard-server.ts`.

## Open Source

Batwara is open source because money-related tools benefit from transparency. People should be able to inspect the code, understand the rules, and improve the product in public.

Public repository:

- [https://github.com/Vivekagent47/batwara](https://github.com/Vivekagent47/batwara)

## License

A project license has not been added yet. This repository should include a proper `LICENSE` file before wider public distribution.

## Near-Term Roadmap

1. Harden settlement rollout and validation
2. Expand automated coverage for ledger math and activity
3. Improve contributor onboarding and operational docs
4. Continue polishing group, friend, and expense flows for production readiness
5. Start shaping Batwara into a usable open-source expense sharing product

## Repository Note

This repository is intentionally early-stage.

If you are visiting from GitHub, expect a project that has a clear direction but is still in its foundation phase. The landing page is real. The product vision is real. The implementation is just beginning.
