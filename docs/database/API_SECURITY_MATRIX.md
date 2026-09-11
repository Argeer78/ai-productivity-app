# API Security Matrix

**Baseline commit:** `938a8483ab928297ae90b7f0f241c0be28c6c58d`  
**Status:** audit only; no route behavior changed

`User` means verified Supabase bearer identity, `Admin` means `requireAdmin()`, `Cron` means fail-closed `CRON_SECRET`, and `SR` means service-role access.

| Route group | Access now | Identity / ownership | SR | Limit | Risk / intended rule |
|---|---|---|---:|---:|---|
| `/api/ai-summary` | User | Bearer user | Yes | No | Bound input and make quota accounting atomic |
| `/api/ai-digest` | User | Bearer user | Yes | No | Same |
| `/api/ai-task-creator` | User | Bearer user | Yes | No | Same |
| `/api/daily-success/morning` | User | Bearer user | Yes | No | References absent `daily_plans` |
| `/api/daily-success/evening` | User | Bearer user | Yes | No | Bound input and centralize quota |
| `/api/daily-score/suggest` | User | Bearer user | Yes | No | Same |
| `/api/ai-images` | User | Bearer user | Yes | No | Bound provider cost |
| `/api/daily-plan` | User/guest | Caller/guest path | Yes | No | Guest quota bypass |
| `/api/ai-travel-plan` | User/guest | Caller/guest path | Yes | No | Guest quota bypass |
| `/api/ai-hub-chat` | User/guest | Caller-provided `userId` | Yes | No | Body identity is not authority |
| `/api/ai-hub-chat/thread` | User/guest | Caller-provided identity | Yes | No | Require bearer-derived owner |
| `/api/ai-companion-chat` | User/guest | Caller-provided `userId` | Yes | No | Require bearer-derived owner |
| `/api/voice/capture` | User/guest | Caller/guest path | Yes | No | Untracked paid usage |
| `/api/ai-translate` | User/admin email | Public env email bypass | Yes | No | Use durable role, not email bypass |
| `/api/assistant` | User/admin email | Public env email bypass | Yes | No | Remove bypass; enforce quota |
| `/api/ai/notes` | User | Bearer user | Yes | No | Legacy JS route; verify quota/input |
| `/api/export` | User | Server-derived bearer user | Yes | No | Current identity pattern is correct |
| `/api/tasks/complete` | Unclear | Ownership not proven | Yes | No | Verify task belongs to bearer user |
| `/api/push/subscribe` | User | Bearer user | Yes | No | Schema currently permits one device/user |
| `/api/push/unsubscribe` | User | Bearer user | Yes | No | Ownership pattern is appropriate |
| `/api/push/test` | User | Bearer user | Yes | No | Keep non-production or tightly scoped |
| `/api/weekly-goal` | User | Bearer user | Yes | No | Enforce owner on every operation |
| `/api/weekly-action-plan` | User | Bearer user | Yes | No | RLS off; API owns authorization |
| `/api/reviews/check` | User/public | Optional bearer | Yes | No | Limit enumeration and abuse |
| `/api/reviews` | Public/user | Optional bearer | Yes | No | Add abuse controls and content bounds |
| `/api/travel-click` | Public/user/admin email | Optional identity | Yes | No | Remove admin email special case |
| `/api/notifications` | Public | Request supplied | No | No | Public side effect; authenticate or limit |
| `/api/stripe/checkout` | User | Bearer user | Yes | No | Appropriate identity boundary |
| `/api/stripe/confirm` | User | Bearer user | Yes | No | Appropriate identity boundary |
| `/api/stripe/portal` | User | Bearer user | Yes | No | Appropriate identity boundary |
| `/api/stripe/webhook` | Stripe signature | Metadata, email fallback | Yes | Provider | Add durable idempotency; prefer immutable user ID |
| `/api/admin/*` | Admin | Broken `requireAdmin()` | Yes | No | Schema lacks expected `admin_users.user_id` |
| `/api/admin-metrics` | Admin | Broken `requireAdmin()` | Yes | No | Same |
| `/api/admin-revenue` | Admin | Broken `requireAdmin()` | Yes | No | Same |
| `/api/admin-test-email` | Admin | Broken `requireAdmin()` | No | No | Same; external side effect |
| `/api/cron-daily` | Cron | Shared secret | Yes | N/A | Fail-closed |
| `/api/cron-digest` | Cron | Shared secret | Yes | N/A | Duplicate daily entry point |
| `/api/cron-weekly` | Cron | Shared secret | Yes | N/A | Fail-closed |
| `/api/cron/notifications` | Cron | Shared secret | Yes | N/A | Fail-closed; push side effects |
| `/api/tasks/reminder-cron` | Cron | Shared secret | Yes | N/A | Fail-closed; push side effects |
| `/api/daily-digest` | Mixed cron/user | Context dependent | Yes | No | Split trust boundaries |
| `/api/weekly-report` | Mixed cron/user | Context dependent | Yes | No | Split trust boundaries |
| `/api/ui-i18n` | Public | None | No | No | Read-only intended |
| `/api/ui-translations/[lang]` | Public | None | No | No | Read-only intended |
| `/api/translations/get` | Public | None | No | No | Read-only intended |
| `/api/ui-translations/sync` | Admin | Broken admin check | Yes | No | Durable admin role only |
| `/api/health` | Public | None | No | N/A | Minimal status only |
| `/api/integrity/verify` | Public | Provider request | No | No | Verify protocol and request binding |
| `/api/scripts` | Unclear | Unverified | Unverified | No | Disable or strongly authenticate |

Admin-specific routes under `/api/admin/` include feedback, email logs, review listing, UI key sync, translation sync, and AI namespace translation. They share the same broken `requireAdmin()` contract.

## Privileged Helpers

- `lib/supabaseAdmin.ts` creates the shared service-role client and must remain server-only.
- `lib/aiUsageServer.ts` trusts its caller-supplied user ID; callers must derive it from verified authentication.
- `lib/adminAuth.ts` verifies a bearer user, then queries an absent `admin_users.user_id` column.

## Target Rules

1. Body and query IDs identify resources; they never grant authority.
2. Every service-role query needs a server-derived owner or verified admin, cron, or provider boundary.
3. Paid AI work needs one atomic quota gateway and bounded input.
4. Public writes and side effects need explicit abuse controls.
5. Admin authorization needs one database-backed source of truth.