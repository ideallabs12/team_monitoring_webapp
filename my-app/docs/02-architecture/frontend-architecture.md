# Frontend Architecture

## Core Technologies
- **React 19** with JSX (no TypeScript)
- **Vite 8** as build tool
- **React Router DOM v7** for client-side routing
- **Vanilla CSS** (75KB global stylesheet)
- **No state management library** — only React built-in (useState, useContext)
- **No component library** — fully custom UI

## Entry Point

```
index.html → src/main.jsx → ReactDOM.createRoot() → src/App.jsx
```

`main.jsx` is minimal:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

## Auth State Management (App.jsx)

The entire authentication state lives in `App.jsx` as local React state. Key state variables:

```javascript
const [user, setUser] = useState(null)           // Supabase auth user object
const [hasProfile, setHasProfile] = useState(null) // Has completed profile?
const [isAdmin, setIsAdmin] = useState(false)    // Is admin or executive?
const [isExecutive, setIsExecutive] = useState(false) // Is executive?
const [featureAccess, setFeatureAccess] = useState(null) // JSONB feature flags
const [isDeactivated, setIsDeactivated] = useState(false) // Account disabled?
const [loading, setLoading] = useState(true)     // Initial auth loading
const [systemSettings, setSystemSettings] = useState({...}) // Maintenance mode etc.
```

**Pattern**: Prop drilling — these state values are passed as props through `Layout` and `AdminLayout` down to pages via `Outlet context`.

## Routing Structure

```
/                               → Login (or redirect based on role)
/forgot-password                → ForgotPassword
/reset-password                 → ResetPassword (no auth required)
/complete-profile               → CompleteProfile (auth required, no profile)

# User Routes (Layout wrapper with Navbar/Sidebar)
/home                           → UserHome
/team                           → UserTeam
/revenue                        → UserRevenue
/historical-revenue             → UserHistoricalRevenue
/revenue-history                → RevenueHistory
/dis                            → UserDis
/team-analytics                 → TeamAnalytics
/team-management                → TeamManagement
/team-dis-report                → TeamDisReport
/leaderboard                    → Leaderboard
/milestones                     → Milestones
/sales-analytics                → SalesExecutive
/reviews                        → UserReviews
/profile                        → ProfileSettings
/settings                       → UserSettings
/attendance                     → Attendance
/announcements                  → UserAnnouncements
/virtual-events                 → VirtualTemplatesHome
/virtual-events/template3       → Template3
/virtual-events/testing         → Testing

# Admin Routes (AdminLayout sidebar)
/admin/home                     → AdminHome
/admin/teams                    → AdminTeams
/admin/users                    → AdminUsers
/admin/users/:id                → AdminUserControlPanel (dynamic)
/admin/dis                      → AdminDis
/admin/write-ups                → AdminWriteUps
/admin/reviews                  → AdminReviews
/admin/revenue                  → AdminRevenue
/admin/analytics                → AdminAnalytics
/admin/copystats                → CopyStats
/admin/ai-analytics             → AdminAiAnalytics
/admin/audit-logs               → AdminAuditLogs
/admin/auditlogs                → AdminAuditLogs (duplicate route)
/admin/milestones               → Milestones (shared with user)
/admin/leaderboard              → Leaderboard (shared with user)
/admin/attendance               → AdminAttendance
/admin/announcements            → AdminAnnouncements
/admin/export-data              → AdminExportData
/admin/virtual-events           → VirtualTemplatesHome
/admin/virtual-events/template3 → Template3
/admin/virtual-events/testing   → Testing
/admin/settings                 → AdminSettings
/admin/role-manager             → AdminRoleManager (master admin only)
*                               → Redirect based on auth state
```

## Layout System

### User Layout (Desktop)
Top navigation bar (`Navbar.jsx`) with:
- Brand logo
- Dynamic nav links (filtered by `has_revenue_logging`, `is_sales_executive`)
- Dropdown menus: "Team Hub" (team leads only), "Others"
- Logout button

### User Layout (Mobile OR Sidebar Preference)
Sidebar drawer (`UserSidebarLayout.jsx`) with:
- Collapsible sidebar
- Announcement unread badge
- Same filtered nav links
- Profile display

### Admin Layout (All Sizes)
Collapsible sidebar (`AdminLayout.jsx`) with:
- All admin nav items filtered by `featureAccess` JSONB
- Profile display
- Sign out button
- Mobile hamburger

## CSS Design System

The `index.css` (75KB) implements a comprehensive Apple-inspired design system with:

### CSS Custom Properties (Variables)
```css
--apple-bg              /* Main background */
--apple-card-bg         /* Card background */
--apple-text-primary    /* Primary text */
--apple-text-secondary  /* Secondary/muted text */
--apple-accent          /* Blue accent (#0071e3) */
--apple-border          /* Border color */
--apple-ease            /* Cubic bezier transition */
```

### Themes
- **Dark mode** (default): `--apple-bg: #0f0f0f`
- **Light mode**: toggled via JavaScript class on `<html>` element
- Theme persisted to `localStorage` via `themeHelper.js`

### Component Classes
- `.apple-card` — glass-morphism cards
- `.apple-glass-nav` — frosted glass navigation
- `.apple-btn` / `.apple-btn-secondary` / `.apple-btn-danger` — button variants
- `.admin-shell`, `.admin-sidebar`, `.admin-content` — admin layout
- `.auth-container`, `.auth-card`, `.auth-form` — authentication pages
- `.apple-dropdown-menu` — dropdown menus

## Data Fetching Pattern

No React Query or SWR. Each component fetches its own data using:
```javascript
useEffect(() => {
  async function loadData() {
    const { data, error } = await supabase.from('table').select('...')
    if (data) setState(data)
  }
  loadData()
}, [dependencies])
```

**Module-level caching** is used in some admin pages to avoid re-fetching:
```javascript
let adminHomeCache = { loaded: false, teams: [], ... }
// In component:
const [teams, setTeams] = useState(adminHomeCache.teams)
```

## UI Data Derivations
Business logic that annotates data (e.g., determining if an attendance punch is "Late" or "Early") is intentionally derived dynamically on the frontend layer based on raw timestamps rather than polluting the database schema with string labels. This preserves data integrity and allows threshold adjustments to apply retroactively.

## Realtime Subscriptions

Several components subscribe to Supabase Realtime for live updates:

| Subscriber | Table/Channel | Events |
|-----------|--------------|--------|
| App.jsx | system_settings | All changes |
| App.jsx | announcements | INSERT (push notifications) |
| App.jsx | profiles (user-specific) | UPDATE |
| PresenceProvider | online-users (presence) | join/leave/sync |
| PageTracker | — | (writes to audit_logs) |
| AdminSettings | system_settings | All |
| UserSidebarLayout | announcements | All (unread count) |

## Navigation UI Features
- Mobile: Hamburger button → full-screen drawer with overlay
- Desktop: Horizontal nav with dropdown fly-out menus
- Admin: Collapsible sidebar with icon-only collapsed mode
- Active route highlighting
- Dropdown menus close on outside click and route change

## Presence System

`PresenceProvider.jsx` wraps the entire app and tracks online users via Supabase Realtime Presence:
- On subscribe: broadcasts `{ user_id, email, first_name, last_name, online_at }`
- State exposed via `usePresence()` hook: `{ onlineUsers: { [userId]: presenceData } }`
- Used in: `AdminAuditLogs.jsx` to show "Active Members" tab with real-time online users
