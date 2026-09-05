# NetSifr platform

A real (non-prototype) implementation of NetSifr's learning platform — Next.js (App Router) + PostgreSQL/Prisma + Auth.js. This started as a Claude Design handoff (see `docs/design-handoff-readme.md` and `chats/` for the original prototype/product conversation, and `project/*.dc.html` for the throwaway HTML/CSS/JS mockups it was built from — those files are reference material only, not app source).

The implementation plan — architecture decisions, data model, phased roadmap — lives at `docs/plan.md`.

## Stack

- **Next.js 16** (App Router, Turbopack), TypeScript. Cache Components (`cacheComponents`) is intentionally **off** — this app is almost entirely per-user/session-dynamic (dashboards, admin console), so the static-shell/PPR model doesn't buy much here; revisit if a genuinely public/static surface (e.g. a marketing page) gets added later.
- **PostgreSQL + Prisma** for the database.
- **Auth.js v5** (Credentials provider, JWT sessions) + **Argon2id** (`@node-rs/argon2`) for password hashing.
- **Resend** for transactional email (invites, password reset) — refuses to send in production if unconfigured rather than silently logging a live link; logs to console in development only. Note: `next build && next start` runs with Next's own `NODE_ENV=production` regardless of `.env`, so it hits the hard-fail path too unless `RESEND_API_KEY` is set — use `npm run dev` locally when exercising invite/reset emails without a real key configured.
- **Vitest** (unit/integration) + **Playwright** (e2e).

## Local setup

1. `npm install`
2. Have a local Postgres running and create the dev/test databases (see `.env.example` for the expected connection strings — adjust to your machine):
   ```
   createuser netsifr --login --pwprompt --createdb
   createdb -O netsifr netsifr_dev
   createdb -O netsifr netsifr_test
   ```
3. Copy `.env.example` to `.env` and fill in `AUTH_SECRET` (`openssl rand -base64 32`).
4. `npm run db:migrate` — applies migrations to `netsifr_dev` (development only; CI/production use `db:migrate:deploy`, see below).
5. `npm run db:seed` — seeds the one `Organization`, personas, and topic list, and bootstraps the first admin (see the seed script for the bootstrap credentials it prints).
6. `npm run dev`

## Scripts

| Script                             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev` / `build` / `start`          | Standard Next.js.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `lint` / `format` / `format:check` | ESLint (with `eslint-config-prettier` so the two never fight) / Prettier.                                                                                                                                                                                                                                                                                                                                             |
| `typecheck`                        | `tsc --noEmit`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `test` / `test:watch`              | Vitest unit + integration tests — integration tests run against `netsifr_test` (`tests/support/setup.ts` points `DATABASE_URL` there), each creating and tearing down its own `Organization` so runs never touch dev data.                                                                                                                                                                                            |
| `test:e2e`                         | Playwright end-to-end flows (builds and starts the app itself against `netsifr_dev` — see `playwright.config.ts`; its `globalSetup`/`globalTeardown` seed and clean up one fixture cohort under the real seeded org, since Phase 1's admin routing isn't multi-tenant-aware). In a sandbox with a browser pre-installed at a fixed path instead of one Playwright manages, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. |
| `db:migrate`                       | `prisma migrate dev` — **development only**, creates new migrations.                                                                                                                                                                                                                                                                                                                                                  |
| `db:migrate:deploy`                | `prisma migrate deploy` — what CI and production actually run; never creates new migrations, only applies existing ones to a clean database.                                                                                                                                                                                                                                                                          |
| `db:seed`                          | Seed script (also run automatically after `db:migrate` via Prisma's seed hook).                                                                                                                                                                                                                                                                                                                                       |
| `db:studio`                        | Prisma Studio, for poking at local data.                                                                                                                                                                                                                                                                                                                                                                              |

## Project structure

- `src/app/` — routes (participant app, `/admin` console, `(auth)` group), Route Handlers under `src/app/api/`.
- `src/modules/` — framework-agnostic business logic (identity, organizations, learning, recognition, …), called by both Server Actions today and, later, by a versioned API for a native mobile client — see the plan's "Mobile readiness" section. Pages and Server Actions stay thin; rules live here.
- `src/lib/` — cross-cutting infrastructure (auth config, Prisma client, rate limiting, email).
- `prisma/schema.prisma` — the data model; `prisma/seed.ts` — seed script.
- `tests/unit/` (pure logic), `tests/integration/` (real Postgres, via `tests/support/fixtures.ts`), `tests/e2e/` (Playwright, against a built-and-started app).

## Scope note

Phases 1–3 of the platform plan are implemented:

- **Phase 1 — Learning**: courses/cohorts/enrolment, invite-only invitations, engagement-proxy attendance, quizzes/assignments/grading, the `ContributionEvent` points ledger, and the admin console (Builder/Attendance/Submissions/Invites + CSV export).
- **Phase 2 — Events**: self-service events discoverable on `/discover`, registration with capacity/waitlists, one-QR-per-occurrence check-in (+ admin manual), post-event feedback, and event-attended points.
- **Phase 3 — Volunteering**: self-service volunteer opportunities, the application lifecycle (apply → shortlist/accept/reject), shifts + capacity-aware signup, service-hour logging with admin verification, and verified-hours points.

Cross-tenant access control is enforced in the module layer (every admin mutation/read is org-scoped), even though the app currently runs single-org — see `docs/plan.md`'s "Phase 2 review — findings & tenant-safety hardening" note.

Community, Action Projects, and the cross-cutting Recognition dashboards/certificates are named/reserved in the plan but intentionally not built yet — see `docs/plan.md` for the full roadmap and why the schema is shaped the way it is ahead of those phases.
