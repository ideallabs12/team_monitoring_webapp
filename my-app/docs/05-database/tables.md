# Database Tables

## profiles
**Purpose**: Stores all user profiles and platform roles

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, FK → auth.users(id) ON DELETE CASCADE | Links to Supabase Auth |
| first_name | text | nullable | |
| last_name | text | nullable | |
| phone | text | nullable | |
| email | text | nullable | Duplicated from auth.users |
| platform_role | text | NOT NULL, DEFAULT 'user' | Values: 'admin', 'executive', 'employee', 'teamlead', 'user' |
| is_deactivated | boolean | NOT NULL, DEFAULT false | Account disabled flag |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| is_sales_executive | boolean | DEFAULT false | Added via migration |
| nav_preference | text | DEFAULT 'navbar' | 'navbar' or 'sidebar' |
| require_gps_attendance | boolean | DEFAULT true | Per-user GPS enforcement |
| require_ip_attendance | boolean | DEFAULT true | Per-user IP enforcement |
| wfh_enabled | boolean | DEFAULT false | WFH bypass flag |
| feature_access | jsonb | DEFAULT '{}' | Feature flags for admin/executive |
| has_revenue_logging | boolean | nullable | Controls revenue nav link visibility |
| has_dis_reporting | boolean | nullable | (Referenced in CompleteProfile) |
| profile_completed | boolean | nullable | Completion flag |
| team_id | uuid | nullable | (Referenced in CompleteProfile — may be legacy) |

**Note**: `team_id` in profiles appears to be a legacy column. The actual team assignment is through `team_members`. The `CompleteProfile.jsx` sets this field on signup but the main team logic uses `team_members`.

### feature_access JSONB Structure
```json
{
  "writeUps": true,
  "reviews": true,
  "auditLogs": true,
  "settings": true,
  "controlPanel": true,
  "aiAnalytics": true,
  "attendance": true,
  "auditLogs_revenue": true,
  "auditLogs_login": true,
  "auditLogs_active": true,
  "auditLogs_admin": true,
  "auditLogs_page": true,
  "maintenanceModeForced": false
}
```

---

## teams
**Purpose**: Sales team definitions

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | text | NOT NULL | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

---

## team_members
**Purpose**: Many-to-many: users belong to teams with roles

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | FK → profiles(id) ON DELETE CASCADE | |
| team_id | uuid | FK → teams(id) ON DELETE CASCADE | |
| team_role | text | NOT NULL, DEFAULT 'member' | 'lead' or 'member' |
| joined_at | timestamptz | NOT NULL, DEFAULT now() | |
| UNIQUE(user_id, team_id) | | | One membership per user/team |

---

## monthly_revenues
**Purpose**: Monthly revenue entries per employee per team

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | FK → profiles(id) ON DELETE CASCADE | |
| team_id | uuid | FK → teams(id) ON DELETE CASCADE | |
| revenue_month | date | NOT NULL | Stored as first of month: '2024-01-01' |
| amount | numeric(12,2) | NOT NULL, DEFAULT 0.00 | |
| entered_by | uuid | FK → profiles(id) | Admin who entered the revenue |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| UNIQUE(user_id, team_id, revenue_month) | | | One entry per user/team/month |

---

## dis_reports
**Purpose**: Daily Information System reports  
**NOTE**: Schema NOT found in database_schema.sql — structure inferred from code queries

| Column | Type | Inferred From | Notes |
|--------|------|--------------|-------|
| id | uuid | PK | |
| user_id | uuid | FK → profiles(id) | |
| team_id | uuid | FK → teams(id) | |
| report_date | date | | |
| positive_leads | numeric/integer | | Count of positive leads |
| expected_revenue | numeric | | Expected revenue for the month |
| calls_made | integer | AdminExportData | |
| meetings_done | integer | AdminExportData | |
| leads_generated | integer | AdminExportData | |
| revenue_closed | numeric | AdminExportData | |
| notes | text | AdminExportData | nullable |
| created_at | timestamptz | | |
| UNIQUE(user_id, team_id, report_date) | | | Inferred from upsert calls |

