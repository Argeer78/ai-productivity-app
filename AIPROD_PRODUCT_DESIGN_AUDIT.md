# AIProd Product Design Audit

**Audit date:** 11 September 2026
**Scope:** Read-only repository audit plus public homepage checks at 378 px and 1440 px
**Product:** AIProd (`aiprod.app`)
**Status:** Audit only. No application code, data, schema, billing, authentication, or deployment was changed.

## Audit Method and Confidence

This audit traces user-facing pages into shared components, Supabase queries, API handlers, plan checks, Stripe handlers, analytics, legal copy, and PWA assets. The deployed public homepage was also inspected at mobile and desktop widths. Authenticated production pages, production database policies, third-party dashboards, real analytics data, email delivery, and Android TWA behavior were not accessed.

Findings use these confidence labels:

- **Verified:** directly supported by repository implementation or the rendered public site.
- **Production verification required:** configuration or behavior lives outside this repository.
- **Proposed:** a recommendation, not a current capability or claim.

The audit does not treat filenames, marketing copy, or client-side gates as proof of secure server-side behavior.

---

## 1. Executive Summary

AIProd is a functioning and unusually broad solo-productivity SaaS. It already has valuable raw material: notes, tasks, planning, Focus Mode, Daily Success, weekly reports, AI assistance, multilingual UI, PWA support, push reminders, Stripe billing, and data export. The product is not short of features. Its central problem is that the experience presents these capabilities as a collection of similarly weighted tools rather than one coherent improvement system.

The best path is evolution around the loop **Plan -> Do -> Measure -> Learn -> Improve**. Daily Success, completed work, focus activity, history, and weekly interpretation can form a credible signature system. Existing tools should remain, but become inputs and actions within that loop. Travel and screen recording should remain accessible as secondary utilities rather than define the primary product story.

The current UI is functional and responsive in its main layouts, but perceived quality is reduced by inconsistent branding (`AI Productivity Hub`, `AIProd`, `AlphaSynth AI`), 16 visually divergent themes, extensive emoji decoration, oversized corner radii, hard-coded colors, a dense 14-item Apps menu, generic AI language, and repeated card grids. The homepage does contain real product screenshots, which is a strong asset, but its hero prioritizes a decorative 3D image and generic “AI workspace” promise. A first-visit guided modal obscures the page before visitors can understand the offer.

Conversion is constrained by an unclear Free/Pro story and inconsistent wording. The strategically stronger distinction is supportable: **Free organizes work; Pro helps users understand and improve how they work.** However, current entitlement enforcement must be normalized before this is marketed more strongly. “Unlimited” is also used alongside a numeric 2,000-call limit and should be replaced with precise language.

Visual polishing should not begin before critical trust and abuse issues are addressed. The export endpoint accepts a caller-supplied user ID and queries through the Supabase service-role client without authenticating ownership. At least the AI Hub endpoint accepts arbitrary or guest IDs, performs an OpenAI request before any server quota check, and increments usage only after success. Cron authentication fails open when `CRON_SECRET` is absent. Global Facebook Pixel, Google Ads/Analytics, and GTM scripts contradict public statements that AIProd uses no advertising trackers and only Plausible. These are P0 issues because they affect user data, cost exposure, operations, and trust.

### Scores

| Dimension | Score | Rationale |
|---|---:|---|
| **Overall product** | **6.4/10** | Strong breadth and useful retention primitives; weak coherence and uneven operational hardening. |
| **Design** | **5.8/10** | Functional theme tokens and responsive layouts, but fragmented visual language and limited component discipline. |
| **UX** | **6.1/10** | Many workflows work, yet navigation, dashboard density, first-visit interruption, and inconsistent states add friction. |
| **Marketing / conversion** | **4.9/10** | Real screenshots and free entry help; positioning, brand, proof, pricing clarity, and trust copy are weak. |
| **Mobile / PWA** | **6.8/10** | Good responsive foundations, manifest, service worker, push, and TWA work; modal, dense navigation, touch/a11y, and offline validation remain. |
| **Technical quality** | **5.2/10** | Modern stack and strict TypeScript; critical API trust issues, no tests/CI, duplicated tracking, and undocumented schema/operations. |
| **Acquisition readiness** | **4.3/10** | Valuable product and recurring-revenue infrastructure, but security, compliance, documentation, observability, and founder dependencies require remediation. |

### Five Highest-Impact Changes

1. **Close P0 trust and cost-control gaps:** authenticate export ownership and all AI requests, enforce quotas server-side, fail cron authentication closed, and reconcile tracking with consent and legal copy.
2. **Make Daily Success the product spine:** connect Today, Focus, tasks, score, and weekly learning into one visible improvement loop.
3. **Rebuild information hierarchy without removing features:** Today, Capture, Plan/Do, Insights, AI, and More; retain direct access to high-frequency actions.
4. **Unify brand and design foundations:** make AIProd primary, consolidate themes into polished Light/Dark plus restrained accents, and standardize components/states.
5. **Instrument activation, retention, and conversion:** define a privacy-respecting event taxonomy and baseline cohorts before changing major workflows.

### Five Strongest Existing Aspects to Preserve

1. Daily Success morning, evening, score, history, and task-generation flow.
2. Real product screenshots and the functional free/demo path.
3. Broad localization with RTL support and user-level language persistence.
4. PWA, push reminders, Focus Mode, and Android TWA foundations.
5. Stripe portal/webhooks, Founder price continuity, and low-cost model choices.

### Critical Issue Before Visual Polish

**P0: fix authorization, server-side AI abuse controls, fail-open cron authentication, and the tracking/privacy contradiction first.** A premium interface cannot compensate for a potentially cross-user export, unbounded paid API calls, or unverifiable public privacy claims.

---

## 2. Current Architecture

### Stack and Runtime

- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, PostCSS.
- Client-heavy pages use direct Supabase browser queries; Next.js route handlers provide AI, billing, admin, export, notification, cron, and translation operations.
- Supabase provides Auth and PostgreSQL. Browser access depends on production Row Level Security (RLS); privileged routes use `supabaseAdmin` and therefore bypass RLS.
- Stripe provides recurring Monthly, Yearly, and Founder-price subscriptions and the customer portal.
- OpenAI powers chat, planning, summaries, translation, task extraction, image generation, and voice transcription. Resend sends scheduled/product emails.
- Vercel hosts the application and four scheduled jobs. Google/Meta/Plausible/Vercel provide analytics or advertising measurement.
- PWA assets include a web manifest, service worker, offline page, push subscriptions, and Android TWA/Play Integrity integration.

