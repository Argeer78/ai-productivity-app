# Staging Database Baseline

**Captured:** 2026-09-11
**Source:** self-hosted Supabase staging only
**Application commit:** `938a8483ab928297ae90b7f0f241c0be28c6c58d`
**Status:** catalog captured; M0.1 clean-room reconstruction, drift comparison, and isolated data recovery passed

This is Milestone 0 evidence, not a migration or a production assertion. Capture did not change staging schema or data.

## Evidence

- Protected root: `/home/aiprod/backups/aiprod-staging-M0-20260911T163323Z`.
- Remote catalog: `catalog/`, mode 700 with mode-600 files.
- Versioned public schema: `baseline/2026-09-11/public_schema.sql`.
- Public schema SHA-256: `2d0c5ad5699c4b7382e60a2b1a5bdf6313abd5533a5c291e668225f308bad8ff`.
- PostgreSQL 17.6; image `supabase/postgres:17.6.1.136`.
- Full catalog: 11 schemas, 79 tables, 752 columns, 210 constraints, 192 indexes, 7 sequences, 202 types, 6 extensions, 118 functions, 11 triggers, 3 views, 0 materialized views, and 1,819 grants.
- Public catalog: 29 base tables and 82 policies. Twenty-three public tables have policies; six have none.

The versioned SQL contains no table rows. A strict literal-secret scan found no credential; one initial scanner match was the identifier `task_reminders`.

## Public Tables

| Table | Rows | RLS | Note |
|---|---:|---:|---|
| `admin_users` | 1 | On | Email primary key; no `user_id` |
| `ai_chat_messages` | 66 | On | User-owned |
| `ai_chat_threads` | 7 | On | User-owned |
| `ai_companion_messages` | 54 | On | User and parent-thread ownership |
| `ai_companion_threads` | 7 | On | User-owned |
| `ai_usage` | 93 | On | Unique user/date record |
| `app_reviews` | 2 | On | Public insert, scoped read |
| `changelog_entries` | 8 | On | Public read |
| `daily_checkins` | 1 | On | Not referenced by current source |
| `daily_scores` | 6 | On | User-owned |
| `email_logs` | 2 | Off | Server table by convention |
| `events` | 0 | Off | No current source reference found |
| `feedback` | 12 | On | Public/authenticated insert |
| `languages` | 26 | Off | Reference data |
| `notes` | 25 | On | User-owned |
| `page_translations` | 598 | On | Anonymous writes are high risk |
| `profiles` | 73 | On | Identity, plan, Stripe, preferences |
| `push_subscriptions` | 8 | Off | Sensitive endpoint/key material |
| `tasks` | 79 | On | User-owned |
| `template_favorites` | 1 | On | User-owned |
| `templates` | 77 | On | Public or user-owned |
| `translations` | 0 | Off | Legacy/unused status unverified |
| `travel_clicks` | 5 | On | Anonymous insert |
| `travel_plans` | 5 | On | User-owned |
| `ui_translations` | 58,972 | On | Public read |
| `user_notification_settings` | 9 | On | User-owned |
| `weekly_action_plans` | 0 | Off | Server-written; no policies |
| `weekly_goals` | 3 | On | User-owned |
| `weekly_reports` | 97 | On | User-owned |

Counts are evidence, not fixtures. No row values belong in Git.

## Admin Contract

`public.admin_users` has only `email text NOT NULL` and nullable `created_at timestamptz DEFAULT now()`. Its primary key is `admin_users_pkey` on `email`; there is no foreign key. RLS is enabled but not forced. The sole policy, `admin_users read own row`, compares email to JWT email.

This conflicts with `lib/adminAuth.ts`, which selects and filters `user_id`. `app/components/AppHeader.tsx` uses `NEXT_PUBLIC_ADMIN_EMAIL`, while other policies use `profiles.is_admin`. Staging therefore has three competing admin models.

## Functions and Dependencies

- `public.increment_ai_usage(uuid, integer)` performs an atomic upsert as SECURITY DEFINER. It does not validate caller ownership.
- `public.get_ai_usage_today(uuid)` uses database `current_date`; the intended product timezone is not explicit.
- Public objects depend on managed `auth.users`, `auth.uid()`, `auth.jwt()`, and `extensions.uuid_generate_v4()` objects.

## Reproduction Results

| Check | Result | Finding |
|---|---|---|
| Backup capture | PASS | Custom archive and globals captured with restrictive modes |
| Archive listing | PASS | 927 entries |
| Public schema checksum | PASS | Local and remote hashes match |
| Public schema from zero | FAIL | Managed `auth` and `extensions` dependencies are absent |
| Full schema from zero | FAIL | Extension drop/recreate terminates the preloaded `pg_net` backend |
| Full custom restore | FAIL | Credential-free provider role/bootstrap process is not deterministic yet |
| Pinned platform plus AIProd migration | PASS | 29 tables, 6 functions, 3 triggers, 82 policies, and 12 Auth foreign keys reconstructed |
| Owner-neutral application fingerprint | PASS | 1,241 sorted records matched staging byte-for-byte |
| Filtered application-data recovery | PASS | Public, Auth, and Storage data restored with aggregate and relationship parity |
| Live staging modified | NO | Capture and checks were read-only |

The failed full-dump attempts remain useful historical evidence: a provider database must not be treated as one application migration. M0.1 established the executable source of truth as the pinned platform bootstrap, service-owned migrations, AIProd migrations, a no-op seed, and schema fingerprint validation. Data recovery is a separate filtered restore process.

See `PLATFORM_BASELINE.md`, `OBJECT_OWNERSHIP.md`, `REPRODUCIBILITY.md`, `SCHEMA_DRIFT.md`, `RLS_MATRIX.md`, `API_SECURITY_MATRIX.md`, `BACKUP_RESTORE.md`, and `MIGRATION_RECONCILIATION.md`.