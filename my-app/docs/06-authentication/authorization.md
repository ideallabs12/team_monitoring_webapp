# Authorization

## Overview
Authorization is implemented at two levels:
1. **Database level** — PostgreSQL Row Level Security (RLS) policies
2. **Frontend level** — React component-level checks

There is NO dedicated authorization middleware or API gateway.

## User Roles

| Role | platform_role value | Description |
|------|---------------------|-------------|
| Master Admin | 'admin' (specific email) | Has all permissions + Role Manager access |
| Admin | 'admin' | Full platform access (based on feature_access) |
| Executive | 'executive' | Read-oriented access, configurable |
| Team Lead | 'teamlead' | Team-specific management features |
| Employee | 'employee' | Own data only |
| User | 'user' | Legacy default role value |

## Master Admin Special Case
The email `signatureglobalconferences@gmail.com` is hardcoded in multiple places for ultra-privileged access:
- `AdminLayout.jsx` — shows "Specials" (Role Manager) menu item
- `AdminRoleManager.jsx` — only this email can access the page
- `AdminSettings.jsx` — overrides feature_access check
- `AdminAiAnalytics.jsx` — overrides feature_access check
- `AdminAuditLogs.jsx` — sees all tabs regardless of featureAccess

## Feature Access System (JSONB)
Admins and executives have a `feature_access` JSONB column on their `profiles` row:

```json
{
  "writeUps": true/false,
  "reviews": true/false,
  "auditLogs": true/false,
  "settings": true/false,
  "controlPanel": true/false,
  "aiAnalytics": true/false,
  "attendance": true/false,
  "auditLogs_revenue": true/false,
  "auditLogs_login": true/false,
  "auditLogs_active": true/false,
  "auditLogs_admin": true/false,
  "auditLogs_page": true/false,
  "maintenanceModeForced": true/false
}
```

This is used to:
- Filter sidebar navigation items in `AdminLayout.jsx`
- Gate access to specific admin pages via `useOutletContext()`
- Limit which audit log tabs are visible
- Force maintenance mode for specific admin users

## Frontend Authorization Checks

### Route-Level (App.jsx)
```javascript
// Admin routes
<Route path="/admin" element={isAdmin ? <AdminLayout> : <Navigate to="/" />}>

// User routes (requires profile + non-admin)
hasProfile && !isAdmin ? <PageComponent> : <Navigate to="/complete-profile">

// Leaderboard conditional
systemSettings.show_leaderboard ? <Leaderboard> : <Navigate to="/home">
```

### Page-Level Checks
Each admin page may additionally check:
```javascript
const { user, featureAccess } = useOutletContext()
const canAccess = user?.email === 'signatureglobalconferences@gmail.com' || !!featureAccess?.settings
if (!canAccess) return <AccessDeniedView>
```

### Sidebar Navigation Filtering
`AdminLayout.jsx` filters nav items based on featureAccess:
```javascript
if (item.path === '/admin/ai-analytics') return !!featureAccess.aiAnalytics;
if (item.path === '/admin/attendance') return !!featureAccess.attendance;
// etc.
```

### User-Level Feature Flags
Some user features are controlled by profile columns:
- `has_revenue_logging` — controls Revenue link in navbar
- `is_sales_executive` — controls Sales Analytics link
- `platform_role === 'teamlead'` — controls Team Hub dropdown

## Database-Level Authorization (RLS)
See `docs/05-database/security-policies.md` for full RLS policy listing.

Key patterns:
- **Own data**: `auth.uid() = user_id` (most user tables)
- **Admin access**: `is_admin()` function (includes executives)
- **Team lead access**: `is_team_lead(team_id)` for revenues
- **Public read**: `USING (true)` — used for teams, holidays, some admin tables

## Authorization Weaknesses

### 1. Client-Side Only Checks
The `featureAccess` system is enforced entirely in the React frontend. There are NO API-level or database-level checks for these feature flags. An authenticated admin could bypass the UI and directly call the Supabase API to access any admin-level data.

**Risk**: Medium. Mitigated by the fact that all admins are internal employees. But executive-role isolation is not enforced at the DB level.

### 2. is_admin() Includes Executives
The database function `is_admin()` was updated to return `true` for both 'admin' AND 'executive' roles. This means executives have the same database-level permissions as admins, even though the UI hides certain features from them.

**Risk**: Low-Medium. A sophisticated executive user could bypass the UI.

### 3. Team Lead Authorization
Team leads are identified by `platform_role === 'teamlead'` in the UI, but the `is_team_lead(team_id)` function checks the `team_members` table for `team_role = 'lead'`. These could be out of sync.

**Risk**: Low.

### 4. No Server-Side Input Validation
All data submitted to Supabase comes directly from the browser. Supabase's PostgREST handles type coercion but there is no business logic validation on insert/update (e.g., no check that revenue amounts are positive, no date range validation).

**Risk**: Low-Medium for data integrity.

### 5. Self-Signup Allowed
New users can sign up themselves via the login page. They won't have access until an admin activates them, but `auth.users` rows accumulate.

**Risk**: Low. Could be addressed by disabling public signup in Supabase settings.