Evidence: [package.json](package.json), [app/layout.tsx](app/layout.tsx#L1), [vercel.json](vercel.json), [lib/supabaseClient.ts](lib/supabaseClient.ts), [lib/supabaseAdmin.ts](lib/supabaseAdmin.ts).

### Application Composition

The root layout wraps every route in UI language, demo, focus, boot, RTL, shell, global focus player, global screen recorder, service worker, and analytics concerns. It also sets `dynamic = "force-dynamic"`, so even public/legal content cannot benefit from normal static rendering. Global product utilities increase consistency but also make the root client/runtime surface heavy.

The theme system uses `data-theme` and CSS variables, then bridges selected hard-coded Tailwind classes with `!important`. This is a migration layer rather than a complete design system. Feature pages frequently own their own card, form, loading, error, and gating patterns.

### Important Data Flows

| Flow | Current implementation | Audit note |
|---|---|---|
| Authentication | Supabase email/password and callback/reset pages; client session persistence | Confirmation enforcement depends partly on Supabase configuration and is not consistently asserted server-side. |
| User content | Browser Supabase queries scoped with `user_id` | Security depends on production RLS, whose policies/migrations are absent from the repository. |
| Daily Success | `daily_scores`, AI morning/evening/suggest APIs, client-computed average/streak | Score is self-rated; supported metrics must be labeled accordingly. |
| Weekly learning | Scores/tasks/notes -> weekly report route -> `weekly_reports` and email | Strong product loop; reliability and entitlement behavior need tests and production logs. |
| AI use | Client posts a `userId`; handlers call OpenAI and increment `ai_usage` | At least one route does not authenticate the claimed identity or pre-check quota. Centralize this boundary. |
| Billing | Authenticated checkout -> Stripe -> webhook/profile plan -> portal | Core state machine exists; event replay handling and reconciliation should be documented and tested. |
| Notifications | User settings + push subscription + Vercel cron | Time-zone handling exists in parts; delivery observability is not evident. |
| Export/deletion | Markdown export route; deletion information/email process | Export is insecure as implemented; in-app deletion implementation was not found. |

### External and Transfer Dependencies

Supabase project ownership, Stripe account/catalog/webhooks, OpenAI project/budgets, Resend domain, Vercel project/cron, Meta/Google/Plausible properties, DNS/domain, Google Play/TWA signing and Play Integrity service account, VAPID keys, affiliate accounts, and support mailbox all need a transfer register. Secret values are intentionally not reproduced here.

---

## 3. Complete Page/Route Inventory

“Gated” below means the page has an auth/demo gate in application code; it does not imply edge middleware protection.

### Public and Lifecycle Routes

| Route | Purpose | Current finding |
|---|---|---|
| `/` | Homepage/product tour/demo entry | Feature-led story, decorative hero, real screenshot carousel, pricing teaser, immediate guided modal. |
| `/auth` | Login/sign-up | Combined form with localization; confirm-email/error recovery needs clearer state design. |
| `/auth/callback` | Supabase auth callback | Transitional route; should preserve destination and provide a recoverable failure path. |
| `/auth/reset` | Password reset | Functional but visually hard-coded and less theme-consistent. |
| `/pricing` | Free/Pro/Founder comparison and checkout | Currency and monthly/yearly controls; repeated cards and ambiguous “unlimited 2,000/day” wording. |
| `/billing/success` | Server-rendered checkout confirmation | Useful fallback reconciliation; destination differs from checkout success URL behavior and needs an end-to-end test. |
| `/promo` | Promotional landing | Separate narrative increases brand/content maintenance and SEO-cannibalization risk. |
| `/tools` | Tool directory | Reinforces suite/catalog positioning; should become secondary discovery. |
| `/templates` | Template discovery | Mixed public/private/pro behavior; useful activation surface. |
| `/templates/[id]` | Template detail/use | Pro gate and template action; clarify outcome before upsell. |
| `/reviews` | Rating/review collection | First-party review surface; do not present as independent proof without clear attribution. |
| `/feedback` | Product feedback | Valuable direct channel; analytics helper currently does not send production custom events. |
| `/changelog` | Product updates | Good trust/retention asset; align brand and release ownership. |
| `/terms` | Current terms route | Duplicates `/legal/terms`; establish one canonical source and redirects. |
| `/privacy-policy` | Current privacy route | Contradicts globally loaded advertising trackers and omits those processors. |
| `/cookies` | Cookie/tracking policy | Says no advertising trackers while Meta/Google scripts load globally. |
| `/legal/terms` | Additional terms implementation | Duplicate legal surface risks divergence. |
| `/legal/privacy` | Additional privacy implementation | Contains placeholder contact/content and risks contradicting the other policy. |
| `/delete-account` | Deletion instructions | Describes email/manual handling; repository-backed in-app deletion was not found. |
| `not-found` | 404 state | Branded recovery exists; include relevant safe destinations. |

### Core Product Routes

| Route | Purpose | Gate/data | Current finding |
|---|---|---|---|
| `/onboarding` | Preference/onboarding flow | Profile/local state | Valuable personalization inputs; too much setup before proven value is a risk. |
| `/dashboard` | Daily overview and action hub | Supabase + AI; demo-aware | Attempts to answer today/progress/insight but contains setup, weather, plan, AI usage, upgrade, level, glance, Focus, AI summary, goals, wins, recent activity, links, and feedback. |
| `/daily-success` | Morning plan, evening reflection, daily score | `daily_scores` + AI | Strongest signature candidate; morning/evening appear side-by-side and scoring competes with both. |
| `/notes` | Capture/edit/AI cleanup/task extraction | Supabase + AI; demo-aware | Strong capture workflow; many secondary controls need progressive disclosure. |
| `/tasks` | Task CRUD, completion, dates/reminders/repeat | Supabase; demo-aware | Core “Do” input; should surface today/next rather than remain isolated. |
| `/planner` | AI/day planning | Supabase + AI | Overlaps Daily Success morning and AI Task Creator; clarify role and handoffs. |
| `/calendar` | Scheduled task view | Supabase | Useful temporal view; ensure mobile day agenda is primary over dense calendar grid. |
| `/ai-chat` | General AI Hub chat | OpenAI; attachment Pro gate | Generic assistant overlaps global assistant and companion. |
| `/ai-companion` | Reflection-oriented AI coach | OpenAI | More differentiated than generic chat; safety language exists but should be policy-reviewed. |
| `/ai-task-creator` | Generate tasks from text | OpenAI | Valuable action best embedded in Notes/Plan while preserving route/deep links. |
| `/weekly-reports` | Weekly report list | `weekly_reports`; Pro messaging | Central Pro value; emphasize interpretation and next actions, not only generated text. |
| `/weekly-reports/[id]` | Report detail | `weekly_reports` | Needs transparent source period, data basis, and recommendation actions. |
| `/weekly-history` | Historical/trend presentation | Scores/reports; Pro gate | Naming overlaps weekly reports; merge conceptually while preserving URLs. |
| `/settings` | Preferences, language, notifications, themes, export | Profile + push + export | Comprehensive but long; account/data controls deserve a dedicated section and secure APIs. |
| `/travel` | AI itinerary and affiliate booking links | OpenAI + external links | Functional utility but strategically secondary; disclose affiliate relationships. |
| `/my-trips` | Saved trip list/details | Supabase | Retain for existing users under More/Specialized. |

### Admin Routes

| Route | Purpose | Finding |
|---|---|---|
| `/admin` | Operations/test-email overview | Email-gated UI; server endpoints must independently verify every request. |
| `/admin/metrics` | Product metrics | Current DAU/WAU are AI-user activity, not whole-product active use. |
| `/admin/users` | User management/list | Dense desktop-oriented grid; sensitive operations need audit logging and role-based authorization. |
| `/admin/users/[id]` | User detail | High-risk support surface; document legitimate uses and least privilege. |
| `/admin/translations` | Translation operations | Useful at 26-language scale; AI translation cost and review state need visibility. |
| `/admin/reviews` | Review moderation | Preserve provenance and moderation history. |
| `/admin/email-log` | Email operations/log | Good operational intent; retention and personal-data access require documentation. |
| `/changelog/admin` | Changelog administration | Inconsistent admin URL namespace; server authorization is the controlling requirement. |

### API Inventory by Domain

There are 54 route handlers: AI/chat (`ai-hub-chat`, thread, `ai-companion-chat`, `assistant`, `ai-task-creator`, `ai-summary`, `ai-digest`, `ai-translate`, `ai-images`, `ai-travel-plan`, note-to-tasks, daily plan/success/score, weekly goal/action/report, voice); Stripe (checkout, confirm, portal, webhook); schedules (daily, weekly, digest, notifications, reminders); push/notifications; reviews/feedback; translations; admin metrics/revenue/system flags/email/translation/reviews; task completion; travel click; export; integrity; health; and scripts. Security review should inventory the accepted identity and authorization method for every handler, not only page gates.

---

## 4. Current Design System

### Foundations

- **Typography:** Inter is loaded at the root, while `body` also declares a system stack. Hierarchy relies mainly on weight and size. Brand character is limited.
- **Color:** Tokens cover body/elevated/card, two border strengths, main/muted text, accent/soft/contrast. Blue/indigo is present but not consistently the unmistakable brand anchor.
- **Themes:** default, Light, Ocean, Purple, Forest, Sunset, Halloween, Christmas, Easter, Gold, Silver, Cyberpunk, Nordic, Midnight, Nebula, and Rainbow. Settings mark seven as Pro, while guest behavior exposes all themes.
- **Spacing/layout:** Tailwind spacing with recurring `max-w-3xl`/`max-w-5xl`; no explicit documented spacing scale or density rules.
- **Shape:** `rounded-xl`, `rounded-2xl`, and `rounded-3xl` are pervasive. Almost every section becomes a card, weakening hierarchy.
- **Icons:** Lucide is installed and used in navigation, but emoji remain common in headings, buttons, metrics, and status copy. This creates translation and accessibility inconsistency.
- **Motion:** fade, float, pulse, shimmer, confetti, Framer Motion, and an infinite rainbow background exist. No global `prefers-reduced-motion` treatment was found.

Evidence: [app/globals.css](app/globals.css#L1), [app/components/AppHeader.tsx](app/components/AppHeader.tsx#L1), [app/settings/page.tsx](app/settings/page.tsx#L24).

### Components and States

There are reusable providers and feature components, but not a mature primitive library. Buttons, fields, cards, dialogs, alerts, badges, skeletons, tabs, empty states, and error states are repeatedly composed with utility strings. This causes inconsistent radii, target sizes, focus treatment, semantic behavior, and theme support.

Loading and empty states are generally present in data-heavy pages. They are less consistently announced to assistive technology; error/success text often lacks `aria-live`, AI operations lack standardized `aria-busy`, and retry actions are inconsistent. Modal behavior exists, but focus trapping/restoration and background inertness require a systematic test.

### Key Inconsistencies

1. The theme token bridge overrides selected Tailwind classes rather than eliminating raw palette usage.
2. Light and dark are product necessities, while many novelty themes fragment quality assurance and brand recognition.
3. Theme names such as Rainbow/Cyberpunk/Luxury Gold conflict with “calm, intelligent, mature.”
4. Brand copy alternates among AIProd, AI Productivity Hub, and AlphaSynth AI.
5. Marketing uses decorative gradients, blurred color orbs, emoji, and a 3D hero while the stated product direction favors real UI.
6. Cards and pills are overused; clear page bands, tables, lists, and unframed workflows would improve scanability.

---

## 5. UX Audit

### Cross-Product Findings

- **Navigation overload:** desktop puts Dashboard, Pricing, and 14 Apps behind a two-column menu; mobile exposes an even longer route list. Frequency and product hierarchy are not encoded.
- **Overlapping concepts:** Planner, Daily Success morning, AI Task Creator, AI Chat, global AI Assistant, and AI Companion have adjacent jobs without clear boundaries.
- **Demo/auth ambiguity:** public exploration is useful, but locally stored guest work and authenticated persistence should be unmistakably distinguished before a user invests effort.
- **Dashboard density:** valuable elements exist, but many widgets compete at the same visual level and duplicate content farther down the page.
- **Progress semantics:** “Bio-Rhythm,” levels, streaks, and scores can feel meaningful, but must clearly distinguish self-rating, observed behavior, and AI interpretation.
- **Interruption:** on a fresh deployed homepage visit, a guided “What do you want to work on right now?” overlay obscured both 378 px and 1440 px views before the value proposition could be evaluated.
- **State fragmentation:** pages implement bespoke alerts, confirms, skeletons, and gates. A coherent state model would improve trust and accessibility.

### Page-by-Page Priorities

- **Auth/onboarding:** shorten time to first saved value. Ask only language/time zone/use case initially; defer AI tone, theme, and notifications until context makes them useful. Confirm what will be saved and how demo content migrates.
- **Notes/tasks:** preserve rich capabilities, but lead with capture and today/completion. Put AI cleanup, recurrence, translation, and advanced reminder options behind contextual menus or expandable sections.
- **Planner/calendar:** define Planner as prioritization and sequencing; Calendar as time placement. A task should move between them without duplicate entry.
- **AI pages:** keep Companion as reflective coaching; make general Chat a contextual command surface; embed task extraction where source text exists. Preserve old URLs as focused/full-screen modes.
- **Reports/history:** one Insights architecture should include weekly reports, trend history, and Daily Success history. Each insight should show its evidence window and offer a next action.
- **Templates:** use templates to accelerate activation from intent to first plan/task/note. Rank by workflow outcome rather than feature type alone.
- **Travel/my trips:** retain under More. Clearly disclose affiliate links near outbound actions and do not let travel dominate core positioning.
- **Settings:** organize as Profile & Preferences, Notifications, Appearance, Plan & Billing, Data & Privacy. Move developer/diagnostic behavior out of customer settings.
- **Feedback/reviews/changelog:** preserve as trust and learning channels. Trigger feedback contextually and never manufacture social proof.
- **Admin:** optimize for operational accuracy and auditability rather than matching customer visual polish first.

---

## 6. Homepage / Marketing Audit

### Current Story

The live hero says “Your AI workspace for focus, planning & tiny wins,” with a badge listing weekly reports, travel planner, and Daily Success. This answers category only broadly and does not explain why the product is different. Travel receives first-viewport prominence despite being secondary to the desired productivity-improvement story. The section “A small toolkit” and the tool grid further reinforce a collection-of-tools model.

The homepage does include real screenshots for Dashboard, Planner, Reports, Travel, and Focus. This is the strongest marketing asset and should replace the decorative 3D hero as the primary visual proof. Current image alt text is generic in places, and screenshots should be refreshed against the final coherent UI.

### Conversion and Trust

- “Free plan included” and no-credit-card language reduce entry friction.
- Pricing is visible, but “Start free. Upgrade when it becomes part of your day” does not state the Pro outcome.
- “100% CLEAN / Ads Free. Forever / No trackers” is false or at least materially misleading while Meta Pixel, Google Ads/Analytics, and GTM load globally.
- “Built for solo makers, students and busy humans” is broad and makes prioritization difficult.
- First-party reviews can support trust only when labeled as user-submitted AIProd reviews; fake testimonials or statistics must never be introduced.
- Footer brand/ownership copy is inconsistent with product and legal pages.
- Duplicate promo/tools/legal routes diffuse SEO authority and content ownership.

### Recommended Positioning

**AIProd helps you plan your work, follow through, and learn what improves your days.**

Supporting story: capture tasks and notes, focus on what matters today, measure a simple daily result, and receive evidence-based weekly interpretation. AI assists the loop; it is not the product identity by itself.

---

## 7. Dashboard Audit

### Current State

The dashboard contains useful building blocks: weather, personalized/setup content, an action hub, weekly goal, Daily Success shortcuts, plan/AI usage, upgrade teaser, level progress, glance, Focus Mode, AI summary, wins, recent activity, quick links, and feedback. This breadth demonstrates product capability but forces users to decide which widget matters.

### Recommended Hierarchy

1. **Primary: What should I do today?** Greeting/date, Daily Success status, top three priorities, next scheduled item, and one Focus action.
2. **Secondary: How am I doing?** Today’s completed/total tasks, self-rated Daily Success score when available, current streak with definition, and a small 7-day comparison.
3. **Tertiary: What should I know?** One deterministic or AI insight with evidence and a clear next action.
4. **Utility:** Quick capture for task/note, resume Focus, and a compact More menu.

Weather should appear only when relevant to scheduled/travel context. AI usage belongs in account/AI UI, not as a primary dashboard metric. Upgrade messaging should be contextual, for example after a user has enough history for a useful trend, rather than occupying permanent premium space.

### Empty and New-User State

For a new user, the dashboard should become a three-step activation path: add or choose today’s priority, complete a Focus/task action, then close the day with Daily Success. Do not show empty trend, level, report, and history cards simultaneously.

---

## 8. Feature Architecture

### Current Relationship

| Product job | Existing inputs/tools | Current issue |
|---|---|---|
| Plan | Planner, Daily Success morning, weekly goal, AI Task Creator, templates | Several entry points perform similar decomposition. |
| Do | Tasks, Calendar, Focus Mode, reminders | Not consistently presented as one execution system. |
| Measure | Daily score, completion, focus activity, streak/level | Metric definitions and data provenance are unclear. |
| Learn | Weekly reports/history, AI summaries, Companion | Valuable but separated across routes and gates. |
| Improve | Suggested plans/goals/tasks | Recommendations do not visibly close the loop into next-week behavior. |
| Capture | Notes, voice, chat, task extraction | Strong capabilities; too many destinations and controls. |
| Specialized | Travel, trips, recorder, themes | Useful to some users but visually competes with core value. |

### Direction

Do not delete features. Establish one core loop and treat tools as ways to enter or advance it. Preserve deep links. Secondary tools can remain under More, command search, and contextual launch points. Use product analytics to determine which items deserve persistent navigation.

---

## 9. Daily Success Audit

### Existing Supported Experience

- Morning: free text plus three priorities -> AI-generated plan -> open in assistant or create tasks.
- Evening: reflection -> AI interpretation -> optional task creation.
- Score: self-selected 0-100 daily score stored in `daily_scores`; a score of at least 60 contributes to the displayed streak.
- History: recent scores, seven-day average, optional energy level, and a “Bio-Rhythm: Energy vs Success” chart.
- AI score suggestion: uses saved activity to propose a score and reasoning.

Evidence: [app/daily-success/page.tsx](app/daily-success/page.tsx#L249), [app/components/BioRhythmChart.tsx](app/components/BioRhythmChart.tsx), [app/api/daily-score/suggest/route.ts](app/api/daily-score/suggest/route.ts).

### What the Data Can Legitimately Support Now

- User-entered daily score and energy.
- Score history, arithmetic averages, and a streak under the explicit `score >= 60` rule.
- Stored tasks and completion states/dates where populated.
- Notes and planner content where stored.
- Focus data only if sessions are durably recorded; this must be verified before marketing focus metrics.

### What Must Not Yet Be Claimed

“Productivity,” “consistency,” “improvement,” causal patterns, workload balance, or focus effectiveness are not automatically established by a self-rating or AI output. Any new score should publish its formula, data completeness, and limitations. “Bio-Rhythm” implies physiological measurement that the implementation does not provide; rename it to “Energy and Daily Success” unless scientifically supported.

### Signature Experience Proposal

Use one restrained **Daily Success ring/scorecard** with explicit inputs, not a gamified universal productivity grade. Morning establishes intent; tasks/Focus record execution; evening captures context; the weekly review compares the user with their own baseline. AI interpretation should cite source facts such as “4 of 6 planned tasks completed” and distinguish observation from suggestion.

---

## 10. AI Integration Audit

### Current Surfaces

General chat, Companion, global assistant, task creator, note-to-tasks, summaries, digest, translation, images, travel planning, voice transcription, Daily Success morning/evening/score, daily planning, weekly goal/action/report, and scheduled emails all use AI or AI-adjacent processing.

The use of smaller models for most text workflows is cost-conscious. Companion includes a non-therapist stance and crisis-response guidance, which is a responsible foundation but not a substitute for expert safety review.

### Risks

- Identity and entitlement checks are repeated and inconsistent. At least `ai-hub-chat` trusts `userId`, accepts guest/demo prefixes, and lacks a pre-call server quota.
- “Guest” limits are local/client concepts and cannot protect paid APIs.
- Attachments are sent as text content with no visible aggregate size/type/token budget in the audited handler.
- Inputs, history, files, and outputs need explicit length limits, timeouts, model allowlists, and structured error handling.
- AI-generated plans/reports can overstate conclusions if data provenance is not shown.
- Translation/report/email automation creates cost and quality exposure at 26-language scale.
- AI content sent to providers and retention/subprocessor behavior require accurate disclosure.

### Opportunity Principles

1. Prefer deterministic insights for counts, trends, and comparisons; use AI for interpretation and wording.
2. Generate weekly interpretation asynchronously only when enough new data exists.
3. Cache/reuse reports; do not regenerate unchanged history.
4. Ask for confirmation before AI creates or modifies tasks.
5. Present source facts and confidence; never imply clinical or scientific authority.
6. Centralize authenticated user, plan, quota, request size, model, timeout, and telemetry enforcement.

---

## 11. Free / Pro Audit

### Current Communicated Entitlements

| Capability | Free | Pro / Founder | Confidence |
|---|---|---|---|
| Notes/tasks/basic reminders | Included | Included | Communicated and implemented in UI. |
| Daily Success score | Included | Included | Implemented. |
| AI usage | 10 calls/day | “Unlimited” and 2,000/day are both stated | Numeric limit exists in UI; enforcement is inconsistent server-side. |
| Weekly AI email reports/goals | Upgrade value | Included | UI/API paths exist; verify every server gate and schedule in production. |
| Attachments | Blocked | Included | Checked in audited AI Hub API, but identity is caller-supplied there. |
| Premium templates/trip saving/themes | Mixed or locked | Included in pricing claims | Enforcement differs by feature and needs a single entitlement map. |
| Founder | N/A | Pro capabilities at locked recurring price | It is a recurring subscription price, not lifetime access after cancellation. |

### Recommended Value Architecture

- **Free: Organize your productivity.** Capture notes/tasks, plan today, use Focus, record Daily Success, and receive a limited current-week view.
- **Pro: Understand and improve your productivity.** Historical comparisons, Weekly AI Reports, pattern interpretation, evidence-linked recommendations, deeper history, and expanded AI capacity.

Do not change pricing or entitlements from this audit. First create a server-owned entitlement matrix and remove contradictions. Upgrade prompts should appear when value is tangible: after enough Daily Success history, on a locked historical comparison, after a weekly preview, or when an AI limit is reached. Avoid permanent dashboard ads and repeated blocking dialogs.

---

## 12. Mobile / PWA Audit

### Strengths

- Main pages use responsive stacks and grids; the deployed homepage had no horizontal overflow at 378 px.
- Manifest defines standalone mode, multiple icon sizes, and Notes/Tasks/Dashboard shortcuts.
- Service worker provides an offline fallback and static caching.
- Push subscription/settings and Android TWA/Play Integrity integration represent meaningful investment.
- Viewport and safe responsive widths are generally present.

### Findings

- Fresh mobile homepage is covered by the guided modal; at 378 x 900 it occupies most of the viewport and hides the underlying proposition.
- Mobile navigation lists nearly every feature and requires scanning rather than supporting repeated daily action.
- Many visible controls use compact text and heights below a robust 44 px touch target.
- Long settings and complex task/travel forms need keyboard, safe-area, sticky-action, and scroll-restoration testing on real iOS/Android devices.
- Dense charts/calendar/admin grids need list or agenda alternatives, not horizontal compression.
- Service-worker cache versioning is manual; offline fallback does not prove authenticated workflows work offline.
- Push delivery, permission recovery, TWA integrity, install prompts, and notification deep links require an actual device test matrix.

### Required Viewports

Add screenshot and interaction coverage at 1440 x 900, 1280 x 800, 1024 x 768, 768 x 1024, 430 x 932, and 360 x 800. Include virtual keyboard open, landscape, text zoom 200%, reduced motion, long translated copy, RTL, and standalone PWA mode.

---

## 13. Accessibility Audit

### Positive Foundations

Semantic headings, labels, some ARIA attributes, keyboard Escape behavior, Lucide icons, and responsive text are present. The design can become accessible without architectural replacement.

### Gaps

1. No skip link or consistently identified main content target.
2. Menus/dialogs need verified focus trap, arrow-key behavior where applicable, focus restoration, `aria-modal`, and background inertness.
3. Status/error/AI output often lacks `aria-live`; loading controls lack standardized `aria-busy`.
4. Icon/emoji-only controls do not consistently expose names; decorative emoji can pollute announcements.
5. Focus styles rely on browser defaults or local classes rather than a guaranteed visible token.
6. Contrast is unverified across 16 themes, disabled states, chart colors, gradients, and translucent surfaces.
7. Infinite gradient, float, pulse, shimmer, smooth scroll, and confetti do not have a global reduced-motion fallback.
8. Charts need a text summary or data table and should not communicate meaning by color alone.
9. Small text and controls risk failing target-size/readability expectations.
10. Native `alert`/`confirm` use is inconsistent and difficult to style/accessibly contextualize.

Target WCAG 2.2 AA with automated checks plus keyboard and screen-reader testing. Accessibility belongs in primitives and tokens, not page-by-page patches.

---

## 14. Performance Audit

- Root `force-dynamic` prevents normal static optimization of homepage, legal, pricing, and other stable content.
- The root mounts many providers and global utilities on every route, including screen recording, focus, service worker, localization, and multiple tracking stacks.
- Google Ads script is included twice, alongside GTM, GA, Meta Pixel, Plausible, and Vercel Analytics.
- Client-heavy pages issue multiple sequential Supabase queries and own large stateful components; dashboard and Daily Success are particularly large.
- Theme bridge selectors and many translucent/blurred/animated surfaces increase style and paint complexity.
- Remote screenshot images exist and should use explicit responsive sizing, modern formats, and measured LCP behavior.
- No bundle budgets, Web Vitals SLOs, synthetic monitoring, or regression tests were found.
- Manual service-worker cache naming risks stale assets and support incidents.

Recommended baseline before redesign: route-level JS, LCP/INP/CLS by device, Supabase request count/latency, AI latency/error rate, image bytes, and third-party script cost. Make stable marketing/legal routes static, lazy-load global utilities by route/intent, and consolidate tracking.

---

## 15. Analytics Audit

### What Exists

- Plausible provider, Vercel Analytics, Google Ads/Analytics/GTM, Meta Pixel PageView, and limited direct `gtag` usage.
- `useAnalytics()` call sites name events, but the helper only logs in development and sends nothing in production.
- Admin metrics include total users, Pro users, notes/tasks totals and seven-day creation counts, AI calls, and unique AI users today/week.
- Travel affiliate clicks have a dedicated endpoint.

### What Can Currently Be Measured Reliably from Repository Evidence

- Account/profile totals and current plan counts, subject to database quality.
- Notes/tasks counts and recent creation.
- AI usage increments where handlers call the helper successfully.
- Travel clicks where the endpoint is invoked.
- Stripe conversions/cancellations in Stripe itself, though product-funnel joins and reconciliation are not demonstrated.

The admin labels “DAU” and “WAU” are actually unique users with rows in `ai_usage`; they are not whole-product active users.

### Missing or Unverified

Registration completion, activation, whole-product DAU/WAU/MAU, cohort retention, first task/note, task completion, Daily Success morning/evening/score, Focus sessions, report view/use, feature adoption, upgrade impression, pricing view, checkout start, checkout completion attribution, cancellation reason, acquisition source, onboarding step drop-off, and experiment assignment are not coherently instrumented.

### Privacy-Respecting Instrumentation Plan

Define anonymous/pseudonymous events with no note/task/prompt text:

- Funnel: `landing_view`, `signup_started`, `signup_completed`, `onboarding_step_completed`, `activation_completed`.
- Core loop: `priority_created`, `task_completed`, `focus_started/completed`, `daily_plan_completed`, `daily_reflection_completed`, `daily_score_saved`, `weekly_report_viewed`, `recommendation_applied`.
- Conversion: `upgrade_prompt_viewed` with context, `pricing_viewed`, `checkout_started`, server-confirmed `subscription_started`, `subscription_cancelled`.
- Quality: AI feature, model class, latency, success/failure, token/cost bucket, quota rejection; never raw content.

Define activation before collection, for example: within seven days, a user creates a priority/task, completes one execution action, and saves one Daily Success reflection/score. Baseline cohorts for at least several weeks before major navigation/dashboard changes. Select one analytics governance model and update consent/policies accordingly.

---

## 16. Trust / Privacy Audit

### Critical Contradiction

[app/layout.tsx](app/layout.tsx#L84) globally loads Google Ads/Analytics, GTM, and Meta Pixel without a visible consent gate. [app/cookies/page.tsx](app/cookies/page.tsx#L74) says AIProd does not use third-party advertising cookies or targeted-ad trackers. [app/privacy-policy/page.tsx](app/privacy-policy/page.tsx#L62) says only anonymized Plausible usage is collected and no invasive/advertising tracking is used. The live homepage additionally claims “No trackers.” These cannot all be true.

### Other Findings

- The repository contains duplicate privacy/terms implementations, increasing legal inconsistency risk.
- Public copy claims RLS protects every record, but schema/policy migrations are not in the repository; verify production policies independently.
- Export includes only notes/tasks, not all account data mentioned across policy/product.
- No authenticated deletion handler or in-app deletion action was found; the deletion page describes an email process.
- AI provider naming, content transmission, retention, subprocessors, international transfers, legal basis, user controls, and training policy need counsel-reviewed accuracy.
- Travel affiliate relationships should be disclosed adjacent to links and in relevant legal pages.
- Billing terms should state renewal, taxes/currency, cancellation effect, refund policy, Founder recurring-price semantics, and support contact consistently.
- Do not claim GDPR compliance, absolute security, “ads free,” “no trackers,” or deletion timelines until operationally verified.

---

## 17. Acquisition Readiness Audit

### Risk Register

| Area | Evidence/risk | Buyer impact | Required evidence/remediation |
|---|---|---|---|
| Data authorization | Export trusts `userId` and uses service role | Potential cross-user disclosure | Fix, test, review logs, incident assessment. |
| AI abuse/cost | Inconsistent identity/quota checks; guest IDs accepted | Unbounded variable cost and abuse | Central gateway, quotas, budgets, alerts, tests. |
| Cron security | Missing secret causes auth bypass | Unauthenticated scheduled operations | Fail closed and monitor configuration. |
| Privacy/consent | Policy conflicts with Meta/Google scripts | Regulatory and reputational liability | Consent/legal review or remove trackers. |
| Database governance | No schema/RLS migrations in repo | Security and transfer uncertainty | Version schema, policies, functions, backups, restore test. |
| Quality controls | No automated tests or CI workflow | High regression/key-person risk | Critical-flow tests and required CI checks. |
| Billing controls | Webhook behavior lacks documented event ledger/reconciliation | Entitlement/support risk | Idempotency strategy, replay tests, reconciliation job/runbook. |
| Account rights | Partial export; deletion implementation/process unclear | Compliance/support risk | Complete authenticated export/deletion and evidence process. |
| Observability | No visible SLOs/alerts for AI, cron, email, webhook | Hidden incidents | Dashboards, alerts, ownership, runbooks. |
| Documentation | README/setup/env/operations are incomplete | Slow transfer and founder dependency | Architecture, env inventory, deploy/rollback/runbooks. |
| Third parties | Many owner-controlled external accounts | Transfer complexity | Vendor/account/contract/data-flow register. |
| Brand/IP | AIProd/Hub/AlphaSynth inconsistency; asset provenance unclear | Trademark/IP diligence | Brand decision, domain/trademark and asset/license register. |
| Localization | 26 locales with AI fallback and admin sync | Quality/support overhead | Source-of-truth, review status, fallback and cost policy. |
| Dead/duplicate surfaces | Duplicate legal routes, cron naming, overlapping AI pages | Maintenance risk | Usage-based consolidation with redirects. |

### Production Verification Required

RLS policies; backups/restore; retention/deletion logs; Supabase email-confirmation configuration; secret rotation; webhook and cron success logs; OpenAI/Resend/Stripe budgets and alerts; uptime/incident history; real accessibility/Core Web Vitals; revenue/churn/refunds; licenses and IP ownership; domain/vendor account ownership; tax/VAT handling; support SLAs; and Android signing/Play Console transfer cannot be proven from the repository.

---

## 18. Proposed AIProd Design System v2

### Principles

1. **Calm focus:** one primary action and one dominant information layer per view.
2. **Evidence before decoration:** real product data and clear charts over generic AI visuals.
3. **Blue intelligence:** retain blue as the recognizable action/data color, supported by neutral ink, cloud, green success, amber caution, and red danger.
4. **Progressive disclosure:** advanced AI and specialized utilities remain available without crowding daily workflows.
5. **Accessible by construction:** contrast, focus, motion, targets, semantics, and long translations are primitive-level requirements.
6. **Honest intelligence:** distinguish user input, measured fact, derived metric, and AI recommendation.

### Recommended Foundations

- **Brand:** AIProd wordmark primary. “AI productivity workspace” is a descriptor, not a competing name. Evolve the existing logo only after testing legibility at 16/24/32 px and app-store contexts.
- **Typography:** one expressive but highly legible display face for product/marketing headings and a neutral UI sans for dense work surfaces. Keep loading optimized and test non-Latin fallback coverage.
- **Color:** one Light and one Dark semantic system first. Use blue for primary actions/selected data, green for confirmed success, amber for attention, red for danger, and multiple neutral surface levels.
- **Theme policy:** preserve existing theme IDs for compatibility, but classify novelty themes as legacy/personalization. Do not make them the default or a core Pro proposition. QA Light/Dark first.
- **Spacing:** documented 4 px base scale; density modes are unnecessary initially. Use 8 px card radius and 6-8 px control radius unless an existing component requires otherwise.
- **Components:** Button, IconButton, LinkButton, Field, Textarea, Select, Checkbox/Switch, SegmentedControl, Tabs, Menu, Dialog, Drawer, Toast/InlineAlert, Tooltip, Badge, Progress, Skeleton, EmptyState, DataCard, list/table, and chart summary.
- **States:** default/hover/active/focus-visible/disabled/loading/error/success/empty/offline/locked for every interactive primitive.
- **Motion:** 120-220 ms functional transitions; no ambient infinite animation in core workflows; global reduced-motion mode.

### Visual Language

Use unframed page sections and restrained dividers for structure. Reserve cards for repeated records, metrics, dialogs, and genuinely bounded tools. Replace emoji labels with Lucide icons plus text. Use charts only when comparison is the task; pair every chart with a concise textual interpretation and source period.

---

## 19. Proposed Information Architecture

### Primary Navigation

| Group | Destination | Contents |
|---|---|---|
| **Today** | `/dashboard` | Daily Success status, priorities, next item, Focus, daily progress. |
| **Tasks** | `/tasks` | Inbox/today/upcoming/completed; calendar entry points. |
| **Notes** | `/notes` | Capture, journal/reflection category, AI cleanup/task extraction. |
| **Plan** | `/planner` | Weekly goal, prioritization, calendar placement, templates. |
| **Insights** | `/weekly-reports` | Daily history, weekly reports, trends, recommendations. |

### Secondary Navigation

- **AI:** contextual command/search plus full-screen Chat and Companion modes.
- **More:** Templates, Calendar alternate view, Travel, My Trips, recorder, Changelog, Feedback, Reviews.
- **Account:** Plan/Billing, Settings, language, notifications, data/privacy, install app, logout.

On mobile, use a stable bottom or compact primary navigation for Today, Tasks, Capture, Insights, and More, after usage data validates those priorities. Keep direct URLs and add redirects only when a route is genuinely consolidated. Frequently used Calendar or Notes can be promoted based on per-user behavior later.

---

## 20. Proposed Homepage Structure

1. **Header:** AIProd, Product, Pricing, Trust, Log in, Start free. Keep the full app directory out of the first navigation layer.
2. **Hero:** “AIProd helps you plan your work and improve how you work.” Supporting Plan -> Do -> Measure -> Learn -> Improve copy. Primary CTA “Start free”; secondary “See how it works.” Use a real Today/Daily Success product capture as the visual hero.
3. **Improvement loop:** five compact steps using actual UI snippets and outcomes, not a feature icon grid.
4. **Today experience:** show priority, next action, Focus, and Daily Success in one realistic screen.
5. **Weekly learning:** show a real, clearly anonymized report/trend example and how a recommendation becomes next week’s plan.
6. **Capture and integrations:** notes, tasks, voice, calendar, and AI as inputs to the loop. Keep specialized tools secondary.
7. **Who it is for:** choose one or two evidence-backed primary jobs; avoid “everyone busy.”
8. **Trust:** accurate provider/privacy summary, export/delete controls, clear support, transparent AI explanation. No unverifiable badges or claims.
9. **Free vs Pro:** Free organizes today; Pro reveals history, patterns, and recommendations. Show exact current limits and billing semantics.
10. **Final CTA/footer:** start free, log in, pricing, legal, changelog, support, ownership. One canonical brand and legal route set.

Do not auto-open onboarding over the hero. Trigger the intent prompt after the visitor chooses Start free/demo, and preserve their answer into the first product action.

---

## 21. Proposed Dashboard Structure

### Returning User

1. Header: greeting, date, compact Daily Success status.
2. Today: three priorities/tasks, next calendar item, quick capture.
3. Focus: one prominent start/resume control with selected task.
4. Progress: completed/planned, current self-score if entered, seven-day comparison.
5. Insight: one evidence-linked observation or weekly recommendation.
6. Secondary strip: Notes, Plan, Calendar, Reports, More.

### New User

1. Choose or add the most important outcome today.
2. Turn it into tasks or start a short Focus session.
3. Return for evening reflection and score.

### Pro Conversion

Show an insight preview only after enough history exists: “You have 7 Daily Success entries. Pro can compare your strongest days and prepare a weekly recommendation.” Keep exact data local/deterministic until the user opts to generate AI interpretation.

---

## 22. Prioritized Improvements

Effort assumes one experienced product engineer with design support: **S** <= 3 days, **M** 1-2 weeks, **L** 3-6 weeks. Risk describes implementation risk, not problem severity.

### P0 - Critical

| Problem | Evidence | Proposed solution | Expected benefit | Risk | Effort | Likely files/components |
|---|---|---|---|---|---:|---|
| Export can query any supplied user ID through service role | Handler has no auth/ownership check | Derive user from verified bearer/session server-side; ignore body identity; test cross-user denial; assess logs | Prevent data disclosure and restore trust | Low | S | `app/api/export/route.ts`, settings export, auth helper, tests |
| AI APIs can trust arbitrary/guest identity and spend before quota check | AI Hub accepts `userId`/demo prefix and calls OpenAI before `bumpAiUsage` | Central authenticated AI gateway; server guest token/rate limit; atomic preflight quota; IP/account throttles; request/token/model budgets | Protect cost, availability, and entitlement integrity | Medium | M | `lib/aiUsageServer.ts`, all AI/voice/image routes |
| Cron authentication fails open | Missing `CRON_SECRET` returns success from verifier | Fail closed with 500/503; startup/config check; rotate secret; alert on unauthorized/config failure | Prevent unauthorized scheduled operations | Low | S | `lib/verifyCron.ts`, cron routes |
| Tracking contradicts public policy and loads without consent | Global Meta/Google/GTM versus “No trackers”/Plausible-only copy | Decide lawful measurement model with counsel; remove unnecessary trackers or add compliant consent; deduplicate scripts; update all copy | Legal/trust alignment and lower page cost | Medium | M | root layout, cookies/privacy, homepage, consent component |
| RLS and privileged access are not reproducible from repo | Public claim exists; no versioned policies/schema | Export/version schema, RLS, RPCs, functions and migration history; test tenant isolation; review all service-role routes | Verifiable tenant security and transferability | Medium | M | Supabase migrations, data-access docs/tests |
| Account deletion claim is not backed by visible in-app workflow | Deletion page promises controls/process; authenticated delete endpoint not found | Implement re-authenticated deletion request, subscription handling, cascade/anonymization plan, confirmation and audit evidence; align SLA copy | User rights, support reliability, compliance | High | M | delete/settings pages, new server endpoint/job, policies |

### P1 - High Impact

| Problem | Evidence | Proposed solution | Expected benefit | Risk | Effort | Likely files/components |
|---|---|---|---|---|---:|---|
| Product feels like 14 unrelated apps | Apps menu and homepage feature catalog | Adopt Today/Tasks/Notes/Plan/Insights/More IA; preserve routes and deep links | Faster orientation, stronger identity, repeat use | Medium | L | AppHeader, mobile nav, route entry points |
| Dashboard lacks a dominant daily decision | Many similarly weighted widgets and duplicate sections | Recompose around Today, Focus, Progress, one Insight; contextualize secondary utilities | Activation and daily retention | Medium | L | dashboard, DashboardGlance/Weather/Level/Setup |
| Signature loop is fragmented | Daily Success, tasks, Focus, and reports are separate | Connect morning intent -> execution -> evening reflection -> weekly learning | Differentiation and habit formation | Medium | L | Daily Success, dashboard, tasks, Focus, reports |
| Brand is inconsistent | AIProd vs AI Productivity Hub vs AlphaSynth AI | Brand inventory; make AIProd primary; normalize metadata/UI/email/legal/footer; retain descriptor for SEO | Recognition, trust, buyer clarity | Low | M | layout, header, homepage, emails, manifest, legal |
| Homepage positioning is generic and first visit is interrupted | Live hero/overlay and decorative image | Outcome-led story; real Today UI hero; move guided prompt after CTA | Comprehension and signup conversion | Medium | M | homepage, onboarding/guided modal, screenshots |
| Free/Pro promise and enforcement conflict | “Unlimited” plus 2,000/day; scattered gates | Server-owned entitlement matrix; precise copy; Free organize / Pro understand framing | Conversion confidence and fewer support issues | Medium | M | pricing, dashboard, settings, APIs, email copy |
| Analytics cannot guide redesign | Production custom helper is a no-op; DAU/WAU mean AI users | Define activation/event schema; instrument core loop and server-confirmed billing; baseline cohorts | Evidence-led roadmap and measurable ROI | Medium | M | analytics library, flows, admin metrics, Stripe webhook |
| Legal/account surfaces are duplicated/incomplete | Two terms/privacy implementations and missing processors | Canonicalize routes with redirects; counsel-reviewed processor, AI, affiliate, billing, rights copy | Trust and lower legal drift | Medium | M | terms/privacy/cookies/delete, sitemap/robots |
| No automated protection for critical flows | No test script/dependencies or CI | Add focused unit/integration/E2E tests for tenant isolation, AI quotas, auth, billing, Daily Success; required CI | Safer evolution and buyer confidence | Medium | M | package/config, tests, CI workflow |
| Accessibility gaps are systemic | No reduced motion/live-state primitives; theme contrast unverified | Accessible primitives, focus/motion tokens, keyboard/SR/contrast tests to WCAG 2.2 AA | Broader usability and lower remediation cost | Medium | L | globals, shared components, major workflows |

### P2 - Valuable

| Problem | Evidence | Proposed solution | Expected benefit | Risk | Effort | Likely files/components |
|---|---|---|---|---|---:|---|
| Visual system is fragmented across 16 themes | Novelty palettes and Tailwind bridge | Ship polished Light/Dark semantic tokens; preserve legacy IDs; standardize radii, type, spacing, states | Premium coherence and faster QA | Medium | L | globals, ThemeProvider, settings, primitives |
| AI surfaces overlap | Chat, assistant, companion, task creator, embedded AI | Define roles; contextual AI command surface; keep full routes as deep modes | Lower cognitive load and better data context | Medium | M | AI pages/components/routes |
| Insights can overclaim self-rated data | “Bio-Rhythm,” productivity score/level language | Rename and disclose metric provenance/formulas; show data completeness and source period | Credibility and user understanding | Low | S | Daily Success, chart, level/report copy |
| Root rendering and scripts hurt performance | `force-dynamic`, many global utilities, duplicate scripts | Static public routes; route/intent lazy loading; script consolidation; performance budgets | Faster acquisition and mobile use | Medium | M | root/layout boundaries, global components, images |
| Mobile daily use requires too much scanning | Long menu, compact controls, dense forms/charts | Validate five-item primary mobile nav, 44 px targets, agenda/list alternatives, keyboard/safe-area QA | Better repeat mobile use | Medium | M | header/nav, calendar, forms, charts |
| Upgrade prompts are generic/permanent | Dashboard teaser and locked pages | Trigger contextually after demonstrated value; show report/history preview with exact entitlement | Higher conversion with less annoyance | Low | M | dashboard, reports/history, settings, gates |
| Export is incomplete even after authorization fix | Only notes and tasks exported | Add profile/preferences, scores, reports, plans/trips/other user data in structured portable formats | Trust and rights completeness | Medium | M | export route/settings/data model |
| Operational ownership is undocumented | Many vendors/crons/keys, sparse README | Architecture decision record, environment example, deploy/rollback, incident, vendor-transfer and data-flow docs | Lower founder dependency and diligence friction | Low | M | README/docs/env example/runbooks |

### P3 - Optional Experiments

| Problem | Evidence | Proposed solution | Expected benefit | Risk | Effort | Likely files/components |
|---|---|---|---|---|---:|---|
| Onboarding may ask too much before value | Multiple preference/theme/push steps | A/B test intent-first 2-step activation versus current flow after analytics baseline | Better signup-to-value rate | Medium | M | onboarding, analytics |
| Navigation needs personalization evidence | Broad feature set with unknown frequency | Measure and optionally pin recent/favorite secondary tools | Faster expert access without universal clutter | Low | M | nav, preferences, analytics |
| Weekly recommendations may close the loop | Reports currently summarize and suggest | Test “Apply to next week” with explicit confirmation and attribution | More report-to-action conversion | Medium | M | report detail, planner/tasks |
| Legacy themes may have a loyal audience | Many themes and seasonal behavior | Keep an Appearance Lab/legacy gallery, measure use, avoid core positioning | Preserve delight without fragmenting default brand | Low | S | settings, ThemeProvider |

---

## 23. Implementation Roadmap

No phase should deploy without rollback and measurement. Database/auth/billing changes require staging and migration plans.

### Phase 0 - Safety and Baseline

- Fix export ownership, AI identity/quota controls, cron fail-open behavior, and tracker/legal contradiction.
- Inventory every API route’s auth, identity, entitlement, request limit, and service-role use.
- Version Supabase schema/RLS/RPCs; add tenant-isolation, quota, webhook, and cron tests.
- Capture baseline funnel, retention, performance, accessibility, AI cost, and incident metrics.
- Document backups, restore, deployment, rollback, vendors, and production configuration.

### Phase 1 - Design and Content Foundations

- Confirm AIProd brand architecture and canonical legal/marketing language.
- Build semantic Light/Dark tokens and accessible UI primitives.
- Add reduced motion, focus, target-size, live-state, skeleton/error/empty standards.
- Preserve legacy theme IDs and routes while migrating defaults.

### Phase 2 - Information Architecture

- Introduce Today/Tasks/Notes/Plan/Insights/More navigation behind a reversible flag.
- Preserve URLs/deep links; add redirects only after usage and SEO analysis.
- Define AI roles and move specialized utilities into contextual/More access.

### Phase 3 - Daily Loop and Dashboard

- Build the new-user activation state and returning-user Today hierarchy.
- Connect priorities/tasks, Focus, Daily Success, and one evidence-linked insight.
- Remove duplicate/equal-weight widgets only after measuring use; keep displaced features accessible.

### Phase 4 - Daily Success and Insights

- Clarify score provenance and rename unsupported “Bio-Rhythm” language.
- Create accessible history and weekly comparison with source periods.
- Add confirmed “apply recommendation” actions and deterministic-first insight generation.

### Phase 5 - Core Product Screens

- Simplify Notes/Tasks primary actions and progressively disclose advanced controls.
- Clarify Planner/Calendar roles and handoffs.
- Consolidate contextual AI while preserving full-screen routes.

### Phase 6 - Public Website and Trust

- Replace generic/decorative hero with real Today/Daily Success UI.
- Ship outcome-led loop, accurate trust section, focused audience, and clear Free/Pro explanation.
- Remove automatic first-visit overlay; canonicalize legal/promo/tools content.

### Phase 7 - Free/Pro Conversion

- Publish precise server-owned entitlement copy.
- Add contextual report/history previews after sufficient user history.
- Measure prompt -> pricing -> checkout -> server-confirmed subscription by context.

### Phase 8 - Responsive, Accessibility, and Performance

- Complete device/keyboard/RTL/long-copy/reduced-motion matrix.
- WCAG 2.2 AA audit with automated and manual tests.
- Split static/dynamic rendering, lazy-load global utilities, optimize images/scripts, enforce budgets.

### Phase 9 - Analytics Validation

- Compare activation, D7/D30 retention, Daily Success completion, report use, conversion, support issues, and performance to baseline.
- Correct event quality and cohort definitions before expanding experiments.

### Phase 10 - Acquisition Documentation

- Complete architecture/data-flow/vendor/IP/license/account-transfer registers.
- Add security/privacy/billing/incident/support runbooks and evidence of restore/reconciliation tests.
- Prepare a buyer-readable KPI dictionary and data-room index without exposing secrets.

---

## 24. Things We Should NOT Change

1. **Do not replace the stack solely for preference.** Next.js, Supabase, Stripe, OpenAI, Resend, and Vercel are appropriate for this stage when properly secured and documented.
2. **Do not remove working features.** Reprioritize and progressively disclose Travel, recorder, templates, themes, AI modes, and other utilities; use evidence before retirement.
3. **Do not break routes or deep links.** Preserve current paths, add compatible redirects, and monitor usage before consolidation.
4. **Do not discard Daily Success.** It is the clearest owned product concept and should become more credible and central.
5. **Do not hide Notes and Tasks.** They are essential inputs to the improvement loop and likely high-frequency actions.
6. **Do not remove the free/demo path.** It lowers trial friction; secure its paid API boundary and make persistence limits clear.
7. **Do not replace the logo automatically.** First normalize the AIProd wordmark and test the existing mark at product/app-icon sizes; evolve only where legibility or distinctiveness fails.
8. **Do not lose real product screenshots.** Refresh and elevate them; they are more persuasive than generic illustration.
9. **Do not lose localization, RTL, PWA, push, Focus Mode, or TWA investment.** Bring them into the design system and test them systematically.
10. **Do not change prices or entitlements from this audit.** Make current rules accurate, secure, measurable, and understandable before experimentation.
11. **Do not fabricate proof.** No fake testimonials, usage statistics, scientific claims, compliance badges, security absolutes, or AI capabilities.
12. **Do not increase AI generation by default.** Use deterministic calculations where possible and budget AI by user value, latency, privacy, and cost.

---

## Approval Gate

This document is the requested audit deliverable. Implementation must wait for explicit approval. The first approved work package should be **Phase 0 only**, with production backups, staging validation, narrow migrations where required, and reversible deployment steps.