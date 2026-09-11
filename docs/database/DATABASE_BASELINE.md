# Database Baseline

**Status:** Repository expectations documented; production state not captured or verified
**Safety gate:** Phase 0 remains blocked for database mutations
**Repository baseline:** `main` at `731901b28d722ed441874655ffdd01a9c32bc350`
**Last reviewed:** 2026-09-11

This document distinguishes facts verified in the repository from facts that require production database evidence. Application references describe required behavior; they are not proof that an object, constraint, policy, or backup exists in production.

## 1. Current Repository Database State

Verified in the repository:

- The application uses Supabase Auth and Postgres through `@supabase/supabase-js`.
- Browser clients use the public Supabase client and therefore depend on correct RLS.
- Server routes use `lib/supabaseAdmin.ts`; the service-role client bypasses RLS.
- No `supabase/` directory, `config.toml`, migration history, complete schema SQL, seed, generated database types, database tests, or reproducible local database exists.
- Two standalone setup examples exist: `scripts/setup_reviews_table.sql` and `scripts/setup_daily_plans.sql`. They are not a complete or ordered migration history.
- The application references 22 table names and two RPC names.

Consequences:

- The repository cannot recreate production.
- Schema drift cannot be measured.
- Exact RLS, grants, functions, triggers, relationships, indexes, extensions, and delete behavior are unknown.
- Database changes and account-deletion work cannot be made safely yet.

## 2. Production Schema Capture Method

### Approved Initial Capture

After human authentication and project selection, use the official Supabase CLI to make immutable, read-only logical exports. The first capture should use `db dump`, not `db pull`, because `db pull` creates local migration state and can prompt to repair remote migration history.

Proposed capture artifacts:

```text
supabase/
  migrations/
    <timestamp>_production_baseline.sql
  roles.sql
  config.toml
  tests/
docs/database/evidence/
  <date>/
    capture-manifest.md
    object-inventory.md
    restore-test-log.md
```

Do not create these artifacts until actual production capture occurs and generated content is reviewed.

Command sequence for the authorized capture session:

```powershell
# Human enters token and password directly at prompts.
npx supabase login
npx supabase init
npx supabase link --project-ref <production-project-ref>

# Review the underlying operation before writing output.
npx supabase db dump --linked --dry-run

# Default schema-only dump; excludes data, custom roles, and managed schemas.
npx supabase db dump --linked --file <protected-temp-path>/schema.sql
npx supabase db dump --linked --file <protected-temp-path>/roles.sql --role-only

# Generate a comparison contract without exposing row data.
npx supabase gen types typescript --linked --schema public > <protected-temp-path>/database.types.ts
```

Before committing a baseline migration:

1. Record CLI/Postgres versions and a SHA-256 hash of each artifact.
2. Scan output for secrets, credentials, production data, SECURITY DEFINER hazards, and unexpected ownership/grants.
3. Inventory custom changes in `auth` and `storage` separately because default dumps exclude managed schemas.
4. Inventory storage buckets, publications, hooks, extensions, Edge Functions, and project configuration separately.
5. Reconcile the reviewed dump into one baseline migration without changing production migration history.
6. Prove the migration can create an isolated local/staging database from zero.

### Prohibited During Capture

- `supabase db reset --linked`
- `supabase db push`
- `supabase migration repair`
- Any SQL `INSERT`, `UPDATE`, `DELETE`, DDL, policy change, or function invocation with side effects
- Blind `db pull` acceptance of a migration-history prompt

## 3. Repository-Derived Dependency Inventory

The following names and columns are observed or inferred from application queries. None are verified against production.

| Domain | Expected table | Observed application contract |
|---|---|---|
| Identity/billing | `profiles` | Auth user ID, plan, email, Stripe customer, onboarding, language, AI and notification settings, admin flag |
| User content | `notes` | User-owned content and timestamps |
| User content | `tasks` | User-owned title, description, completion, due date, source note, priority, reminder, category, repeat |
| Feedback | `feedback` | Optional user, email, message, source, timestamp |
| Reviews | `app_reviews` | Optional user, rating, comment, source, timestamp |
| AI chat | `ai_chat_threads` | User-owned thread metadata |
| AI chat | `ai_chat_messages` | Thread/user ownership, role, content, timestamp |
| Companion | `ai_companion_threads` | User-owned thread metadata |
| Companion | `ai_companion_messages` | Thread/user ownership, role, content, timestamp |
| AI quota | `ai_usage` | User/date/count daily usage |
| Daily success | `daily_scores` | User score, energy, timestamps |
| Daily success | `daily_plans` | User plan text and timestamp |
| Weekly | `weekly_goals` | User goal text and timestamps |
| Weekly | `weekly_reports` | User report content and timestamps |
| Notifications | `push_subscriptions` | User endpoint and Web Push `p256dh`/`auth` material |
| Notifications | `user_notification_settings` | User notification preferences |
| Localization | `ui_translations` | Global key/text/language records |
| Product content | `changelog_entries` | Public changelog content |
| Templates | `templates` | Public or user-owned templates |
| Travel | `travel_plans` | User-owned travel plan data |
| Telemetry | `email_logs` | User/email/type/send/error details |
| Telemetry | `travel_clicks` | User/click/destination tracking |

