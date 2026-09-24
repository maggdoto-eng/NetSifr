# NetSifr — build backlog

Living list of what's shipped, what's next, and what's blocked. Newest priorities at top.

## 🚧 In progress / next

### Surveys (native) — NEW, top priority
Native survey builder + runner + analytics, from the `Custom Interactive Survey Tool`
prototype (Downloads). See the "Surveys" section below for scope.
- [x] Schema: `Survey`, `SurveySection`, `SurveyQuestion`, `SurveyResponse` (+ answer storage), status (draft/published), versioning
- [x] Module: create/update/publish, submit response, aggregate/crosstab/filter (port `survey-schema.js` logic server-side)
- [x] Admin **Builder** — sections, 12 question types, options, required, skip logic, consent + ending pages, preview, publish
- [x] **Runner** — consent → stepwise sections/questions, skip logic, ending page (participant + optionally public link)
- [x] Admin **dashboard** — list, response counts, completion rate, per-question distributions, scale/rating averages, ranking, cross-tabs by segment, date/segment filters, **CSV export**
- [x] Decide: surveys as their own top-level area vs. attached to programs/events
- [x] Design-system note: prototype ships a *newer* NetSifr brand (leaf-green/slate, UNODC-report style) — app currently uses pine/mint/coral. Decide whether to keep app system or adopt the new one.

## 🧩 Surveys — spec-gap closure (working through, top→bottom)
From DEVELOPMENT_SPEC.md review. Design system + core behaviours already match.
- [x] 1. Partial submission + consent/version stamp (§3.1/§5.2/§5.3) — response model (surveyVersion, consent), start+patch flow, stream answers, complete flag
- [x] 2. Save & resume in the Runner (localStorage; Resume vs Start over)
- [x] 3. Rate-limit the public submission endpoints (§9 anti-spam)
- [x] 4. Runner end screen: image, secondary link, personalized summary tiles, "Submit another response"
- [x] 5. Runner polish: enter animation (fade+rise), saved-dot indicator
- [x] 6. Share modal QR code
- [x] 7. Builder: Reset to template + validation warnings (empty titles, <2 options, dangling branch targets)
- [x] 8. Builder: drag-to-reorder questions
- [x] 9. Admin: single-response drill-down + pagination for large sets
- [x] 10. Accessibility: aria-live progress, focus management on step change
### Surveys §13 — engagement, theming & responsive (DONE)
- [x] 13.1 Data model: `survey.theme` (animation/duration/background/engagement) + defaultTheme/getTheme + ANIMATION/BACKGROUND/MILESTONES/ENCOURAGEMENTS catalogues
- [x] 13.2 Per-question animations (slide-up/fade/slide-left/scale/none, duration, restart per step, reduced-motion)
- [x] 13.3 Engagement: 25/50/75% milestone toasts (once per attempt) + section encouragement notes
- [x] 13.4 Page décor layer (plain/leaves/dots/blobs/gradient) behind content
- [x] 13.5 Responsive + Desktop/Mobile preview frame in the Runner (PreviewFrame)
- [x] 13.6 Builder "Experience" panel editing theme
- [x] 13.7 Runner tweak override props (animation/background/engagement, auto → defer to theme)

### Surveys — production hardening (after §13; the recommended 1,2,4,5) — DONE
- [x] P1. Per-survey ownership (ownerUserId stamped at create, creator shown on dashboard)
- [x] P2. PII separation & data-retention (separate `contact` column, PII toggle in builder, anonymised default export + opt-in full export, per-response delete, retention window + purge/anonymise governance bar)
- [x] P4. Server-side aggregation for large response sets (>1500 → getAnalytics on the server, filters via surveyAnalyticsAction)
- [x] P5. Builder extras: "Other → free text" option, undo/redo (⌘Z / ⌘⇧Z, coalesced), per-question image
- [ ] (still deferred) i18n/RTL, per-invite tokens

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
