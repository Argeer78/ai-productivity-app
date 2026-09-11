# Reference and Content Data Strategy

**Seed status:** no mandatory database rows

The tested clean room reaches the expected AIProd schema with `supabase/seed.sql` performing no inserts. The application has code/file fallbacks for supported languages and UI strings.

| Table/data | Classification | Clean install | Disaster recovery |
|---|---|---|---|
| `languages` | Optional canonical reference | May be empty; locale support is versioned in code | Preserve rows; consider a reviewed future seed |
| `templates` with no user owner | Optional product content | Feature can start empty | Preserve as product content |
| User-owned `templates` | User data | Never seed | Restore |
| `ui_translations` | Managed product content | Local JSON files provide fallback | Preserve; do not seed 58,972 staging rows into Git |
| `page_translations` | Generated/shared translation cache | May be empty | Preserve for current recovery; may later regenerate |
| `translations` | Empty legacy/alternate store | May be empty | Preserve until translation reconstruction decides retirement |
| `changelog_entries` | Optional editorial content | May be empty | Preserve |
| `admin_users` | Security configuration containing an email | Never seed from staging | Restore securely until admin reconstruction |
| Notes, tasks, profiles, plans, chat, usage, favorites, settings | User data | Never seed | Restore |
| Reviews and feedback | User-submitted data | Never seed | Restore per retention policy |
| `email_logs`, `events`, `travel_clicks` | Operational/telemetry data | Never seed | Restore or expire per approved retention policy |

## Translation Notes

- `languages/*.json` contains versioned UI fallback content for 26 locales.
- `ui_translations` is application-owned content maintained by admin/sync tooling; it is not required for bootstrap.
- `page_translations` behaves as generated/cache content but must currently be included in backup because regeneration is not yet formally defined.
- `translations` is empty and its active ownership is unclear.
- Translation architecture and source-of-truth decisions are deferred to the dedicated reconstruction milestone.

No personal data, staging content export, admin email, or generated translation cache belongs in repository seeds.