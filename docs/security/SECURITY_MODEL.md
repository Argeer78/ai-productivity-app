# AIProd Security Model

## Scope

This document defines the M1 security contract. It applies to staging first. Production changes require separate approval.

## Trust Levels

| Class | Identity source | Authorization boundary |
|---|---|---|
| Public | None | Explicitly limited operation, validated input, IP-based abuse control where appropriate |
| Authenticated user | Validated Supabase bearer token | Trusted `auth.users.id` derived server-side |
| Resource owner | Authenticated user | Trusted user ID must own the target row or operation |
| Admin | Authenticated user | Membership in `public.admin_users` by `user_id` |
| Internal/cron | Server-held bearer secret | Constant-time credential verification and fail-closed configuration |
| Webhook | Provider signature | Raw-body verification, replay/idempotency handling, and provider-specific validation |

Client-supplied user IDs, emails, roles, admin flags, and ownership claims are data, never authorization evidence.

## Canonical Identity

Protected routes call the shared server authentication helper. It validates the bearer token with Supabase and returns the authenticated user. Routes derive ownership and usage attribution from `user.id`; email is used only where the product operation genuinely requires an address.

Authentication failures use these contracts:

- `401`: missing or invalid authentication.
- `403`: authenticated identity lacks permission.
- `500`: authentication or authorization infrastructure is unavailable.

Responses never expose provider errors, SQL details, stack traces, tokens, or configuration values.

## Admin Authority

`public.admin_users.user_id`, referencing `auth.users.id`, is the sole admin membership source. AIProd currently needs only admin/non-admin membership, so no general RBAC layer is introduced.

The browser obtains an `admin` capability from an authenticated endpoint and uses it only to render navigation. Every privileged server operation independently enforces admin authorization. Public environment variables, email comparison, profile flags, and hidden UI are not authorization mechanisms.

## Ownership And Privileged Access

User-owned operations must bind database predicates to the authenticated user ID. A service-role client may be retained only when the operation genuinely needs elevated access and the route performs authentication, authorization, ownership, and input validation before the privileged query.

Service-role usage is classified as:

- **Keep:** platform, webhook, cron, or administrative operation requiring elevation.
- **Replace:** user operation that can safely execute through the authenticated RLS client.
- **Encapsulate:** necessary elevation behind a narrow helper that accepts trusted identity.

## Validation And Errors

Routes use Zod through `lib/apiValidation.ts` to validate body, query, path identifiers, enums, lengths, and file metadata before database or provider calls. JSON bodies are read as bounded text before parsing, so chunked requests cannot bypass `Content-Length` checks. Specialized file and provider-signature validators remain in place. Security-relevant errors use `400`, `401`, `403`, `404`, `409`, `413`, `429`, `500`, or `503` according to their meaning and return a stable JSON envelope.

## Abuse And AI Cost Boundary

Rate limits use authenticated user identity when available and a trusted client-address source for public traffic. Proxy-derived addresses are accepted only after the Nginx forwarding contract is verified. AI operations additionally require bounded input, usage attribution, quota enforcement, provider timeout, and a fixed maximum number of provider calls per request.

### Request Classes

| Payload class | Default maximum | Rationale |
|---|---:|---|
| Small JSON | 32 KiB | Mutations, identifiers, settings, and short prompts |
| AI/text JSON | 256 KiB | Bounded histories and attachment text without breaking current chat workflows |
| Webhook raw body | 1 MiB | Provider event envelopes while preserving raw signature verification |
| Voice multipart | 11 MiB request / 10 MiB file | Existing product file limit plus multipart overhead |

### Rate-Limit Classes

| Class | Default | Store failure |
|---|---:|---|
| Public-light | 60/minute | Fail open for low-cost reads and events |
| Authenticated-standard | 120/minute | Fail open for ordinary application mutations |
| Sensitive | 10/5 minutes | Fail closed |
| AI-light | 20/hour | Fail closed |
| AI-heavy | 5/hour | Fail closed |
| Admin | 30/5 minutes | Fail closed; admin authorization remains mandatory |
| Internal | 3/15 minutes | Fail closed after cron-secret verification |

The shared store is `public.security_rate_limits`, consumed only through an atomic security-definer function available to `service_role`. Counters are keyed by action, HMAC-derived identity, and fixed window. The table has RLS enabled and no client policies. Limits and windows can be overridden by server-only environment variables.

Rate-limit responses use HTTP `429`, a numeric `Retry-After` header, and `{ "ok": false, "error": { "code": "rate_limited", "message": "Too many requests." } }`. Store failures on paid, sensitive, admin, and internal operations return controlled `503` responses rather than permitting unbounded provider calls.

### Proxy Trust Boundary

The application ignores `X-Forwarded-For`. Anonymous identity may use `X-Real-IP` only when `TRUST_PROXY_HEADERS=true`, Nginx overwrites that header with `$remote_addr`, and the Next.js listener is reachable only through loopback. Staging acceptance must verify all three conditions. Identifiers are HMAC-SHA-256 values; raw addresses are neither persisted nor logged.

The existing daily AI entitlement counters still contain read-decide-increment flows. The atomic M1.4 limiter is the hard cost perimeter. Consolidating plan entitlements and credits into one atomic accounting model remains M4 work.

Email cron fan-out is capped at 500 selected recipients per invocation. Deterministic pagination or continuation for populations above that ceiling remains operational follow-up work; the cap intentionally prevents an unbounded provider batch.

## Security Logging

Server logs may record event type, route, trusted user ID, target resource ID, outcome, and coarse rate-limit metadata. They must not record authorization headers, tokens, passwords, API keys, provider credentials, sensitive request bodies, or generated user content.

## Database Change Workflow

Every database change follows:

```text
forward migration
  -> isolated clean-room validation
  -> schema fingerprint comparison
  -> verified staging backup
  -> staging migration
  -> staging acceptance
```

Live schema changes are never made manually. Migrations are rollback-aware, but recovery uses a new forward migration or the protected pre-change backup rather than editing applied migration history.

## M1 Delivery Order

1. Canonical identity and admin membership.
2. Unsafe task, thread, voice, and Play Integrity routes.
3. RLS policies for deliberately classified tables.
4. Shared validation, error, rate-limit, and abuse controls.
5. Route registry reconciliation and service-role containment.
6. Automated negative security tests and staging acceptance.