Expected integrations:

- `profiles.plan` is written by Stripe webhook flows and read for entitlement decisions.
- Most user tables are queried with `user_id`; `profiles.id` appears to map to `auth.users.id`.
- Message tables appear to depend on their thread tables.
- Cron routes read profiles, tasks, reports, and notification settings using service-role access.
- Export reads user notes and tasks through a server-authenticated route.

The exact columns, types, defaults, nullability, generated expressions, enums, checks, foreign keys, uniqueness, and indexes remain unknown.

## 4. Actual Verified Production Objects

**Status: Not yet captured or verified.**

No authenticated production introspection has occurred. Therefore there is no verified list of production schemas, tables, views, materialized views, sequences, types, extensions, functions, triggers, indexes, constraints, grants, publications, buckets, or row counts.

After capture, this section must contain an exact object inventory and a reconciliation table:

| Object | Repository expected | Production present | Captured in baseline | Difference/action |
|---|---:|---:|---:|---|
| Pending capture | Unknown | Unknown | No | Production access required |

## 5. RLS Inventory

**Actual production RLS status: Not yet captured or verified.**

Repository-derived expectations:

- User-owned tables should constrain reads and writes to `auth.uid() = user_id` or an equivalent ownership relationship.
- Message access should enforce ownership through both message/user fields and the parent thread as appropriate.
- `templates` should expose public records while restricting private records to their owner.
- `ui_translations` and `changelog_entries` appear publicly readable and privileged for writes.
- `feedback` and `app_reviews` appear to permit intended anonymous inserts while preventing public reads.
- `profiles` must protect billing, admin, and preference fields from cross-user access and unauthorized self-elevation.

Capture must record for every exposed table:

- Whether RLS is enabled and forced.
- Policy name, roles, command, `USING`, and `WITH CHECK` expressions.
- Table and sequence grants to `anon`, `authenticated`, and other roles.
- Function `EXECUTE` grants and SECURITY DEFINER ownership/search path.
- Anonymous, authenticated-owner, authenticated-non-owner, and service-role behavior tests.

Query filters in application code are not authorization controls. Missing or permissive RLS would expose data even when normal UI calls include a user filter.

## 6. RPCs, Functions, and Triggers

Two application RPC dependencies are verified by name in `lib/aiUsageServer.ts`:

| RPC | Observed call contract | Production definition |
|---|---|---|
| `increment_ai_usage` | Parameters `p_user_id`, `p_inc`; expected to atomically increment daily usage | Not captured |
| `get_ai_usage_today` | Parameter `p_user_id`; expected to return the current daily usage count | Not captured |

Unknown and required for review:

- Exact parameter and return types.
- Invoker vs SECURITY DEFINER behavior, owner, grants, and `search_path` safety.
- Atomicity, uniqueness conflict handling, and concurrency behavior.
- Date/timezone boundary. Any Athens-time behavior is an application expectation to test, not a verified database fact.
- Trigger dependencies, side effects, exception behavior, and index support.
- All additional functions and triggers not referenced directly by application code.

No function or trigger implementation is versioned in the repository.

## 7. Service-Role Usage

`lib/supabaseAdmin.ts` creates a privileged client from server-only environment variables. Service-role requests bypass RLS; each call site must enforce authorization before selecting or mutating data.

Observed categories:

| Boundary | Examples | Required control |
|---|---|---|
| User-authenticated | Export, push subscription, AI usage helpers | Derive user from verified bearer/session; never trust body `userId` |
| Webhook-authenticated | Stripe webhook | Verify Stripe signature; validate mapped account identity |
| Admin-authenticated | Admin users/stats/reviews/translation routes | Verify Supabase user and durable admin authorization |
| Cron-authenticated | Daily/weekly/digest/notification/reminder routes | Fail-closed bearer `CRON_SECRET` check before work |
| Unclear/high risk | AI routes accepting caller-provided IDs or charging before quota checks | Audit and repair after baseline gate |

Phase 0 already added server-derived identity for export and fail-closed cron verification. Remaining service-role call sites require route-by-route review; production RLS cannot mitigate mistakes made through this client.

## 8. Backup Capability

**Project capability: Unknown.** The plan, scheduled backup status, retention, PITR status, and available recovery window have not been checked.

Supabase's documented platform behavior:

- Pro, Team, and Enterprise projects receive scheduled daily backups with plan-dependent retention.
- PITR is a separately enabled add-on on eligible paid plans and replaces daily backups when enabled.
- Free projects should maintain their own logical exports.
- Database backups do not include Storage object bytes.
- Custom role passwords are omitted.

The project-specific backup procedure and evidence requirements are in [BACKUP_RESTORE.md](BACKUP_RESTORE.md).

## 9. Restore Status

**Status: Not tested; recoverability is not verified.**

No backup has been restored to local or staging infrastructure. There is no measured recovery time, confirmed recovery point, object reconciliation, row-count comparison, RLS behavior test, or application smoke test.

