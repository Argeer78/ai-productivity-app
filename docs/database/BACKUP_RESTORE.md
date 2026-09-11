# Database Backup and Restore Runbook

**Status:** Procedure documented; production backup capability and restore are not verified
**Safety rule:** Never test a restore against the production project
**Last reviewed:** 2026-09-11

This runbook defines the evidence required to pass the Phase 0 database safety gate. It does not assert that a usable backup exists. Production project access, backup settings, database contents, and restore behavior have not yet been inspected.

## Current Status

| Control | Status | Evidence needed |
|---|---|---|
| Supabase plan | Unknown | Dashboard billing/plan confirmation |
| Scheduled daily backups | Unknown | Database > Backups screenshot or recorded settings |
| PITR | Unknown | Database > Backups > Point in Time status and recovery window |
| Manual logical backup | Not captured | Timestamped schema, role, and encrypted data artifacts |
| Storage object backup | Not captured | Bucket inventory and separate object copy |
| Isolated restore | Not tested | Successful local or disposable-project rehearsal log |
| Recovery time | Unknown | Measured restore duration |
| Recovery point | Unknown | Confirmed daily/PITR/manual backup timestamp |

## Backup Types

### Supabase Scheduled Backups

Supabase automatically provides daily backups for Pro, Team, and Enterprise projects. Retention depends on the plan. The actual project plan and available restore points must be checked in **Database > Backups**.

Scheduled backups are project recovery controls, not a substitute for version-controlled schema migrations. A restore causes project downtime. Custom role passwords are not retained and must be reset after restoration.

### Point-in-Time Recovery

PITR is an add-on for eligible paid projects and requires supported compute. It uses physical snapshots and WAL archives. Supabase documents a worst-case recovery point objective of two minutes, but the project's actual earliest and latest recovery points must be read from the Dashboard.

When PITR is enabled, it replaces daily backups. Its current status must not be inferred from the plan.

### Manual Logical Backup

A manual logical backup is an independently retained export. It supports inspection and an isolated restore rehearsal. Use the official Supabase CLI and capture separate artifacts:

```powershell
npx supabase db dump --linked --file backup/roles.sql --role-only
npx supabase db dump --linked --file backup/schema.sql
npx supabase db dump --linked --file backup/data.sql --data-only --use-copy -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

These are command templates, not commands approved for immediate execution. Choose a dated, access-restricted directory outside the Git worktree for data artifacts. Never commit production data, credentials, connection strings, role passwords, access tokens, or encryption keys.

The default schema dump excludes data, custom roles, and Supabase-managed schemas such as `auth` and `storage`. If those schemas contain project-specific triggers, policies, or other customizations, capture and review their differences separately. Do not use `db pull` for the first capture: it creates migration state and may prompt to alter remote migration history.

## Coverage and Limitations

The backup set must account for all of the following:

| Asset | Scheduled/PITR | Logical DB dump | Separate action |
|---|---|---|---|
| Application schema, functions, triggers, RLS, indexes | Database-level | Schema dump | Review dump completeness |
| Custom roles | Database-level, passwords omitted | `--role-only`, passwords omitted | Reset login passwords in target |
| Table data, including auth/storage metadata | Database-level | `--data-only` | Encrypt and restrict artifact |
| Custom `auth`/`storage` schema changes | Database-level | Excluded by default schema dump | Capture and review separately |
| Storage bucket configuration | Metadata may be in DB; diff tools have gaps | Not a complete portable definition | Inventory and reproduce explicitly |
| Storage object bytes | Not included | Not included | Copy/download objects separately |
| Vault/pgsodium root encryption key | Not in backup files | Not included | Follow Supabase key-transfer process if used |
| Realtime publications | Requires post-restore attention | Diff tools may omit changes | Record and reactivate explicitly |
| Edge Functions and secrets | Not a database backup concern | Not included | Inventory/download functions; recreate secrets securely |
| Project/Auth settings and providers | Not fully represented | Not included | Record Dashboard configuration |

No Storage API usage was found in the repository, but production bucket existence is still unverified. Do not omit the Dashboard inventory on that basis.

## Safe Backup Procedure

1. Record the operator, UTC start time, source project reference, CLI version, and intended artifact location. Do not record secret values.
2. In the Supabase Dashboard, confirm the source project and current plan. Record scheduled backup or PITR status, retention/recovery window, and latest restore point.
3. Confirm sufficient encrypted storage for the backup. Keep production data outside the repository with least-privilege access and a retention/deletion date.
4. Confirm Docker Desktop or another supported container runtime and the pinned Supabase CLI are available. The npm CLI requires Node.js 20 or later.
5. Run `supabase login` interactively. Enter the personal access token directly in the terminal. Never pass it in chat or commit it.
6. Initialize/link tooling only after the repository owner approves the generated files. Link to the production project reference and enter the database password directly at the prompt.
7. Dry-run the dump command and review its target before capture:

   ```powershell
   npx supabase db dump --linked --dry-run
   ```

8. Capture roles, schema, and data as separate files. Treat the data and role artifacts as sensitive even when passwords are omitted.
9. Inventory custom `auth`/`storage` changes, extensions, publications, hooks, buckets, Storage objects, Edge Functions, and project settings separately.
10. Hash all artifacts and record file sizes. Scan schema/role text for embedded secrets before any schema artifact enters version control.
11. Do not consider the backup valid until it restores successfully in isolation.

## Isolated Restore Rehearsal

### Target Requirements

Use one of these targets:

- A disposable Supabase project with no production traffic, keys, webhooks, or integrations.
- A local Supabase stack in Docker when it can faithfully exercise the captured features.

Never use the linked production project. Clearly label the target as disposable and confirm its project reference before every restore command.

### Procedure

1. Create the isolated target and record its project reference, Postgres version, region, and creation time.
2. Enable extensions and Database Webhooks used by the source before restore.
3. If the source uses Vault or column encryption, follow Supabase's root-key transfer procedure. Retrieve the old key while the source is active, transmit it only through an approved secret-handling channel, and never store it in this repository.
4. Review the schema dump for ownership statements and target-default privileges. Before restoring, preserve intended `anon` and `authenticated` privileges rather than inheriting overly broad target defaults.
5. Restore roles, schema, and data in one transaction with errors stopping the operation:

   ```powershell
   psql --single-transaction --variable ON_ERROR_STOP=1 `
     --file roles.sql `
     --file schema.sql `
     --command "SET session_replication_role = replica" `
     --file data.sql `
     --dbname $env:ISOLATED_DATABASE_URL
   ```

