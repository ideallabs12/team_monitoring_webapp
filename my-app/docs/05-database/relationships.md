# Database Relationships

## Entity Relationship Overview

```
auth.users (Supabase managed)
    └── 1:1 → profiles (id = auth.users.id)
                 ├── 1:N → team_members (user_id)
                 ├── 1:N → monthly_revenues (user_id)
                 ├── 1:N → monthly_revenues (entered_by)
                 ├── 1:N → dis_reports (user_id)
                 ├── 1:N → audit_logs (user_id)
                 ├── 1:N → sales_analytics (member_id)
                 ├── 1:N → sales_analytics (entered_by)
                 ├── 1:N → reviews (user_id)
                 ├── 1:N → attendance_logs (user_id)
                 ├── 1:N → announcements (created_by)
                 ├── 1:N → announcement_views (user_id)
                 ├── 1:N → notifications (created_by)
                 └── 1:N → notification_reads (user_id)

teams
    ├── N:N ↔ profiles (via team_members)
    ├── 1:N → monthly_revenues (team_id)
    ├── 1:N → dis_reports (team_id)
    ├── 1:N → monthly_targets (team_id)
    ├── 1:N → sales_analytics (team_id)
    ├── 1:N → reviews (team_id)
    └── 1:N ← events (target_team_id)

office_locations
    └── 1:N → office_ips (location_id)

speakers
    └── 1:N → speaker_timeline_events (speaker_id)

events
    └── 1:N → reviews (event_id)

announcements
    └── 1:N → announcement_views (announcement_id)

notifications
    └── 1:N → notification_reads (notification_id)
```

## Key Relationships Explained

### User → Team (Many-to-Many via team_members)
- A user can belong to multiple teams (primary and secondary)
- Each membership has a role: 'lead' or 'member'
- UNIQUE constraint prevents duplicate memberships

### User → Revenue (One-to-Many via monthly_revenues)
- Each revenue record belongs to one user AND one team
- UNIQUE constraint: one revenue per (user_id, team_id, revenue_month)
- `entered_by` tracks who created the entry (usually admin/team lead)

### User → DIS Reports (One-to-Many)
- Each DIS report belongs to one user AND one team
- UNIQUE constraint: one report per (user_id, team_id, report_date) [inferred]

### User → Profiles (One-to-One)
- Every auth.users record can have one profile
- Profile created manually during CompleteProfile step
- CASCADE DELETE: if auth user deleted, profile deleted

## Notable Missing Relationships
- `profiles.team_id` column exists but is not the canonical team assignment. The `team_members` table is authoritative.
- `monthly_targets` has no schema definition found — relationships inferred from code

## Cascade Behaviors

| Parent | Child Table | On Delete |
|--------|------------|-----------|
| auth.users | profiles | CASCADE |
| profiles | team_members | CASCADE |
| profiles | monthly_revenues | CASCADE |
| profiles | dis_reports | CASCADE |
| profiles | audit_logs | CASCADE |
| profiles | reviews | CASCADE |
| profiles | attendance_logs | CASCADE |
| teams | team_members | CASCADE |
| teams | monthly_revenues | CASCADE |
| teams | reviews | SET NULL |
| events | reviews | CASCADE |
| announcements | announcement_views | CASCADE |
| notifications | notification_reads | CASCADE |
| speakers | speaker_timeline_events | CASCADE |
| office_locations | office_ips | CASCADE |

## Potential Issues

1. **`profiles.team_id` redundancy**: The `profiles` table has a `team_id` column set during profile creation, but actual team membership is managed via `team_members`. These could become out of sync.

2. **No soft deletes**: Most tables use hard CASCADE deletes. Deleting a team deletes all members and revenues for that team.

3. **`monthly_revenues.entered_by` has no CASCADE**: The `entered_by` FK references `profiles(id)` with no delete rule specified. If the entering admin is deleted, this could cause orphaned records or constraint violations. REQUIRES VERIFICATION.

4. **Speaker management is self-contained**: `speakers` and `speaker_timeline_events` have no FK to `profiles` (no `created_by`/`owner` column). Anyone can modify any speaker record.