---

## monthly_targets
**Purpose**: Revenue targets per user per team per month  
**NOTE**: Schema NOT found in database_schema.sql — structure inferred from code

| Column | Type | Inferred From | Notes |
|--------|------|--------------|-------|
| id | uuid | PK | |
| user_id | uuid | FK → profiles(id) | |
| team_id | uuid | FK → teams(id) | |
| target_month | date | revenueUtils.js | First of month format |
| amount | numeric | | Target amount |
| created_at | timestamptz | | |

---

## audit_logs
**Purpose**: Immutable activity log

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| user_id | uuid | FK → profiles(id) ON DELETE CASCADE | |
| action_type | text | NOT NULL | Values: 'login', 'revenue_added', 'revenue_updated', 'admin_activity', 'user_page_view', 'admin_page_view' |
| details | jsonb | nullable | Action-specific data |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

---

## sales_analytics
**Purpose**: Call and meeting logs for sales executives

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| team_id | uuid | FK → teams(id) ON DELETE CASCADE | |
| member_id | uuid | FK → profiles(id) ON DELETE CASCADE | |
| speaker_name | text | NOT NULL | |
| sales_revenue | numeric(12,2) | NOT NULL, DEFAULT 0.00 | |
| call_date | date | NOT NULL | |
| entered_by | uuid | FK → profiles(id) ON DELETE CASCADE | |
| created_at | timestamptz | DEFAULT now() | |

---

## events
**Purpose**: Review events (created by admin)

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| title | text | NOT NULL | |
| description | text | nullable | |
| is_active | boolean | NOT NULL, DEFAULT true | |
| target_team_id | uuid | FK → teams(id) ON DELETE SET NULL, nullable | |
| social_platform | text | nullable | |
| social_url | text | nullable | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

---

## reviews
**Purpose**: Employee review/write-up submissions

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| event_id | uuid | FK → events(id) ON DELETE CASCADE | NOT NULL |
| user_id | uuid | FK → profiles(id) ON DELETE CASCADE | NOT NULL |
| team_id | uuid | FK → teams(id) ON DELETE SET NULL, nullable | |
| title | text | NOT NULL | |
| context | text | NOT NULL | |
| status | text | NOT NULL, DEFAULT 'pending' | 'pending', 'approved', 'rejected' |
| admin_feedback | text | nullable | |
| photo_url | text | nullable | Supabase Storage URL |
| penname | text | nullable | Anonymous display name |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

---

## attendance_logs
**Purpose**: Employee check-in/check-out records

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | |
| user_id | uuid | FK → profiles(id) ON DELETE CASCADE | |
| attendance_date | date | DEFAULT CURRENT_DATE | |
| check_in_time | timestamptz | nullable | |
| check_out_time | timestamptz | nullable | |
| latitude | numeric | nullable | GPS coordinate at check-in |
| longitude | numeric | nullable | GPS coordinate at check-in |
| ip_address | text | nullable | IP at check-in |
| status | text | DEFAULT 'present' | 'present', 'pending_approval' |
| exception_reason | text | nullable | WFH/exception note |
| created_at | timestamptz | DEFAULT now() | |

---

## office_locations
**Purpose**: GPS coordinates of office locations for attendance validation

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| name | text | NOT NULL | |
| latitude | decimal(10,8) | NOT NULL | |
| longitude | decimal(11,8) | NOT NULL | |
| radius_meters | integer | NOT NULL, DEFAULT 300 | |
| is_active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |

**Default**: Main Branch HQ at lat 17.4790648, lon 78.3938006 (Hyderabad, India area)

---

## office_ips
**Purpose**: Whitelisted IP addresses for attendance validation

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| name | text | NOT NULL | |
| ip_address | text | NOT NULL | |
| is_active | boolean | DEFAULT true | |
| location_id | uuid | FK → office_locations(id) ON DELETE CASCADE, nullable | |
| created_at | timestamptz | DEFAULT now() | |

