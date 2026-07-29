# Route Inventory

## Route Summary Table

| Route | Page/Component | Access | Role Required | Purpose |
|-------|---------------|--------|---------------|---------|
| `/` | Login | Public | None | Login / Sign-up |
| `/forgot-password` | ForgotPassword | Public | None | Password reset request |
| `/reset-password` | ResetPassword | Public (with token) | None | Set new password |
| `/complete-profile` | CompleteProfile | Auth Required | Any authed user without profile | First-time profile setup |
| `/home` | UserHome | Protected | User (non-admin) | User dashboard |
| `/team` | UserTeam | Protected | User | Team member view |
| `/revenue` | UserRevenue | Protected | User | Revenue entry and view |
| `/historical-revenue` | UserHistoricalRevenue | Protected | User | Historical revenue view |
| `/revenue-history` | RevenueHistory | Protected | User | Revenue history with filters |
| `/dis` | UserDis | Protected | User | Daily Information System |
| `/team-analytics` | TeamAnalytics | Protected | User (team lead effective) | Team analytics charts |
| `/team-management` | TeamManagement | Protected | User (team lead effective) | Team target management |
| `/team-dis-report` | TeamDisReport | Protected | User (team lead effective) | Team DIS audit |
| `/leaderboard` | Leaderboard | Protected | User + system_settings.show_leaderboard | Rankings |
| `/milestones` | Milestones | Protected | User | Achievement milestones |
| `/sales-analytics` | SalesExecutive | Protected | User (is_sales_executive) | Sales analytics |
| `/reviews` | UserReviews | Protected | User | Event reviews |
| `/profile` | ProfileSettings | Protected | User | Edit profile |
| `/settings` | UserSettings | Protected | User | App preferences |
| `/attendance` | Attendance | Protected | User (featureAccess.attendance) | Check-in/out |
| `/announcements` | UserAnnouncements | Protected | User | View announcements |
| `/virtual-events` | VirtualTemplatesHome | Protected | User | Template browser |
| `/virtual-events/template3` | Template3 | Protected | User | Speaker pass template |
| `/virtual-events/testing` | Testing | Protected | User | Testing template |
| `/admin` | Redirect | Protected | Admin/Executive | → /admin/home |
| `/admin/home` | AdminHome | Protected | Admin/Executive | Admin dashboard |
| `/admin/teams` | AdminTeams | Protected | Admin | Team management |
| `/admin/users` | AdminUsers | Protected | Admin | User management |
| `/admin/users/:id` | AdminUserControlPanel | Protected | Admin | Per-user panel |
| `/admin/dis` | AdminDis | Protected | Admin/Executive | DIS reports |
| `/admin/write-ups` | AdminWriteUps | Protected | Admin (featureAccess.writeUps) | Write-up management |
| `/admin/reviews` | AdminReviews | Protected | Admin (featureAccess.reviews) | Review approvals |
| `/admin/revenue` | AdminRevenue | Protected | Admin/Executive | Revenue management |
| `/admin/analytics` | AdminAnalytics | Protected | Admin/Executive | Analytics dashboard |
| `/admin/copystats` | CopyStats | Protected | Admin | Revenue/DIS export tool |
| `/admin/ai-analytics` | AdminAiAnalytics | Protected | Admin (featureAccess.aiAnalytics) | AI insights |
| `/admin/auditlogs` | AdminAuditLogs | Protected | Admin (featureAccess.auditLogs_*) | Audit logs |
| `/admin/audit-logs` | AdminAuditLogs | Protected | Admin | Duplicate route |
| `/admin/milestones` | Milestones | Protected | Admin/Executive | Milestones view |
| `/admin/leaderboard` | Leaderboard | Protected | Admin/Executive | Leaderboard view |
| `/admin/attendance` | AdminAttendance | Protected | Admin (featureAccess.attendance) | Attendance management |
| `/admin/announcements` | AdminAnnouncements | Protected | Admin | Announcement management |
| `/admin/export-data` | AdminExportData | Protected | Admin | Data export |
| `/admin/virtual-events` | VirtualTemplatesHome | Protected | Admin | Template browser |
| `/admin/virtual-events/template3` | Template3 | Protected | Admin | Speaker pass template |
| `/admin/virtual-events/testing` | Testing | Protected | Admin | Testing template |
| `/admin/settings` | AdminSettings | Protected | Admin (featureAccess.settings) | System settings |
| `/admin/role-manager` | AdminRoleManager | Protected | MASTER ADMIN ONLY | Feature access management |
| `*` (catch-all) | Redirect | Any | Based on auth state | Redirect to home |

## Route Protection Logic

### Public Routes
- `/` — Shows Login if not authenticated; redirects to appropriate home if authenticated
- `/forgot-password` — Redirects to `/` if already logged in
- `/reset-password` — Always accessible (needs auth token from email link)

### Protected User Routes
Wrapped in `<Route element={<Layout>}>` which checks:
```javascript
hasProfile && !isAdmin
  ? <PageComponent> 
  : <Navigate to="/complete-profile">
```

### Protected Admin Routes
Wrapped in `<Route path="/admin" element={isAdmin ? <AdminLayout> : <Navigate to="/">>`:
- All admin sub-routes are accessible to any admin/executive by default
- Individual feature pages check `featureAccess` via `useOutletContext()`
- Role Manager additionally checks `user.email === 'signatureglobalconferences@gmail.com'`

## Duplicate Routes Found
- `/admin/audit-logs` and `/admin/auditlogs` both map to `AdminAuditLogs`
- The sidebar links to `/admin/auditlogs`
- Both routes work but one is redundant

## Route Access Notes

### Navbar-Conditional Links (Not separate routes)
These links appear/disappear in the navbar based on user flags:
- Revenue link — hidden if `has_revenue_logging === false`
- Sales Executive link — only shown if `is_sales_executive === true`
- Team Hub dropdown — only shown if `platform_role === 'teamlead'`
- Leaderboard link in Others — only for team leads

### System Settings-Conditional Routes
- `/leaderboard` — redirects to `/home` if `system_settings.show_leaderboard === false`

## API Routes
There are NO traditional API routes. All data access uses the Supabase PostgREST API directly from the frontend:
- `https://pzalalbpxlwtcnmkaegb.supabase.co/rest/v1/[table]` — Auto-generated by Supabase
- `https://pzalalbpxlwtcnmkaegb.supabase.co/functions/v1/ai-analytics` — Edge Function
