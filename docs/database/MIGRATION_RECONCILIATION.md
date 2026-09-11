# Migration Reconciliation

**Status:** M0.1 local migration history and reproducibility established  
**Rule:** no remote history repair or schema mutation is authorized

## Current Truth

- `supabase/migrations/20260911000000_aiprod_staging_baseline.sql` is the first AIProd-owned migration.
- `supabase/seed.sql` is an explicit no-op because no database rows are required for clean startup.
- `supabase/README.md` defines timestamp naming, immutable forward migrations, validation, and recovery rules.
- `scripts/setup_reviews_table.sql` and `scripts/setup_daily_plans.sql` are standalone scripts, not history.
- Staging has 11 schemas and 79 tables. The versioned artifact covers the 29 public tables.
- The full dump contains managed schemas and extension operations that cannot be replayed directly over the provider image.
- Historical per-change lineage before the baseline remains unavailable; the reviewed baseline is the new local origin.
- The baseline has not been applied to staging or inserted into a remote migration ledger because staging already contains that state.

## Source-to-Staging Drift

| Contract | Source expects | Staging has | Decision needed |
|---|---|---|---|
| Admin membership | `admin_users.user_id` | Email primary key | Select one durable model and migrate atomically |
| Admin UI | `NEXT_PUBLIC_ADMIN_EMAIL` | JWT email and `profiles.is_admin` also exist | Remove browser authority; unify model |
| Daily plans | Writes `daily_plans` | Table absent | Decide whether feature or table is obsolete |
| Push devices | Upsert by user/endpoint | Also unique on `user_id` | Decide one-device versus multi-device contract |
| Weekly action plan | One user/week implied | No unique user/week constraint | Check data before adding uniqueness |
| Stripe fallback | Email lookup | Profile email uniqueness not proven | Prefer immutable ID; assess duplicates |
| Page translations | Admin/server content | Anonymous insert/update | Restrict in reviewed RLS migration |
| Notifications | User-owned sensitive rows | `push_subscriptions` RLS off | Define browser versus server ownership |
| AI quota date | Product day boundary | Database `current_date` | Define and test timezone contract |
| Legacy objects | Several tables unused by source | Objects remain in staging | Establish owner/retention before removal |

## Established Baseline

1. Keep the M0 capture and checksums immutable; do not hand-edit evidence into applied history.
2. Rebuild platform state from the pinned Compose stack and service-owned migrations.
3. Apply the AIProd baseline and later timestamped migrations in lexical order.
4. Apply the explicit no-op seed.
5. Compare the deterministic application fingerprint before promotion.
6. Restore protected data separately; do not restore platform migration ledgers or Vault secrets.
7. Add each approved database change as a new forward migration with focused tests.
8. Never run remote history repair or mark the baseline applied without explicit approval, a fresh backup, and a rollback procedure.

Proposed ordering for later approval: baseline application schema; admin authority; daily plans contract; public/sensitive RLS; push subscription cardinality; weekly plan identity; billing identity; AI quota boundary.

Migration truth is **reproducible from the M0.1 baseline**. Clean-room reconstruction, owner-neutral fingerprint parity, and isolated filtered-data recovery pass. M1 remains out of scope and requires explicit approval; none of the listed security or product-contract changes were implemented during M0.1.