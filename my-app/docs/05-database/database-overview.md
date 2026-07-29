# Database Overview

## Database Technology
- **Provider**: Supabase (managed PostgreSQL)
- **PostgreSQL Version**: 17 (per supabase/config.toml)
- **Project ID**: `pzalalbpxlwtcnmkaegb`
- **ORM/Query Builder**: Supabase JS client (PostgREST)
- **No raw SQL from frontend** — all queries via Supabase client
- **Row Level Security (RLS)**: Enabled on ALL tables

## Schema Source
The `database_schema.sql` file in the repository root contains the full migration history as a concatenated SQL file. It is NOT a migration system (no timestamped migrations) — it is a manual record of all schema changes applied in sequence.

## Tables Summary

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profiles and roles | Yes |
| `teams` | Sales teams | Yes |
| `team_members` | User-team membership with roles | Yes |
| `monthly_revenues` | Monthly revenue records | Yes |
| `dis_reports` | Daily Information System reports | NOT IN SCHEMA FILE* |
| `monthly_targets` | Revenue targets per user/team/month | NOT IN SCHEMA FILE* |
| `audit_logs` | System activity trail | Yes |
| `sales_analytics` | Sales executive call logs | Yes |
| `events` | Review events | Yes |
| `reviews` | Employee review submissions | Yes |
| `holidays` | Holiday calendar | Yes |
| `office_locations` | GPS office coordinates | Yes |
| `office_ips` | Whitelisted IPs for attendance | Yes |
| `attendance_logs` | Check-in/out records | Yes |
| `announcements` | Company announcements | Yes |
| `announcement_views` | Read receipts for announcements | Yes |
| `notifications` | System notifications | Yes |
| `notification_reads` | Notification read receipts | Yes |
| `system_settings` | Global platform settings (1 row) | Yes |
| `speakers` | Speaker CRM records | Yes |
| `speaker_timeline_events` | Immutable speaker history | Yes |

> *`dis_reports` and `monthly_targets` are heavily used in the code but NOT found in `database_schema.sql`. Their schema must have been created separately and not recorded in this file, OR they may exist in the Supabase cloud instance from direct dashboard creation.

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `review_photos` | Yes | Photos attached to reviews |
| `announcements_media` | Yes | Images/videos in announcements |

## Database Functions (PostgreSQL)

| Function | Returns | SECURITY DEFINER | Purpose |
|----------|---------|-----------------|---------|
| `is_admin()` | boolean | Yes | Check if current user is admin or executive |
| `is_team_lead(team_id)` | boolean | Yes | Check if current user is team lead for a team |
| `get_db_size()` | numeric | Yes | Get DB size in MB |
| `get_exact_db_size()` | bigint | Yes | Get exact DB size in bytes |
| `get_db_storage_stats()` | json | Yes | Get used/remaining DB space as JSON |
| `deactivate_inactive_users(days)` | integer | Yes | Batch deactivate users inactive for N days |
| `get_leaderboard_data(target_month)` | setof record | Yes | Aggregates revenue vs targets for leaderboard |

## Realtime-Enabled Tables

Tables added to `supabase_realtime` publication:
- `audit_logs`
- `reviews`
- `events`
- `announcements`
- `notifications`
- `announcement_views`
- `system_settings`

## Key Observations
1. **dis_reports and monthly_targets are NOT in the schema file** — This is a significant gap in documentation
2. **system_settings uses a CHECK constraint** to ensure only 1 row ever exists (id must = 1)
3. **speakers table has open RLS policies** — anyone can insert/update speakers, which is a security risk
4. **audit_logs is append-only by design** — no UPDATE/DELETE policies for regular users
5. **speaker_timeline_events has no UPDATE policy** — intentionally immutable
6. **reviews had NOT NULL constraints relaxed and then restored** — visible in migration history showing schema churn
