# Staging RLS Matrix

**Evidence:** captured staging catalog, 2026-09-11  
**Scope:** 29 `public` base tables; 82 policies; forced RLS on none

`Yes` means at least one policy exists for that command. It does not prove the expression is safe. Service-role requests bypass every row.

| Table | RLS | Select | Insert | Update | Delete | Ownership / finding |
|---|---:|---:|---:|---:|---:|---|
| `admin_users` | On | Yes | No | No | No | JWT email; code expects absent `user_id` |
| `ai_chat_messages` | On | Yes | Yes | Yes | Yes | `user_id` |
| `ai_chat_threads` | On | Yes | Yes | Yes | Yes | `user_id` |
| `ai_companion_messages` | On | Yes | Yes | Yes | Yes | User plus parent thread |
| `ai_companion_threads` | On | Yes | Yes | Yes | Yes | `user_id` |
| `ai_usage` | On | Yes | Yes | Yes | Yes | `user_id`; SECURITY DEFINER RPC bypasses RLS |
| `app_reviews` | On | Yes | Yes | No | No | Own read, public insert |
| `changelog_entries` | On | Yes | Yes | No | No | Public read, profile-admin insert |
| `daily_checkins` | On | Yes | Yes | No | No | `user_id`; not referenced by source |
| `daily_scores` | On | Yes | Yes | Yes | No | `user_id`; duplicate policy variants |
| `email_logs` | Off | No | No | No | No | Server only by convention |
| `events` | Off | No | No | No | No | Unclear/unused |
| `feedback` | On | Yes | Yes | No | No | Public insert; competing admin models |
| `languages` | Off | No | No | No | No | Global reference data |
| `notes` | On | Yes | Yes | Yes | Yes | `user_id` |
| `page_translations` | On | Yes | Yes | Yes | No | Anonymous writes are high risk |
| `profiles` | On | Yes | Yes | Yes | No | `id = auth.uid()`; billing/admin fields |
| `push_subscriptions` | Off | No | No | No | No | Sensitive endpoint/key material |
| `tasks` | On | Yes | Yes | Yes | Yes | `user_id` |
| `template_favorites` | On | Yes | Yes | No | Yes | `user_id` |
| `templates` | On | Yes | Yes | Yes | Yes | Public or `user_id` |
| `translations` | Off | No | No | No | No | Unclear/legacy |
| `travel_clicks` | On | No | Yes | No | No | Anonymous write-only telemetry |
| `travel_plans` | On | Yes | Yes | Yes | Yes | `user_id` |
| `ui_translations` | On | Yes | No | No | No | Public read; server writes |
| `user_notification_settings` | On | Yes | Yes | Yes | No | `user_id` |
| `weekly_action_plans` | Off | No | No | No | No | Server only; no user/week uniqueness |
| `weekly_goals` | On | Yes | Yes | Yes | Yes | `user_id`; overlapping policies |
| `weekly_reports` | On | Yes | Yes | Yes | No | `user_id` |

Tables with no policies are `email_logs`, `events`, `languages`, `push_subscriptions`, `translations`, and `weekly_action_plans`.

Priority findings:

1. `push_subscriptions` has RLS disabled despite sensitive material.
2. `page_translations` permits anonymous inserts and updates.
3. Broad grants to `anon` and `authenticated` make RLS-off tables a priority for grant review.
4. Admin authorization uses JWT email, `profiles.is_admin`, and `admin_users` inconsistently.
5. Every service-role caller must independently derive identity and ownership.

This records current behavior. Policy changes require a later approved migration.