# Environment Reference

**Scope:** variable names and ownership only  
**Rule:** never store values here

## Source Inventory

| Variable | Class | Purpose / note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Browser Supabase endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Browser anonymous key |
| `NEXT_PUBLIC_SITE_URL` | Public | Redirect/site origin |
| `NEXT_PUBLIC_APP_URL` | Public | Canonical application URL |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Public, deprecated authority | UI visibility and email bypasses |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | Browser push subscription |
| `NEXT_PUBLIC_FREE_AI_DAILY_LIMIT` | Public | UI hint; server must enforce independently |
| `NEXT_PUBLIC_BOOKING_AID` | Public | Travel affiliate identifier |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Preferred service-role credential |
| `SUPABASE_SERVICE_KEY` | Server secret alias | Legacy fallback; consolidate |
| `SUPABASE_URL` | Server operational | Server endpoint alias |
| `OPENAI_API_KEY` | Server secret | AI provider |
| `RESEND_API_KEY` | Server secret | Email provider |
| `STRIPE_SECRET_KEY` | Server secret | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Server secret | Webhook verification |
| `CRON_SECRET` | Server secret | Cron authentication |
| `VAPID_PRIVATE_KEY` | Server secret | Web Push signing |
| `VAPID_SUBJECT` | Server operational | Web Push contact |
| `ANDROID_PACKAGE_NAME` | Server operational | Play Integrity app identity |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Server secret | Play Integrity account if configured |
| `NODE_ENV` | Runtime | Framework mode |

Stripe price names to verify are `STRIPE_PRICE_PRO_EUR`, `STRIPE_PRICE_PRO_USD`, `STRIPE_PRICE_FOUNDER_EUR`, and `STRIPE_PRICE_FOUNDER_USD`.

## Observed On Staging

`/home/aiprod/apps/aiprod/app/.env.production` is owned by `aiprod:docker` and mode 600. Only these names were observed:

- Public: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_FREE_AI_DAILY_LIMIT`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`.
- Server secret: `SUPABASE_SERVICE_ROLE_KEY`.
- Server aliases: `SUPABASE_SERVICE_KEY`, `SUPABASE_URL`.

No PM2 ecosystem file was found. PM2 supplies `PORT=3065`.

## Gaps and Rules

- Provider variables referenced by source were not observed in the staging app env file. Optional integrations must fail safely when absent.
- `NEXT_PUBLIC_ADMIN_EMAIL` is not observed on the VPS but remains an insecure authorization concept in source.
- The two service-role variable names overlap; select one canonical server-only name later.
- Secret owners and rotation dates are not documented.
- `vercel.json` and Vercel-era source configuration are non-authoritative for the VPS until reconciled.
- Public variables can never confer privilege.
- Server secrets must not enter logs, docs, Git, build output, or responses.