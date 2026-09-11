# Clean Installation and Reproducibility

## Target Architecture

```text
pinned self-hosted Supabase platform
  -> database bootstrap scripts complete
  -> Auth and Storage service migrations complete
  -> AIProd versioned migrations run in timestamp order
  -> required seed runs (currently no-op)
  -> schema fingerprint validation passes
```

AIProd does not recreate Supabase from an application SQL dump.

## Application Migration

The initial migration is `supabase/migrations/20260911000000_aiprod_staging_baseline.sql`. It is derived mechanically from the verified staging public-schema artifact. Only dump transport guards were removed and `CREATE SCHEMA public` became `CREATE SCHEMA IF NOT EXISTS public` because the platform owns schema bootstrap.

It preserves 29 public tables, 6 functions, 3 triggers, 82 policies, constraints, indexes, RLS state, grants, default privileges, email-only `admin_users`, and absent `daily_plans`.

## Clean-Room Proof

On 2026-09-11 an isolated internal-only Docker network was created with generated disposable credentials and no published ports:

1. Pinned PostgreSQL image and seven bootstrap scripts initialized the platform database.
2. Pinned GoTrue applied Auth migrations, including `auth.jwt()`.
3. The AIProd baseline migration ran with `ON_ERROR_STOP=1`.
4. Validation returned 29 tables, 6 functions, 3 triggers, 82 policies, 12 public foreign keys to Auth, no `admin_users.user_id`, and no `daily_plans`.
5. An owner-neutral fingerprint compared 1,241 application-schema records byte-for-byte with live staging and produced identical SHA-256 hashes.
6. Total elapsed time for the initial reconstruction was 7 seconds; all disposable resources were removed after every run.

Result: **PASS**.

## Operator Procedure

1. Verify all image, Compose, and bootstrap hashes against `PLATFORM_BASELINE.md`.
2. Generate new platform credentials outside Git.
3. Start the pinned platform with no production integrations.
4. Wait for database initialization and service-owned migrations, checking required objects rather than historical ledger counts.
5. Apply migrations lexically by timestamp with `psql -X -v ON_ERROR_STOP=1` or an approved migration runner.
6. Apply `supabase/seed.sql`.
7. Generate a schema fingerprint and compare it with an accepted environment.
8. Run Auth/RLS tests with synthetic users before exposing ingress.

Staging already contains the baseline state. The baseline migration has not been applied to staging or inserted into a remote migration ledger. That reconciliation requires separate approval.