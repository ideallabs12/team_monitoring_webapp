# Application Structure

## Root Source Organization

```
src/
├── App.jsx                    # Root: auth state machine + routing
├── main.jsx                   # ReactDOM.createRoot entry point
├── supabaseClient.js          # Supabase client singleton (hardcoded credentials)
├── index.css                  # Global stylesheet (~75KB, Apple-inspired design system)
├── App.css                    # Minimal app-level CSS
│
├── components/                # Shared/layout components
│   ├── Layout.jsx             # User layout wrapper (Navbar vs Sidebar decision)
│   ├── Navbar.jsx             # Top navigation bar (desktop)
│   ├── UserSidebarLayout.jsx  # Sidebar layout (mobile / user preference)
│   ├── AdminLayout.jsx        # Admin sidebar layout (always sidebar)
│   ├── PresenceProvider.jsx   # Context: Supabase Realtime presence tracker
│   ├── PageTracker.jsx        # Invisible: logs page views to audit_logs
│   ├── MaintenanceScreen.jsx  # Full-screen maintenance mode display (particle animation)
│   ├── ThemeSwitch.jsx        # Dark/Light mode toggle component
│   ├── PullToRefresh.jsx      # Mobile pull-to-refresh wrapper
│   ├── Footer.jsx             # Minimal footer
│   └── charts/               # Chart sub-components (REQUIRES INSPECTION)
│
├── pages/
│   ├── homeprofile/           # Auth + profile setup (6 files)
│   │   ├── Login.jsx          # Email/pass + Google OAuth login
│   │   ├── CompleteProfile.jsx # First-time profile setup
│   │   ├── ProfileSettings.jsx # User profile edit
│   │   ├── ForgotPassword.jsx  # Password reset request
│   │   ├── ResetPassword.jsx   # Password reset confirmation
│   │   └── home.jsx           # Stub/redirect (133 bytes, minimal)
│   │
│   ├── user/                  # Regular user pages (16 files)
│   │   ├── UserHome.jsx       # Dashboard (21KB)
│   │   ├── UserTeam.jsx       # Team member view (21KB)
│   │   ├── UserRevenue.jsx    # Revenue entry + view (55KB - LARGEST USER PAGE)
│   │   ├── UserHistoricalRevenue.jsx # Historical revenue view (10KB)
│   │   ├── RevenueHistory.jsx # Revenue history with filters (32KB)
│   │   ├── UserDis.jsx        # Daily Information System form (33KB)
│   │   ├── UserAnnouncements.jsx # Announcements viewer (16KB)
│   │   ├── Attendance.jsx     # GPS/IP check-in/out (15KB)
│   │   ├── Leaderboard.jsx    # Team performance rankings (23KB)
│   │   ├── Milestones.jsx     # Achievement milestones (31KB)
│   │   ├── TeamAnalytics.jsx  # Team analytics charts (37KB)
│   │   ├── TeamManagement.jsx # Team management for leads (56KB - LARGEST)
│   │   ├── TeamDisReport.jsx  # Team DIS audit report (21KB)
│   │   ├── SalesExecutive.jsx # Sales executive analytics (20KB)
│   │   ├── UserReviews.jsx    # Review submission (24KB)
│   │   └── UserSettings.jsx   # User preferences (6KB)
│   │
│   └── admin/                 # Admin pages (18 files + subdirectory)
│       ├── AdminLayout.jsx    # Admin sidebar (11KB)
│       ├── AdminHome.jsx      # Admin dashboard (58KB - LARGEST ADMIN PAGE)
│       ├── AdminUsers.jsx     # User management (70KB - 2ND LARGEST)
│       ├── AdminTeams.jsx     # Team management (83KB - LARGEST FILE)
│       ├── AdminRevenue.jsx   # Revenue dashboard (53KB)
│       ├── AdminDis.jsx       # DIS reports viewer (33KB)
│       ├── AdminAnalytics.jsx # Analytics dashboard (34KB)
│       ├── AdminAiAnalytics.jsx # AI-powered analytics (17KB)
│       ├── AdminAnnouncements.jsx # Announcements manager (22KB)
│       ├── attendance/            # Modularized attendance feature
│       │   ├── AdminAttendance.jsx     # Main container
│       │   ├── AttendanceFilterBar.jsx # Unified filter bar
│       │   ├── AttendanceLogsList.jsx  # Logs display with smart Late/Early UI
│       │   └── AttendanceSettings.jsx  # Office locations config
│       ├── AdminAuditLogs.jsx # Audit logs viewer (16KB)
│       ├── AdminExportData.jsx # Data export (31KB)
│       ├── AdminReviews.jsx   # Review approvals (34KB)
│       ├── AdminRoleManager.jsx # Feature access manager (16KB)
│       ├── AdminSettings.jsx  # System settings (37KB)
│       ├── AdminUserControlPanel.jsx # Individual user panel (37KB)
│       ├── AdminWriteUps.jsx  # Write-up management (20KB)
│       ├── CopyStats.jsx      # Revenue/DIS copy/export tool (61KB)
│       └── virtualtemplates/
│           ├── VirtualTemplatesHome.jsx # Template selector (4KB)
│           ├── Template3.jsx  # Speaker Pass Invite template (47KB)
│           └── Testing.jsx    # Testing template (56KB - large, unclear status)
│
├── utils/                     # Pure utility functions (no side effects)
│   ├── revenueUtils.js        # Month formatting, revenue calculations (8.3KB)
│   ├── analyticsUtils.js      # Analytics calculations (19.7KB)
│   ├── milestoneUtils.js      # Milestone calculations (8.5KB)
│   └── themeHelper.js         # Theme get/set helpers (436 bytes)
│
├── hooks/                     # EMPTY — no custom hooks implemented
│
└── frontend/pages/
    └── sql.txt                # Early-stage SQL reference (NOT used by app)
```

