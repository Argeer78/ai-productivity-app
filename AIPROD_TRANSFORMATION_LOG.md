# AIProd Transformation Log

## Baseline

- Date: 11 September 2026
- Branch: `main`
- Baseline commit: `731901b28d722ed441874655ffdd01a9c32bc350`
- Initial working tree: only `AIPROD_PRODUCT_DESIGN_AUDIT.md` was untracked.
- Package manager: npm (`package-lock.json`).
- Environment files are ignored by `.env*`; secret values were not inspected or recorded.
- Git identity is configured.

### Initial Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |
| `npm run lint` | Failed before transformation: 26 error lines and 453 warning lines |

The existing lint debt is the baseline. New work must not add focused lint errors.

### Database Safety Baseline

The repository contains no versioned Supabase schema, migrations, RLS policies, or definitions for the `increment_ai_usage` and `get_ai_usage_today` RPCs used by the application. The only migration-named file found is `scripts/check_migration_el.ts`, which is not a database migration or backup mechanism.

Before any database change, the following production-controlled evidence is required:

1. A current logical schema-only export including tables, functions, triggers, constraints, indexes, and RLS policies.
2. A current backup or point-in-time recovery confirmation and retention window.
3. A restore rehearsal in a separate Supabase project or isolated staging database.
4. A migration user/role and deployment procedure that does not expose credentials.
5. A tested rollback script for each proposed migration.
6. Confirmation of foreign-key behavior and all user-owned tables before account deletion is implemented.

No database or production data was changed during this work.

## Phase 0 - Safety and Baseline (Blocked, Partial Application Work)

### Changes Made

- Added `lib/serverAuth.ts`, a server-only Supabase bearer-token verifier.
- Secured `POST /api/export`: it ignores caller-supplied identity and scopes service-role queries to the verified token user.
- Updated Settings export to send the active Supabase access token and handle non-success responses.
- Changed shared cron authentication to fail closed when `CRON_SECRET` is absent.
- Added the shared cron check before work in daily, weekly, notification, digest, and task-reminder scheduled routes.
- Removed query-string cron-secret support to avoid credentials in URLs and logs.

### Important Decisions

- No schema, RLS, RPC, deletion, or webhook-ledger migration was guessed from client queries.
- No visual/design phase started before Phase 0 completion.
- No incomplete Phase 0 commit was created.
- Existing routes and user data were preserved.

### Validation Performed

| Slice | TypeScript | Focused ESLint | Behavioral source check |
|---|---|---|---|
| Export authorization | Passed | Passed with 0 errors (8 pre-existing warnings in Settings) | API derives `user.id`; client sends bearer; no body identity |
| Cron authorization | Passed | Passed with no diagnostics | All five routes authenticate first; missing secret fails; no URL secret fallback |

### Completed Post-Change Validation

The original combined validation wrapper timed out and later entered a PowerShell continuation prompt because of a wrapper syntax error. It did not provide trustworthy final status for every check, so the same read-only validations were rerun as separate bounded commands. No implementation work proceeded while validation was unresolved.

| Check | Exit code | Result |
|---|---:|---|
| `npx tsc --noEmit` | 0 | Passed with no diagnostics. |
| Focused ESLint for all Phase 0 application files | 0 | Passed with 0 errors and 8 warnings. |
| `npm run build` | 0 | Compilation, TypeScript, page-data collection, and generation of 58 static pages completed. |
| `git diff --check` | 0 | Passed with no whitespace errors. |
| Changed-file secret scan | 0 | No embedded secret values, credential-bearing URLs, or private-key blocks found. |

The eight focused lint warnings are warning-class baseline debt: five `no-explicit-any` findings (including the pre-existing export catch type), one unused state variable, and two React hook dependency warnings. No focused lint error or build/type regression was introduced. The only build warning was stale `baseline-browser-mapping` reference data; it does not block compilation.

The build created no Git-visible output. The working tree contains only the audit/log, the new server auth helper, and the documented export/cron changes.

### Blocking Conditions

Phase 0 cannot be completed safely from repository evidence alone:

1. **No verified database rollback:** schema/RLS/RPC source and backup/restore evidence are absent.
2. **Atomic AI quotas cannot be proven:** current RPC implementation is outside the repository. Replacing or depending on it without source and concurrency semantics could break entitlements or permit overspend.
3. **Account deletion cannot be safely implemented:** the complete set of user-owned tables, foreign keys, retention requirements, Stripe lifecycle behavior, and rollback path are unknown.
4. **RLS reproducibility cannot be completed:** production policies must be exported and reviewed before public security claims are retained.

These match the explicit stop conditions: inability to establish rollback and risk of destructive or cross-user behavior. Work must resume at Phase 0 after the database artifacts and restore evidence are available.

### Rollback Information

Application-layer partial changes can be reversed by reverting only these uncommitted paths:

- `lib/serverAuth.ts`
- `app/api/export/route.ts`
- `app/settings/page.tsx`
- `lib/verifyCron.ts`
- `app/api/cron-daily/route.ts`
- `app/api/cron-weekly/route.ts`
- `app/api/cron/notifications/route.ts`
- `app/api/cron-digest/route.ts`
- `app/api/tasks/reminder-cron/route.ts`

Do not use destructive Git reset commands because the audit document predates implementation and remains untracked.

### Resulting Commit

None. Phase 0 is incomplete and therefore was not checkpointed.

## Staging Safety Consolidation

- Replaced browser-shared admin-key authorization with Supabase bearer authentication and server-side `admin_users` membership checks.
- Moved admin metrics, reviews, feedback, and email-log reads behind protected server routes.
- Bound service-role AI, push, travel, export, and billing operations to verified user identities while preserving explicit guest/demo flows.
- Made OpenAI, Resend, push, and Stripe initialization safe when optional staging credentials are absent.
- Moved Stripe price IDs to server-only environment variables documented in `README.md`.
- Kept scheduled jobs fail-closed when `CRON_SECRET` is absent and removed query-string secret support.

Validation after consolidation passed: full ESLint, TypeScript, production build, and `git diff --check`.

Deployment remains blocked until the staging `admin_users` membership column is verified as `user_id` and secure VPS access plus the application deployment path are available. Production infrastructure and data were not changed.