An available backup indicator in the Dashboard is not sufficient evidence. The gate requires a successful isolated restore rehearsal following [BACKUP_RESTORE.md](BACKUP_RESTORE.md).

## 10. Local/Staging Reproduction

**Status: Not available.**

Target workflow after production capture:

1. Pin the Supabase CLI version in `devDependencies`; use Node.js 20 or later.
2. Commit reviewed `supabase/config.toml`, baseline migration, later migrations, and database tests.
3. Start the local stack with Docker using `npx supabase start`.
4. Recreate from zero with local-only `npx supabase db reset`.
5. Generate types from local schema and compare them with the committed types.
6. Run pgTAP tests for RLS, grants, RPC behavior, constraints, and deletion relationships.
7. Run application integration tests using test users and disabled external side effects.
8. Repeat in a separate staging project before any production migration.

Production data should not be copied to developer machines. Use deterministic synthetic seeds. If a restore rehearsal requires production data, use an access-controlled isolated target and an approved data-protection process.

## 11. Schema and Versioning Strategy

After the verified baseline is established:

- Treat `supabase/migrations/` as the schema source of truth.
- Make every schema change in a new timestamped forward migration; do not edit migrations already applied to shared environments.
- Keep data backfills explicit, bounded, idempotent where practical, and separate from large DDL changes.
- Include rollback or forward-recovery instructions for every production migration and prove them in staging.
- Add pgTAP tests for RLS and shared database behavior, especially AI quota concurrency and account deletion.
- Generate and commit TypeScript database types from the migration-built local database.
- Use CI to run local reset, DB tests, type generation drift checks, TypeScript, lint, and build.
- Require review of SECURITY DEFINER functions, grants, policies, locks, index strategy, and destructive statements.
- Apply migrations to staging first. Production application requires explicit approval, a current backup, and a tested recovery plan.
- Prevent Dashboard-only schema edits except emergency changes; immediately capture any emergency change as a migration.

The initial production dump is a bootstrap baseline, not permission to rewrite remote migration history. Reconciliation of any existing `supabase_migrations` records must be planned and approved separately.

## 12. Remaining Risks

- Production may differ materially from all repository-derived expectations.
- RLS may be missing, overly broad, or inconsistent across operations.
- Service-role routes can bypass all database authorization.
- AI quota RPCs may race, use an unexpected timezone, or grant broad execution rights.
- Foreign keys and delete rules may leave orphaned data or block account deletion.
- Stripe plan/customer fields may lack uniqueness or integrity constraints.
- High-frequency queries may lack supporting indexes.
- Managed `auth`/`storage` customizations, publications, extensions, hooks, or Vault use may be omitted by a default dump.
- Storage objects and project configuration are outside a normal database backup.
- Backup existence, retention, and restore viability are unknown.
- No database tests currently detect drift or authorization regressions.
- Production data retention, deletion, and backup-artifact handling policies are not documented.

## 13. Human Actions Required

1. Sign in to the Supabase Dashboard and select the production project.
2. Confirm and record the project plan plus **Database > Backups** scheduled/PITR status and recovery window.
3. Confirm an approved encrypted location for sensitive backup artifacts and an isolated restore target.
4. Confirm Docker Desktop and the Supabase CLI are available, or approve adding a pinned `supabase` dev dependency. Do not install or modify project tooling implicitly.
5. Run `supabase login` locally. Enter the personal access token directly in the terminal; never send it through chat or commit it.
6. Provide/select the production project reference and enter the database password directly when prompted.
7. Confirm whether Vault/pgsodium, custom roles, non-default extensions, hooks, publications, buckets/objects, and Edge Functions are used.
8. Authorize the read-only schema/roles/type capture. Stop if any command proposes changing production or migration history.
9. Review generated text for secrets and production data before any artifact is committed.
10. Approve and observe an isolated restore rehearsal. Do not connect it to production external services.

## 14. Readiness Decision

**Decision: NOT READY for database-dependent Phase 0 remediation or later product phases.**

The safety gate remains closed until all of these conditions pass:

- [ ] Production schema and role captures are complete and reviewed.
- [ ] Actual tables, functions, triggers, constraints, indexes, extensions, grants, RLS, and managed-schema customizations are inventoried.
- [ ] Repository expectations are reconciled against production.
- [ ] Backup/PITR status and retention are confirmed for the actual project.
- [ ] A protected manual logical backup is current.
- [ ] An isolated restore rehearsal succeeds and is documented.
- [ ] Local/staging can recreate the schema from versioned migrations.
- [ ] RLS and RPC database tests pass.
- [ ] Account-deletion relationships and data-retention obligations are known.
- [ ] Every proposed migration has a staging-tested recovery path.

Until those checks pass, do not implement account deletion, alter the production schema, repair remote migration history, or start the visual transformation phases.

## Evidence Sources

- Repository-wide read-only query and history inventory performed for Phase 0.
- `AIPROD_PRODUCT_DESIGN_AUDIT.md`.
- `AIPROD_TRANSFORMATION_LOG.md`.
- Official [Supabase CLI](https://supabase.com/docs/reference/cli) and [database backup](https://supabase.com/docs/guides/platform/backups) documentation.