6. Apply separately reviewed customizations for managed schemas. Recreate bucket configuration, copy Storage object bytes, restore required Edge Functions/configuration, and reactivate required Realtime publications.
7. Reset passwords for any custom login roles through an approved secret process.
8. Run the verification checklist below. Do not connect the isolated target to production Stripe webhooks, cron jobs, email, push, analytics, or OAuth callbacks.
9. Record elapsed restore time, failures and corrections, final checks, operator, and UTC completion time.
10. Destroy or sanitize the target and backup artifacts according to the approved retention policy.

### Verification Checklist

- [ ] Restore command completed with no ignored SQL errors.
- [ ] Expected schemas, tables, views, sequences, functions, triggers, constraints, indexes, and extensions exist.
- [ ] Both AI usage RPCs exist and their definitions match the capture.
- [ ] RLS enablement, force status, policies, grants, and function execution privileges match the source.
- [ ] Sanitized row-count comparisons pass for all expected tables.
- [ ] Foreign keys and delete rules match the source.
- [ ] Auth sign-in and ownership-scoped reads/writes pass with test users only.
- [ ] Anonymous access is limited to explicitly intended operations.
- [ ] Service-role workflows operate only at authenticated/admin/cron boundaries.
- [ ] Storage buckets, configuration, and object counts/checksums match when Storage is used.
- [ ] Required publications, hooks, functions, and project settings are restored.
- [ ] Application smoke tests pass with external side effects disabled.
- [ ] Recovery time and achievable recovery point are recorded.

## Production Incident Restore

A production restore is a separate, high-impact operation. It requires incident approval, an agreed restore point, customer-impact assessment, downtime communication, replication-slot/subscription handling, and a post-restore validation plan. Use the Supabase Dashboard flow for scheduled backup or PITR restoration and follow the current official documentation.

Do not run any of the following during baseline capture or rehearsal against production:

```text
supabase db reset --linked
supabase db push
supabase migration repair
supabase migration up --linked
supabase migration down --linked
```

## Human Actions Required Now

1. Sign in to the Supabase Dashboard and select the production project.
2. Record the project plan in this document or the transformation log.
3. Open **Database > Backups > Scheduled backups** and record whether backups exist, their retention, and the latest successful backup.
4. Open **Database > Backups > Point in Time** and record whether PITR is enabled plus the earliest/latest recovery points.
5. Confirm whether the project uses Vault/pgsodium, custom roles, Database Webhooks, non-default extensions, Realtime publications, Storage buckets/objects, or Edge Functions.
6. Confirm an approved isolated restore target and secure backup-artifact location.
7. Confirm Docker Desktop and the Supabase CLI are available, or approve adding a pinned CLI dev dependency.
8. Run `supabase login` locally and enter the token directly in the terminal. Do not paste tokens or passwords into chat.
9. Provide or select the production project reference, then enter the database password directly when prompted.
10. Stop before any command that proposes a production change or migration-history repair.

## Exit Criteria

The backup/restore portion of Phase 0 passes only when:

- Backup/PITR capability and retention are evidenced for the actual project.
- A current manual logical backup exists in approved protected storage.
- Non-database assets and managed-schema customizations are inventoried.
- The backup restores successfully in an isolated environment.
- RLS, RPCs, relationships, row counts, and required application flows are verified.
- Measured recovery time and recovery point meet the owner's approved objectives.
- Artifacts have a documented owner, encryption, retention, and deletion policy.

Until then, restore status remains **not verified** and destructive database work remains blocked.

## Official References

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase CLI installation](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase `db dump` reference](https://supabase.com/docs/reference/cli/supabase-db-dump)
