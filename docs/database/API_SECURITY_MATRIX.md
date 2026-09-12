# API Security Matrix

**M1.5 source baseline:** `7b15dff0c3227bef660b0d2b72dfe639ce80f65d`
**Inventory:** 57 route files, 61 exported HTTP handlers
**Status:** Source-reconciled on 2026-09-12; production and `main` were not inspected or changed

This matrix describes application enforcement, not inferred protection from route names. `User` means a verified Supabase bearer identity. `Owner` means every privileged resource query is constrained by that verified user ID. `Admin` means `requireAdmin()`. `Cron` means fail-closed `CRON_SECRET`. `SR` means the shared service-role client, which bypasses RLS. Guest AI routes intentionally process request-provided content but do not use guest identifiers to read or persist guest-owned database state.

Rate classes are implemented by `lib/rateLimit.ts`: `public-light`, `authenticated-standard`, `sensitive`, `ai-light`, `ai-heavy`, `admin`, and `internal`. Provider, sensitive, admin, and internal limits fail closed. Authenticated identities are derived from verified user IDs; anonymous identities use only proxy-overwritten `X-Real-IP`.

## Handler Matrix

| Route | Method | Class and authority | Data access / SR classification | Validation and rate control | Provider / caller status |
|---|---|---|---|---|---|
| `/api/admin-metrics` | GET | Admin: bearer + `requireAdmin()` | `profiles`, `notes`, `tasks`, `ai_usage`; SR required | No body; no explicit route limit | Admin dashboard |
| `/api/admin-revenue` | GET | Admin: bearer + `requireAdmin()` | No database access | No body; no explicit route limit | Stub; likely obsolete |
| `/api/admin-test-email` | POST | Admin: bearer + `requireAdmin()` | No database access | Zod, 32 KiB; `admin`, `email:admin-test` | Resend; admin UI |
| `/api/admin/ai-translate-namespace` | POST | Admin: bearer + `requireAdmin()` | `ui_translations`; SR required | Zod, 32 KiB; `admin`, `admin:translate-namespace` | OpenAI, 60 s, no retries; admin UI |
| `/api/admin/email-logs` | GET | Admin: bearer + `requireAdmin()` | `email_logs` (RLS off); SR required | No body; no explicit route limit | Admin UI |
| `/api/admin/feedback` | GET | Admin: bearer + `requireAdmin()` | `feedback`; SR required | No body; no explicit route limit | Admin UI |
| `/api/admin/reviews/list` | GET | Admin: bearer + `requireAdmin()` | `app_reviews`; SR required | No body; no explicit route limit | Admin UI |
| `/api/admin/sync-ui-keys` | POST | Admin: bearer + `requireAdmin()` | `ui_translations`; SR required | Zod, 32 KiB; `admin`, `admin:sync-ui-keys` | OpenAI, 60 s, no retries; admin UI |
| `/api/admin/system-flags` | GET | Public only for whitelisted flag; otherwise Admin | `ui_translations`; SR contained to selected key | Zod query; no explicit route limit | Application feature flag |
| `/api/admin/system-flags` | POST | Admin: bearer + `requireAdmin()` | `ui_translations`; SR required | Zod, 32 KiB; no explicit route limit | Admin UI |
| `/api/admin/ui-translation-sync` | POST | Admin: bearer + `requireAdmin()` | `ui_translations`; SR required | Zod, 32 KiB; `admin`, `admin:ui-translation-sync` | OpenAI, 60 s, no retries; admin UI |
| `/api/ai/notes` | POST | Public guest AI | No database access | Zod, 256 KiB; `ai-light`, `ai:notes` | OpenAI, 30 s, no retries; Notes fallback |
| `/api/ai/note-to-tasks` | POST | Public guest AI | No database access | Zod, 256 KiB; `ai-light`, `ai:note-to-tasks` | OpenAI fetch, 30 s abort; Notes/Planner |
| `/api/ai-companion-chat` | POST | User or intentional guest; bearer is authority for user state | `profiles` only for bearer user; SR contained | Zod, 256 KiB; `ai-light`, `ai:companion-chat` | OpenAI, 30 s, no retries; companion UI |
| `/api/ai-digest` | POST | User | `profiles`, `notes`, `tasks`, `ai_usage`; SR owner-scoped | Bounded schema; `ai-light`, `ai:digest` | OpenAI, 30 s, no retries |
| `/api/ai-hub-chat` | POST | User or intentional guest; bearer is authority for user state | `profiles` only for bearer user; SR contained | Zod, 256 KiB; `ai-light`, `ai:hub-chat` | OpenAI, 30 s, no retries; chat UI |
| `/api/ai-hub-chat/thread` | DELETE | Owner: bearer + parent lookup | `ai_chat_threads`, `ai_chat_messages`; SR owner-scoped | Zod, 32 KiB; no explicit route limit | Chat UI |
| `/api/ai-images` | POST | User, plan-gated | `profiles`; quota helper; SR owner-scoped | Zod, 32 KiB; `ai-light`, `ai:image` | OpenAI, 60 s, no retries |
| `/api/ai-summary` | POST | User | `profiles`, `notes`, `tasks`, `ai_usage`; SR owner-scoped | Bounded schema; `ai-light`, `ai:summary` | OpenAI, 30 s, no retries |
| `/api/ai-task-creator` | POST | User or intentional guest | `profiles`, `ai_usage` only for bearer user; SR contained | Zod, 32 KiB; `ai-light`, `ai:task-creator` | OpenAI, 30 s, no retries; task creator UI |
| `/api/ai-translate` | POST | Public, User, or Admin | `profiles`, `ai_usage`, `page_translations`; SR contained by verified user/admin where applicable | Zod, 256 KiB; public/auth lookup plus provider rate action | OpenAI, 30 s, no retries |
| `/api/ai-travel-plan` | POST | User or intentional guest | `profiles`, `ai_usage` only for bearer user; SR contained | Zod, 32 KiB; `ai-light`, `ai:travel-plan` | OpenAI, 30 s, no retries; travel UI |
| `/api/assistant` | POST | Public, User, or Admin | `profiles`, `ai_usage` only for verified identity; SR contained | Zod, 256 KiB; `ai-light`/`admin`, `ai:assistant` | OpenAI, 30 s, no retries |
| `/api/auth/capabilities` | GET | User; admin boolean from canonical membership | `admin_users` through helper; SR required | No body; no explicit route limit | UI capability hint only |
| `/api/cron/notifications` | GET | Cron | Delegates to notification runner; SR required there | `internal`, `internal:notifications` | Resend |
| `/api/cron-daily` | GET | Cron | Delegates directly to daily digest runner; SR required there | `internal`, `internal:daily-digest` | Resend/OpenAI through runner |
| `/api/cron-digest` | GET | Cron | Calls protected `/api/daily-digest` | `internal`, `internal:cron-digest`; 35 s abort | Internal HTTP alias |
| `/api/cron-weekly` | GET | Cron | Delegates directly to weekly report runner; SR required there | `internal`, `internal:weekly-report` | Resend/OpenAI through runner |
| `/api/daily-digest` | POST | Cron | `profiles`, `tasks`; SR required for batch processing | No body; `internal`, `internal:daily-digest` | OpenAI 30 s/no retries, Resend |
| `/api/daily-plan` | POST | User or intentional guest | `profiles`, `tasks`, `ai_usage` only for bearer user; SR contained | Zod, 32 KiB; `ai-light`, `ai:daily-plan` | OpenAI, 30 s, no retries |
| `/api/daily-score/suggest` | POST | User | `profiles`, `notes`, `tasks`, `ai_usage`; SR owner-scoped | Bounded schema; `ai-light`, `ai:daily-score` | OpenAI, 30 s, no retries |
| `/api/daily-success/evening` | POST | User | `profiles`, `ai_usage`; SR owner-scoped | Zod, 256 KiB; `ai-light`, `ai:evening` | OpenAI, 30 s, no retries |
| `/api/daily-success/morning` | POST | User | `profiles`, `ai_usage`, `daily_plans`; SR owner-scoped | Zod, 256 KiB; `ai-light`, `ai:morning` | OpenAI, 30 s, no retries; `daily_plans` schema mismatch remains |
| `/api/export` | POST | User/Owner | `notes`, `tasks`; SR owner-scoped | No body; no explicit route limit | Export UI |
| `/api/health` | GET | Public | No data | No input; no limit | Health check |
| `/api/integrity/verify` | POST | User + provider attestation bound to user/package/time | `play_integrity_verifications`; SR contained | Zod, about 21 KiB; no explicit route limit | Google Play Integrity; Android client |
| `/api/notifications` | GET | Cron | `user_notification_settings`, `profiles`; SR required for batch | `internal`, `internal:notifications` | Resend |
| `/api/push/subscribe` | POST | User | `push_subscriptions` (RLS off); SR owner-scoped | Zod, 32 KiB; `authenticated-standard`, `push:subscribe` | PWA client |
| `/api/push/test` | POST | User | `push_subscriptions` (RLS off); SR owner-scoped | No body; `sensitive`, `push:test` | Web Push |
| `/api/push/unsubscribe` | POST | User | `push_subscriptions` (RLS off); SR owner-scoped | Zod, 32 KiB; `authenticated-standard`, `push:unsubscribe` | PWA client |
| `/api/reviews` | POST | User | `app_reviews`; SR owner value from bearer | Zod, 32 KiB; `authenticated-standard`, `reviews:create` | Review form |
| `/api/reviews` | GET | Public | `app_reviews`; SR contained to public DTO, reviewer UUID excluded | No input; no explicit route limit | Reviews page |
| `/api/reviews` | DELETE | Admin | `app_reviews`; SR required | Zod query; `admin`, `admin:reviews-delete` | Admin reviews UI |
| `/api/reviews/check` | GET | Optional User | `app_reviews`; SR query constrained by verified user ID | No body; no explicit route limit | Review popup |
| `/api/scripts` | GET | Public | Static hard-coded content only | No input; no limit | No source caller found; likely obsolete |
| `/api/stripe/checkout` | POST | User | Stripe customer/session; verified bearer metadata | Zod, 32 KiB; `sensitive`, `stripe:checkout` | Stripe, no SDK retries; billing UI |
| `/api/stripe/confirm` | POST | User + matching Stripe metadata | `profiles`; SR owner-scoped after metadata/user match | Zod, 32 KiB; `sensitive`, `stripe:confirm` | Stripe; success page |
| `/api/stripe/portal` | POST | User | `profiles`; SR owner-scoped | No body; `sensitive`, `stripe:portal` | Stripe; settings UI |
| `/api/stripe/webhook` | POST | Webhook: Stripe signature | `profiles`; SR required | Raw body, 1 MiB; provider limiter/signature | Stripe; durable idempotency deferred to M5 |
| `/api/tasks/complete` | POST | Owner: bearer + owner lookup | `tasks`, `notes`; SR owner-scoped | Zod, 32 KiB; no explicit route limit | Task UI |
| `/api/tasks/reminder-cron` | GET | Cron | `tasks`, `push_subscriptions` (RLS off); SR required for batch | `internal`, `internal:task-reminders` | Web Push/email |
| `/api/translations/get` | POST | Public | `ui_translations`; anon client, RLS public read | Zod, 32 KiB; `public-light`, `public:translations` | UI translation loader |
| `/api/travel-click` | POST | Public or User; bearer only when supplied | `travel_clicks`; SR insert with verified user or null | Zod, 32 KiB; public/auth rate class | Affiliate telemetry |
| `/api/ui-i18n` | GET | Public | `ui_translations`; SR read constrained to selected language/columns | Bounded query semantics; no explicit route limit | UI startup |
| `/api/ui-translations/[lang]` | GET | Public | `ui_translations`; SR read constrained to selected languages/columns | Normalized path param; no explicit route limit | UI fallback loader |
| `/api/ui-translations/sync` | POST | Admin | `ui_translations`; SR required | Zod, 32 KiB; no explicit route limit | Admin translation UI |
| `/api/voice/capture` | POST | User | `profiles`, `ai_usage`, `notes`; SR owner-scoped | Request 11 MiB, file 10 MiB, MIME/timezone/mode checks; `ai-light`, `ai:voice-capture` | OpenAI, 60 s, no retries; voice UI |
| `/api/weekly-action-plan` | POST | User, plan-gated | `profiles`, `tasks`, `notes`, `ai_usage`, `daily_scores`, `weekly_goals`, `weekly_action_plans` (RLS off); SR owner-scoped | Zod, 32 KiB; `ai-light`, `ai:weekly-action-plan` | OpenAI, 30 s, no retries |
| `/api/weekly-goal` | POST | User | `weekly_goals`; SR owner value from bearer | Zod, 32 KiB; optional `ai-light`, `ai:weekly-goal` | OpenAI only when refining |
| `/api/weekly-goal` | GET | User/Owner | `weekly_goals`; SR query uses bearer user ID, query `userId` grants no authority | No body; `authenticated-standard`, `weekly-goal:read` | Weekly UI |
| `/api/weekly-report` | GET | Cron | `profiles`, `notes`, `tasks`, `ai_usage`, `daily_scores`, `weekly_goals`, `weekly_reports`; SR required for batch | `internal`, `internal:weekly-report` | OpenAI 30 s/no retries, Resend |

