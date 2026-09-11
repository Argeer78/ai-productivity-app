# Database Object Ownership

**Captured:** 2026-09-11
**Rule:** platform objects are prerequisites, not AIProd migrations

## Platform Managed

The pinned Supabase stack owns these schemas and their objects:

- `_realtime`, `auth`, `extensions`, `graphql`, `graphql_public`, `net`, `realtime`, `storage`, `supabase_functions`, and `vault`.
- Platform roles including `anon`, `authenticated`, `authenticator`, `service_role`, `supabase_admin`, and service-specific roles.
- Auth, Storage, Realtime, GraphQL, Vault, Supavisor, and webhook bootstrap state.
- Extensions and extension lifecycle: `pg_net`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp`.
- Platform migration ledgers and provider-created event triggers/publications.

These objects are initialized by the pinned database bootstrap scripts and service images. They must not be copied into AIProd migrations.

## AIProd Managed

All captured `public` objects are application-owned and are represented by the baseline migration:

- User/product tables: `profiles`, `notes`, `tasks`, `daily_scores`, `daily_checkins`, `weekly_goals`, `weekly_reports`, `weekly_action_plans`, `ai_chat_threads`, `ai_chat_messages`, `ai_companion_threads`, `ai_companion_messages`, `ai_usage`, `travel_plans`, `travel_clicks`, `push_subscriptions`, `user_notification_settings`, `templates`, and `template_favorites`.
- Content/operations tables: `admin_users`, `app_reviews`, `feedback`, `email_logs`, `events`, `languages`, `changelog_entries`, `ui_translations`, `page_translations`, and `translations`.
- Six `public` functions, three application triggers, public constraints/indexes/sequences, RLS state, 82 policies, explicit grants, and default privileges.

Application ownership does not mean the current design is correct. The baseline intentionally preserves email-only `admin_users`, absent `daily_plans`, policy gaps, broad grants, and anonymous translation writes.

## Shared Dependencies

AIProd-owned objects depend on platform contracts:

| Dependency | Provider | AIProd use |
|---|---|---|
| `auth.users` | GoTrue migrations | Twelve public foreign keys and identity ownership |
| `auth.uid()`, `auth.email()`, `auth.jwt()` | GoTrue migrations | RLS policy evaluation |
| `extensions.uuid_generate_v4()` | Platform extension bootstrap | Public UUID defaults |
| `anon`, `authenticated`, `service_role` | Platform role bootstrap | Grants and policy roles |
| `postgres`, `supabase_admin` | Platform role bootstrap | Existing default privileges and migration execution |
| `public` schema | PostgreSQL/Supabase bootstrap | Container for AIProd objects |

The migration may reference these dependencies after platform bootstrap but must not create or own them.

## Ambiguous Boundaries

- `public.set_current_timestamp_updated_at()` and `public.weekday_int_array_is_valid()` are generic utilities, but they are application-owned because they live in `public` and support AIProd constraints/triggers.
- Translation tables are application-owned schema. Their rows have different content/cache classifications documented in `REFERENCE_DATA.md`.
- `_realtime.tenants`, `_realtime.extensions`, `_realtime.feature_flags`, and Realtime publications are platform configuration. They are regenerated from platform configuration and verified after recovery.
- Vault currently contains zero secrets. Vault schema/data remains platform-owned and credentials remain outside Git.

## pg_net

`pg_net` 0.20.3 is installed in `extensions` by the platform webhook bootstrap (`volumes/db/webhooks.sql`). No `public` object depends on the `net` schema or `pg_net` extension. AIProd migrations therefore neither create, drop, nor alter it.

The M0 replay failure occurred because a full clean-mode database dump attempted to drop/recreate a preloaded platform extension. That operation terminated the applying backend. Correct lifecycle: platform bootstrap owns `pg_net`; AIProd starts afterward.