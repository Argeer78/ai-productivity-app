# Preserved M1 Backlog

M0.1 does not authorize these changes:

1. **M1.1 implemented; staging acceptance pending:** canonical `admin_users.user_id` authority, server capability endpoint, and removal of `NEXT_PUBLIC_ADMIN_EMAIL` and `profiles.is_admin` authorization.
2. Require authenticated owner validation in `/api/tasks/complete`.
3. Remove untracked guest/caller identity from `/api/voice/capture`; add quota and abuse controls.
4. Require bearer-derived ownership for AI Hub thread deletion and related thread operations.
5. Authenticate and bind Play Integrity verification requests; do not expose an unrestricted public verifier.
6. Add practical user/IP/provider rate limiting to paid AI and public side-effect routes.
7. Remove anonymous insert/update access from `page_translations` through a reviewed migration.
8. Decide and enforce `push_subscriptions` ownership, RLS, grants, and device cardinality.
9. Review grants/RLS for six policyless public tables: `email_logs`, `events`, `languages`, `push_subscriptions`, `translations`, and `weekly_action_plans`.
10. Resolve the application write to absent `daily_plans` without silently inventing schema.
11. Add Stripe webhook idempotency and remove unsafe email fallback assumptions.
12. Define AI quota timezone and atomic reservation semantics.
13. Reconstruct translation architecture in its dedicated milestone; do not combine it with general M1 work.

Every database change above requires a new timestamped forward migration after backup, clean-room validation, staging application, drift verification, and acceptance.