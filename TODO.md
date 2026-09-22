# NetSifr — build backlog

Living list of what's shipped, what's next, and what's blocked. Newest priorities at top.

## 🚧 In progress / next

### Surveys (native) — NEW, top priority
Native survey builder + runner + analytics, from the `Custom Interactive Survey Tool`
prototype (Downloads). See the "Surveys" section below for scope.
- [ ] Schema: `Survey`, `SurveySection`, `SurveyQuestion`, `SurveyResponse` (+ answer storage), status (draft/published), versioning
- [ ] Module: create/update/publish, submit response, aggregate/crosstab/filter (port `survey-schema.js` logic server-side)
- [ ] Admin **Builder** — sections, 12 question types, options, required, skip logic, consent + ending pages, preview, publish
- [ ] **Runner** — consent → stepwise sections/questions, skip logic, ending page (participant + optionally public link)
- [ ] Admin **dashboard** — list, response counts, completion rate, per-question distributions, scale/rating averages, ranking, cross-tabs by segment, date/segment filters, **CSV export**
- [ ] Decide: surveys as their own top-level area vs. attached to programs/events
- [ ] Design-system note: prototype ships a *newer* NetSifr brand (leaf-green/slate, UNODC-report style) — app currently uses pine/mint/coral. Decide whether to keep app system or adopt the new one.

## 📋 Backlog (deferred roadmap)

### Phase 5 — Action Projects
- [ ] `ActionProject`, `Team`, `ProjectMembership`, `Task`, `Contribution`
- [ ] Admin authoring + participant team/task/contribution flows

### Phase 6 — Recognition & recommendations
- [ ] Recommendation engine over Topic/Cause/Skill/Location ("you're into X, here's a call for you")
- [ ] Org/initiative impact dashboards reading the ContributionEvent ledger
- [ ] Skills portfolios

### Polish / HCI pass
- [ ] Restyle remaining old screens: Events/Volunteering detail flows (register/apply/check-in/feedback/log-hours + admin detail pages), forgot/reset-password
- [ ] Responsive: admin rail collapse on mobile/tablet
- [ ] Success feedback: toasts/confirmations ("Saved", "Invite sent", "Graded")
- [ ] Accessibility audit (contrast, screen-reader, icon-only buttons, datetime inputs)
- [ ] Route-level error boundaries

## ⛔ Blocked / needs someone else
- [ ] **Domain flip** — `lms.netsifr.org` waiting on dev's Cloudflare CNAME; then flip `AUTH_URL` + redeploy
- [ ] **Email** — set a real `RESEND_API_KEY` + verified sender so invites/resets send in prod
- [ ] **Neon cold starts** — decide: keep-warm ping vs. upgrade Neon plan to disable autosuspend

## ✅ Shipped (this engagement)
- Deployed to Vercel (Singapore) + Neon (Singapore), co-located; instant-nav (loading skeletons + client cache + prefetch)
- Whole-app restyle to the design system; separate admin login; invite-only register
- LMS Tier 1 (guided journey: progress, continue, syllabus, module nav)
- Announcements + in-app notifications
- My Progress / grades page
- Course completion + printable certificate
- Community: cohort discussion, likes, follows, org community feed, moderation (report/hide)
- Achievement badges; demo program seed
