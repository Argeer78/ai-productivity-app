# AIProd Database Migrations

## Structure

- `migrations/YYYYMMDDHHMMSS_description.sql`: immutable ordered migrations.
- `seed.sql`: required non-user reference data only; currently no-op.

The initial baseline represents verified staging behavior. Do not edit it after acceptance or application to a shared environment. Add a new forward migration instead.

## Workflow

1. Capture and verify a protected backup.
2. Create a timestamped migration using lowercase snake_case description.
3. Review locks, runtime, RLS, grants, ownership, data backfills, and recovery path.
4. Apply the full chain to a fresh pinned clean room with `ON_ERROR_STOP=1`.
5. Run schema drift and database behavior tests.
6. Apply to staging only after approval; validate and record migration identity.
7. Obtain acceptance before a separately approved production operation.

Rollback philosophy is forward recovery. Destructive migrations require a tested backup restore and explicit rollback/compensating migration. Never edit a migration already applied to a shared environment and never repair remote migration history without explicit approval.