## Reconciliation

The prior matrix was a planning snapshot, not an exact inventory. Source proves 57 route files and 61 methods. The following classifications changed or were clarified:

- `/api/ai/notes` and `/api/ai/note-to-tasks` are intentional public guest AI routes with bounded requests and fail-closed anonymous provider limiting.
- `/api/integrity/verify` is authenticated and binds the Play Integrity payload to the bearer user, package, timestamp, and replay hash; it is not public.
- `/api/notifications`, `/api/daily-digest`, and `/api/weekly-report` are cron-only entry points, not public or mixed user routes.
- `GET /api/weekly-goal` is now owner-scoped to the bearer identity. Its former query-string authority was removed in M1.5.
- Public `GET /api/reviews` now returns an explicit `verified` boolean and never exposes `user_id`; full reviewer identifiers remain admin-only.
- `/api/admin/system-flags` has two distinct GET modes: one named public flag and authenticated admin access for all other flags.
- `/api/scripts` is public static content with no source caller found. It was not removed automatically.

Known aliases are `/api/cron-daily` and `/api/cron-digest` for daily digest execution, plus `/api/cron-weekly` and `/api/cron/notifications` wrappers around their protected runners. The aliases remain deployed pending a separate removal decision.

## Privileged Access Rules

Service-role use is **required** for admin-wide reads/writes, cron batch processing, webhook reconciliation, capability membership checks, and server-only writes. It is **contained** on user routes only when the verified bearer ID is applied to every owner predicate or inserted owner field. Public translation and review reads expose explicit column projections only; service-role possession is never treated as authorization.

