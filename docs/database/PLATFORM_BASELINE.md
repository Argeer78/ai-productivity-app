# Pinned Supabase Platform Baseline

**Captured:** 2026-09-11
**Upgrade status:** no upgrade performed

The deployed checkout has no observable Git release tag. Reproducibility is pinned by the Compose file hash, bootstrap-file hashes, image tags, and immutable local image IDs.

## Platform Definition

- Compose file: `/home/aiprod/apps/aiprod/supabase/supabase-project/docker-compose.yml`
- Compose SHA-256: `f3b5c5d0dacb41ca51cd1ace74f5a67886fa4c46c6eab70e7ea8135b1e4614aa`
- PostgreSQL: 17.6
- Database image: `supabase/postgres:17.6.1.136`
- Database image ID: `sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00`
- Database bootstrap role: `supabase_admin`; database: `postgres`; timezone: UTC; `wal_level`: logical.

| Service | Image | Image ID |
|---|---|---|
| API gateway | `envoyproxy/envoy:v1.39.1` | `sha256:57e14a549d7bd43c8d3f6d03e8cfa653e037d4b38e133acd9b54f38c524401b4` |
| Auth | `supabase/gotrue:v2.196.0` | `sha256:c0c25187a6b835e65a6f6e6c6b39d090e832d40e6de5186f2c038e0411944232` |
| Edge Functions | `supabase/edge-runtime:v1.76.2` | `sha256:edd22bef4477b900d5c300e287ce9b18bff9b81a0291bee14ee0b7c7b71a2899` |
| Image proxy | `darthsim/imgproxy:v3.31.4` | `sha256:73c5dda13199745b0d2d00e4149d4a589c5b2e205dbf335ca05eca8276b54712` |
| Postgres Meta | `supabase/postgres-meta:v0.99.0` | `sha256:9a079ac1c94d89629262822a4bd1902d5b1be4adb464e5a0a8fd078aaed72158` |
| Realtime | `supabase/realtime:v2.134.10` | `sha256:cbcc6a7986fc28b6dcffa798b077d5fb9c69cd25500371ab49147a86d7edbb03` |
| REST | `postgrest/postgrest:v14.17` | `sha256:c9dc201e555f5d8e37e7f39cdd4df0229774996e213bfd7de8d10ac609030f2c` |
| Storage | `supabase/storage-api:v1.74.0` | `sha256:f1546fac6d1c7e345428ac904bfaa7be7cecd50a1f549fe1cf38c628a7b15c85` |
| Studio | `supabase/studio:2026.09.07-sha-7996410` | `sha256:94a2a9d2906e8b4109e55159a62e241c3044709a492913ea8edd34b14973d288` |
| Supavisor | `supabase/supavisor:2.9.12` | `sha256:464b93a60ba8c96bc06dad7f241562d6613b2a994922307717b05f432ae415c2` |

## Database Bootstrap Lock

| File | SHA-256 |
|---|---|
| `volumes/db/webhooks.sql` | `b584aaaa0c393f27218f81e01e76e1d07d42f947083249adcd6097ad471cde62` |
| `volumes/db/_supabase.sql` | `9dce462adc04137d6afabcf28efa60a6c355270a4b32d7af58891ac4eb964c5f` |
| `volumes/db/logs.sql` | `f0463ce5030907acef49326d2bffd36002df0718035071be7c99bd7fc897c63d` |
| `volumes/db/pooler.sql` | `df97ebe148d94cfb92a5e37ebf972dfd496be195f0915ecf14396b2cf50efecb` |
| `volumes/db/roles.sql` | `3ad717b225daa38aa982da26750f35641eb404e1eb5e69a763c22236ab96c1b2` |
| `volumes/db/realtime.sql` | `7e9e442e7fc4dae05544c07b67bede37a00d84644304dfce4d937134cb4c8f88` |
| `volumes/db/jwt.sql` | `1cc94a4f16f6e2932b383cd68e211a96bcae298437ca4120d8a5106396c58465` |

## Extensions and Schemas

Installed extensions are `pg_net` 0.20.3, `pg_stat_statements` 1.11, `pgcrypto` 1.3, `plpgsql` 1.0, `supabase_vault` 0.3.1, and `uuid-ossp` 1.1.

Expected non-system schemas are `_realtime`, `auth`, `extensions`, `graphql`, `graphql_public`, `net`, `public`, `realtime`, `storage`, `supabase_functions`, and `vault`.

Shared preload libraries are `pg_stat_statements`, `pgaudit`, `plpgsql`, `plpgsql_check`, `pg_cron`, `pg_net`, `pgsodium`, `auto_explain`, `pg_tle`, `plan_filter`, and `supabase_vault`. Session preload uses `supautils`.

## Initialization Assumptions

1. The database entrypoint completes all seven mounted bootstrap scripts.
2. GoTrue starts and applies Auth migrations before AIProd policy SQL references `auth.jwt()` or related helpers.
3. Storage applies its own schema migrations before Storage metadata recovery.
4. Other pinned services initialize their owned schemas/configuration.
5. AIProd migrations run only after platform service migration readiness.

Fresh service migration-ledger row counts may differ from a historically upgraded staging stack. Readiness is based on required object sets and service health, not ledger row-count equality.