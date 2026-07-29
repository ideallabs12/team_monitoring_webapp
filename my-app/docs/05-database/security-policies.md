# Database Security Policies (RLS)

## Overview
Row Level Security (RLS) is enabled on ALL tables. Two helper functions drive the admin policies:

```sql
-- is_admin(): returns true for platform_role IN ('admin', 'executive')
-- is_team_lead(team_id): returns true if current user is lead for that team
```

Both functions are SECURITY DEFINER, meaning they bypass RLS when checking profiles.

## Policy Summary by Table

### profiles
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own profile | SELECT | auth.uid() = id |
| Users can update own profile | UPDATE | auth.uid() = id |
| Users can insert own profile | INSERT | auth.uid() = id |
| Admins can manage all profiles | ALL | is_admin() |

### teams
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can view teams | SELECT | true (public) |
| Admins can manage all teams | ALL | is_admin() |

### team_members
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view team members of their teams | SELECT | EXISTS(member in same team) |
| Users can join a team | INSERT | auth.uid() = user_id |
| Admins can manage all team members | ALL | is_admin() |

### monthly_revenues
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own revenues | SELECT | auth.uid() = user_id |
| Users can insert own revenues | INSERT | auth.uid() = user_id |
| Users can update own revenues | UPDATE | auth.uid() = user_id |
| Admins can manage all revenues | ALL | is_admin() |
| Team Leads can view team revenues | SELECT | is_team_lead(team_id) OR auth.uid() = user_id |
| Team Leads can insert team revenues | INSERT | is_team_lead(team_id) OR auth.uid() = user_id |
| Team Leads can update team revenues | UPDATE | is_team_lead(team_id) OR auth.uid() = user_id |

### audit_logs
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can insert own audit logs | INSERT | auth.uid() = user_id |
| Admins can view all audit logs | SELECT | platform_role = 'admin' (direct check) |
| Admins can delete audit logs | DELETE | platform_role = 'admin' (direct check) |

**Note**: Audit logs delete policy uses a direct subquery check, not `is_admin()`. This means EXECUTIVES cannot delete audit logs.

### sales_analytics
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own sales analytics | SELECT | auth.uid() = entered_by |
| Users can insert own sales analytics | INSERT | auth.uid() = entered_by AND is_sales_executive = true |
| Users can update own sales analytics | UPDATE | auth.uid() = entered_by |
| Users can delete own sales analytics | DELETE | auth.uid() = entered_by |
| Admins can view all sales analytics | SELECT | platform_role = 'admin' |

### events
| Policy | Operation | Rule |
|--------|-----------|------|
| Enable read access for all users | SELECT | true (public) |
| Enable ALL for admins | ALL | platform_role = 'admin' |

### reviews
| Policy | Operation | Rule |
|--------|-----------|------|
| Enable read access for all users | SELECT | true (public) |
| Enable insert for users | INSERT | auth.uid() = user_id |
| Enable update for users or admins | UPDATE | auth.uid() = user_id OR platform_role = 'admin' |
| Enable delete for users or admins | DELETE | auth.uid() = user_id OR platform_role = 'admin' |

### attendance_logs
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can insert their own attendance | INSERT | auth.uid() = user_id |
| Users can view their own attendance | SELECT | auth.uid() = user_id |
| Admins can view all attendance logs | SELECT | platform_role = 'admin' |
| Admins can update attendance logs | UPDATE | platform_role = 'admin' |
| Users can update their own attendance | UPDATE | auth.uid() = user_id |

### office_locations
| Policy | Operation | Rule |
|--------|-----------|------|
| Allow authenticated read access | SELECT | true (any authenticated) |
| Allow admin all access | ALL | platform_role = 'admin' |

### office_ips
| Policy | Operation | Rule |
|--------|-----------|------|
| Allow authenticated read access | SELECT | true (any authenticated) |
| Allow admin all access | ALL | platform_role = 'admin' |

### announcements
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can view published announcements | SELECT | status = 'published' |
| Admins can manage announcements | ALL | true WITH CHECK (true) ⚠️ |

**SECURITY ISSUE**: The admin announcement policy uses `USING(true)` which means it bypasses all checks! This is effectively an open policy.

### announcement_views
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view their own receipts | SELECT | auth.uid() = user_id OR true ⚠️ |
| Users can insert their own view | INSERT | auth.uid() = user_id |

**SECURITY ISSUE**: The SELECT policy has `OR true` which makes it completely public.

### notifications
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can view notifications | SELECT | true (public) |
| Admins can manage notifications | ALL | true WITH CHECK (true) ⚠️ |

**SECURITY ISSUE**: Admin notification policy is completely open.

### notification_reads
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view their own reads | SELECT | auth.uid() = user_id OR true ⚠️ |
| Users can mark notifications as read | INSERT | auth.uid() = user_id |

### system_settings
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can view system settings | SELECT | true (public) |
| Admins can update system settings | UPDATE | platform_role = 'admin' (direct check) |

### holidays
| Policy | Operation | Rule |
|--------|-----------|------|
| Admins can manage holidays | ALL | platform_role = 'admin' |
| Everyone can view holidays | SELECT | true (public) |

### speakers
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can view speakers | SELECT | true |
| Anyone can insert speakers | INSERT | true ⚠️ |
| Anyone can update speakers | UPDATE | true ⚠️ |

**CRITICAL SECURITY ISSUE**: Any authenticated user can create or modify speaker records.

### speaker_timeline_events
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can view timeline events | SELECT | true |
| Anyone can insert timeline events | INSERT | true ⚠️ |

**SECURITY ISSUE**: Any authenticated user can add speaker timeline events.

## Security Policy Issues Summary

| Severity | Table | Issue |
|----------|-------|-------|
| HIGH | speakers | Any authenticated user can insert/update any speaker |
| HIGH | speaker_timeline_events | Any authenticated user can insert events |
| HIGH | announcements | Admin policy uses USING(true) — overly permissive |
| MEDIUM | announcement_views | SELECT has `OR true` — exposes all read receipts |
| MEDIUM | notification_reads | SELECT has `OR true` — exposes all read receipts |
| LOW | notifications | Admin policy uses USING(true) |
| LOW | reviews | All users can read all reviews (including pending ones) |
| INFO | dis_reports | Schema not in database_schema.sql — RLS policies unknown |
| INFO | monthly_targets | Schema not in database_schema.sql — RLS policies unknown |
