# Schema Drift Detection

## Mechanism

`scripts/database/schema_fingerprint.sql` emits a deterministic application-schema fingerprint covering public tables, columns/defaults/nullability, constraints, indexes, functions, triggers, RLS flags, policies, table/routine grants, and default ACLs.

Object grants to platform ownership roles `postgres` and `supabase_admin` are excluded because the same effective owner privilege is represented differently when migrations run under a different bootstrap role. Grants to `PUBLIC`, `anon`, `authenticated`, `service_role`, and any other non-platform role remain in scope. Default ACLs are compared separately, including their owner role.

`scripts/database/compare-schema-drift.ps1` compares two databases using PostgreSQL service names:

```powershell
pwsh scripts/database/compare-schema-drift.ps1 `
  -ExpectedService aiprod_cleanroom `
  -ActualService aiprod_staging
```

Credentials belong in a protected `pg_service.conf`/password mechanism outside Git. The script never accepts or prints passwords. Fingerprints may contain function/policy definitions and are temporary restricted artifacts; do not commit them without review.

## Expected Database

The expected database must be created from the pinned platform, repository migrations, and repository seed. Never use a hand-maintained schema dump as the expected side.

## Interpretation

- Exit 0: fingerprints match.
- Exit 1: drift exists; review `schema.diff.txt`.
- Object owner, owner-equivalent object ACL, comment, and platform-schema differences are outside this application fingerprint.
- Any unexplained public-object difference blocks migration promotion.

Run drift detection after clean-room construction, before and after staging migrations, in CI when a disposable platform is available, and periodically against staging to catch Dashboard/manual edits.