---

## announcements
**Purpose**: Company-wide announcements

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| title | text | NOT NULL | |
| content | text | NOT NULL | Rich text HTML |
| media_urls | jsonb | DEFAULT '[]' | Array of storage URLs |
| is_pinned | boolean | DEFAULT false | |
| status | text | DEFAULT 'published' | 'published' or 'draft' |
| created_by | uuid | FK → profiles(id) | |
| created_at | timestamptz | DEFAULT now() | |

---

## announcement_views
**Purpose**: Read receipts for announcements

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| announcement_id | uuid | FK → announcements(id) ON DELETE CASCADE | |
| user_id | uuid | FK → profiles(id) ON DELETE CASCADE | |
| viewed_at | timestamptz | DEFAULT now() | |
| UNIQUE(announcement_id, user_id) | | | One view per user per announcement |

---

## notifications
**Purpose**: System notification records

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| title | text | NOT NULL | |
| description | text | NOT NULL | |
| type | text | DEFAULT 'alert' | 'milestone', 'action', 'alert' |
| created_by | uuid | FK → profiles(id) | |
| created_at | timestamptz | DEFAULT now() | |

---

## notification_reads
**Purpose**: Tracks which users have read which notifications

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| notification_id | uuid | FK → notifications(id) ON DELETE CASCADE | |
| user_id | uuid | FK → profiles(id) ON DELETE CASCADE | |
| read_at | timestamptz | DEFAULT now() | |
| UNIQUE(notification_id, user_id) | | | |

---

## system_settings
**Purpose**: Global platform configuration (single row)

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | integer | PK, DEFAULT 1 | CHECK (id = 1) — enforces single row |
| announcement_text | text | DEFAULT '' | Legacy banner text |
| announcement_expires_at | timestamptz | nullable | |
| maintenance_mode | boolean | DEFAULT false | |
| show_leaderboard | boolean | DEFAULT true | |
| dis_locked | boolean | DEFAULT false | |
| dis_allow_past | boolean | DEFAULT false | |
| allow_review_paste | boolean | DEFAULT false | |
| updated_at | timestamptz | DEFAULT now() | |

---

## holidays
**Purpose**: Holiday dates that block DIS submissions

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| holiday_date | date | NOT NULL, UNIQUE | |
| description | text | nullable | |
| created_at | timestamptz | DEFAULT now() | |

---

## speakers
**Purpose**: CRM-like tracking of conference speakers

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| speaker_type | text | NOT NULL, CHECK IN ('past','present','future') | |
| speaker_name | text | NOT NULL | |
| email | text | nullable | |
| profile_url | text | nullable | |
| company | text | nullable | |
| connected_by | text | nullable | |
| event_name | text | nullable | |
| calling_executive | text | nullable | 'geetha', 'prasad sir', 'srinath' (hardcoded examples) |
| payment_status | text | DEFAULT 'pending' | 'pending','partial','paid','refunded','transferred','not_applicable' |
| agreed_amount | numeric(12,2) | DEFAULT 0.00 | |
| paid_amount | numeric(12,2) | DEFAULT 0.00 | |
| pending_amount | numeric(12,2) | DEFAULT 0.00 | |
| refund_status | text | DEFAULT 'none' | 'none','refund_requested','refunded','transferred' |
| transferred_to_event | text | nullable | |
| package_type | text | nullable | |
| current_main_status | text | nullable | |
| current_sub_status | text | nullable | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

---

## speaker_timeline_events
**Purpose**: Immutable history of speaker status changes

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | |
| speaker_id | uuid | FK → speakers(id) ON DELETE CASCADE | |
| main_status | text | NOT NULL | |
| sub_status | text | NOT NULL | |
| note | text | nullable | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Note**: No UPDATE policy — intentionally immutable log.
