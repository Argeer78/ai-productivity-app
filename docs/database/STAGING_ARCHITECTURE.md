# Staging Architecture

**Captured:** 2026-09-11  
**Scope:** observed staging topology; no production assertions

## Application

| Item | Value |
|---|---|
| SSH target | `aiprod@supabase-staging.aiprod.app` |
| Host | `srv1267838` |
| Application path | `/home/aiprod/apps/aiprod/app` |
| Git branch / commit | `staging` / `938a8483ab928297ae90b7f0f241c0be28c6c58d` |
| Worktree at capture | Clean; 0 ahead/behind `origin/staging` |
| PM2 process | `aiprod-staging`, online |
| PM2 command | `/usr/bin/npm start`, Node interpreter |
| Next.js port | 3065 |
| PM2 logs | `/home/aiprod/.pm2/logs/aiprod-staging-{out,error}.log` |
| PM2 systemd unit | Not observed |

## Ingress

| Hostname | Listener | Upstream |
|---|---|---|
| `staging.aiprod.app` | HTTPS 443; IPv6 HTTP 80 observed | `127.0.0.1:3065` |
| `supabase-staging.aiprod.app` | HTTPS 443; IPv6 HTTP 80 observed | `127.0.0.1:54321` |

Certificate paths and headers are intentionally omitted.

## Supabase Runtime

| Container | Image | Published ports |
|---|---|---|
| `supabase-db` | `supabase/postgres:17.6.1.136` | None |
| `supabase-auth` | `supabase/gotrue:v2.196.0` | None |
| `supabase-rest` | `postgrest/postgrest:v14.17` | None |
| `supabase-storage` | `supabase/storage-api:v1.74.0` | None |
| `supabase-edge-functions` | `supabase/edge-runtime:v1.76.2` | None |
| `realtime-dev.supabase-realtime` | `supabase/realtime:v2.134.10` | None |
| `supabase-meta` | `supabase/postgres-meta:v0.99.0` | None |
| `supabase-studio` | `supabase/studio:2026.09.07-sha-7996410` | None |
| `supabase-imgproxy` | `darthsim/imgproxy:v3.31.4` | None |
| `supabase-pooler` | `supabase/supavisor:2.9.12` | `127.0.0.1:55432->5432`, `127.0.0.1:56543->6543` |
| `supabase-envoy` | `envoyproxy/envoy:v1.39.1` | `127.0.0.1:54321->8000` |

Published Supabase ports bind to loopback. An unrelated database container shares the host and is outside this application's ownership boundary.

## Operations

The evidenced deployment flow is local changes to GitHub `staging`, deployment into the application path, Next.js build, and PM2 restart. The automation trigger and rollback mechanism were not proven. No PM2 systemd startup unit was observed, so restart persistence is an operational gap.

Current M0 evidence is under `/home/aiprod/backups/aiprod-staging-M0-20260911T163323Z`. An earlier same-day directory also exists; two directories do not establish retention.

Trust boundaries:

1. Nginx terminates ingress and forwards to loopback services.
2. Browser access uses the anonymous Supabase key and relies on RLS.
3. Next.js service-role routes bypass RLS.
4. PM2 and Docker share one VPS host boundary.
5. External AI, payment, email, push, and Google services were not enabled or exercised in M0.