## Component Responsibilities

### `App.jsx` — Auth State Machine
The root component acts as a state machine managing the entire auth lifecycle:
- Fetches session on mount
- Subscribes to `onAuthStateChange`
- Fetches profile role from `profiles` table
- Sets: `user`, `hasProfile`, `isAdmin`, `isExecutive`, `featureAccess`, `isDeactivated`
- Listens to `system_settings` realtime for maintenance mode
- Listens to `announcements` for push notifications
- Listens to `profiles` for real-time deactivation

### `Layout.jsx` — User Layout Switcher
Decides between top Navbar layout and sidebar layout:
- If mobile (≤768px) → always Sidebar
- If `nav_preference === 'sidebar'` → Sidebar
- Otherwise → Top Navbar

### `AdminLayout.jsx` — Admin Sidebar
Permanent sidebar with collapsible behavior:
- Navigation filtered by `featureAccess` JSONB from `profiles` table
- Only master admin email sees the "Specials" / Role Manager menu item

## Code Organization Type
**Page-based + Role-based hybrid**:
- Top level: `pages/admin/`, `pages/user/`, `pages/homeprofile/`
- Within role: flat file structure (no feature sub-folders)
- No service layer, no repository pattern
- No custom hooks (hooks/ directory is empty)

## File Size Concerns
Files over 30KB are considered very large for React components:

| File | Size | Concern |
|------|------|---------|
| AdminTeams.jsx | 83KB | CRITICAL — very large single component |
| AdminUsers.jsx | 70KB | HIGH — very large single component |
| CopyStats.jsx | 61KB | HIGH — very large single component |
| Testing.jsx | 56KB | HIGH — unclear purpose |
| AdminHome.jsx | 58KB | HIGH — dashboard is too large |
| UserRevenue.jsx | 55KB | HIGH |
| TeamManagement.jsx | 56KB | HIGH |
| AdminRevenue.jsx | 53KB | HIGH |
| AdminSettings.jsx | 37KB | MEDIUM |
| AdminUserControlPanel.jsx | 37KB | MEDIUM |
| Template3.jsx | 47KB | MEDIUM |
