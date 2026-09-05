# HANDOFF — continue here

Short orientation for picking this project up in a fresh session (local VS Code
or otherwise). The authoritative detail lives in **`docs/plan.md`** — read that
first; this file is just the quick "where things stand and how to run it."

## What this is

NetSifr — a climate NGO's social learning & action platform. Next.js 16 (App
Router) + PostgreSQL/Prisma 7 + Auth.js v5 (Credentials + Argon2id). Business
logic lives in framework-agnostic `src/modules/*`; Server Actions/pages are thin
callers, so a future `/api/v1` for mobile can reuse the same functions.

## Status (built & committed)

- **Phase 1 — Learning**: courses/cohorts/enrolment, invite-only invitations,
  engagement-proxy attendance, quizzes/assignments/grading, `ContributionEvent`
  points ledger, admin console (Builder/Attendance/Submissions/Invites + CSV).
- **Phase 2 — Events**: self-service events on `/discover`, registration with
  capacity/waitlists, one-QR-per-occurrence check-in (+ admin manual), feedback,
  event-attended points.
- **Phase 3 — Volunteering**: self-service opportunities, application lifecycle
  (apply → shortlist/accept/reject), shifts + capacity-aware signup, service-hour
  logging with admin verification, verified-hours points.
- **Tenant-safety hardening**: every admin mutation/read is org-scoped **in the
  module layer** (`assertInOrg` + resolver assertions in `src/modules/organizations`),
  even though the app runs single-org today. See the "Phase 2 review" note in
  `docs/plan.md`.

Quality gate is green as of this handoff: `npm run typecheck`, `npm run lint`,
`npm run build`, `npm test` (65 unit/integration), and all three Playwright e2e
flows (`npm run test:e2e`).

## Run it locally

1. `npm install`
2. Local Postgres running; create the databases (see `.env.example` for the
   connection strings — adjust to your machine):
   ```
   createuser netsifr --login --pwprompt --createdb
   createdb -O netsifr netsifr_dev
   createdb -O netsifr netsifr_test
   ```
3. `cp .env.example .env`, then set `AUTH_SECRET` (`openssl rand -base64 32`) and
   fix the `DATABASE_URL`/`DATABASE_URL_TEST` to match your user/db.
   `RESEND_API_KEY` can stay empty for local dev (invite/reset links log to the
   console).
4. `npm run db:migrate` — applies migrations and runs the seed.
5. `npm run dev` — http://localhost:3000

**Login:** the seed (step 4) **prints the bootstrap admin's email + a generated
password to the console** — grab those. That account is an org OWNER, so it can
use `/admin` (Programs, Events, Volunteering) as well as the participant app.

> Use `npm run dev` (not `build && start`) for local testing without a real
> Resend key: a production build forces `NODE_ENV=production`, where the email
> sender hard-fails instead of logging links. Details in `README.md`.

## Quick tour (exercises all three phases)

1. Log in as the seeded admin.
2. **Learning**: `/admin/programs` → create → Builder → publish → invite yourself
   (link logs to console) → accept → engage recording, take quiz, submit
   assignment → grade it in `/admin`.
3. **Events**: `/admin/events` → create event + occurrence → publish → `/discover`
   → register → check-in QR is on the occurrence's Check-in tab.
4. **Volunteering**: `/admin/volunteering` → new opportunity → add shift → Open
   for applications → `/discover` → apply → accept yourself in the Applications
   tab → `/volunteering/[id]` sign up + log hours → verify in "Hours to verify".

## What's next

**Phase 4 — Community & social learning** (`Community`/`Post`/`Comment`/
`Reaction`/`Follow`/`Notification`/moderation), audience-scoped from day one —
see `docs/plan.md`'s roadmap and the note that every `Post` needs an explicit
`audience` from the start so cohort/volunteer content can't leak public.

To continue in a fresh session, just say: *"Read docs/plan.md and HANDOFF.md,
then continue with Phase 4."*

## Deliberate scope notes (not bugs)

- Single-org: admin routing resolves "the org" as the oldest org
  (`getDefaultOrganization`). Access control is already org-scoped in the module
  layer, so going multi-org is mostly routing work — see `docs/plan.md`.
- Volunteering shift attendance marking (`ATTENDED`/`NO_SHOW`) exists in the
  module + is tested, but has no admin UI yet (Phase 3 points come from verified
  service logs, not shift attendance). Easy fast-follow.
- Engagement-proxy attendance is a deliberate proxy, not proof of viewing (Google
  Drive has no playback API) — flagged in `docs/plan.md` for any future
  accredited-hours need.