RLS-off tables remain `email_logs`, `events`, `languages`, `push_subscriptions`, `translations`, and `weekly_action_plans`. Current API access to sensitive RLS-off tables is bounded as follows:

- `email_logs`: admin-only list route.
- `push_subscriptions`: bearer owner predicates or cron batch processing.
- `weekly_action_plans`: bearer owner predicates or cron report processing.
- `events`, `languages`, and `translations`: no current API route access.

Enabling RLS or changing grants requires an approved database migration and clean-room validation; it is not silently folded into this application-only milestone.

## M1.5 Repairs

- Removed raw OpenAI response bodies, model JSON, and provider exception details from logs and client responses across affected AI routes.
- Normalized provider parse failures and unexpected failures to controlled responses.
- Removed public reviewer UUID disclosure and centralized review service-role access.
- Replaced caller-supplied weekly-goal read authority with verified bearer ownership and authenticated rate limiting.
- Added internal throttling, timeout, and controlled downstream failures to `/api/cron-digest`.
- Ensured oversized note AI requests are rejected before provider configuration or provider work.
- Added executable fail-closed cron authentication tests.

## Remaining Work

- Database policy changes for RLS-off tables require a separately approved migration.
- `daily_plans` is referenced by the morning route but is absent from the captured staging public schema; this remains a documented schema/application mismatch.
- Stripe webhook durable event idempotency and deeper billing reliability remain deferred to M5.
- Dead/stub route removal requires explicit approval.
- Production, `main`, and M2 remain out of scope.