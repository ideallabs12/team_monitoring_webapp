# Project Documentation: IdealLabs Team Monitoring Webapp

## 1. Project Overview
- **Purpose**: IdealLabs Team Monitoring Webapp is an internal operations portal designed for platform administrators, team leads, and employees. It provides secure, role-based interfaces to monitor and audit daily operational sales sheets (DIS), manage monthly sales targets, track individual/team revenue contributions, and analyze overall performance metrics (growth, compliance, efficiency).
- **Tech Stack**:
  - **Core**: React (v19.2.6), Vite (v8.0.12)
  - **Routing**: React Router DOM (v7.15.1)
  - **UI/Icon Library**: Lucide React (v1.16.0)
  - **Charts**: Recharts (v3.8.1)
  - **Database & Auth**: Supabase (@supabase/supabase-js v2.106.1)
  - **Deployment**: Vercel configuration (`vercel.json`)
  - **Monitoring**: @vercel/speed-insights (v2.0.0)

---

## 2. Project Structure
```text
my-app/
├── admin_setup.sql      # Database function overrides & RLS updates for Admin/Team Lead controls
├── eslint.config.js     # ESLint linting rules configuration
├── index.html           # Main HTML shell
├── package.json         # Dependency configuration file
├── schema.sql           # Initial database table creation and base RLS policies
├── seed.js              # Script using Supabase API to seed test users, teams, and data
├── test_query.js        # Script to query database rows for verification
├── vercel.json          # Deployment rules & rewrites for SPA history API routing
├── vite.config.js       # Vite bundler options
└── src/
    ├── App.css          # Custom styling rules
    ├── App.jsx          # Root routing and core authentication session handler
    ├── index.css        # Premium typography, modern gradients, animations, and Apple-inspired dark UI
    ├── main.jsx         # React application entrypoint
    ├── supabaseClient.js# Supabase client instantiation and config
    ├── assets/          # Static assets (hero image, brand SVGs)
    ├── components/      # Shared components
    │   ├── Footer.jsx   # Generic copyright footer
    │   ├── Layout.jsx   # Shell layout for normal users
    │   ├── Navbar.jsx   # Responsive desktop & mobile slide-out navigation bar
    │   └── charts/      # Data visualization components
    │       ├── AverageRevenueChart.jsx  # Trend comparison bar chart
    │       ├── ComplianceHeatmap.jsx    # 3-month calendar-style daily DIS submission grid
    │       ├── ExpectedVsActualChart.jsx# Bar chart comparing expectations with final revenues
    │       ├── ParetoChart.jsx          # Concentration analyzer with bar and cumulative line
    │       ├── RevenueTrendChart.jsx    # Pie chart and share breakdown list
    │       ├── Sparkline.jsx            # Tiny inline trendline chart
    │       └── TeamRadarChart.jsx       #Normalized spider chart comparing performance axes
    ├── frontend/
    │   └── pages/
    │       └── sql.txt  # Reference database schemas
    ├── utils/           # Shared helper routines
    │   ├── analyticsUtils.js # Analytical math, averages, streak and ranking calculations
    │   └── revenueUtils.js   # Date processing, normalized months, targets and summing tools
    └── pages/           # Direct pages
        ├── CompleteProfile.jsx # Onboarding profile setup & team assignment form (limit 2)
        ├── ForgotPassword.jsx  # Password reset request page
        ├── ProfileSettings.jsx # Personal detail & security update forms
        ├── ResetPassword.jsx   # User password reset execution page
        ├── home.jsx            # fallback home template
        ├── Login.jsx           # Secure auth supporting email/password and Google OAuth
        ├── admin/              # Admin interface pages
        │   ├── AdminAnalytics.jsx   # Global executive performance KPIs & visualizations
        │   ├── AdminAuditLogs.jsx   # Activity audit logs display (placeholder)
        │   ├── AdminDis.jsx         # Daily information sheets logs & missing reports auditor
        │   ├── AdminHome.jsx        # Monthly sales targets editor per employee
        │   ├── AdminLayout.jsx      # Admin specific shell layout with sidebar
        │   ├── AdminRevenue.jsx     # Revenue leaderboard, averages, and expected vs actuals
        │   ├── AdminSettings.jsx    # Team list organizer and member directory mapping
        │   ├── AdminTeams.jsx       # Interactive team rosters view & user detail profiles
        │   └── AdminUsers.jsx       # User access console (platform role config, block/deactivate, reset pass)
        └── user/               # Standard user interface pages
            ├── UserDis.jsx      # Daily information sheet logger and team lead metric review panel
            ├── UserHome.jsx     # Personal metrics summary & active team list
            ├── UserRevenue.jsx  # Personal monthly revenue contribution logger
            └── UserTeam.jsx     # Teammate leaderboard & direct contributions tracker
```

---

## 3. Supabase Setup
- **Tables and Data Types**:
  1. `profiles`:
     - `id` (uuid, primary key, references `auth.users(id) on delete cascade`)
     - `first_name` (text)
     - `last_name` (text)
     - `phone` (text)
     - `email` (text)
     - `platform_role` (text, default `'user'`)
     - `is_deactivated` (boolean, default `false`)
     - `created_at` (timestamp with time zone, default `now()`)
     - `profile_completed` (boolean, default `false` via user metadata)
  2. `teams`:
     - `id` (uuid, primary key, default `gen_random_uuid()`)
     - `name` (text, not null)
     - `created_at` (timestamp with time zone, default `now()`)
  3. `team_members`:
     - `id` (uuid, primary key, default `gen_random_uuid()`)
     - `user_id` (uuid, references `profiles(id) on delete cascade`)
     - `team_id` (uuid, references `teams(id) on delete cascade`)
     - `team_role` (text, default `'member'`)
     - `joined_at` (timestamp with time zone, default `now()`)
     - Unique constraint: `(user_id, team_id)`
  4. `monthly_revenues`:
     - `id` (uuid, primary key, default `gen_random_uuid()`)
     - `user_id` (uuid, references `profiles(id) on delete cascade`)
     - `team_id` (uuid, references `teams(id) on delete cascade`)
     - `revenue_month` (date, e.g., `'2023-10-01'`)
     - `amount` (numeric(12, 2), default `0.00`)
     - `entered_by` (uuid, references `profiles(id)`)
     - `created_at` (timestamp with time zone, default `now()`)
     - Unique constraint: `(user_id, team_id, revenue_month)`
  5. `dis_reports` (referred to/used in user and admin sections):
     - `id` (uuid, primary key, default `gen_random_uuid()`)
     - `user_id` (uuid, references `profiles(id) on delete cascade`)
     - `team_id` (uuid, references `teams(id) on delete cascade`, optional)
     - `report_date` (date, primary constraint)
     - `positive_leads` (integer, default `0`)
     - `revenue_generated` (numeric(12, 2), default `0.00`)
     - `expected_revenue` (numeric(12,2), default `0.00`)
     - `created_at` (timestamp with time zone, default `now()`)
     - Unique constraint: `(user_id, report_date)`
  6. `monthly_targets`:
     - `id` (uuid, primary key, default `gen_random_uuid()`)
     - `user_id` (uuid, references `profiles(id) on delete cascade`)
     - `team_id` (uuid, references `teams(id) on delete cascade`)
     - `target_month` (date)
     - `target_amount` (numeric(12, 2))
     - Unique constraint: `(user_id, team_id, target_month)`

- **Helper Functions & Security Definers**:
  - `is_admin()`: checks if current authenticated user has platform_role = 'admin' in profiles.
  - `is_team_lead(check_team_id)`: checks if user has role = 'lead' for a specific team in team_members.

- **RLS Policies**:
  - **Profiles**:
    - Users can view, insert, and update their own profiles where `auth.uid() = id`.
    - Admins can manage all profiles (via `is_admin()`).
  - **Teams**:
    - Anyone can view teams.
    - Admins can manage all teams (via `is_admin()`).
  - **Team Members**:
    - Users can view team members of their teams.
    - Users can join a team (insert where `auth.uid() = user_id`).
    - Admins can manage all team memberships (via `is_admin()`).
  - **Monthly Revenues**:
    - Users can view, insert, and update their own revenues where `auth.uid() = user_id`.
    - Admins can manage all revenues (via `is_admin()`).
    - Team Leads can view, insert, and update revenues for their specific team (`is_team_lead(team_id)`).

- **Supabase Client Initialization**:
  The client is initialized in `src/supabaseClient.js` using `createClient(supabaseUrl, supabaseAnonKey)` with hardcoded constants.

---

## 4. Routing Structure
Defined routes in `src/App.jsx`:
- `/` -> Renders `Login`
- `/forgot-password` -> Renders `ForgotPassword`
- `/reset-password` -> Renders `ResetPassword`
- `/complete-profile` -> Renders `CompleteProfile` (Protected: requires active user without completed profile)
- `/home` -> Renders `UserHome` (Inside standard layout navbar context)
- `/team` -> Renders `UserTeam` (Inside standard layout navbar context)
- `/revenue` -> Renders `UserRevenue` (Inside standard layout navbar context)
- `/dis` -> Renders `UserDis` (Inside standard layout navbar context)
- `/profile` -> Renders `ProfileSettings` (Inside standard layout navbar context)
- `/admin` -> Layout wrapper `AdminLayout` for admin console
  - `/admin/home` -> `AdminHome` (Assign Targets)
  - `/admin/teams` -> `AdminTeams` (Roster/Leaderboard)
  - `/admin/users` -> `AdminUsers` (User controls/actions)
  - `/admin/dis` -> `AdminDis` (Daily submissions logs)
  - `/admin/revenue` -> `AdminRevenue` (Leaderboard/Averages)
  - `/admin/analytics` -> `AdminAnalytics` (Executive insights & KPIs)
  - `/admin/auditlogs` -> `AdminAuditLogs` (Under development)
  - `/admin/settings` -> `AdminSettings` (Mapping Directory)
- `*` -> Wildcard redirect to context-specific home base.

---

## 5. Environment Variables
No custom environment variables (`.env`) are currently configured. The Supabase connection endpoints (`supabaseUrl` and `supabaseAnonKey`) are declared directly as hardcoded string constants inside `src/supabaseClient.js`, `seed.js`, and `test_query.js`.

---

## 6. Project Configurations & Codebase Source Files

### File: `src\App.css`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\App.css`

```css
.counter {
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
  transition: border-color 0.3s;
  margin-bottom: 24px;

  &:hover {
    border-color: var(--accent-border);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.hero {
  position: relative;

  .base,
  .framework,
  .vite {
    inset-inline: 0;
    margin: 0 auto;
  }

  .base {
    width: 170px;
    position: relative;
    z-index: 0;
  }

  .framework,
  .vite {
    position: absolute;
  }

  .framework {
    z-index: 1;
    top: 34px;
    height: 28px;
    transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
      scale(1.4);
  }

  .vite {
    z-index: 0;
    top: 107px;
    height: 26px;
    width: auto;
    transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
      scale(0.8);
  }
}

#center {
  display: flex;
  flex-direction: column;
  gap: 25px;
  place-content: center;
  place-items: center;
  flex-grow: 1;

  @media (max-width: 1024px) {
    padding: 32px 20px 24px;
    gap: 18px;
  }
}

#next-steps {
  display: flex;
  border-top: 1px solid var(--border);
  text-align: left;

  & > div {
    flex: 1 1 0;
    padding: 32px;
    @media (max-width: 1024px) {
      padding: 24px 20px;
    }
  }

  .icon {
    margin-bottom: 16px;
    width: 22px;
    height: 22px;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    text-align: center;
  }
}

#docs {
  border-right: 1px solid var(--border);

  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

#next-steps ul {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 8px;
  margin: 32px 0 0;

  .logo {
    height: 18px;
  }

  a {
    color: var(--text-h);
    font-size: 16px;
    border-radius: 6px;
    background: var(--social-bg);
    display: flex;
    padding: 6px 12px;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: var(--shadow);
    }
    .button-icon {
      height: 18px;
      width: 18px;
    }
  }

  @media (max-width: 1024px) {
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;

    li {
      flex: 1 1 calc(50% - 8px);
    }

    a {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }
}

#spacer {
  height: 88px;
  border-top: 1px solid var(--border);
  @media (max-width: 1024px) {
    height: 48px;
  }
}

.ticks {
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  &::before {
    left: 0;
    border-left-color: var(--border);
  }
  &::after {
    right: 0;
    border-right-color: var(--border);
  }
}

```

---

### File: `src\App.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\App.jsx`

```jsx
import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { SpeedInsights } from "@vercel/speed-insights/react"

// Components
import Layout from './components/Layout'
import Login from './pages/Login'
import UserHome from './pages/user/UserHome'
import UserTeam from './pages/user/UserTeam'
import UserRevenue from './pages/user/UserRevenue'
import UserDis from './pages/user/UserDis'
import CompleteProfile from './pages/CompleteProfile'
import ProfileSettings from './pages/ProfileSettings'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// Admin Components
import AdminLayout from './pages/admin/AdminLayout'
import AdminHome from './pages/admin/AdminHome'
import AdminTeams from './pages/admin/AdminTeams'
import AdminRevenue from './pages/admin/AdminRevenue'
import AdminDis from './pages/admin/AdminDis'
import AdminSettings from './pages/admin/AdminSettings'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'

function App() {
  const [user, setUser] = useState(null)
  const [hasProfile, setHasProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeactivated, setIsDeactivated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error)
        setLoading(false)
        return
      }
      handleSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSession = async (session) => {
    try {
      setLoading(true)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        setHasProfile(null)
        await checkProfile(currentUser.id)
      } else {
        setHasProfile(false)
        setLoading(false)
      }
    } catch (err) {
      console.error("Session handler error:", err)
      setLoading(false)
    }
  }

  const checkProfile = async (userId) => {
    try {
      let data = null
      
      // Try to select including is_deactivated
      const res = await supabase
        .from('profiles')
        .select('first_name, profile_completed, platform_role, is_deactivated')
        .eq('id', userId)
        .maybeSingle()
      
      if (res.error) {
        // Fallback in case is_deactivated column is not migrated yet
        const fallbackRes = await supabase
          .from('profiles')
          .select('first_name, profile_completed, platform_role')
          .eq('id', userId)
          .maybeSingle()
        if (fallbackRes.error) throw fallbackRes.error
        data = fallbackRes.data
      } else {
        data = res.data
      }

      if (data) {
        if (data.is_deactivated === true) {
          setIsDeactivated(true)
        } else {
          setIsDeactivated(false)
        }
        
        if (data.platform_role === 'admin') {
          setIsAdmin(true)
          setHasProfile(true)
        } else {
          setIsAdmin(false)
          const completed = !!data.first_name || data.profile_completed === true
          setHasProfile(completed)
        }
      } else {
        // No profile row found — check auth user_metadata as fallback
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.user_metadata?.profile_completed === true) {
          setHasProfile(true)
        } else {
          setHasProfile(false)
        }
        setIsDeactivated(false)
        setIsAdmin(false)
      }
    } catch (err) {
      console.error("Profile check error:", err)
      setHasProfile(false)
      setIsDeactivated(false)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileCompleted = () => {
    setHasProfile(true)
    setIsAdmin(false)
  }

  if (loading || (user && hasProfile === null)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        Loading...
      </div>
    )
  }

  if (user && isDeactivated) {
    return (
      <div className="apple-theme-wrapper" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#000',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          background: '#161617',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '480px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 69, 58, 0.1)',
            border: '1px solid rgba(255, 69, 58, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '2rem'
          }}>
            🚫
          </div>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
            color: '#fff'
          }}>Access Blocked</h1>
          <p style={{
            color: '#86868b',
            lineHeight: '1.5',
            fontSize: '0.95rem',
            marginBottom: '32px'
          }}>
            Your access to this portal has been deactivated by an administrator. You do not have permission to view this content or perform other actions.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              setUser(null)
              setIsDeactivated(false)
            }}
            className="apple-btn apple-btn-primary"
            style={{ width: '100%', padding: '14px', borderRadius: '14px' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login user={user} isAdmin={isAdmin} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route 
          path="/complete-profile" 
          element={
            user && !isAdmin
              ? (hasProfile ? <Navigate to="/home" replace /> : <CompleteProfile user={user} onComplete={handleProfileCompleted} />)
              : <Navigate to="/" replace />
          } 
        />

        {/* Regular User Routes */}
        <Route element={<Layout user={user} />}>
          <Route 
            path="/home" 
            element={
              hasProfile && !isAdmin ? <UserHome user={user} /> : <Navigate to="/complete-profile" replace />
            } 
          />
          <Route 
            path="/team" 
            element={
              hasProfile && !isAdmin ? <UserTeam user={user} /> : <Navigate to="/complete-profile" replace />
            } 
          />
          <Route 
            path="/revenue" 
            element={
              hasProfile && !isAdmin ? <UserRevenue user={user} /> : <Navigate to="/complete-profile" replace />
            } 
          />
          <Route 
            path="/dis" 
            element={
              hasProfile && !isAdmin ? <UserDis /> : <Navigate to="/complete-profile" replace />
            } 
          />
          <Route 
            path="/profile" 
            element={
              hasProfile && !isAdmin ? <ProfileSettings user={user} /> : <Navigate to="/complete-profile" replace />
            } 
          />
        </Route>

        {/* Admin Routes - Bypasses standard Layout and uses AdminLayout exclusively */}
        <Route 
          path="/admin" 
          element={
            isAdmin ? <AdminLayout user={user} /> : <Navigate to="/" replace />
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<AdminHome />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="dis" element={<AdminDis />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="auditlogs" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? (isAdmin ? "/admin/home" : (hasProfile ? "/home" : "/complete-profile")) : "/"} replace />} />
      </Routes>
    </Router>
  )
}

export default App

```

---

### File: `src\components\Footer.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\Footer.jsx`

```jsx
export default function Footer() {
  return (
    <footer className="footer">
      <p>&copy; {new Date().getFullYear()} IdealLabs. All rights reserved.</p>
    </footer>
  )
}

```

---

### File: `src\components\Layout.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\Layout.jsx`

```jsx
import { Outlet, Navigate } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout({ user }) {
  if (!user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="apple-theme-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar user={user} />
      <main style={{ 
        flex: 1, 
        padding: 'clamp(20px, 4vw, 40px) clamp(16px, 5%, 48px)', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%', 
        boxSizing: 'border-box',
        animation: 'fadeIn 0.3s var(--apple-ease)' 
      }}>
        <Outlet />
      </main>
    </div>
  )
}

```

---

### File: `src\components\Navbar.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\Navbar.jsx`

```jsx
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Navbar({ user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close menu when navigation happens
  useEffect(() => {
    setIsOpen(false)
  }, [location])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/home', label: 'Home' },
    { to: '/team', label: 'Team' },
    { to: '/revenue', label: 'Revenue' },
    { to: '/dis', label: 'DIS' },
    { to: '/profile', label: 'Profile' }
  ]

  return (
    <nav className="apple-glass-nav" style={{ padding: '0 clamp(16px, 5%, 48px)' }}>
      <div style={{
        display: 'flex',
        height: '64px',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Branding on the left */}
        <Link to="/home" style={{ 
          fontWeight: '700', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
          color: '#ffffff',
          textDecoration: 'none'
        }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, #0071e3, #30d5c8)', boxShadow: '0 0 12px rgba(0, 113, 227, 0.6)' }}></div>
          <span style={{ 
            background: 'linear-gradient(to right, #ffffff, #86868b)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            iDEALAB
          </span>
        </Link>
        
        {user && (
          <>
            {/* Desktop Nav Links — hidden on mobile via CSS class */}
            <div className="apple-nav-desktop-links">
              {navLinks.map(link => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  style={{ 
                    color: isActive(link.to) ? '#ffffff' : 'var(--apple-text-secondary)', 
                    fontWeight: '500', 
                    fontSize: '0.92rem', 
                    transition: 'color 0.25s var(--apple-ease)',
                    textDecoration: 'none',
                    position: 'relative',
                    padding: '8px 0'
                  }}
                >
                  {link.label}
                  {isActive(link.to) && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'var(--apple-accent)',
                      borderRadius: '1px',
                      boxShadow: '0 0 8px rgba(0, 113, 227, 0.4)'
                    }} />
                  )}
                </Link>
              ))}
              
              <div style={{ width: '1px', height: '16px', background: 'var(--apple-border)', margin: '0 4px' }}></div>
              
              <button 
                onClick={handleLogout} 
                className="apple-btn apple-btn-secondary" 
                style={{ padding: '6px 16px !important', fontSize: '0.85rem' }}
              >
                Logout
              </button>
            </div>

            {/* Mobile Hamburger Button — shown on mobile via CSS class */}
            <button 
              className={`apple-hamburger-btn apple-nav-mobile-toggle ${isOpen ? 'open' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
            </button>

            {/* Mobile Menu Drawer Overlay */}
            <div className={`apple-mobile-menu-drawer ${isOpen ? 'open' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                {navLinks.map((link, idx) => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className="apple-drawer-link"
                    style={{ 
                      color: isActive(link.to) ? '#ffffff' : 'var(--apple-text-secondary)',
                      transitionDelay: `${idx * 0.05}s`
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
                
                <button 
                  onClick={handleLogout} 
                  className="apple-btn apple-btn-danger" 
                  style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '24px', borderRadius: '28px' }}
                >
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

```

---

### File: `src\components\charts\AverageRevenueChart.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\charts\AverageRevenueChart.jsx`

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AverageRevenueChart({ data, title = "Average Revenue" }) {
  // Custom tooltip to make it match the app's dark theme
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
        }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 6px 0', fontSize: '0.85rem' }}>{label}</p>
          <p style={{ color: '#4ade80', margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>
            ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card" style={{ padding: '28px', background: 'var(--card-bg)' }}>
      <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#fff' }}>{title}</h3>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="period" 
              stroke="var(--text-secondary)" 
              tick={{ fill: 'var(--text-secondary)', fontSize: '0.85rem' }} 
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              stroke="var(--text-secondary)" 
              tick={{ fill: 'var(--text-secondary)', fontSize: '0.85rem' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar 
              dataKey="average" 
              fill="url(#colorAvg)" 
              radius={[6, 6, 0, 0]}
              barSize={40}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

```

---

### File: `src\components\charts\ComplianceHeatmap.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\charts\ComplianceHeatmap.jsx`

```jsx
import { useState, useMemo } from 'react'

export default function ComplianceHeatmap({ disReports, profiles, memberships, teams, currentDateStr }) {
  // currentDateStr is 'YYYY-MM-DD'
  const [tooltip, setTooltip] = useState(null)

  // 1. Calculate the date range for the last 3 months
  // We want to show about 13 weeks of data ending at currentDateStr.
  const dateRange = useMemo(() => {
    const end = new Date(currentDateStr)
    const start = new Date(end)
    // Go back 13 weeks (91 days)
    start.setDate(end.getDate() - 90)
    
    const dates = []
    const current = new Date(start)
    
    while (current <= end) {
      const year = current.getFullYear()
      const month = String(current.getMonth() + 1).padStart(2, '0')
      const day = String(current.getDate()).padStart(2, '0')
      dates.push(`${year}-${month}-${day}`)
      current.setDate(current.getDate() + 1)
    }
    
    return { dates, startDateStr: dates[0], endDateStr: dates[dates.length - 1] }
  }, [currentDateStr])

  // 2. Active non-admin users map
  const activeUsers = useMemo(() => {
    const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
    const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
    
    // Users in at least one team
    const inTeamIds = new Set(
      memberships
        .filter(m => nonAdminIds.has(m.user_id))
        .map(m => m.user_id)
    )
    
    return nonAdminProfiles.filter(p => inTeamIds.has(p.id))
  }, [profiles, memberships])

  const expectedCount = activeUsers.length

  // 3. Grid data
  const gridData = useMemo(() => {
    const reportsByDate = {}
    disReports.forEach(r => {
      reportsByDate[r.report_date] = (reportsByDate[r.report_date] || 0) + 1
    })

    const data = []
    
    dateRange.dates.forEach(dateStr => {
      const d = new Date(dateStr)
      const dayOfWeek = d.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const count = reportsByDate[dateStr] || 0
      const rate = expectedCount > 0 ? (count / expectedCount) * 100 : 0
      
      let level = 0 // grey/no data
      if (count > 0) {
        if (rate < 50) level = 1 // red
        else if (rate < 80) level = 2 // yellow
        else level = 3 // green
      } else if (!isWeekend && expectedCount > 0) {
        level = 1 // weekday with 0 submission is red
      }

      data.push({
        date: dateStr,
        dayOfWeek,
        count,
        total: expectedCount,
        rate: Math.round(rate),
        isWeekend,
        level
      })
    })

    // To align Sunday-Saturday rows, pad the front of the array
    const firstDayOfWeek = new Date(dateRange.startDateStr).getDay()
    const paddedData = []
    for (let i = 0; i < firstDayOfWeek; i++) {
      paddedData.push({ isSpacer: true })
    }
    
    return [...paddedData, ...data]
  }, [dateRange, disReports, expectedCount])

  // 4. Calculate Team Compliance Rates (last 30 business days)
  const teamCompliance = useMemo(() => {
    // Weekdays in the last 30 calendar days
    const today = new Date(currentDateStr)
    const start = new Date(today)
    start.setDate(today.getDate() - 30)

    const weekdays = []
    const current = new Date(start)
    while (current <= today) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const year = current.getFullYear()
        const month = String(current.getMonth() + 1).padStart(2, '0')
        const day = String(current.getDate()).padStart(2, '0')
        weekdays.push(`${year}-${month}-${day}`)
      }
      current.setDate(current.getDate() + 1)
    }

    const weekdaySet = new Set(weekdays)

    return teams.map(team => {
      const teamMems = memberships.filter(m => m.team_id === team.id)
      const teamUserIds = new Set(teamMems.map(m => m.user_id))
      const teamActiveMems = activeUsers.filter(u => teamUserIds.has(u.id))
      
      const expectedSubmissions = teamActiveMems.length * weekdays.length
      
      const actualSubmissions = disReports.filter(r => 
        teamUserIds.has(r.user_id) && 
        weekdaySet.has(r.report_date)
      ).length

      const rate = expectedSubmissions > 0 ? Math.round((actualSubmissions / expectedSubmissions) * 100) : 0

      return {
        id: team.id,
        name: team.name,
        count: teamActiveMems.length,
        rate
      }
    }).sort((a, b) => b.rate - a.rate)
  }, [teams, memberships, activeUsers, disReports, currentDateStr])

  // 5. Calculate Users with Missing Streak (consecutive 3+ weekdays missed)
  const missingStreaks = useMemo(() => {
    const list = []
    const today = new Date(currentDateStr)

    activeUsers.forEach(user => {
      const userReports = new Set(
        disReports.filter(r => r.user_id === user.id).map(r => r.report_date)
      )

      let missingDays = 0
      const current = new Date(today)
      
      // Go back up to 15 weekdays
      let weekdaysChecked = 0
      while (weekdaysChecked < 10) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const year = current.getFullYear()
          const month = String(current.getMonth() + 1).padStart(2, '0')
          const day = String(current.getDate()).padStart(2, '0')
          const checkDateStr = `${year}-${month}-${day}`
          
          if (!userReports.has(checkDateStr)) {
            missingDays++
          } else {
            // Submitted, streak broken
            break
          }
          weekdaysChecked++
        }
        current.setDate(current.getDate() - 1)
      }

      if (missingDays >= 3) {
        // Find team names
        const userTeams = memberships
          .filter(m => m.user_id === user.id)
          .map(m => teams.find(t => t.id === m.team_id)?.name)
          .filter(Boolean)

        list.push({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          teams: userTeams.join(', ') || 'No Team',
          missingDays
        })
      }
    })

    return list.sort((a, b) => b.missingDays - a.missingDays)
  }, [activeUsers, disReports, teams, memberships, currentDateStr])

  // Month header helper labels
  const monthLabels = useMemo(() => {
    const labels = []
    const dates = dateRange.dates
    let lastMonth = -1
    
    // We scan columns (which are chunks of 7 items)
    // There are firstDayOfWeek spacers, so the index in dates is gridIndex - firstDayOfWeek
    const firstDayOfWeek = new Date(dateRange.startDateStr).getDay()
    const columnsCount = Math.ceil(gridData.length / 7)
    
    for (let c = 0; c < columnsCount; c++) {
      const gridIdx = c * 7
      const dateIdx = gridIdx - firstDayOfWeek
      if (dateIdx >= 0 && dateIdx < dates.length) {
        const d = new Date(dates[dateIdx])
        const m = d.getMonth()
        if (m !== lastMonth) {
          labels.push({
            name: d.toLocaleString('default', { month: 'short' }),
            colIndex: c
          })
          lastMonth = m
        }
      }
    }
    
    return labels
  }, [dateRange, gridData])

  const getLevelColor = (level) => {
    switch(level) {
      case 3: return '#10b981' // emerald-500
      case 2: return '#fbbf24' // amber-400
      case 1: return '#ef4444' // red-500
      default: return 'rgba(255, 255, 255, 0.08)' // grey spacer or weekend with 0
    }
  }

  const getLevelName = (level) => {
    switch(level) {
      case 3: return '80-100% Submission'
      case 2: return '50-80% Submission'
      case 1: return '<50% Submission'
      default: return 'No Data / Weekend'
    }
  }

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>DIS Compliance Tracker</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Submission rates and streaks of daily reports.
        </p>
      </div>

      {/* ── HEATMAP GRID SECTION ── */}
      <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '28px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '600' }}>Daily Submission Grid (Last 3 Months)</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {/* Month Labels row */}
          <div style={{ display: 'flex', position: 'relative', height: '20px', marginLeft: '30px', marginBottom: '4px' }}>
            {monthLabels.map((lbl, idx) => (
              <span key={idx} style={{ 
                position: 'absolute', 
                left: `${lbl.colIndex * 16}px`, 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)',
                fontWeight: '500'
              }}>
                {lbl.name}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Days Labels col */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '112px', width: '24px', marginRight: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '2px 0' }}>
              <span>Su</span>
              <span>Tu</span>
              <span>Th</span>
              <span>Sa</span>
            </div>

            {/* Grid Container */}
            <div style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(7, 13px)', 
              gridAutoFlow: 'column', 
              gridGap: '3px',
              overflowX: 'auto',
              flex: 1,
              paddingBottom: '8px'
            }}>
              {gridData.map((cell, idx) => {
                if (cell.isSpacer) {
                  return <div key={idx} style={{ width: '13px', height: '13px', background: 'transparent' }} />
                }
                return (
                  <div
                    key={idx}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltip({
                        date: cell.date,
                        rate: cell.rate,
                        count: cell.count,
                        total: cell.total,
                        level: cell.level,
                        x: rect.left + window.scrollX - 40,
                        y: rect.top + window.scrollY - 85
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width: '13px',
                      height: '13px',
                      borderRadius: '2px',
                      background: getLevelColor(cell.level),
                      cursor: 'pointer',
                      border: cell.isWeekend ? '1px dashed rgba(255, 255, 255, 0.05)' : 'none',
                      transition: 'transform 0.1s'
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Less</span>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: getLevelColor(0) }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: getLevelColor(1) }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: getLevelColor(2) }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: getLevelColor(3) }} />
          <span>More</span>
        </div>
      </div>

      {/* ── TWO-COLUMN SUMMARY (TEAMS & STREAKS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Team Compliance Rates */}
        <div style={{ background: 'rgba(15, 23, 42, 0.2)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '600' }}>Team Compliance (Last 30 Days)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {teamCompliance.map(tm => (
              <div key={tm.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: '500' }}>{tm.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({tm.count} mems)</span></span>
                  <span style={{ fontWeight: 'bold', color: tm.rate >= 80 ? '#34d399' : tm.rate >= 50 ? '#fbbf24' : '#f87171' }}>{tm.rate}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${tm.rate}%`, 
                    height: '100%', 
                    background: tm.rate >= 80 ? '#10b981' : tm.rate >= 50 ? '#fbbf24' : '#ef4444',
                    borderRadius: '3px',
                    transition: 'width 1s ease-in-out'
                  }} />
                </div>
              </div>
            ))}
            {teamCompliance.length === 0 && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No team data available.</p>
            )}
          </div>
        </div>

        {/* Right Column: Missing streaks */}
        <div style={{ background: 'rgba(15, 23, 42, 0.2)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '600' }}>Needs Attention (Missed 3+ Consecutive Days)</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active team members who haven't reported recently.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
            {missingStreaks.map(usr => (
              <div key={usr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fca5a5' }}>{usr.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{usr.teams}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {usr.missingDays} days missed
                </div>
              </div>
            ))}
            {missingStreaks.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎉</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>All members compliant!</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── TOOLTIP PORTAL ── */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: tooltip.y,
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          pointerEvents: 'none',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', marginBottom: '2px' }}>
            {new Date(tooltip.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Rate: <strong style={{ color: getLevelColor(tooltip.level) }}>{tooltip.rate}%</strong> ({tooltip.count}/{tooltip.total} reports)
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {getLevelName(tooltip.level)}
          </div>
        </div>
      )}
    </div>
  )
}

```

---

### File: `src\components\charts\ExpectedVsActualChart.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\charts\ExpectedVsActualChart.jsx`

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ExpectedVsActualChart({ data, title = "Expected vs Actual Revenue", teams = [], selectedTeamId = 'all', onTeamChange }) {
  // data is array of { period, Expected, Actual, Accuracy, monthStr }

  // Compute total accuracy for the period
  const totalExpected = data.reduce((sum, item) => sum + item.Expected, 0)
  const totalActual = data.reduce((sum, item) => sum + item.Actual, 0)
  const averageAccuracy = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0

  let badgeColor = '#94a3b8' // stable/neutral
  let badgeBg = 'rgba(148, 163, 184, 0.12)'
  let accuracyDesc = 'No Forecast Data'

  if (totalExpected > 0) {
    if (averageAccuracy >= 90 && averageAccuracy <= 110) {
      badgeColor = '#34d399' // green (Highly Accurate)
      badgeBg = 'rgba(52, 211, 153, 0.12)'
      accuracyDesc = 'Highly Accurate Forecast'
    } else if (averageAccuracy > 110) {
      badgeColor = '#60a5fa' // blue (Under-forecasting / Sandbagging)
      badgeBg = 'rgba(96, 165, 250, 0.12)'
      accuracyDesc = 'Under-forecasting (Conservative)'
    } else {
      badgeColor = '#f87171' // red (Over-forecasting / Aggressive)
      badgeBg = 'rgba(248, 113, 113, 0.12)'
      accuracyDesc = 'Over-forecasting (Aggressive)'
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const expected = payload.find(p => p.dataKey === 'Expected')?.value || 0
      const actual = payload.find(p => p.dataKey === 'Actual')?.value || 0
      const accuracy = expected > 0 ? Math.round((actual / expected) * 100) : 0
      
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: '600' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                Expected (DIS)
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>
                ${expected.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Actual Revenue
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>
                ${actual.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Accuracy Rate</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: accuracy >= 90 && accuracy <= 110 ? '#34d399' : accuracy > 110 ? '#60a5fa' : '#f87171' }}>
                {accuracy > 0 ? `${accuracy}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Comparing forward forecasts (DIS) with finalized monthly revenues.
          </p>
        </div>

        {totalExpected > 0 && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end',
            background: badgeBg, 
            border: `1px solid rgba(${badgeColor === '#34d399' ? '52, 211, 153' : badgeColor === '#60a5fa' ? '96, 165, 250' : '248, 113, 113'}, 0.25)`, 
            padding: '6px 12px', 
            borderRadius: '8px'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forecast Accuracy</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: badgeColor, lineHeight: 1.2 }}>
              {averageAccuracy}%
            </span>
            <span style={{ fontSize: '0.65rem', color: badgeColor, fontWeight: '500' }}>
              {accuracyDesc}
            </span>
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            barGap={4}
          >
            <defs>
              <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.5}/>
              </linearGradient>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#064e3b" stopOpacity={0.5}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="period"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              tickLine={false}
              dy={10}
            />
            <YAxis
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            
            <Bar 
              name="Expected (DIS Forecast)"
              dataKey="Expected" 
              fill="url(#colorExpected)" 
              radius={[4, 4, 0, 0]}
              barSize={20}
              animationDuration={1200}
            />
            <Bar 
              name="Actual Revenue"
              dataKey="Actual" 
              fill="url(#colorActual)" 
              radius={[4, 4, 0, 0]}
              barSize={20}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom bar: Legend + Team Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '16px',
        paddingTop: '14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        {/* Legend items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'linear-gradient(180deg, #3b82f6 0%, #1e3a8a 100%)',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Expected (DIS Forecast)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'linear-gradient(180deg, #10b981 0%, #064e3b 100%)',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Actual Revenue</span>
          </div>
        </div>

        {/* Team Selector */}
        {onTeamChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Team:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => onTeamChange(e.target.value)}
              className="form-control"
              style={{
                padding: '5px 28px 5px 12px',
                fontSize: '0.78rem',
                width: 'auto',
                borderRadius: '8px',
                height: '30px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#f1f5f9',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center'
              }}
            >
              <option value="all">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

```

---

### File: `src\components\charts\ParetoChart.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\charts\ParetoChart.jsx`

```jsx
import { useState, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ParetoChart({ data, concentrationStats }) {
  // data is array of { userId, name, revenue, cumulativePercent }
  // concentrationStats is { top20PercentRevenue, zeroRevenueCount, totalCount }
  const [displayCount, setDisplayCount] = useState(15) // '15', '30', 'all'

  const chartData = useMemo(() => {
    if (displayCount === 'all') return data
    return data.slice(0, Number(displayCount))
  }, [data, displayCount])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const revenue = payload.find(p => p.dataKey === 'revenue')?.value || 0
      const cumulativePercent = payload.find(p => p.dataKey === 'cumulativePercent')?.value || 0
      
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <p style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: '600' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Revenue:</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>
                ${revenue.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cumulative:</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#a855f7' }}>
                {cumulativePercent}%
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Determine concentration severity
  const isHighRisk = concentrationStats.top20PercentRevenue >= 75
  const riskColor = isHighRisk ? '#f87171' : concentrationStats.top20PercentRevenue >= 50 ? '#fbbf24' : '#34d399'

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header and Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Revenue Distribution (Pareto)</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Analyzes user revenue concentration. The curve shows cumulative contribution.
          </p>
        </div>

        {/* Truncation Control */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2px' }}>
          {[15, 30, 'all'].map(count => (
            <button
              key={count}
              onClick={() => setDisplayCount(count)}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                border: 'none',
                background: displayCount === count ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: displayCount === count ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: displayCount === count ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.1s'
              }}
            >
              {count === 'all' ? 'All' : `Top ${count}`}
            </button>
          ))}
        </div>
      </div>

      {/* Concentration Key Stat Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Risk concentration */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.4)', 
          border: '1px solid rgba(255,255,255,0.03)', 
          borderRadius: '10px', 
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Concentration</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: riskColor }}>
              {concentrationStats.top20PercentRevenue}%
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>of rev by top 20% members</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: riskColor, marginTop: '2px', fontWeight: '500' }}>
            {isHighRisk ? '⚠️ High Concentration Risk' : '🟢 Healthy Distribution'}
          </span>
        </div>

        {/* Zero revenue contributors */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.4)', 
          border: '1px solid rgba(255,255,255,0.03)', 
          borderRadius: '10px', 
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inactive Sales Contributors</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: concentrationStats.zeroRevenueCount > 0 ? '#fbbf24' : '#34d399' }}>
              {concentrationStats.zeroRevenueCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>members with $0 revenue</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Out of {concentrationStats.totalCount} active team members.
          </span>
        </div>

      </div>

      {/* Chart container */}
      {data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📊</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No revenue data recorded in this period.</span>
        </div>
      ) : (
        <div style={{ width: '100%', height: 300, flex: 1 }}>
          <ResponsiveContainer>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
            >
              <defs>
                <linearGradient id="colorPareto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)', fontSize: '0.65rem' }}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              
              {/* Left YAxis - Revenue */}
              <YAxis
                yAxisId="left"
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`}
              />

              {/* Right YAxis - Cumulative Percentage */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#a855f7"
                domain={[0, 100]}
                tick={{ fill: '#a855f7', fontSize: '0.75rem' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />

              <Tooltip content={<CustomTooltip />} />
              
              <Bar 
                yAxisId="left"
                dataKey="revenue" 
                fill="url(#colorPareto)" 
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativePercent" 
                stroke="#a855f7" 
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, stroke: '#0b0f18', fill: '#a855f7' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

```

---

### File: `src\components\charts\RevenueTrendChart.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\charts\RevenueTrendChart.jsx`

```jsx
import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#a855f7', // purple-500
  '#14b8a6', // teal
  '#f97316'  // orange
]

const renderCustomLabel = (props) => {
  const { cx, cy, midAngle, outerRadius, value, name, fill } = props
  if (!value || value === 0) return null

  const RADIAN = Math.PI / 180
  const radius = outerRadius + 22
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  
  const labelText = `${name}: $${value.toLocaleString()}`
  const cardWidth = Math.max(140, labelText.length * 8.6 + 42)
  const cardHeight = 32
  
  const rx = x > cx ? x + 8 : x - cardWidth - 8
  const ry = y - cardHeight / 2

  return (
    <g>
      {/* Card Background */}
      <rect
        x={rx}
        y={ry}
        width={cardWidth}
        height={cardHeight}
        rx={6}
        ry={6}
        fill="rgba(15, 23, 42, 0.95)"
        stroke={fill}
        strokeWidth={1.8}
        style={{
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))'
        }}
      />
      {/* Color Indicator Dot */}
      <rect
        x={rx + 10}
        y={y - 5}
        width={10}
        height={10}
        rx={3}
        fill={fill}
      />
      {/* Card Text */}
      <text
        x={rx + 28}
        y={y}
        fill="#f1f5f9"
        dominantBaseline="central"
        style={{
          fontSize: '0.78rem',
          fontWeight: '600',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <tspan fill="#f1f5f9" fontWeight="bold">{name}</tspan>
        <tspan fill="#94a3b8">: </tspan>
        <tspan fill="#34d399">${value.toLocaleString()}</tspan>
      </text>
    </g>
  )
}

export default function RevenueTrendChart({ data, teams }) {
  const pieData = useMemo(() => {
    if (!data || data.length === 0 || !teams || teams.length === 0) return []

    const teamTotals = {}
    teams.forEach(t => { teamTotals[t.name] = 0 })

    data.forEach(row => {
      teams.forEach(t => {
        teamTotals[t.name] = (teamTotals[t.name] || 0) + Number(row[t.name] || 0)
      })
    })

    return Object.entries(teamTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data, teams])

  const grandTotal = useMemo(
    () => pieData.reduce((sum, d) => sum + d.value, 0),
    [pieData]
  )

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Revenue Distribution</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Team revenue share for the selected period.
        </p>
      </div>

      {grandTotal === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No revenue data available for this period.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Pie Chart — no hover interactions */}
          <div style={{ flex: '1 1 350px', height: 350, minWidth: '300px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={1200}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={1}
                  label={renderCustomLabel}
                  labelLine={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{ cursor: 'default' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend / Breakdown List */}
          <div style={{ flex: '0 1 260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Grand total header */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '4px'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                ${grandTotal.toLocaleString()}
              </div>
            </div>

            {/* Team items */}
            {pieData.map((item, idx) => {
              const pct = grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : 0
              return (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    cursor: 'default'
                  }}
                >
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: COLORS[idx % COLORS.length],
                    flexShrink: 0
                  }} />
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: '400', color: '#94a3b8' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#cbd5e1' }}>
                    ${item.value.toLocaleString()}
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    color: COLORS[idx % COLORS.length],
                    background: `${COLORS[idx % COLORS.length]}18`,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    minWidth: '38px',
                    textAlign: 'center'
                  }}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

```

---

### File: `src\components\charts\Sparkline.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\charts\Sparkline.jsx`

```jsx
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function Sparkline({ data, width = 80, height = 20 }) {
  // data: array of numbers, e.g., [0, 1000, 2000, 1500, 3000]
  if (!data || data.length === 0) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>N/A</span>

  const chartData = data.map((val, idx) => ({ idx, val }))
  
  const isAllZero = data.every(val => val === 0)
  
  // Determine trend color (first value vs last value)
  const first = data[0] || 0
  const last = data[data.length - 1] || 0
  
  const strokeColor = isAllZero
    ? 'rgba(255, 255, 255, 0.15)'
    : last > first
      ? '#34d399' // green (growth)
      : last < first
        ? '#ef4444' // red (decline)
        : '#fbbf24' // amber (stable)

  return (
    <div style={{ width, height, display: 'inline-block', verticalAlign: 'middle' }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

```

---

### File: `src\components\charts\TeamRadarChart.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\components\charts\TeamRadarChart.jsx`

```jsx
import { useState, useEffect, useMemo } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts'

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#a855f7', // purple-500
  '#14b8a6', // teal
  '#f97316'  // orange
]

export default function TeamRadarChart({ data, rawTeams }) {
  // data: [ { subject: 'Revenue', 'Team A': 80, 'Team B': 40 ... }, ... ]
  // rawTeams: [ { id, name, revenue, growth, compliance, leads, efficiency, membersCount } ]
  const [selectedTeams, setSelectedTeams] = useState({})

  useEffect(() => {
    if (rawTeams && rawTeams.length > 0) {
      setSelectedTeams(prev => {
        // If we already have selected teams, check if they exist in rawTeams
        const newMap = {}
        let hasSelection = false
        rawTeams.forEach(t => {
          if (prev[t.name]) {
            newMap[t.name] = true
            hasSelection = true
          }
        })
        if (hasSelection) return newMap

        // Otherwise, select the first 3 teams by default so it's not cluttered
        const defaultMap = {}
        rawTeams.slice(0, 3).forEach(t => {
          defaultMap[t.name] = true
        })
        return defaultMap
      })
    }
  }, [rawTeams])

  // Assign colors to all teams
  const teamColors = useMemo(() => {
    const map = {}
    rawTeams.forEach((t, i) => {
      map[t.name] = COLORS[i % COLORS.length]
    })
    return map
  }, [rawTeams])

  const toggleTeam = (name) => {
    setSelectedTeams(prev => ({
      ...prev,
      [name]: !prev[name]
    }))
  }

  const activeTeamNames = useMemo(() => {
    return Object.keys(selectedTeams).filter(name => selectedTeams[name])
  }, [selectedTeams])

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Team Comparison Radar</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Normalized performance index (0-100) across key business dimensions.
        </p>
      </div>

      {/* Team select pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {rawTeams.map(t => {
          const active = !!selectedTeams[t.name]
          const color = teamColors[t.name]
          return (
            <button
              key={t.id}
              onClick={() => toggleTeam(t.name)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                border: active ? `1px solid ${color}` : '1px solid var(--border-color)',
                background: active ? `rgba(${active ? '59,130,246' : '0,0,0'}, 0.05)` : 'transparent',
                backgroundColor: active ? `${color}15` : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: active ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: active ? color : 'rgba(255,255,255,0.2)',
                boxShadow: active ? `0 0 8px ${color}` : 'none'
              }} />
              {t.name}
            </button>
          )
        })}
      </div>

      {/* Radar Chart Container */}
      {activeTeamNames.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🕸️</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select one or more teams to overlay.</span>
        </div>
      ) : (
        <div style={{ width: '100%', height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ResponsiveContainer>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }} 
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}
                axisLine={false}
              />
              
              {activeTeamNames.map(name => (
                <Radar
                  key={name}
                  name={name}
                  dataKey={name}
                  stroke={teamColors[name]}
                  fill={teamColors[name]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Raw Metrics Comparison Table */}
      {activeTeamNames.length > 0 && (
        <div style={{ marginTop: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '6px 4px' }}>Team</th>
                <th style={{ padding: '6px 4px' }}>Total Rev</th>
                <th style={{ padding: '6px 4px' }}>MoM Growth</th>
                <th style={{ padding: '6px 4px' }}>DIS Comp.</th>
                <th style={{ padding: '6px 4px' }}>Leads</th>
                <th style={{ padding: '6px 4px' }}>Rev/Member</th>
              </tr>
            </thead>
            <tbody>
              {rawTeams.filter(t => selectedTeams[t.name]).map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e2e8f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: teamColors[t.name] }} />
                    {t.name}
                  </td>
                  <td style={{ padding: '8px 4px' }}>${Math.round(t.revenue).toLocaleString()}</td>
                  <td style={{ padding: '8px 4px' }}>{Math.round(t.growth)}%</td>
                  <td style={{ padding: '8px 4px' }}>{Math.round(t.compliance)}%</td>
                  <td style={{ padding: '8px 4px' }}>{t.leads}</td>
                  <td style={{ padding: '8px 4px' }}>${Math.round(t.efficiency).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

```

---

### File: `src\frontend\pages\sql.txt`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\frontend\pages\sql.txt`

```javascript
- 1. Create Profiles Table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  first_name text,
  last_name text,
  phone text,
  email text,
  platform_role text default 'user' not null, -- 'admin' or 'user'. We will update this manually in Supabase.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Turn on RLS for profiles
alter table public.profiles enable row level security;
-- 2. Create Teams Table
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Turn on RLS for teams
alter table public.teams enable row level security;
-- 3. Create Team Members Table
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  team_role text default 'member' not null, -- 'lead' or 'member'. We will update this manually in Supabase.
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, team_id) -- A user can only join a specific team once
);
-- Turn on RLS for team members
alter table public.team_members enable row level security;
-- 4. Create Monthly Revenues Table
create table public.monthly_revenues (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  revenue_month date not null, -- e.g., '2023-10-01'
  amount numeric(12, 2) default 0.00 not null,
  entered_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, team_id, revenue_month) -- Only one record per user, per team, per month
);
-- Turn on RLS for monthly revenues
alter table public.monthly_revenues enable row level security;
-- ==========================================
-- BASIC ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- PROFILES: Users can view and update their own profile.
create policy "Users can view own profile." on profiles for select using (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile." on profiles for insert with check (auth.uid() = id);
-- TEAMS: Everyone can view teams. Only admins can insert/update (enforced via Supabase UI for now, so we just allow read).
create policy "Anyone can view teams." on teams for select using (true);
-- TEAM MEMBERS: Users can view memberships if they belong to the team. Users can insert themselves into a team.
create policy "Users can view team members of their teams" on team_members for select using (
  exists (select 1 from team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid())
);
create policy "Users can join a team." on team_members for insert with check (auth.uid() = user_id);
-- MONTHLY REVENUES: Users can view and insert their own revenues.
create policy "Users can view own revenues." on monthly_revenues for select using (auth.uid() = user_id);
create policy "Users can insert own revenues." on monthly_revenues for insert with check (auth.uid() = user_id);
create policy "Users can update own revenues." on monthly_revenues for update using (auth.uid() = user_id);
-- Note: We can add more complex policies later for Team Leads to view/edit their members' profiles and revenues.
```

---

### File: `src\index.css`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\index.css`

```css
:root {
  --primary: #4F46E5;
  --primary-hover: #4338CA;
  --bg-color: #0F172A;
  --card-bg: rgba(30, 41, 59, 0.7);
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --border-color: rgba(255, 255, 255, 0.1);
  --danger: #EF4444;
  --danger-hover: #DC2626;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: var(--text-primary);
  background-color: var(--bg-color);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

#root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

a {
  text-decoration: none;
  color: var(--primary);
  transition: color 0.2s;
}
a:hover {
  color: var(--text-primary);
}

.btn {
  background-color: var(--primary);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-danger {
  background-color: var(--danger);
}
.btn-danger:hover {
  background-color: var(--danger-hover);
}

/* Auth Pages */
.auth-container {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top right, #1e1b4b, var(--bg-color));
  padding: 20px;
}

.login-auth-container {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
  gap: clamp(32px, 6vw, 84px);
  justify-content: space-between;
  overflow: hidden;
  background:
    linear-gradient(125deg, rgba(5, 12, 27, 0.96), rgba(17, 24, 39, 0.88)),
    radial-gradient(circle at 15% 18%, rgba(20, 184, 166, 0.34), transparent 30%),
    radial-gradient(circle at 75% 22%, rgba(99, 102, 241, 0.28), transparent 32%),
    radial-gradient(circle at 68% 84%, rgba(34, 197, 94, 0.16), transparent 30%),
    #050c1b;
  padding: clamp(28px, 5vw, 72px);
}

.login-auth-container::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: linear-gradient(115deg, rgba(0, 0, 0, 0.9), transparent 78%);
  pointer-events: none;
}

.auth-identity,
.auth-card {
  position: relative;
  z-index: 1;
}

.auth-identity {
  width: 100%;
  max-width: 700px;
}

.auth-brand-mark {
  width: 62px;
  height: 62px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  color: #ecfeff;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
  margin-bottom: 28px;
}

.auth-kicker {
  color: #67e8f9;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.auth-identity h1 {
  color: #f8fafc;
  font-size: clamp(2.45rem, 6vw, 5.2rem);
  line-height: 0.98;
  max-width: 680px;
  margin-bottom: 24px;
}

.auth-copy {
  color: #cbd5e1;
  font-size: clamp(1rem, 1.7vw, 1.18rem);
  line-height: 1.8;
  max-width: 600px;
}

.auth-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 34px;
  max-width: 660px;
}

.auth-feature {
  min-height: 96px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.075);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: #e2e8f0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.auth-feature svg {
  color: #5eead4;
}

.auth-feature span {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.35;
}

.auth-status-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.auth-status-panel > div {
  min-width: 190px;
  padding: 14px 16px;
  border-left: 3px solid #22c55e;
  background: rgba(15, 23, 42, 0.42);
  border-radius: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.auth-status-label {
  display: block;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.auth-status-panel strong {
  color: #f8fafc;
  font-size: 0.92rem;
}

.auth-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(15, 23, 42, 0.55));
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: clamp(26px, 4vw, 38px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  width: 100%;
  max-width: 440px;
  animation: fadeIn 0.5s ease-out;
}

.auth-card-header {
  text-align: left;
  margin-bottom: 24px;
}

.auth-card-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.24);
  color: #bbf7d0;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.auth-card h2 {
  color: #f8fafc;
  font-size: clamp(1.7rem, 4vw, 2.1rem);
  line-height: 1.15;
  margin-bottom: 8px;
}

.auth-card p,
.auth-forgot a {
  color: #cbd5e1;
}

.auth-card-header p {
  margin: 0;
}

.auth-alert {
  padding: 11px 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.auth-alert-error {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.13);
  border: 1px solid rgba(239, 68, 68, 0.26);
}

.auth-alert-success {
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.13);
  border: 1px solid rgba(34, 197, 94, 0.24);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.auth-field label {
  display: block;
  color: #e2e8f0;
  font-size: 0.86rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.auth-field input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(2, 6, 23, 0.4);
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.auth-field input:focus {
  border-color: rgba(94, 234, 212, 0.72);
  background: rgba(2, 6, 23, 0.58);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.16);
}

.auth-field input::placeholder {
  color: #718096;
}

.auth-submit {
  width: 100%;
  min-height: 48px;
  margin-top: 4px;
  background: linear-gradient(135deg, #14b8a6, #4f46e5);
  box-shadow: 0 16px 28px rgba(20, 184, 166, 0.18);
}

.auth-submit:hover {
  background: linear-gradient(135deg, #0d9488, #4338ca);
}

.auth-forgot {
  text-align: right;
  margin-top: 14px;
  font-size: 0.88rem;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.16);
}

.auth-divider span {
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.google-btn {
  width: 100%;
  min-height: 48px;
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  font-weight: 700;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.google-btn:hover {
  background-color: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.auth-switch {
  margin-top: 20px;
  text-align: center;
  font-size: 0.92rem;
}

.auth-switch button {
  background: none;
  border: none;
  color: #67e8f9;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

@media (max-width: 980px) {
  .login-auth-container {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 28px;
    padding: 32px 20px;
  }

  .auth-identity {
    max-width: 560px;
    text-align: center;
  }

  .auth-brand-mark {
    margin: 0 auto 20px;
  }

  .auth-copy {
    margin: 0 auto;
  }

  .auth-feature-grid {
    grid-template-columns: 1fr;
    margin-top: 24px;
  }

  .auth-feature {
    min-height: auto;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
  }

  .auth-status-panel {
    justify-content: center;
  }
}

@media (max-width: 560px) {
  .login-auth-container {
    align-items: flex-start;
    padding: 24px 14px;
  }

  .auth-identity h1 {
    font-size: 2.2rem;
  }

  .auth-copy,
  .auth-status-panel {
    display: none;
  }

  .auth-card {
    padding: 24px 18px;
  }

  .auth-card-header {
    text-align: center;
  }
}

/* Layout */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 5%;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 50;
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(to right, #818cf8, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--primary);
  object-fit: cover;
}

.main-content {
  flex: 1;
  padding: 40px 5%;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

/* User Home */
.dashboard-header {
  margin-bottom: 40px;
}
.dashboard-header h1 {
  font-size: 2.5rem;
  margin-bottom: 8px;
}
.dashboard-header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

.card h3 {
  font-size: 1.25rem;
  margin-bottom: 12px;
  color: #fff;
}

.card p {
  color: var(--text-secondary);
}

/* Footer */
.footer {
  padding: 24px 5%;
  text-align: center;
  border-top: 1px solid var(--border-color);
  background: rgba(15, 23, 42, 0.8);
  color: var(--text-secondary);
  margin-top: auto;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Premium Form Controls */
.form-control {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.2s ease-in-out;
  outline: none;
}

.form-control:focus {
  border-color: #6366f1;
  background: rgba(15, 23, 42, 0.85);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

.form-control:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.2);
}

.form-control::placeholder {
  color: #64748b;
}

.form-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control option {
  background-color: #0f172a;
  color: #fff;
}

/* Chrome/Safari calendar picker icon styling */
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

/* Responsive Grid for DIS submissions */
.dis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
@media (min-width: 1024px) {
  .dis-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}


/* =====================================================
   ADMIN SIDEBAR LAYOUT
   ===================================================== */

/* Overall shell: sidebar + main side by side */
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #0b0f18;
}

/* ── Sidebar wrapper (desktop) ── */
.admin-sidebar-wrapper {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 40;
}

/* ── The sidebar itself ── */
.admin-sidebar {
  width: 220px;
  height: 100vh;
  background: #0d1117;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Scrollbar styling for sidebar */
.admin-sidebar::-webkit-scrollbar { width: 4px; }
.admin-sidebar::-webkit-scrollbar-track { background: transparent; }
.admin-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

/* ── Brand ── */
.admin-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px 20px;
  margin-bottom: 8px;
}

.admin-sidebar-brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  flex-shrink: 0;
}

.admin-sidebar-brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.01em;
}

/* ── Navigation ── */
.admin-sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 10px;
}

.admin-sidebar-link {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
  cursor: pointer;
  white-space: nowrap;
}

.admin-sidebar-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}

.admin-sidebar-link.active {
  background: rgba(255, 255, 255, 0.07);
  color: #f1f5f9;
  font-weight: 600;
}

.admin-sidebar-link.active svg {
  color: #f1f5f9;
}

/* ── Bottom: Profile + Sign Out ── */
.admin-sidebar-bottom {
  padding: 16px 10px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-sidebar-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.admin-sidebar-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.admin-sidebar-profile-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.admin-sidebar-profile-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-sidebar-role-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 4px;
  padding: 1px 6px;
  display: inline-block;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.admin-sidebar-signout {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  width: 100%;
  text-align: left;
}

.admin-sidebar-signout:hover {
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
}

/* ── Main content area ── */
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #0b0f18;
}

.admin-content {
  flex: 1;
  padding: 36px 40px;
  max-width: 1300px;
  width: 100%;
  animation: fadeIn 0.25s ease-in-out;
}

/* Override the old admin-content-area class */
.admin-content-area {
  flex: 1;
  padding: 36px 40px;
  max-width: 1300px;
  width: 100%;
  margin: 0;
}

/* ── Mobile top bar ── */
.admin-mobile-topbar {
  display: none;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: #0d1117;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 30;
}

.admin-mobile-menu-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

/* ── Mobile sidebar (hidden by default) ── */
.admin-sidebar-mobile {
  display: none;
  position: fixed;
  top: 0;
  left: -240px;
  width: 240px;
  height: 100vh;
  z-index: 50;
  transition: left 0.25s ease;
}

.admin-sidebar-mobile.open {
  left: 0;
}

/* ── Mobile overlay ── */
.admin-sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 45;
  backdrop-filter: blur(2px);
}

/* ── Responsive: mobile breakpoint ── */
@media (max-width: 768px) {
  .admin-sidebar-wrapper { display: none; }
  .admin-mobile-topbar { display: flex; }
  .admin-sidebar-mobile { display: block; }
  .admin-sidebar-overlay { display: block; }
  .admin-content { padding: 24px 20px; }
}

/* ── Placeholder page styles ── */
.admin-page-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 36px;
}

.admin-page-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.admin-page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 4px;
  line-height: 1.2;
}

.admin-page-subtitle {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}

.admin-coming-soon-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 60px 40px;
  text-align: center;
  max-width: 560px;
}

.admin-coming-soon-icon {
  font-size: 3.5rem;
  margin-bottom: 20px;
}

.admin-coming-soon-card h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.admin-coming-soon-card p {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 24px;
}

.admin-coming-soon-badge {
  display: inline-block;
  padding: 6px 18px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Secondary button style */
.btn-secondary {
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
  border: 1px solid rgba(255,255,255,0.1);
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.08);
  color: #f1f5f9;
  transform: translateY(-1px);
}

/* =====================================================
   APPLE SYSTEM UI OVERHAUL (USER PORTAL)
   ===================================================== */
:root {
  --apple-bg: #000000;
  --apple-card: #161617;
  --apple-card-hover: #1c1c1e;
  --apple-border: rgba(255, 255, 255, 0.08);
  --apple-border-strong: rgba(255, 255, 255, 0.16);
  --apple-text-primary: #f5f5f7;
  --apple-text-secondary: #86868b;
  --apple-accent: #0071e3;
  --apple-accent-green: #30d5c8;
  --apple-accent-green-solid: #28cd41;
  --apple-accent-orange: #ff9f0a;
  --apple-accent-red: #ff453a;
  --apple-accent-blue: #0071e3;
  --apple-blur-bg: rgba(22, 22, 23, 0.82);
  --apple-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --apple-ease: cubic-bezier(0.25, 1, 0.5, 1);
}

/* Theme Wrapper Context */
.apple-theme-wrapper {
  background-color: var(--apple-bg) !important;
  color: var(--apple-text-primary) !important;
  font-family: var(--apple-font) !important;
  min-height: 100vh;
  width: 100%;
}

.apple-theme-wrapper a {
  color: var(--apple-accent-blue);
  transition: opacity 0.2s var(--apple-ease);
}

.apple-theme-wrapper a:hover {
  opacity: 0.8;
}

/* Premium Typography */
.apple-title-large {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--apple-text-primary);
  line-height: 1.1;
  margin-bottom: 8px;
}

.apple-title-medium {
  font-size: clamp(1.4rem, 3.5vw, 2.2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--apple-text-primary);
  margin-bottom: 6px;
}

.apple-title-small {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--apple-text-primary);
  margin-bottom: 4px;
}

.apple-kicker {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--apple-text-secondary);
  margin-bottom: 6px;
}

.apple-lead {
  font-size: clamp(1rem, 1.8vw, 1.15rem);
  color: var(--apple-text-secondary);
  font-weight: 400;
  line-height: 1.45;
}

/* Glassmorphic Elements */
.apple-glass-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--apple-blur-bg);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--apple-border);
  transition: background-color 0.3s var(--apple-ease);
  width: 100%;
}

/* Desktop nav links container */
.apple-nav-desktop-links {
  display: flex;
  gap: 30px;
  align-items: center;
}

/* Mobile hamburger toggle — hidden by default on desktop */
.apple-nav-mobile-toggle {
  display: none !important;
}

/* Responsive: switch to hamburger on mobile */
@media (max-width: 768px) {
  .apple-glass-nav {
    background: rgba(0, 0, 0, 0.92);
  }
  .apple-nav-desktop-links {
    display: none !important;
  }
  .apple-nav-mobile-toggle {
    display: flex !important;
  }
}

/* Premium Cards */
.apple-card {
  background: var(--apple-card) !important;
  border: 1px solid var(--apple-border) !important;
  border-radius: 18px !important;
  padding: 24px !important;
  color: var(--apple-text-primary) !important;
  transition: transform 0.3s var(--apple-ease), border-color 0.3s var(--apple-ease), box-shadow 0.3s var(--apple-ease) !important;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4) !important;
}

.apple-card:hover {
  transform: translateY(-2px);
  border-color: var(--apple-border-strong) !important;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6) !important;
}

/* Custom Accented Badges */
.apple-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
}

.apple-badge-blue {
  background: rgba(0, 113, 227, 0.12);
  border: 1px solid rgba(0, 113, 227, 0.25);
  color: var(--apple-accent-blue);
}

.apple-badge-green {
  background: rgba(48, 213, 200, 0.12);
  border: 1px solid rgba(48, 213, 200, 0.25);
  color: var(--apple-accent-green);
}

.apple-badge-orange {
  background: rgba(255, 159, 10, 0.12);
  border: 1px solid rgba(255, 159, 10, 0.25);
  color: var(--apple-accent-orange);
}

.apple-badge-red {
  background: rgba(255, 69, 58, 0.12);
  border: 1px solid rgba(255, 69, 58, 0.25);
  color: var(--apple-accent-red);
}

/* Hero Stats */
.apple-stat-hero {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}

/* Apple Theme Grid system */
.apple-responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  width: 100%;
}

@media (max-width: 768px) {
  .apple-responsive-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.apple-two-col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
}

@media (max-width: 600px) {
  .apple-two-col-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Apple Buttons */
.apple-btn {
  border-radius: 24px !important;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 12px 28px !important;
  cursor: pointer;
  transition: all 0.25s var(--apple-ease) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
}

.apple-btn:active {
  transform: scale(0.97);
}

.apple-btn-primary {
  background: #ffffff !important;
  color: #000000 !important;
}

.apple-btn-primary:hover {
  background: #e5e5ea !important;
  transform: none !important;
}

.apple-btn-secondary {
  background: rgba(255, 255, 255, 0.08) !important;
  color: var(--apple-text-primary) !important;
  border: 1px solid var(--apple-border) !important;
}

.apple-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: var(--apple-border-strong) !important;
  transform: none !important;
}

.apple-btn-danger {
  background: var(--apple-accent-red) !important;
  color: #ffffff !important;
}

.apple-btn-danger:hover {
  background: #ff3b30 !important;
  transform: none !important;
}

/* Premium Form Elements */
.apple-form-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--apple-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.apple-form-control {
  width: 100%;
  padding: 14px 18px !important;
  border-radius: 12px !important;
  border: 1px solid var(--apple-border) !important;
  background: rgba(255, 255, 255, 0.04) !important;
  color: var(--apple-text-primary) !important;
  font-size: 1rem !important;
  font-family: inherit !important;
  transition: border-color 0.25s var(--apple-ease), background-color 0.25s var(--apple-ease), box-shadow 0.25s var(--apple-ease) !important;
  outline: none;
}

.apple-form-control:focus {
  border-color: var(--apple-accent-blue) !important;
  background: rgba(255, 255, 255, 0.06) !important;
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.18) !important;
}

.apple-form-control:hover:not(:disabled) {
  border-color: var(--apple-border-strong) !important;
}

.apple-form-control option {
  background-color: #161617;
  color: #f5f5f7;
}

.admin-profile-grid-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 28px;
  align-items: start;
}

@media (max-width: 900px) {
  .admin-profile-grid-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* Tab Pill Selectors */
.apple-pill-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 4px;
  gap: 2px;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.apple-pill-tabs::-webkit-scrollbar {
  display: none;
}

.apple-pill-tab {
  padding: 8px 20px;
  border-radius: 16px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--apple-text-secondary);
  transition: all 0.25s var(--apple-ease);
  white-space: nowrap;
}

.apple-pill-tab.active {
  background: #ffffff;
  color: #000000;
}

/* Table Replacement Mobile Card System */
.apple-mobile-list-card {
  display: none;
  flex-direction: column;
  gap: 14px;
}

.apple-mobile-list-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--apple-border);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Media Query to hide/show tables and card lists */
@media (max-width: 768px) {
  .apple-desktop-table-container {
    display: none !important;
  }
  .apple-mobile-list-card {
    display: flex !important;
  }
}

/* Responsive side-by-side or stacked pane layout (DIS team dashboard) */
.apple-pane-layout {
  display: flex;
  gap: 28px;
  width: 100%;
}

.apple-left-pane {
  width: 280px;
  flex-shrink: 0;
}

.apple-right-pane {
  flex: 1;
  min-width: 0;
}

@media (max-width: 900px) {
  .apple-pane-layout {
    flex-direction: column;
    gap: 24px;
  }
  .apple-left-pane {
    width: 100%;
  }
}

/* Beautiful Animated Hamburger Button */
.apple-hamburger-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  width: 40px;
  height: 40px;
  z-index: 110;
}

.apple-hamburger-btn span {
  display: block;
  width: 18px;
  height: 2px;
  background: #ffffff;
  border-radius: 2px;
  transition: transform 0.25s var(--apple-ease), opacity 0.25s var(--apple-ease);
}

.apple-hamburger-btn.open span:first-child {
  transform: translateY(4px) rotate(45deg);
}

.apple-hamburger-btn.open span:last-child {
  transform: translateY(-4px) rotate(-45deg);
}

/* Sliding Mobile Overlay Drawer */
.apple-mobile-menu-drawer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000000;
  z-index: 105;
  padding: 80px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: opacity 0.3s var(--apple-ease), transform 0.3s var(--apple-ease), visibility 0.3s var(--apple-ease);
}

.apple-mobile-menu-drawer.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.apple-drawer-link {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--apple-text-primary) !important;
  border-bottom: 1px solid var(--apple-border);
  padding-bottom: 16px;
  display: block;
  text-decoration: none;
  letter-spacing: -0.02em;
}

.apple-drawer-link:active {
  opacity: 0.6;
}

/* Full Screen blur overlays for modals */
.apple-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.apple-modal-card {
  background: var(--apple-card);
  border: 1px solid var(--apple-border);
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  position: relative;
  animation: appleModalReveal 0.35s var(--apple-ease);
}

@keyframes appleModalReveal {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}


```

---

### File: `src\main.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

---

### File: `src\pages\CompleteProfile.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\CompleteProfile.jsx`

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function CompleteProfile({ user, onComplete }) {
  const navigate = useNavigate()
  
  // Try to pre-fill from Google if available
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const nameParts = metadataName.trim().split(/\s+/)
  const [firstName, setFirstName] = useState(user?.user_metadata?.given_name || nameParts[0] || '')
  const [lastName, setLastName] = useState(user?.user_metadata?.family_name || nameParts.slice(1).join(' ') || '')
  
  const [phone, setPhone] = useState('')
  const [teams, setTeams] = useState([])
  
  // New logic for asking how many teams
  const [numTeams, setNumTeams] = useState(1)
  const [selectedTeams, setSelectedTeams] = useState(['']) // Array of team IDs
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch available teams from Supabase
    const fetchTeams = async () => {
      const { data, error } = await supabase.from('teams').select('*')
      if (data) {
        setTeams(data)
      } else {
        console.error('Error fetching teams:', error)
      }
    }
    fetchTeams()
  }, [])

  const handleNumTeamsChange = (e) => {
    let val = parseInt(e.target.value) || 0
    if (val < 0) val = 0
    if (val > 2) val = 2 // cap at 2
    setNumTeams(val)
    
    setSelectedTeams(prev => {
      const newArr = [...prev]
      if (val < newArr.length) return newArr.slice(0, val)
      while (newArr.length < val) newArr.push('')
      return newArr
    })
  }

  const handleTeamSelect = (index, value) => {
    const newArr = [...selectedTeams]
    newArr[index] = value
    setSelectedTeams(newArr)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate team selections
    const validTeams = selectedTeams.filter(t => t !== '')
    if (numTeams > 0 && validTeams.length !== numTeams) {
      setError('Please select a team for all dropdowns, or reduce the number of teams.')
      setLoading(false)
      return
    }
    if (validTeams.length > 2) {
      setError('You cannot belong to more than 2 teams.')
      setLoading(false)
      return
    }

    const uniqueTeams = [...new Set(validTeams)]
    if (uniqueTeams.length !== validTeams.length) {
      setError('Please select different teams, not the same team twice.')
      setLoading(false)
      return
    }

    try {
      // 1. Insert/Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          phone: phone,
          profile_completed: true
        })

      if (profileError) {
        console.error('Profile upsert failed:', profileError)
        throw profileError
      }

      // 2. ALSO store in auth user_metadata (this always works, no RLS issues)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { profile_completed: true, first_name: firstName, last_name: lastName }
      })
      if (metaError) console.warn('Metadata update warning:', metaError)

      // 3. Clear old team memberships first (prevents stacking)
      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) console.warn('Team cleanup warning:', deleteError)

      // 4. Insert fresh team memberships
      if (uniqueTeams.length > 0) {
        const teamMemberships = uniqueTeams.map(teamId => ({
          user_id: user.id,
          team_id: teamId
        }))

        const { error: teamError } = await supabase
          .from('team_members')
          .upsert(teamMemberships, { onConflict: 'user_id,team_id' })

        if (teamError) throw teamError
      }

      onComplete?.()
      navigate('/home', { replace: true })
      
    } catch (err) {
      console.error('CompleteProfile save error:', err)
      setError(err.message || 'An error occurred while saving your profile.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <h1>Complete Your Profile</h1>
        <p>Please provide a few more details to continue.</p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="John"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.5)', color: '#fff', fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Doe"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.5)', color: '#fff', fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Phone Number
            </label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              How many teams do you belong to? (Max 2)
            </label>
            <input 
              type="number" 
              min="0"
              max={Math.min(2, teams.length)}
              value={numTeams}
              onChange={handleNumTeamsChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          {numTeams > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Select Your Teams
              </label>
              
              {teams.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No teams available yet. An admin needs to create them.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedTeams.map((selectedId, index) => (
                    <select 
                      key={index}
                      value={selectedId}
                      onChange={(e) => handleTeamSelect(index, e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: '#fff',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="" disabled>Select Team #{index + 1}</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

```

---

### File: `src\pages\ForgotPassword.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\ForgotPassword.jsx`

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setMessage('Password reset instructions have been sent to your email.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p>Enter your email to receive a reset link</p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '16px', fontSize: '0.9rem' }}>{message}</div>}

        <form onSubmit={handleReset} style={{ textAlign: 'left', marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '0.9rem' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)' }}>Back to Login</Link>
        </div>
      </div>
    </div>
  )
}

```

---

### File: `src\pages\Login.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\Login.jsx`

```jsx
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BarChart3, Building2, ShieldCheck, UsersRound } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Login({ user, isAdmin }) {
  const navigate = useNavigate()

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      navigate(isAdmin ? '/admin/home' : '/home')
    }
  }, [user, isAdmin, navigate])

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }

  return (
    <div className="auth-container login-auth-container">
      <section className="auth-identity" aria-label="Company application overview">
        <div className="auth-brand-mark">
          <Building2 size={30} />
        </div>

        <div>
          <p className="auth-kicker">Internal Operations Portal</p>
          <h1>Ideallabs Team Monitoring</h1>
          <p className="auth-copy">
            One workspace for admins, team leads, and employees to track revenue, team activity,
            daily reporting, and operational performance.
          </p>
        </div>

        <div className="auth-feature-grid">
          <div className="auth-feature">
            <ShieldCheck size={20} />
            <span>Role-based secure access</span>
          </div>
          <div className="auth-feature">
            <UsersRound size={20} />
            <span>Employee and team visibility</span>
          </div>
          <div className="auth-feature">
            <BarChart3 size={20} />
            <span>Revenue and DIS tracking</span>
          </div>
        </div>

        <div className="auth-status-panel">
          <div>
            <span className="auth-status-label">Workspace</span>
            <strong>Admin + Employee</strong>
          </div>
          <div>
            <span className="auth-status-label">Access</span>
            <strong>Company Accounts</strong>
          </div>
        </div>
      </section>

      <div className="auth-card">
        <div className="auth-card-header">
          <span className="auth-card-badge">Secure sign in</span>
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Sign in to continue to your dashboard' : 'Create your employee profile to get started'}</p>
        </div>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-success">{message}</div>}

        <form onSubmit={handleEmailAuth} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
          </div>

          <button type="submit" className="btn auth-submit" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        {isLogin && (
          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot your password?</Link>
          </div>
        )}

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button onClick={handleGoogleLogin} className="google-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setMessage('') }}>
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  )
}

```

---

### File: `src\pages\ProfileSettings.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\ProfileSettings.jsx`

```jsx
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import {
  getLastNMonths,
  normalizeMonth,
  formatRevenueMonthShort,
  sumRevenues
} from '../utils/revenueUtils'

export default function ProfileSettings({ user }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Form State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Extra features state
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [revenues, setRevenues] = useState([])

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      
      setEmail(user.email || '')
      
      try {
        const [profileRes, teamsRes, membershipsRes, revenuesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('teams').select('*'),
          supabase.from('team_members').select('*').eq('user_id', user.id),
          supabase.from('monthly_revenues').select('*').eq('user_id', user.id)
        ])

        if (profileRes.data) {
          setFirstName(profileRes.data.first_name || '')
          setLastName(profileRes.data.last_name || '')
          setPhone(profileRes.data.phone || '')
        }
        if (teamsRes.data) setTeams(teamsRes.data)
        if (membershipsRes.data) setMemberships(membershipsRes.data)
        if (revenuesRes.data) setRevenues(revenuesRes.data)
      } catch (err) {
        console.error("Error loading profile settings", err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])



  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // 1. Update Database Profile (First Name, Last Name, Phone)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Update Auth Settings (Email, Password)
      const authUpdates = {}
      if (email !== user.email) {
        authUpdates.email = email
      }
      if (password) {
        authUpdates.password = password
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates)
        if (authError) throw authError
        
        if (authUpdates.email) {
          setMessage({ type: 'success', text: 'Profile updated! Check your new email address for a confirmation link.' })
          setSaving(false)
          return
        }
      }

      setMessage({ type: 'success', text: 'Profile settings saved successfully!' })
      setPassword('') // Clear password field after save
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading profile settings...</div>

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Security & Details</div>
        <h1 className="apple-title-large">Profile Settings</h1>
        <p className="apple-lead">
          Manage your personal information, email preferences, and security settings.
        </p>
      </div>

      {message.text && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '10px',
          marginBottom: '24px',
          background: message.type === 'error' ? 'rgba(255, 69, 58, 0.08)' : 'rgba(48, 213, 200, 0.08)',
          border: `1px solid ${message.type === 'error' ? 'var(--apple-accent-red)' : 'var(--apple-accent-green)'}`,
          color: message.type === 'error' ? 'var(--apple-accent-red)' : 'var(--apple-accent-green)',
          fontSize: '0.88rem',
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      {/* Pane Layout */}
      <div className="apple-pane-layout">
        
        {/* LEFT COLUMN: Manage Settings */}
        <div className="apple-right-pane" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="apple-card">
              <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Personal Information</h3>
              
              <div className="apple-two-col-grid" style={{ marginBottom: '16px' }}>
                <div>
                  <label className="apple-form-label">First Name</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="apple-form-control"
                  />
                </div>
                <div>
                  <label className="apple-form-label">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="apple-form-control"
                  />
                </div>
              </div>

              <div>
                <label className="apple-form-label">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="apple-form-control"
                />
              </div>
            </div>

            <div className="apple-card">
              <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Security & Login</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label className="apple-form-label">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="apple-form-control"
                />
              </div>

              <div>
                <label className="apple-form-label">New Password (leave blank to keep current)</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="apple-form-control"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="apple-btn apple-btn-primary" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Saving changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Extra Profile Stats & Achievements */}
        <div className="apple-left-pane" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Performance Overview */}
          <div className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>My Achievements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--apple-border)', 
                borderRadius: '12px', 
                padding: '16px' 
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>All-Time Contribution</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
                  ${sumRevenues(revenues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--apple-border)', 
                borderRadius: '12px', 
                padding: '16px' 
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Active Billing Cycles</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
                  {revenues.filter(r => Number(r.amount) > 0).length} Months
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

```

---

### File: `src\pages\ResetPassword.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\ResetPassword.jsx`

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if the user arrived here with a valid recovery token
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // We are cleared to reset the password
        console.log("Password recovery mode active")
      }
    })
  }, [])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      
      setMessage('Password updated successfully! Redirecting...')
      setTimeout(() => navigate('/home'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Set New Password</h1>
        <p>Please enter your new password below</p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '16px', fontSize: '0.9rem' }}>{message}</div>}

        <form onSubmit={handleUpdatePassword} style={{ textAlign: 'left', marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>New Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

```

---

### File: `src\pages\admin\AdminAnalytics.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminAnalytics.jsx`

```jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertCircle, 
  Calendar, 
  Award, 
  Activity, 
  TrendingDown,
  UserCheck
} from 'lucide-react'
import { getLastNMonths, normalizeMonth } from '../../utils/revenueUtils'
import {
  calculateMonthlyTrend,
  calculateExpectedVsActual,
  calculateTeamRadarScores,
  calculateParetoData,
  calculatePerformerStatus
} from '../../utils/analyticsUtils'

import RevenueTrendChart from '../../components/charts/RevenueTrendChart'
import ExpectedVsActualChart from '../../components/charts/ExpectedVsActualChart'
import ComplianceHeatmap from '../../components/charts/ComplianceHeatmap'
import TeamRadarChart from '../../components/charts/TeamRadarChart'
import ParetoChart from '../../components/charts/ParetoChart'
import Sparkline from '../../components/charts/Sparkline'

const TIME_FILTER_OPTIONS = [
  { label: 'Last 3 Months', value: 3 },
  { label: 'Last 6 Months', value: 6 },
  { label: 'Last 12 Months', value: 12 },
  { label: 'All Time', value: 0 }
]

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [memberships, setMemberships] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])

  // Global Time Filter (default to Last 6 Months)
  const [periodFilter, setPeriodFilter] = useState(6)

  // Local Section Filters
  const [expectedVsActualTeamId, setExpectedVsActualTeamId] = useState('all')
  const [paretoTeamId, setParetoTeamId] = useState('all')
  const [performerTab, setPerformerTab] = useState('top') // 'top' | 'attention'
  const [seeding, setSeeding] = useState(false)

  // Current Date String for calculations
  const currentDateStr = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  // Load All Required Data on Mount
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [teamsRes, profilesRes, memRes, revRes, disRes] = await Promise.all([
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('team_members').select('*'),
        supabase.from('monthly_revenues').select('*'),
        supabase.from('dis_reports').select('*').order('report_date', { ascending: false })
      ])

      if (teamsRes.data) setTeams(teamsRes.data)
      if (profilesRes.data) setProfiles(profilesRes.data)
      if (memRes.data) setMemberships(memRes.data)
      if (revRes.data) setRevenues(revRes.data)
      if (disRes.data) setDisReports(disRes.data)
    } catch (err) {
      console.error("Error loading analytics data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleSeedDemoData = async () => {
    setSeeding(true)
    try {
      const activeMembers = memberships.filter(m => {
        const p = profiles.find(prof => prof.id === m.user_id)
        return p && p.platform_role !== 'admin'
      })

      if (activeMembers.length === 0) {
        alert("No active team members found to seed data for. Please add users to teams first in the Teams tab.")
        setSeeding(false)
        return
      }

      const monthsToSeed = getLastNMonths(6)
      const mockRevenues = []
      const mockDIS = []

      // Generate revenues for the last 6 months
      activeMembers.forEach(mem => {
        monthsToSeed.forEach((month, idx) => {
          const base = mem.user_id.charCodeAt(0) * 50 + 4000
          const amount = Math.round(base + (idx * 500) + Math.random() * 2000)
          mockRevenues.push({
            user_id: mem.user_id,
            team_id: mem.team_id,
            revenue_month: month,
            amount
          })
        })

        // Generate DIS reports for the last 30 calendar days
        const today = new Date()
        for (let i = 0; i < 30; i++) {
          const d = new Date()
          d.setDate(today.getDate() - i)
          const dayOfWeek = d.getDay()
          
          if (Math.random() < 0.2) continue

          const dateStr = d.toISOString().split('T')[0]
          const expected = Math.round(300 + Math.random() * 500)
          const leads = Math.round(Math.random() * 4)

          mockDIS.push({
            user_id: mem.user_id,
            team_id: mem.team_id,
            report_date: dateStr,
            expected_revenue: expected,
            positive_leads: leads,
            revenue_generated: Math.round(expected * 0.9)
          })
        }
      })

      if (mockRevenues.length > 0) {
        const { error: revErr } = await supabase.from('monthly_revenues').insert(mockRevenues)
        if (revErr) throw revErr
      }

      if (mockDIS.length > 0) {
        const { error: disErr } = await supabase.from('dis_reports').upsert(mockDIS, { onConflict: 'user_id,report_date' })
        if (disErr) throw disErr
      }

      alert("Demo data successfully seeded!")
      await loadAllData()
    } catch (err) {
      console.error("Failed to seed data:", err)
      alert("Error seeding data: " + err.message)
    } finally {
      setSeeding(false)
    }
  }

  // Non-admin profiles only
  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin'),
    [profiles]
  )
  const nonAdminIds = useMemo(
    () => new Set(nonAdminProfiles.map(p => p.id)),
    [nonAdminProfiles]
  )

  // Filtered revenues & DIS reports for calculations based on period
  const nonAdminRevenues = useMemo(
    () => revenues.filter(r => nonAdminIds.has(r.user_id)),
    [revenues, nonAdminIds]
  )

  // Chronological list of months YYYY-MM-01
  const activeMonths = useMemo(() => {
    let months = getLastNMonths(periodFilter || 12).reverse()
    if (periodFilter === 0) {
      // Find all unique months in data
      const unique = [...new Set(nonAdminRevenues.map(r => normalizeMonth(r.revenue_month)))].filter(Boolean).sort()
      months = unique.length > 0 ? unique : getLastNMonths(12).reverse()
    }
    return months
  }, [periodFilter, nonAdminRevenues])

  // Current month YYYY-MM-01 helper
  const currentMonthStr = useMemo(() => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${m}-01`
  }, [])

  // Last Month YYYY-MM-01 helper
  const lastMonthStr = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${m}-01`
  }, [])

  // ===== DATA COMPUTATIONS =====

  // 1. Revenue Trend Line Data
  const trendData = useMemo(() => {
    return calculateMonthlyTrend(nonAdminRevenues, teams, activeMonths)
  }, [nonAdminRevenues, teams, activeMonths])

  // 2. Expected vs Actual Data (Filtered locally by expectedVsActualTeamId)
  const expectedVsActualData = useMemo(() => {
    return calculateExpectedVsActual(disReports, nonAdminRevenues, activeMonths, expectedVsActualTeamId, memberships)
  }, [disReports, nonAdminRevenues, activeMonths, expectedVsActualTeamId, memberships])

  // 3. Team Radar Scores
  const radarData = useMemo(() => {
    return calculateTeamRadarScores(teams, nonAdminRevenues, disReports, memberships, profiles, activeMonths)
  }, [teams, nonAdminRevenues, disReports, memberships, profiles, activeMonths])

  // 4. Pareto Data
  const paretoDataObj = useMemo(() => {
    return calculateParetoData(nonAdminRevenues, profiles, paretoTeamId, memberships, activeMonths)
  }, [nonAdminRevenues, profiles, paretoTeamId, memberships, activeMonths])

  // 5. Performer Status Data
  const performerData = useMemo(() => {
    return calculatePerformerStatus(nonAdminRevenues, profiles, disReports, memberships, teams, activeMonths, currentDateStr)
  }, [nonAdminRevenues, profiles, disReports, memberships, teams, activeMonths, currentDateStr])

  // Split Performers
  const topPerformers = useMemo(() => {
    return performerData
      .filter(p => !p.needsAttention && p.m1Revenue > 0)
      .sort((a, b) => b.m1Revenue - a.m1Revenue)
  }, [performerData])

  const needsAttentionPerformers = useMemo(() => {
    return performerData
      .filter(p => p.needsAttention)
      .sort((a, b) => a.m1Revenue - b.m1Revenue)
  }, [performerData])

  // Global KPI Summary Cards
  const kpis = useMemo(() => {
    // Current month revenue
    const currentMonthRev = nonAdminRevenues
      .filter(r => normalizeMonth(r.revenue_month) === currentMonthStr)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)

    // Last month revenue
    const lastMonthRev = nonAdminRevenues
      .filter(r => normalizeMonth(r.revenue_month) === lastMonthStr)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)

    const revChange = lastMonthRev > 0 ? ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0

    // Average forecast accuracy across activeMonths
    const totalExpected = expectedVsActualData.reduce((sum, item) => sum + item.Expected, 0)
    const totalActual = expectedVsActualData.reduce((sum, item) => sum + item.Actual, 0)
    const overallAccuracy = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 100

    // Overall DIS Compliance (weekdays in activeMonths)
    // Find compliance rates for each team and average them
    const activeTeamComps = radarData.rawTeams.filter(t => t.membersCount > 0)
    const avgDISCompliance = activeTeamComps.length > 0
      ? Math.round(activeTeamComps.reduce((sum, t) => sum + t.compliance, 0) / activeTeamComps.length)
      : 100

    // Active Users count
    const totalActiveUsers = nonAdminProfiles.filter(p => 
      memberships.some(m => m.user_id === p.id)
    ).length

    return {
      currentMonthRev,
      revChange,
      overallAccuracy,
      avgDISCompliance,
      totalActiveUsers
    }
  }, [nonAdminRevenues, currentMonthStr, lastMonthStr, expectedVsActualData, radarData, nonAdminProfiles, memberships])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <span>Loading analytics dashboard...</span>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { to { transform: rotate(360deg); } }
        `}} />
      </div>
    )
  }

  const isDatabaseEmpty = revenues.length === 0 && disReports.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <div className="admin-page-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <h1 className="admin-page-title">Executive Analytics</h1>
            <p className="admin-page-subtitle">Interactive performance indexes, revenues, compliance, and distribution risk.</p>
          </div>
        </div>

        {/* Global Time Filter Controls */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '3px' }}>
          {TIME_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriodFilter(opt.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: periodFilter === opt.value ? '#3b82f6' : 'transparent',
                color: periodFilter === opt.value ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── EMPTY DATA BANNER ── */}
      {isDatabaseEmpty && (
        <div style={{
          background: 'rgba(251, 191, 36, 0.08)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <AlertCircle size={24} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f1f5f9', fontWeight: '600' }}>No Performance Metrics Found</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                The <strong>monthly_revenues</strong> and <strong>dis_reports</strong> tables are empty. To preview the executive dashboard immediately, seed realistic demo data for the current active team members.
              </p>
            </div>
          </div>
          <button 
            onClick={handleSeedDemoData} 
            disabled={seeding}
            className="btn"
            style={{ 
              background: '#fbbf24', 
              color: '#0b0f18', 
              fontSize: '0.85rem', 
              padding: '8px 18px',
              fontWeight: '700',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </button>
        </div>
      )}

      {/* ── KPI HIGHLIGHTS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        {/* KPI 1: Monthly Revenue */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '12px', borderRadius: '10px' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue (This Month)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              ${kpis.currentMonthRev.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: kpis.revChange >= 0 ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              {kpis.revChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {kpis.revChange >= 0 ? '+' : ''}{kpis.revChange.toFixed(1)}% vs last month
            </div>
          </div>
        </div>

        {/* KPI 2: Forecast Accuracy */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', padding: '12px', borderRadius: '10px' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forecast Accuracy</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {kpis.overallAccuracy}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              DIS forecast vs actual ratio
            </div>
          </div>
        </div>

        {/* KPI 3: DIS Compliance */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '12px', borderRadius: '10px' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg DIS Compliance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {kpis.avgDISCompliance}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Daily report completion rate
            </div>
          </div>
        </div>

        {/* KPI 4: Active Users */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', padding: '12px', borderRadius: '10px' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Team Members</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {kpis.totalActiveUsers}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Excluding platform administrators
            </div>
          </div>
        </div>

      </div>

      {/* ── ROW 1: REVENUE TREND LINE (Section 1) ── */}
      <div style={{ width: '100%' }}>
        <RevenueTrendChart data={trendData} teams={teams} />
      </div>

      {/* ── ROW 2: EXPECTED VS ACTUAL (Section 2) & TEAM RADAR (Section 4) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        
        {/* Expected vs Actual Revenue Card */}
        <div>
          <ExpectedVsActualChart
            data={expectedVsActualData}
            teams={teams}
            selectedTeamId={expectedVsActualTeamId}
            onTeamChange={setExpectedVsActualTeamId}
          />
        </div>

        {/* Team comparison radar */}
        <div>
          <TeamRadarChart data={radarData.radarData} rawTeams={radarData.rawTeams} />
        </div>

      </div>

      {/* ── ROW 3: DIS COMPLIANCE HEATMAP & STREAKS (Section 3) ── */}
      <div style={{ width: '100%' }}>
        <ComplianceHeatmap 
          disReports={disReports} 
          profiles={profiles} 
          memberships={memberships} 
          teams={teams}
          currentDateStr={currentDateStr}
        />
      </div>

      {/* ── ROW 4: PARETO CHART (Section 5) & RANKINGS TABLE (Section 6) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        
        {/* Pareto Chart Card */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '24px', right: '110px', zIndex: 10 }}>
            {/* Pareto Team Filter */}
            <select
              value={paretoTeamId}
              onChange={(e) => setParetoTeamId(e.target.value)}
              className="form-control"
              style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto', borderRadius: '14px', height: '28px', background: 'rgba(15,23,42,0.8)' }}
            >
              <option value="all">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <ParetoChart data={paretoDataObj.paretoData} concentrationStats={paretoDataObj.concentrationStats} />
        </div>

        {/* Section 6 - Ranked table of performers */}
        <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Performer Rankings & Trends</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Track performance indicators, streaks, and sparkline trends.
              </p>
            </div>

            {/* Top / Needs Attention toggles */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2px' }}>
              <button
                onClick={() => setPerformerTab('top')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '14px',
                  border: 'none',
                  background: performerTab === 'top' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                  color: performerTab === 'top' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Top Performers
              </button>
              <button
                onClick={() => setPerformerTab('attention')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '14px',
                  border: 'none',
                  background: performerTab === 'attention' ? 'rgba(248, 113, 113, 0.15)' : 'transparent',
                  color: performerTab === 'attention' ? '#f87171' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Needs Attention ({needsAttentionPerformers.length})
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 8px', width: '40px' }}>Rank</th>
                  <th style={{ padding: '10px 8px' }}>Name</th>
                  <th style={{ padding: '10px 8px' }}>Team</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Trend (6M)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>DIS Streak</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {performerTab === 'top' ? (
                  topPerformers.slice(0, 10).map((usr, idx) => (
                    <tr key={usr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#cd7f32' : 'var(--text-secondary)' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: '500' }}>{usr.name}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{usr.teams}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#34d399' }}>
                        ${Math.round(usr.m1Revenue).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <Sparkline data={usr.sparkline} />
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: usr.streak > 0 ? '#60a5fa' : 'var(--text-secondary)' }}>
                        🔥 {usr.streak}d
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '700', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: usr.status === 'Rising' ? 'rgba(52,211,153,0.12)' : usr.status === 'Declining' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.05)',
                          color: usr.status === 'Rising' ? '#34d399' : usr.status === 'Declining' ? '#f87171' : 'var(--text-secondary)'
                        }}>
                          {usr.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  needsAttentionPerformers.map((usr, idx) => (
                    <tr key={usr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#f87171' }}>
                        ⚠️
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: '500' }}>{usr.name}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{usr.teams}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500', color: '#cbd5e1' }}>
                        ${Math.round(usr.m1Revenue).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <Sparkline data={usr.sparkline} />
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: '#ef4444' }}>
                        {usr.complianceRate}% comp.
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '700', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: 'rgba(248,113,113,0.15)',
                          color: '#f87171'
                        }}>
                          Needs Coach
                        </span>
                      </td>
                    </tr>
                  ))
                )}
                {performerTab === 'top' && topPerformers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      No active performers recorded in this range.
                    </td>
                  </tr>
                )}
                {performerTab === 'attention' && needsAttentionPerformers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#34d399', fontWeight: '600' }}>
                      🎉 Zero members flagged for coaching. Clean compliance!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  )
}

```

---

### File: `src\pages\admin\AdminAuditLogs.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminAuditLogs.jsx`

```jsx
import { ClipboardList } from 'lucide-react'

export default function AdminAuditLogs() {
  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
          <ClipboardList size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Audit Logs</h1>
          <p className="admin-page-subtitle">Track all admin and user actions across the platform.</p>
        </div>
      </div>

      <div className="admin-coming-soon-card">
        <div className="admin-coming-soon-icon">🔍</div>
        <h2>Audit Log Viewer</h2>
        <p>
          This section will display a full audit trail of all critical actions — logins,
          data changes, revenue updates, team modifications, and admin overrides.
        </p>
        <div className="admin-coming-soon-badge">Coming Soon</div>
      </div>
    </div>
  )
}

```

---

### File: `src\pages\admin\AdminDis.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminDis.jsx`

```jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminDis() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [memberships, setMemberships] = useState([])
  const [revenues, setRevenues] = useState([])
  const [reports, setReports] = useState([])

  // Submitted User IDs for the selectedDate
  const [submittedToday, setSubmittedToday] = useState(new Set())

  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTeamId, setSelectedTeamId] = useState('all')

  const loadData = async () => {
    try {
      const [teamsRes, profilesRes, membershipsRes, revenuesRes] = await Promise.all([
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('team_members').select('*'),
        supabase.from('monthly_revenues').select('*'),
      ])

      const teamsData = teamsRes.data || []
      const profilesData = profilesRes.data || []
      const membershipsData = membershipsRes.data || []
      const revenuesData = revenuesRes.data || []

      // Filter out admins
      const nonAdminProfiles = profilesData.filter(p => p.platform_role !== 'admin')

      // DIS reports are intentionally single-day only to avoid double-counting leads.
      const query = supabase
        .from('dis_reports')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email
          ),
          teams (
            name
          )
        `)
        .eq('report_date', selectedDate)

      const { data: reportsData } = await query.order('report_date', { ascending: false })

      // Calculate missing reports specifically for the selectedDate
      const { data: selectedDateReports } = await supabase
        .from('dis_reports')
        .select('user_id')
        .eq('report_date', selectedDate)

      const submittedUserIds = new Set(selectedDateReports?.map(r => r.user_id) || [])

      setTeams(teamsData)
      setProfiles(nonAdminProfiles)
      setMemberships(membershipsData)
      setRevenues(revenuesData)
      setReports(reportsData || [])
      setSubmittedToday(submittedUserIds)
    } catch (err) {
      console.error("Error loading admin DIS data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [selectedDate])

  // Global totals for selected date (used only for "All Teams" view)
  const globalSummary = useMemo(() => {
    let totalLeads = 0
    let totalExpected = 0
    const userLatestRevenue = {}

    for (const r of reports) {
      totalLeads += Number(r.positive_leads)
      totalExpected += Number(r.expected_revenue)

      if (userLatestRevenue[r.user_id] === undefined) {
        const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
        const userMonthRevs = revenues.filter(rv => rv.user_id === r.user_id && rv.revenue_month === monthStr)
        userLatestRevenue[r.user_id] = userMonthRevs.reduce((sum, rv) => sum + Number(rv.amount), 0)
      }
    }

    const totalRevenue = Object.values(userLatestRevenue).reduce((acc, val) => acc + val, 0)
    return { totalRevenue, totalLeads, totalExpected }
  }, [reports, revenues])

  // Group reports and missing list by team
  const teamData = useMemo(() => {
    const nonAdminIds = new Set(profiles.map(p => p.id))

    return teams.map(team => {
      const teamMems = memberships.filter(m => m.team_id === team.id && nonAdminIds.has(m.user_id))
      const teamMemberIds = new Set(teamMems.map(m => m.user_id))

      const teamReps = reports.filter(r => {
        const isCurrentMember = teamMemberIds.has(r.user_id)
        if (isCurrentMember) return true
        const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
        const hasHistRev = revenues.some(
          rv => rv.user_id === r.user_id &&
                rv.team_id === team.id &&
                rv.revenue_month === monthStr
        )
        return hasHistRev
      })

      const teamUserLatestRevenue = {}
      let teamTotalLeads = 0
      let teamTotalExpected = 0

      for (const r of teamReps) {
        teamTotalLeads += Number(r.positive_leads)
        teamTotalExpected += Number(r.expected_revenue)
        if (teamUserLatestRevenue[r.user_id] === undefined) {
          const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
          const revRecord = revenues.find(
            rv => rv.user_id === r.user_id &&
                  rv.team_id === team.id &&
                  rv.revenue_month === monthStr
          )
          teamUserLatestRevenue[r.user_id] = revRecord ? Number(revRecord.amount) : 0
        }
      }

      const teamTotalRevenue = Object.values(teamUserLatestRevenue).reduce((acc, val) => acc + val, 0)

      // Missing users: active members who haven't submitted, with team info
      const missing = teamMems.filter(m => !submittedToday.has(m.user_id)).map(m => {
        const prof = profiles.find(p => p.id === m.user_id)
        return {
          name: prof ? `${prof.first_name} ${prof.last_name}` : 'Unknown',
          teamName: team.name
        }
      })

      return {
        ...team,
        membersCount: teamMems.length,
        submissions: teamReps,
        missing,
        totalRevenue: teamTotalRevenue,
        totalLeads: teamTotalLeads,
        totalExpected: teamTotalExpected
      }
    })
  }, [teams, profiles, memberships, reports, submittedToday, revenues])

  // Derived data for current view
  const isAllTeams = selectedTeamId === 'all'

  const activeTeam = !isAllTeams ? teamData.find(t => t.id === selectedTeamId) : null

  // All missing across all teams (for "All Teams" view)
  const allMissing = useMemo(() => {
    return teamData.flatMap(t => t.missing)
  }, [teamData])

  // Submissions to display
  const displayedSubmissions = useMemo(() => {
    if (isAllTeams) return reports
    return activeTeam ? activeTeam.submissions : []
  }, [isAllTeams, reports, activeTeam])

  // Stats for the displayed team
  const displayedStats = useMemo(() => {
    if (isAllTeams) return globalSummary
    if (!activeTeam) return { totalRevenue: 0, totalLeads: 0, totalExpected: 0 }
    return {
      totalRevenue: activeTeam.totalRevenue,
      totalLeads: activeTeam.totalLeads,
      totalExpected: activeTeam.totalExpected
    }
  }, [isAllTeams, globalSummary, activeTeam])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading DIS Dashboard...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>DIS Dashboard</h2>
        <button
          onClick={loadData}
          className="btn btn-secondary"
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ===== FILTER CONTROLS ===== */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="form-control"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
              Select Team
            </label>
            <select
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(e.target.value)}
              className="form-control"
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===== GLOBAL SUMMARY METRICS — only for All Teams ===== */}
      {isAllTeams && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08), rgba(59, 130, 246, 0.08))', border: '1px solid rgba(74, 222, 128, 0.25)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
              All Teams Revenue (MTD)
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80' }}>
              ${displayedStats.totalRevenue.toFixed(2)}
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
              All Teams Expected Revenue (MTD)
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa' }}>
              ${displayedStats.totalExpected.toFixed(2)}
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
              All Teams Positive Leads
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>
              {displayedStats.totalLeads}
            </div>
          </div>
        </div>
      )}

      {/* ===== TEAM-SPECIFIC STATS (when a specific team is selected) ===== */}
      {!isAllTeams && activeTeam && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div className="card" style={{ padding: '16px 20px', background: 'rgba(74, 222, 128, 0.03)', border: '1px solid rgba(74, 222, 128, 0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>This Month ({activeTeam.name})</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>${activeTeam.totalRevenue.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', background: 'rgba(96, 165, 250, 0.03)', border: '1px solid rgba(96, 165, 250, 0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Expected Revenue ({activeTeam.name})</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>${activeTeam.totalExpected.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', background: 'rgba(251, 191, 36, 0.03)', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Positive Leads ({activeTeam.name})</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{activeTeam.totalLeads}</div>
          </div>
        </div>
      )}

      {/* ===== MISSING DIS REPORTS ===== */}
      {isAllTeams ? (
        allMissing.length > 0 && (
          <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)', padding: '20px', marginBottom: '28px' }}>
            <h4 style={{ color: '#ef4444', fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
              ⚠️ Missing DIS Reports ({allMissing.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allMissing.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.08)'
                }}>
                  <span style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>{item.name}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    background: 'rgba(96,165,250,0.1)',
                    border: '1px solid rgba(96,165,250,0.2)',
                    color: '#60a5fa'
                  }}>{item.teamName}</span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        activeTeam && activeTeam.missing.length > 0 && (
          <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)', padding: '20px', marginBottom: '28px' }}>
            <h4 style={{ color: '#ef4444', fontSize: '1.05rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
              ⚠️ Missing DIS Reports ({activeTeam.missing.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeTeam.missing.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.08)'
                }}>
                  <span style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ===== SUBMITTED REPORTS GRID ===== */}
      <div>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#fff' }}>
          Submitted Reports
          <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '400' }}>
            ({displayedSubmissions.length} submission{displayedSubmissions.length !== 1 ? 's' : ''})
          </span>
        </h4>
        {displayedSubmissions.length > 0 ? (
          <div className="dis-grid">
            {displayedSubmissions.map(row => {
              const monthStr = `${row.report_date.split('-')[0]}-${row.report_date.split('-')[1]}-01`

              // Find revenue — if all teams, sum across all teams for this user
              let teamSpecificRevenue = 0
              if (isAllTeams) {
                const userMonthRevs = revenues.filter(rv => rv.user_id === row.user_id && rv.revenue_month === monthStr)
                teamSpecificRevenue = userMonthRevs.reduce((sum, rv) => sum + Number(rv.amount), 0)
              } else {
                const revRecord = revenues.find(
                  rv => rv.user_id === row.user_id &&
                        rv.team_id === (activeTeam?.id) &&
                        rv.revenue_month === monthStr
                )
                teamSpecificRevenue = revRecord ? Number(revRecord.amount) : 0
              }

              return (
                <div
                  key={row.id}
                  className="card"
                  style={{
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '1.05rem' }}>{row.profiles?.first_name} {row.profiles?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.profiles?.email}</div>
                    {isAllTeams && row.teams?.name && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          textTransform: 'capitalize',
                          background: 'rgba(96,165,250,0.1)',
                          border: '1px solid rgba(96,165,250,0.2)',
                          color: '#60a5fa'
                        }}>{row.teams.name}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Positive Leads:</span>
                      <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{row.positive_leads}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>MTD Revenue:</span>
                      <span style={{ fontWeight: 'bold', color: '#4ade80' }}>${teamSpecificRevenue.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Expected Revenue:</span>
                      <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>${Number(row.expected_revenue).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.95rem' }}>No reports submitted for the selected date.</p>
        )}
      </div>
    </div>
  )
}

```

---

### File: `src\pages\admin\AdminHome.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminHome.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react'
import { Check, Edit2, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import {
  formatRevenueMonth,
  getEffectiveTarget,
  getTargetAssignmentMonths,
  normalizeMonth,
  sumRevenues
} from '../../utils/revenueUtils'

export default function AdminHome() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [memberships, setMemberships] = useState([])
  const [revenues, setRevenues] = useState([])
  const [targets, setTargets] = useState([])

  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getTargetAssignmentMonths(0, 0)[0])
  const [editingUserId, setEditingUserId] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [savingUserId, setSavingUserId] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsRes, profilesRes, memRes, revRes] = await Promise.all([
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('profiles').select('*'),
          supabase.from('team_members').select('*'),
          supabase.from('monthly_revenues').select('*')
        ])
        if (teamsRes.data) setTeams(teamsRes.data)
        if (profilesRes.data) setProfiles(profilesRes.data)
        if (memRes.data) setMemberships(memRes.data)
        if (revRes.data) setRevenues(revRes.data)

        const { data: targetData, error: targetErr } = await supabase.from('monthly_targets').select('*')
        if (!targetErr && targetData) setTargets(targetData)
      } catch (err) {
        console.error('Error loading admin home data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id)
    }
  }, [selectedTeamId, teams])

  const teamMembers = useMemo(() => {
    if (!selectedTeamId) return []
    const memberIds = memberships
      .filter(m => m.team_id === selectedTeamId)
      .map(m => m.user_id)
    return profiles
      .filter(p => p.platform_role !== 'admin' && memberIds.includes(p.id))
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
  }, [selectedTeamId, memberships, profiles])

  const memberTargets = useMemo(() => {
    return teamMembers.map(member => {
      const target = getEffectiveTarget(targets, member.id, selectedTeamId, selectedMonth)
      const currentTarget = target ? Number(target.target_amount || 0) : 0
      const reached = sumRevenues(revenues.filter(r =>
        r.user_id === member.id &&
        r.team_id === selectedTeamId &&
        normalizeMonth(r.revenue_month) === selectedMonth
      ))
      const achievement = currentTarget > 0 ? (reached / currentTarget) * 100 : 0

      return {
        ...member,
        currentTarget,
        targetSourceMonth: target ? normalizeMonth(target.target_month) : '',
        reached,
        achievement
      }
    })
  }, [teamMembers, targets, revenues, selectedTeamId, selectedMonth])

  const summary = useMemo(() => {
    const expected = memberTargets.reduce((sum, member) => sum + member.currentTarget, 0)
    const reached = memberTargets.reduce((sum, member) => sum + member.reached, 0)
    const achievement = expected > 0 ? (reached / expected) * 100 : 0
    return { expected, reached, achievement }
  }, [memberTargets])

  const monthOptions = useMemo(() => getTargetAssignmentMonths(11, 12), [])

  const startEditing = (member) => {
    setEditingUserId(member.id)
    setEditAmount(member.currentTarget > 0 ? String(member.currentTarget) : '')
    setMessage({ type: '', text: '' })
  }

  const cancelEditing = () => {
    setEditingUserId('')
    setEditAmount('')
  }

  const handleSaveTarget = async (userId) => {
    setMessage({ type: '', text: '' })
    const amount = Number(editAmount)
    if (!selectedTeamId || !userId || !selectedMonth) {
      setMessage({ type: 'error', text: 'Select team, employee, and month.' })
      return
    }
    if (Number.isNaN(amount) || amount < 0) {
      setMessage({ type: 'error', text: 'Target amount must be 0 or greater.' })
      return
    }

    setSavingUserId(userId)
    try {
      const { error } = await supabase
        .from('monthly_targets')
        .upsert(
          {
            user_id: userId,
            team_id: selectedTeamId,
            target_month: selectedMonth,
            target_amount: amount
          },
          { onConflict: 'user_id,team_id,target_month' }
        )
      if (error) throw error

      const { data: freshTargets, error: refreshErr } = await supabase.from('monthly_targets').select('*')
      if (!refreshErr) setTargets(freshTargets || [])
      cancelEditing()
      setMessage({ type: 'success', text: `Target updated from ${formatRevenueMonth(selectedMonth)} onward.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to assign target.' })
    } finally {
      setSavingUserId('')
    }
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Assign monthly targets and monitor target vs reached clearly.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        {/* Card header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0' }}>Assign Monthly Targets</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Edit a member target for the selected month. It continues into upcoming months until another target is saved.
            </p>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {memberTargets.length} team member{memberTargets.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Team + Month dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'end', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Team</label>
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value)
                cancelEditing()
              }}
              className="form-control"
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Effective Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                cancelEditing()
              }}
              className="form-control"
            >
              {monthOptions.map(month => (
                <option key={month} value={month}>{formatRevenueMonth(month)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== SUMMARY CARDS (moved here from the bottom) ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(96,165,250,0.35)',
            background: 'rgba(96,165,250,0.08)'
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Target — {formatRevenueMonth(selectedMonth)}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa' }}>${summary.expected.toFixed(2)}</div>
          </div>

          <div style={{
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(74,222,128,0.35)',
            background: 'rgba(74,222,128,0.08)'
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Reached — {formatRevenueMonth(selectedMonth)}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#4ade80' }}>${summary.reached.toFixed(2)}</div>
          </div>

          <div style={{
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(251,191,36,0.35)',
            background: 'rgba(251,191,36,0.08)'
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Achievement</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fbbf24' }}>
              {summary.expected > 0 ? `${summary.achievement.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Members table */}
        {memberTargets.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>No non-admin members found for this team.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Member</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Current Target</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Applies From</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Reached</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Achievement</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {memberTargets.map(member => {
                  const isEditing = editingUserId === member.id
                  const isSaving = savingUserId === member.id

                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ color: '#fff', fontWeight: '700' }}>{member.first_name} {member.last_name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{member.email}</div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            className="form-control"
                            value={editAmount}
                            onChange={(e) => {
                              // Only allow numeric input with optional decimal
                              const val = e.target.value
                              if (val === '' || /^\d*\.?\d*$/.test(val)) setEditAmount(val)
                            }}
                            placeholder="0.00"
                            style={{ width: '140px', marginLeft: 'auto', textAlign: 'right' }}
                            autoFocus
                          />
                        ) : (
                          <span style={{ color: '#60a5fa', fontWeight: '800' }}>${member.currentTarget.toFixed(2)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                        {member.targetSourceMonth ? formatRevenueMonth(member.targetSourceMonth) : 'Not assigned'}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#4ade80', fontWeight: '700' }}>
                        ${member.reached.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fbbf24', fontWeight: '700' }}>
                        {member.currentTarget > 0 ? `${member.achievement.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => handleSaveTarget(member.id)}
                                disabled={isSaving}
                                title="Save target"
                                aria-label="Save target"
                                style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={cancelEditing}
                                disabled={isSaving}
                                title="Cancel edit"
                                aria-label="Cancel edit"
                                style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => startEditing(member)}
                              title="Edit target"
                              aria-label={`Edit target for ${member.first_name} ${member.last_name}`}
                              style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {message.text && (
          <div style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            color: message.type === 'error' ? '#f87171' : '#4ade80',
            background: message.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)',
            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(74,222,128,0.25)'}`
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}

```

---

### File: `src\pages\admin\AdminLayout.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminLayout.jsx`

```jsx
import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import {
  LayoutDashboard,
  Users,
  UsersRound,
  FileText,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Settings,
  LogOut,
  BarChart2,
  Menu,
  X
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/admin/home',      label: 'Dashboard',   icon: LayoutDashboard },
  { path: '/admin/teams',     label: 'Teams',       icon: UsersRound },
  { path: '/admin/users',     label: 'Users',       icon: Users },
  { path: '/admin/dis',       label: 'DIS Reports', icon: FileText },
  { path: '/admin/revenue',   label: 'Revenue',     icon: DollarSign },
  { path: '/admin/analytics', label: 'Analytics',   icon: TrendingUp },
  { path: '/admin/auditlogs', label: 'Audit Logs',  icon: ClipboardList },
  { path: '/admin/settings',  label: 'Settings',    icon: Settings },
]

export default function AdminLayout({ user }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('first_name, last_name, platform_role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  // Derive initials for avatar
  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : 'SA'

  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
    : 'System Admin'

  const SidebarContent = () => (
    <div className="admin-sidebar">
      {/* ── Brand ── */}
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-brand-icon">
          <BarChart2 size={20} strokeWidth={2.5} />
        </div>
        <span className="admin-sidebar-brand-name">iDEALAB</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="admin-sidebar-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <Link
              key={path}
              to={path}
              className={`admin-sidebar-link${active ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom: Profile + Sign Out ── */}
      <div className="admin-sidebar-bottom">
        <div className="admin-sidebar-profile">
          <div className="admin-sidebar-avatar">{initials}</div>
          <div className="admin-sidebar-profile-info">
            <span className="admin-sidebar-profile-name">{fullName}</span>
            <span className="admin-sidebar-role-badge">Admin</span>
          </div>
        </div>

        <button className="admin-sidebar-signout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="admin-shell">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Desktop Sidebar ── */}
      <div className="admin-sidebar-wrapper">
        <SidebarContent />
      </div>

      {/* ── Mobile Sidebar ── */}
      <div className={`admin-sidebar-mobile${sidebarOpen ? ' open' : ''}`}>
        <SidebarContent />
      </div>

      {/* ── Main Content ── */}
      <div className="admin-main">
        {/* Mobile top bar */}
        <div className="admin-mobile-topbar">
          <button
            className="admin-mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="admin-sidebar-brand-name" style={{ fontSize: '1rem' }}>
            iDEALAB Admin
          </div>
        </div>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

```

---

### File: `src\pages\admin\AdminRevenue.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminRevenue.jsx`

```jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  filterRevenuesByPeriod,
  filterRevenuesByCompletedPeriod,
  sumRevenues,
  normalizeMonth,
  getLastNMonths,
  getEffectiveTargetAmount,
  TIME_PERIOD_OPTIONS
} from '../../utils/revenueUtils'

export default function AdminRevenue() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [memberships, setMemberships] = useState([])
  const [targets, setTargets] = useState([])

  // Period filter now lives inside the "Expected vs Actual" section
  const [periodFilter, setPeriodFilter] = useState(1)
  const [averagePeriod, setAveragePeriod] = useState(6)
  const [selectedTeamId, setSelectedTeamId] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsRes, profilesRes, revRes, memRes] = await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*'),
          supabase.from('team_members').select('*')
        ])

        if (teamsRes.data) setTeams(teamsRes.data)
        if (profilesRes.data) setProfiles(profilesRes.data)
        if (revRes.data) setRevenues(revRes.data)
        if (memRes.data) setMemberships(memRes.data)

        const { data: targetData, error: targetError } = await supabase
          .from('monthly_targets')
          .select('*')
        if (!targetError && targetData) setTargets(targetData)
      } catch (err) {
        console.error('Error loading admin revenue data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin'),
    [profiles]
  )
  const nonAdminIds = useMemo(
    () => new Set(nonAdminProfiles.map(p => p.id)),
    [nonAdminProfiles]
  )

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id)
    }
  }, [selectedTeamId, teams])

  const nonAdminRevenues = useMemo(
    () => revenues.filter(r => nonAdminIds.has(r.user_id)),
    [revenues, nonAdminIds]
  )

  // Use all-time revenues for top-level cards (no global period filter)
  const allTimeTotal = sumRevenues(nonAdminRevenues)

  const averagePeriodOptions = [
    { label: '1M', value: 1 },
    { label: '2M', value: 2 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
    { label: 'All Time', value: 0 },
  ]

  const teamAverages = useMemo(() => {
    const filtered = filterRevenuesByCompletedPeriod(nonAdminRevenues, averagePeriod)
    return teams.map(team => {
      const teamRevs = filtered.filter(r => r.team_id === team.id)
      const sum = sumRevenues(teamRevs)
      let average = 0
      if (averagePeriod > 0) {
        average = sum / averagePeriod
      } else {
        const uniqueMonths = new Set(teamRevs.map(r => normalizeMonth(r.revenue_month))).size
        average = uniqueMonths > 0 ? sum / uniqueMonths : 0
      }
      return {
        teamId: team.id,
        teamName: team.name,
        average: Number(average.toFixed(2))
      }
    }).sort((a, b) => b.average - a.average)
  }, [nonAdminRevenues, teams, averagePeriod])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e']

  // All-time team leaderboard
  const teamRevenues = teams.map(team => {
    const allTimeSum = sumRevenues(nonAdminRevenues.filter(r => r.team_id === team.id))
    return { ...team, allTimeTotal: allTimeSum }
  }).sort((a, b) => b.allTimeTotal - a.allTimeTotal)

  const highestTeam = teamRevenues.length > 0 && teamRevenues[0].allTimeTotal > 0 ? teamRevenues[0] : null

  const topContributors = nonAdminProfiles.map(profile => {
    const allTimeSum = sumRevenues(nonAdminRevenues.filter(r => r.user_id === profile.id))
    return { ...profile, allTimeTotal: allTimeSum }
  }).filter(m => m.allTimeTotal > 0)
    .sort((a, b) => b.allTimeTotal - a.allTimeTotal)

  const highestMember = topContributors.length > 0 ? topContributors[0] : null

  // Period-based month set — for the Expected vs Actual section
  const monthSet = useMemo(() => {
    if (periodFilter === 0) {
      const allMonths = [
        ...revenues.map(r => normalizeMonth(r.revenue_month)),
        ...targets.map(t => normalizeMonth(t.target_month))
      ].filter(Boolean)
      return new Set(allMonths)
    }
    return new Set(getLastNMonths(periodFilter))
  }, [periodFilter, revenues, targets])

  const teamMembers = useMemo(() => {
    if (!selectedTeamId) return []
    const memberIds = memberships
      .filter(m => m.team_id === selectedTeamId)
      .map(m => m.user_id)
    return nonAdminProfiles.filter(p => memberIds.includes(p.id))
  }, [selectedTeamId, memberships, nonAdminProfiles])

  const memberStats = useMemo(() => {
    return teamMembers.map(member => {
      const expected = Array.from(monthSet).reduce((sum, month) => {
        return sum + getEffectiveTargetAmount(targets, member.id, selectedTeamId, month)
      }, 0)

      const actual = revenues
        .filter(r =>
          r.user_id === member.id &&
          r.team_id === selectedTeamId &&
          monthSet.has(normalizeMonth(r.revenue_month))
        )
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)

      const achievement = expected > 0 ? (actual / expected) * 100 : 0
      return {
        ...member,
        expected,
        actual,
        gap: actual - expected,
        achievement
      }
    }).sort((a, b) => b.actual - a.actual)
  }, [teamMembers, targets, revenues, selectedTeamId, monthSet])

  const summary = useMemo(() => {
    const expected = memberStats.reduce((sum, m) => sum + m.expected, 0)
    const actual = memberStats.reduce((sum, m) => sum + m.actual, 0)
    const achievement = expected > 0 ? (actual / expected) * 100 : 0
    return { expected, actual, achievement }
  }, [memberStats])

  const filterLabel = TIME_PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label || 'All Time'

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading analytics...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Revenue Analytics</h2>
      </div>

      {/* ===== TOP SUMMARY CARDS (all-time) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(59, 130, 246, 0.1))',
          border: '1px solid rgba(74, 222, 128, 0.3)'
        }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>All Time Revenue</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#4ade80' }}>
            ${allTimeTotal.toFixed(2)}
          </div>
        </div>

        <div className="card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Top Performing Team</h3>
          {highestTeam ? (
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>{highestTeam.name}</div>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', marginTop: '4px' }}>${highestTeam.allTimeTotal.toFixed(2)}</div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>No revenue data</div>
          )}
        </div>

        <div className="card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Top Individual Contributor</h3>
          {highestMember ? (
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                {highestMember.first_name} {highestMember.last_name}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#a78bfa', marginTop: '4px' }}>
                ${highestMember.allTimeTotal.toFixed(2)}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>No revenue data</div>
          )}
        </div>
      </div>

      {/* ===== TEAM MEMBERS EXPECTED VS ACTUAL ===== */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Team Members Expected vs Actual</h3>

        {/* Team selector + period dropdown in the same row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: '16px', alignItems: 'end', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Team</label>
            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="form-control">
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Period</label>
            <select value={periodFilter} onChange={e => setPeriodFilter(Number(e.target.value))} className="form-control">
              {TIME_PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary mini-cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div className="card" style={{ border: '1px solid rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Expected ({filterLabel})</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#60a5fa' }}>${summary.expected.toFixed(2)}</div>
          </div>
          <div className="card" style={{ border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Actual ({filterLabel})</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#4ade80' }}>${summary.actual.toFixed(2)}</div>
          </div>
          <div className="card" style={{ border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Achievement</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24' }}>
              {summary.expected > 0 ? `${summary.achievement.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {memberStats.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No non-admin members found for this team.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Member</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Expected</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Actual</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Gap</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Achievement</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 8px', color: '#fff', fontWeight: '600' }}>
                      {member.first_name} {member.last_name}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#60a5fa', fontWeight: '700' }}>
                      ${member.expected.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#4ade80', fontWeight: '700' }}>
                      ${member.actual.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: member.gap >= 0 ? '#4ade80' : '#f87171', fontWeight: '700' }}>
                      {member.gap >= 0 ? '+' : ''}${member.gap.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fbbf24', fontWeight: '700' }}>
                      {member.expected > 0 ? `${member.achievement.toFixed(1)}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== TEAM AVERAGE REVENUE ===== */}
      <div className="card" style={{ marginBottom: '40px', padding: '24px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f1f5f9' }}>Team Average Revenue</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Average monthly revenue per team. Select a period to compare.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '3px' }}>
            {averagePeriodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setAveragePeriod(opt.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: averagePeriod === opt.value ? '#3b82f6' : 'transparent',
                  color: averagePeriod === opt.value ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {teamAverages.map((team, idx) => (
             <div key={team.teamId} style={{
               background: 'rgba(15, 23, 42, 0.4)',
               border: '1px solid rgba(255,255,255,0.05)',
               borderRadius: '12px',
               padding: '20px',
               display: 'flex',
               flexDirection: 'column',
               position: 'relative',
               overflow: 'hidden'
             }}>
               <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: COLORS[idx % COLORS.length] }} />
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', paddingLeft: '8px' }}>
                 {team.teamName}
               </div>
               <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', paddingLeft: '8px' }}>
                 ${team.average.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
               </div>
             </div>
          ))}
          {teamAverages.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', padding: '10px' }}>No teams available</div>
          )}
        </div>
      </div>

      {/* ===== TEAM LEADERBOARD (all-time) ===== */}
      <div className="card" style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px' }}>Team Leaderboard</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {teamRevenues.map((team, index) => {
            const maxRev = highestTeam?.allTimeTotal || 1
            const percentage = Math.max(5, (team.allTimeTotal / maxRev) * 100)

            return (
              <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '30px 150px 1fr 100px', alignItems: 'center', gap: '16px' }}>
                <div style={{ color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                  #{index + 1}
                </div>
                <div style={{ fontWeight: '500' }}>{team.name}</div>

                <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: index === 0 ? 'linear-gradient(90deg, #4ade80, #3b82f6)' : '#3b82f6',
                    borderRadius: '6px',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
                    ${team.allTimeTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

```

---

### File: `src\pages\admin\AdminSettings.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminSettings.jsx`

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [profilesRes, teamsRes, membershipsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('first_name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('team_members').select('*')
      ])

      if (profilesRes.error) throw profilesRes.error
      if (teamsRes.error) throw teamsRes.error
      if (membershipsRes.error) throw membershipsRes.error

      // We only manage team memberships for non-admin users
      const nonAdminUsers = (profilesRes.data || []).filter(p => p.platform_role !== 'admin')
      
      setUsers(nonAdminUsers)
      setTeams(teamsRes.data || [])
      setMemberships(membershipsRes.data || [])
    } catch (err) {
      console.error('Error loading settings data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered users based on search query
  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
    const email = (user.email || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  // Open modal handler
  const handleOpenModal = (user) => {
    setSelectedUser(user)
    setSelectedTeamId('')
    setSelectedRole('member')
    setModalError('')
    setModalMessage('')
  }

  // Close modal handler
  const handleCloseModal = () => {
    setSelectedUser(null)
  }

  // Get user's current memberships
  const getUserMemberships = (userId) => {
    return memberships.filter(m => m.user_id === userId)
  }

  // Remove user from a team
  const handleRemoveFromTeam = async (userId, teamId) => {
    setModalSaving(true)
    setModalError('')
    setModalMessage('')
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId)

      if (error) throw error

      setModalMessage('Removed from team successfully!')
      
      // Reload lists
      const { data: newMems } = await supabase.from('team_members').select('*')
      setMemberships(newMems || [])
    } catch (err) {
      console.error('Error removing from team:', err)
      setModalError(err.message || 'Failed to remove from team.')
    } finally {
      setModalSaving(false)
    }
  }

  // Add user to a team
  const handleAddToTeam = async (e) => {
    e.preventDefault()
    if (!selectedUser || !selectedTeamId) return

    setModalSaving(true)
    setModalError('')
    setModalMessage('')

    try {
      // 1. Enforce maximum 3 teams constraint (double-check query)
      const { data: currentMems, error: countError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', selectedUser.id)

      if (countError) throw countError

      if ((currentMems || []).length >= 2) {
        throw new Error('Limit exceeded: A user cannot belong to more than 2 teams.')
      }

      // 2. Insert membership record
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          user_id: selectedUser.id,
          team_id: selectedTeamId,
          team_role: selectedRole
        })

      if (insertError) throw insertError

      setModalMessage('Added to team successfully!')
      setSelectedTeamId('')
      setSelectedRole('member')

      // Reload lists
      const { data: newMems } = await supabase.from('team_members').select('*')
      setMemberships(newMems || [])
    } catch (err) {
      console.error('Error adding to team:', err)
      setModalError(err.message || 'Failed to add to team.')
    } finally {
      setModalSaving(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading Admin Settings...</div>

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: '#fff' }}>Admin Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Configure platform structure and manage user team memberships (Maximum of 2 teams per user).
        </p>
      </div>

      {/* Directory Search & Filter Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ flex: 1, padding: '10px 14px' }}
          />
        </div>
      </div>

      {/* Directory list of members */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Member Directory</h3>
        
        {filteredUsers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '12px' }}>Name & Email</th>
                  <th style={{ padding: '12px' }}>Platform Role</th>
                  <th style={{ padding: '12px' }}>Team Memberships (Max 2)</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const userMems = getUserMemberships(user.id)
                  
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{user.first_name} {user.last_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '14px 12px', textTransform: 'capitalize' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: '0.8rem',
                          color: '#fff'
                        }}>
                          {user.platform_role || 'User'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {userMems.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {userMems.map(m => {
                              const t = teams.find(team => team.id === m.team_id)
                              return (
                                <span key={m.id} style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: m.team_role === 'lead' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(74, 222, 128, 0.12)',
                                  border: m.team_role === 'lead' ? '1px solid rgba(96, 165, 250, 0.25)' : '1px solid rgba(74, 222, 128, 0.25)',
                                  fontSize: '0.75rem',
                                  color: m.team_role === 'lead' ? '#60a5fa' : '#4ade80',
                                  textTransform: 'capitalize',
                                  fontWeight: '500'
                                }}>
                                  {t?.name || 'Unknown'} ({m.team_role})
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            No Teams Assigned
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          ⚙️ Manage Teams
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No users found matching query.</p>
        )}
      </div>

      {/* MEMBERSHIP MANAGEMENT MODAL */}
      {selectedUser && (() => {
        const userMems = getUserMemberships(selectedUser.id)
        const isMaxedOut = userMems.length >= 2

        // Get list of teams user is NOT already in
        const userJoinedTeamIds = userMems.map(m => m.team_id)
        const availableTeams = teams.filter(t => !userJoinedTeamIds.includes(t.id))

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }} onClick={handleCloseModal}>
            <div style={{
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '550px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Close Button */}
              <button 
                onClick={handleCloseModal}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}
              >
                &times;
              </button>

              {/* Modal Header */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', textTransform: 'capitalize' }}>
                  Manage Teams: {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedUser.email}</span>
              </div>

              {/* Success / Error Messages inside modal */}
              {modalError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}
              {modalMessage && (
                <div style={{ padding: '10px 14px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80', color: '#4ade80', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {modalMessage}
                </div>
              )}

              {/* Section 1: Current Memberships */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Current Teams ({userMems.length} / 2)
                </h4>
                {userMems.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {userMems.map(m => {
                      const t = teams.find(team => team.id === m.team_id)
                      return (
                        <div key={m.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '8px'
                        }}>
                          <div>
                            <span style={{ fontWeight: '600', color: '#fff', marginRight: '8px', textTransform: 'capitalize' }}>
                              {t?.name || 'Unknown Team'}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: m.team_role === 'lead' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                              color: m.team_role === 'lead' ? '#60a5fa' : '#4ade80',
                              textTransform: 'capitalize',
                              fontWeight: 'bold'
                            }}>
                              {m.team_role}
                            </span>
                          </div>
                          <button
                            disabled={modalSaving}
                            onClick={() => handleRemoveFromTeam(selectedUser.id, m.team_id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              padding: '4px 8px'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>Not assigned to any team yet.</p>
                )}
              </div>

              {/* Section 2: Add to New Team */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Add to a Team
                </h4>
                
                {isMaxedOut ? (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                    color: '#fbbf24',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}>
                    ⚠️ Maximum limit reached (2 teams). You must remove this user from a team before adding them to a new one.
                  </div>
                ) : availableTeams.length > 0 ? (
                  <form onSubmit={handleAddToTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Select Team</label>
                        <select
                          value={selectedTeamId}
                          onChange={(e) => setSelectedTeamId(e.target.value)}
                          required
                          className="form-control"
                          style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}
                        >
                          <option value="" disabled>-- Select Team --</option>
                          {availableTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role</label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          required
                          className="form-control"
                          style={{ fontSize: '0.9rem' }}
                        >
                          <option value="member">Member</option>
                          <option value="lead">Team Lead</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={modalSaving || !selectedTeamId}
                      className="btn"
                      style={{ background: '#4ade80', color: '#0f172a', fontWeight: 'bold', width: '100%', marginTop: '4px' }}
                    >
                      {modalSaving ? 'Adding...' : '➕ Add User to Team'}
                    </button>
                  </form>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>User is already in all available teams.</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

```

---

### File: `src\pages\admin\AdminTeams.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminTeams.jsx`

```jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  normalizeMonth,
  filterRevenuesByPeriod,
  sumRevenues,
  getLastNMonths,
  formatRevenueMonth,
  toRevenueMonthString
} from '../../utils/revenueUtils'
import UserRevenue from '../user/UserRevenue'
import { ArrowLeft, Users, TrendingUp, Mail, Phone, Calendar, Shield, FileText } from 'lucide-react'

export default function AdminTeams() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  
  // Navigation & Detail States
  const [activeTeam, setActiveTeam] = useState(null) // selected team object for detail view
  const [viewingProfileUser, setViewingProfileUser] = useState(null) // selected user profile object for profile view

  // User Profile DIS history state
  const [disReports, setDisReports] = useState([])
  const [loadingDis, setLoadingDis] = useState(false)

  // Month picker for revenue column – default to current month
  const now = new Date()
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState(
    toRevenueMonthString(now.getFullYear(), now.getMonth())
  )

  useEffect(() => {
    async function loadData() {
      const [teamsRes, membershipsRes, profilesRes, revRes] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('team_members').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*')
      ])

      if (teamsRes.data) setTeams(teamsRes.data)
      if (membershipsRes.data) setMemberships(membershipsRes.data)
      if (profilesRes.data) setProfiles(profilesRes.data)
      if (revRes.data) setRevenues(revRes.data)
        
      setLoading(false)
    }
    loadData()
  }, [])

  // Load DIS Reports for user profile dynamically
  useEffect(() => {
    if (!viewingProfileUser) {
      setDisReports([])
      return
    }

    async function fetchUserDis() {
      setLoadingDis(true)
      try {
        const { data, error } = await supabase
          .from('dis_reports')
          .select('*')
          .eq('user_id', viewingProfileUser.id)
          .order('report_date', { ascending: false })
          .limit(6)
        if (data) setDisReports(data)
      } catch (err) {
        console.error("Error loading user DIS reports:", err)
      } finally {
        setLoadingDis(false)
      }
    }
    fetchUserDis()
  }, [viewingProfileUser])

  // Build list of months available for picker (last 24 months)
  const monthOptions = useMemo(() => getLastNMonths(24), [])

  // Find teams this viewing member belongs to
  const memberTeams = useMemo(() => {
    if (!viewingProfileUser) return []
    return memberships
      .filter(m => m.user_id === viewingProfileUser.id)
      .map(m => {
        const t = teams.find(team => team.id === m.team_id)
        return {
          name: t ? t.name : 'Unknown Team',
          role: m.team_role
        }
      })
  }, [viewingProfileUser, memberships, teams])

  // Current Month String
  const currentMonthStr = useMemo(() => {
    const d = new Date()
    return toRevenueMonthString(d.getFullYear(), d.getMonth())
  }, [])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading teams ledger...</div>

  // ==========================================
  // VIEW 1: MEMBER PROFILE VIEW (2-column layout)
  // ==========================================
  if (viewingProfileUser) {
    return (
      <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)', paddingBottom: '60px' }}>
        {/* Back navigation left top hero section */}
        <button
          onClick={() => setViewingProfileUser(null)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--apple-border)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '28px',
            transition: 'all 0.25s var(--apple-ease)'
          }}
          className="apple-btn-secondary"
        >
          <ArrowLeft size={16} /> Back to Members
        </button>

        {/* Full-width stacked rows: Profile → Latest DIS → Revenue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* ROW 1: My Profile Card */}
          <div className="apple-card" style={{ padding: '24px !important' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0071e3, #30d5c8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                {viewingProfileUser.first_name?.[0]?.toUpperCase() || 'M'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '700' }}>
                  {viewingProfileUser.first_name} {viewingProfileUser.last_name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                  {viewingProfileUser.platform_role || 'Member'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                  <Mail size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Email Address
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>{viewingProfileUser.email}</div>
              </div>

              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                  <Phone size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Phone Number
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>{viewingProfileUser.phone || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
                  Team Assignments
                </div>
                {memberTeams.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {memberTeams.map((t, idx) => (
                      <span
                        key={idx}
                        className={t.role === 'lead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-blue'}
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                      >
                        {t.name} ({t.role})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                    No teams assigned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ROW 2: Latest DIS Reports */}
          <div className="apple-card" style={{ padding: '24px !important' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={18} style={{ color: 'var(--apple-accent-orange)' }} />
              <h3 className="apple-title-small" style={{ margin: 0 }}>Latest Daily DIS</h3>
            </div>

            {loadingDis ? (
              <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem' }}>Loading DIS reports...</div>
            ) : disReports.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {disReports.map(rep => (
                  <div
                    key={rep.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--apple-border)',
                      borderRadius: '10px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '600' }}>
                      <span style={{ color: '#fff' }}>
                        {new Date(rep.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                      </span>
                      <span style={{ color: 'var(--apple-accent-green)' }}>
                        + {rep.positive_leads} Leads
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--apple-text-secondary)', fontSize: '0.78rem' }}>
                      <span>Exp Revenue:</span>
                      <span style={{ color: '#fff', fontWeight: '500' }}>${Number(rep.expected_revenue).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.85rem' }}>
                No DIS entries submitted yet.
              </p>
            )}
          </div>

          {/* ROW 3: Revenue (full width) */}
          <div>
            <UserRevenue user={viewingProfileUser} isAdminView={true} />
          </div>

        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: TEAM MEMBERS DETAILS VIEW
  // ==========================================
  if (activeTeam) {
    const teamMemberships = memberships.filter(m => m.team_id === activeTeam.id)
    const teamProfiles = teamMemberships
      .map(m => {
        const profile = profiles.find(p => p.id === m.user_id)
        return {
          profile,
          role: m.team_role,
          joinedAt: m.joined_at,
          membershipId: m.id
        }
      })
      .filter(m => m.profile && m.profile.platform_role !== 'admin')
      .sort((a, b) => (a.role === 'lead' ? -1 : 1))

    return (
      <div style={{ animation: 'fadeIn 0.25s var(--apple-ease)' }}>
        {/* Back navigation left top hero section */}
        <button
          onClick={() => setActiveTeam(null)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--apple-border)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '28px',
            transition: 'all 0.25s var(--apple-ease)'
          }}
          className="apple-btn-secondary"
        >
          <ArrowLeft size={16} /> Back to Teams
        </button>

        <div style={{ marginBottom: '32px' }}>
          <span className="apple-kicker">Team Roster</span>
          <h2 className="apple-title-medium" style={{ textTransform: 'capitalize' }}>
            {activeTeam.name} Members
          </h2>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>
            Review role hierarchy and revenue contributions for this team roster.
          </p>
        </div>

        {/* Month Filter */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Revenue Month
            </label>
            <select
              value={selectedRevenueMonth}
              onChange={e => setSelectedRevenueMonth(e.target.value)}
              className="apple-form-control"
              style={{ padding: '8px 16px !important', fontSize: '0.88rem !important', width: 'auto', borderRadius: '10px !important' }}
            >
              {monthOptions.map(m => (
                <option key={m} value={m}>{formatRevenueMonth(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Member list details */}
        <div className="apple-card" style={{ padding: '24px !important' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: '600' }}>
              Roster Members ({teamProfiles.length})
            </h4>
            <span style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)' }}>
              Audit month: <strong style={{ color: 'var(--apple-accent-green)' }}>{formatRevenueMonth(selectedRevenueMonth)}</strong>
            </span>
          </div>

          {teamProfiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Table Header Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(180px, 1.2fr) 110px 120px 100px',
                gap: '12px',
                padding: '0 0 12px 0',
                fontSize: '0.78rem',
                color: 'var(--apple-text-secondary)',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid var(--apple-border)'
              }}>
                <div>Member Details</div>
                <div style={{ textAlign: 'center' }}>Role</div>
                <div style={{ textAlign: 'right' }}>Revenue</div>
                <div style={{ textAlign: 'center' }}>Action</div>
              </div>

              {/* Rows */}
              {teamProfiles.map(item => {
                const { profile, role, membershipId } = item
                
                // Get member revenue for the selected team & selected month
                const monthRevenue = revenues
                  .filter(r => r.user_id === profile.id && r.team_id === activeTeam.id && normalizeMonth(r.revenue_month) === selectedRevenueMonth)
                  .reduce((sum, r) => sum + Number(r.amount || 0), 0)

                return (
                  <div
                    key={membershipId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 1.2fr) 110px 120px 100px',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      fontSize: '0.92rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#fff' }}>{profile.first_name} {profile.last_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>{profile.email}</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span className={role === 'lead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-blue'} style={{ padding: '2px 8px', fontSize: '0.68rem', textTransform: 'capitalize' }}>
                        {role}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', fontWeight: '700', color: monthRevenue > 0 ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)' }}>
                      ${monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => setViewingProfileUser(profile)}
                        className="apple-btn apple-btn-secondary"
                        style={{ padding: '6px 12px !important', fontSize: '0.78rem', borderRadius: '10px !important' }}
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                )
              })}

            </div>
          ) : (
            <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>
              No roster members in this team.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 3: TEAMS CARD SUMMARY VIEW (Default view)
  // ==========================================
  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Platform Organization</div>
        <h1 className="apple-title-large">Manage Teams</h1>
        <p className="apple-lead">
          View organizational team cards, analyze member sizes, and track current month contributions.
        </p>
      </div>

      {/* Grid of Team Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
        {teams.length > 0 ? (
          teams.map(team => {
            // Count total members (excluding platform admins)
            const teamMemberCount = memberships.filter(m => {
              if (m.team_id !== team.id) return false
              const profile = profiles.find(p => p.id === m.user_id)
              return profile && profile.platform_role !== 'admin'
            }).length

            // Sum this month's revenue
            const teamThisMonthRevenues = revenues.filter(
              r => r.team_id === team.id && normalizeMonth(r.revenue_month) === currentMonthStr
            )
            const teamThisMonthTotal = teamThisMonthRevenues.reduce((sum, r) => sum + Number(r.amount || 0), 0)

            return (
              <div
                key={team.id}
                onClick={() => setActiveTeam(team)}
                className="apple-card"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'var(--apple-card) !important',
                  padding: '24px !important',
                  position: 'relative'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: '700', textTransform: 'capitalize' }}>
                    {team.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                    <Users size={14} />
                    <span>{teamMemberCount} {teamMemberCount === 1 ? 'member' : 'members'}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--apple-border)', paddingTop: '14px', marginTop: 'auto' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                    <TrendingUp size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> This Month Revenue
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: teamThisMonthTotal > 0 ? 'var(--apple-accent-green)' : '#fff' }}>
                    ${teamThisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="apple-card" style={{ textAlign: 'center', padding: '40px !important', gridColumn: '1 / -1' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}>👥</span>
            <p style={{ color: 'var(--apple-text-secondary)', margin: 0 }}>No teams found in the database. Add teams in Settings.</p>
          </div>
        )}
      </div>
    </div>
  )
}

```

---

### File: `src\pages\admin\AdminUsers.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\admin\AdminUsers.jsx`

```jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Users, Search, Shield, Key, AlertTriangle, Activity, X, Plus, Trash2 } from 'lucide-react'

export default function AdminUsers() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Control Center Modal
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')

  // Team Assignment Form inside Modal
  const [newTeamId, setNewTeamId] = useState('')
  const [newTeamRole, setNewTeamRole] = useState('member')

  const loadData = async () => {
    setLoading(true)
    try {
      const [profilesRes, teamsRes, membershipsRes, revRes, disRes] = await Promise.all([
        supabase.from('profiles').select('*').order('first_name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('team_members').select('*'),
        supabase.from('monthly_revenues').select('*'),
        supabase.from('dis_reports').select('*')
      ])

      if (profilesRes.error) throw profilesRes.error
      if (teamsRes.error) throw teamsRes.error
      if (membershipsRes.error) throw membershipsRes.error

      setUsers(profilesRes.data || [])
      setTeams(teamsRes.data || [])
      setMemberships(membershipsRes.data || [])
      setRevenues(revRes.data || [])
      setDisReports(disRes.data || [])
    } catch (err) {
      console.error('Error loading admin users data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Exclude admin profiles from the entire directory
  const nonAdminUsers = useMemo(() => users.filter(u => u.platform_role !== 'admin'), [users])

  // Filtered users: Email, Team, and Name search
  const filteredUsers = useMemo(() => {
    return nonAdminUsers.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      const email = (user.email || '').toLowerCase()
      
      const userMems = memberships.filter(m => m.user_id === user.id)
      const userTeamNames = userMems.map(m => {
        const t = teams.find(team => team.id === m.team_id)
        return t ? t.name.toLowerCase() : ''
      })

      const query = searchQuery.toLowerCase()
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        userTeamNames.some(teamName => teamName.includes(query))
      )
    })
  }, [nonAdminUsers, teams, memberships, searchQuery])

  // Open Modal Handler
  const handleOpenModal = (user) => {
    setSelectedUser(user)
    setNewTeamId('')
    setNewTeamRole('member')
    setModalError('')
    setModalSuccess('')
  }

  // Close Modal Handler
  const handleCloseModal = () => {
    setSelectedUser(null)
  }

  // Update Platform Role
  const handleUpdatePlatformRole = async (userId, newRole) => {
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ platform_role: newRole })
        .eq('id', userId)

      if (error) throw error

      setModalSuccess(`Platform role updated to ${newRole}!`)
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, platform_role: newRole } : u))
      setSelectedUser(prev => prev ? { ...prev, platform_role: newRole } : null)
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to update platform role.')
    } finally {
      setModalSaving(false)
    }
  }

  // Toggle Account Activation/Deactivation
  const handleToggleDeactivation = async (userId, currentStatus) => {
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')
    const nextStatus = !currentStatus
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_deactivated: nextStatus })
        .eq('id', userId)

      if (error) throw error

      setModalSuccess(nextStatus ? 'Account successfully deactivated!' : 'Account successfully activated!')
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_deactivated: nextStatus } : u))
      setSelectedUser(prev => prev ? { ...prev, is_deactivated: nextStatus } : null)
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to update activation status.')
    } finally {
      setModalSaving(false)
    }
  }

  // Send Password Reset Email
  const handleSendResetEmail = async (email) => {
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error

      setModalSuccess('Password reset link sent to user email successfully!')
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to send password reset email.')
    } finally {
      setModalSaving(false)
    }
  }

  // Add User to a Team
  const handleAddToTeam = async (e) => {
    e.preventDefault()
    if (!selectedUser || !newTeamId) return

    setModalSaving(true)
    setModalError('')
    setModalSuccess('')

    try {
      // Limit check (max 2 teams per user)
      const userMems = memberships.filter(m => m.user_id === selectedUser.id)
      if (userMems.length >= 2) {
        throw new Error('Limit exceeded: A user cannot belong to more than 2 teams.')
      }

      const { error } = await supabase
        .from('team_members')
        .insert({
          user_id: selectedUser.id,
          team_id: newTeamId,
          team_role: newTeamRole
        })

      if (error) throw error

      setModalSuccess('Added to team successfully!')
      setNewTeamId('')
      
      // Reload memberships
      const { data: newMems } = await supabase.from('team_members').select('*')
      setMemberships(newMems || [])
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to add user to team.')
    } finally {
      setModalSaving(false)
    }
  }

  // Remove User from a Team
  const handleRemoveFromTeam = async (userId, teamId) => {
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId)

      if (error) throw error

      setModalSuccess('Removed from team successfully!')
      
      // Reload memberships
      const { data: newMems } = await supabase.from('team_members').select('*')
      setMemberships(newMems || [])
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to remove user from team.')
    } finally {
      setModalSaving(false)
    }
  }

  // Compile Dynamic Activity Logs
  const userActivities = useMemo(() => {
    if (!selectedUser) return []
    const activities = []

    // 1. Revenues Log
    const userRevs = revenues.filter(r => r.user_id === selectedUser.id)
    for (const r of userRevs) {
      const team = teams.find(t => t.id === r.team_id)
      activities.push({
        id: `rev-${r.id}`,
        type: 'revenue',
        date: new Date(r.created_at || r.revenue_month),
        description: `Logged revenue contribution of $${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} for team "${team ? team.name : 'Unknown'}"`,
        icon: '💰'
      })
    }

    // 2. DIS Reports Log
    const userDis = disReports.filter(d => d.user_id === selectedUser.id)
    for (const d of userDis) {
      activities.push({
        id: `dis-${d.id}`,
        type: 'dis',
        date: new Date(d.report_date),
        description: `Submitted Daily Information Sheet (DIS) with ${d.positive_leads} positive leads and $${Number(d.expected_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })} expected revenue`,
        icon: '📝'
      })
    }

    // 3. Team memberships Log
    const userMems = memberships.filter(m => m.user_id === selectedUser.id)
    for (const m of userMems) {
      const team = teams.find(t => t.id === m.team_id)
      activities.push({
        id: `team-${m.id}`,
        type: 'team',
        date: new Date(m.joined_at || selectedUser.created_at),
        description: `Assigned to team "${team ? team.name : 'Unknown'}" as "${m.team_role}"`,
        icon: '👥'
      })
    }

    // Sort by date descending
    return activities.sort((a, b) => b.date - a.date)
  }, [selectedUser, revenues, disReports, memberships, teams])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading registered users...</div>

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
          <Users size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">User Console</h1>
          <p className="admin-page-subtitle">
            View all registered platform members, manage role configurations, deactivate accounts, and monitor historical activities.
          </p>
        </div>
      </div>

      {/* Directory Search & Statistics */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by name, email, or team assignment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '42px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '500' }}>
              Total Users: {nonAdminUsers.length}
            </span>
            <span style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '500', color: '#ef4444' }}>
              Deactivated: {nonAdminUsers.filter(u => u.is_deactivated).length}
            </span>
          </div>
        </div>
      </div>

      {/* Users List Card */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#fff' }}>Registered Users Directory</h3>

        {filteredUsers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px' }}>Name & Email</th>
                  <th style={{ padding: '12px' }}>Platform Role</th>
                  <th style={{ padding: '12px' }}>Active Teams</th>
                  <th style={{ padding: '12px' }}>Account Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const userMems = memberships.filter(m => m.user_id === user.id)
                  const isDeactivated = !!user.is_deactivated

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', opacity: isDeactivated ? 0.6 : 1 }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>
                          {user.first_name} {user.last_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          background: user.platform_role === 'admin' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                          border: user.platform_role === 'admin' ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                          color: user.platform_role === 'admin' ? '#f87171' : '#818cf8'
                        }}>
                          {user.platform_role || 'user'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {userMems.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {userMems.map(m => {
                              const t = teams.find(team => team.id === m.team_id)
                              return (
                                <span key={m.id} style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  background: m.team_role === 'lead' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(74, 222, 128, 0.12)',
                                  border: m.team_role === 'lead' ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid rgba(74, 222, 128, 0.25)',
                                  color: m.team_role === 'lead' ? '#eab308' : '#4ade80',
                                  fontWeight: '500',
                                  textTransform: 'capitalize'
                                }}>
                                  {t?.name || 'Unknown'} ({m.team_role})
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No Assigned Teams</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: isDeactivated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                          border: isDeactivated ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                          color: isDeactivated ? '#ef4444' : '#4ade80'
                        }}>
                          {isDeactivated ? 'Deactivated' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          ⚙️ Control Panel
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No users found matching search query.</p>
        )}
      </div>

      {/* USER CONTROL PANEL MODAL */}
      {selectedUser && (() => {
        const userMems = memberships.filter(m => m.user_id === selectedUser.id)
        const isMaxedOut = userMems.length >= 2
        const isDeactivated = !!selectedUser.is_deactivated

        // Teams this user is not in
        const userJoinedTeamIds = userMems.map(m => m.team_id)
        const availableTeams = teams.filter(t => !userJoinedTeamIds.includes(t.id))

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }} onClick={handleCloseModal}>
            <div style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '30px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Close Button */}
              <button 
                onClick={handleCloseModal}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', textTransform: 'capitalize' }}>
                  🛠️ Control Panel: {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedUser.email}</span>
              </div>

              {/* Success / Error Messages inside modal */}
              {modalError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div style={{ padding: '10px 14px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80', color: '#4ade80', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {modalSuccess}
                </div>
              )}

              {/* Grid content */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }} className="apple-two-col-grid">
                
                {/* Left side: Account Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Platform Role management */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} style={{ color: '#818cf8' }} /> Platform Role
                    </h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleUpdatePlatformRole(selectedUser.id, 'user')}
                        className="btn"
                        disabled={modalSaving || selectedUser.platform_role === 'user'}
                        style={{
                          flex: 1,
                          fontSize: '0.8rem',
                          padding: '8px 12px',
                          background: selectedUser.platform_role === 'user' ? '#818cf8' : 'rgba(255,255,255,0.05)',
                          color: selectedUser.platform_role === 'user' ? '#0f172a' : '#94a3b8',
                          fontWeight: 'bold',
                          borderRadius: '8px'
                        }}
                      >
                        User Role
                      </button>
                      <button
                        onClick={() => handleUpdatePlatformRole(selectedUser.id, 'teamlead')}
                        className="btn"
                        disabled={modalSaving || selectedUser.platform_role === 'teamlead'}
                        style={{
                          flex: 1,
                          fontSize: '0.8rem',
                          padding: '8px 12px',
                          background: selectedUser.platform_role === 'teamlead' ? '#eab308' : 'rgba(255,255,255,0.05)',
                          color: selectedUser.platform_role === 'teamlead' ? '#0f172a' : '#94a3b8',
                          fontWeight: 'bold',
                          borderRadius: '8px'
                        }}
                      >
                        Team Lead
                      </button>
                    </div>
                  </div>

                  {/* Account Deactivation */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={14} style={{ color: '#fbbf24' }} /> Deactivate Account
                    </h4>
                    <button
                      onClick={() => handleToggleDeactivation(selectedUser.id, isDeactivated)}
                      disabled={modalSaving}
                      className="btn"
                      style={{
                        width: '100%',
                        fontSize: '0.85rem',
                        padding: '10px 14px',
                        background: isDeactivated ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: isDeactivated ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        color: isDeactivated ? '#4ade80' : '#f87171',
                        fontWeight: '600',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      {isDeactivated ? '🔓 Activate Account' : '🔒 Block Portal Access'}
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                      Deactivating will lock the user out from accessing any views inside this application.
                    </span>
                  </div>

                  {/* Password Reset */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} style={{ color: '#10b981' }} /> Password Recovery
                    </h4>
                    <button
                      onClick={() => handleSendResetEmail(selectedUser.email)}
                      disabled={modalSaving}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        fontSize: '0.85rem',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}
                    >
                      Send Reset Email
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                      Sends a secure recovery link to the user's registered email address.
                    </span>
                  </div>

                </div>

                {/* Right side: Team Assignments & Activity Monitor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Team Memberships */}
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Team Assignments ({userMems.length} / 2)
                    </h4>
                    {userMems.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {userMems.map(m => {
                          const t = teams.find(team => team.id === m.team_id)
                          return (
                            <div key={m.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              borderRadius: '8px'
                            }}>
                              <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>
                                {t?.name || 'Unknown Team'} ({m.team_role})
                              </span>
                              <button
                                disabled={modalSaving}
                                onClick={() => handleRemoveFromTeam(selectedUser.id, m.team_id)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '600'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0 0 14px 0', fontSize: '0.85rem' }}>No assigned teams.</p>
                    )}

                    {/* Add to Team mini-form */}
                    {!isMaxedOut ? (
                      availableTeams.length > 0 ? (
                        <form onSubmit={handleAddToTeam} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Team</label>
                              <select
                                value={newTeamId}
                                onChange={(e) => setNewTeamId(e.target.value)}
                                required
                                className="form-control"
                                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              >
                                <option value="" disabled>-- Select Team --</option>
                                {availableTeams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role</label>
                              <select
                                value={newTeamRole}
                                onChange={(e) => setNewTeamRole(e.target.value)}
                                required
                                className="form-control"
                                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              >
                                <option value="member">Member</option>
                                <option value="lead">Team Lead</option>
                              </select>
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={modalSaving || !newTeamId}
                            className="btn"
                            style={{ background: '#4ade80', color: '#0f172a', fontWeight: 'bold', fontSize: '0.8rem', width: '100%', padding: '6px 10px', borderRadius: '6px' }}
                          >
                            <Plus size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Assign to Team
                          </button>
                        </form>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.82rem' }}>User is already assigned to all active teams.</p>
                      )
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', padding: '6px 10px', borderRadius: '6px', display: 'block' }}>
                        ⚠️ Maximum limit of 2 team memberships reached.
                      </span>
                    )}
                  </div>

                  {/* Activity Log */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} style={{ color: '#38bdf8' }} /> Activity Timeline
                    </h4>
                    <div style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {userActivities.length > 0 ? (
                        userActivities.map(act => (
                          <div key={act.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{act.icon}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.78rem', color: '#e2e8f0', lineHeight: '1.4' }}>{act.description}</span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {act.date.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center', display: 'block', padding: '10px 0' }}>
                          No platform activity logged yet.
                        </span>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )
      })()}

    </div>
  )
}

```

---

### File: `src\pages\home.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\home.jsx`

```jsx
function Home() {
  return (
    <div>
      <h1>Supabase Connected Successfully</h1>
    </div>
  )
}

export default Home
```

---

### File: `src\pages\user\UserDis.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\user\UserDis.jsx`

```jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export default function UserDis() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userTeams, setUserTeams] = useState([])

  // Form states
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [positiveLeads, setPositiveLeads] = useState('')
  const [expectedRevenue, setExpectedRevenue] = useState('')
  const [mtdRevenue, setMtdRevenue] = useState(0)
  const [loadingMTD, setLoadingMTD] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // History tab states
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Navigation tab
  const [activeTab, setActiveTab] = useState('submit') // 'submit', 'history', 'team'

  // Team Lead states
  const ledTeams = useMemo(() => userTeams.filter(t => t.role === 'lead'), [userTeams])
  const isTeamLead = ledTeams.length > 0
  const [selectedLedTeamId, setSelectedLedTeamId] = useState('')
  const [teamFilterPeriod, setTeamFilterPeriod] = useState('date') // 'date', '1week', '2weeks', '1month'
  const [teamSelectedDate, setTeamSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [teamMembers, setTeamMembers] = useState([])
  const [teamSubmissions, setTeamSubmissions] = useState([])
  const [teamRevenues, setTeamRevenues] = useState([])
  const [missingTeamSubmissions, setMissingTeamSubmissions] = useState([])
  const [loadingTeamData, setLoadingTeamData] = useState(false)
  const [teamMetrics, setTeamMetrics] = useState({}) // { [teamId]: { total: X, submitted: Y } }

  // Edit report states for Team Lead
  const [editingReport, setEditingReport] = useState(null)
  const [editLeads, setEditLeads] = useState('')
  const [editExpected, setEditExpected] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Helper to parse 'YYYY-MM-01' from Date string
  const getMonthStrFromDate = (dateStr) => {
    if (!dateStr) return ''
    const [year, month] = dateStr.split('-')
    return `${year}-${month}-01`
  }

  // Helper: Month-to-date revenue calculator (total across all teams)
  const fetchMonthToDateRevenue = async (userId, monthStr) => {
    if (!userId || !monthStr) return 0
    
    const { data, error } = await supabase
      .from('monthly_revenues')
      .select('amount')
      .eq('user_id', userId)
      .eq('revenue_month', monthStr)
      
    if (error) {
      console.error("Error fetching MTD revenue:", error)
      throw error
    }
    if (!data) return 0
    return data.reduce((sum, item) => sum + Number(item.amount), 0)
  }

  // Load User & Profile
  useEffect(() => {
    async function getUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
          if (prof) setProfile(prof)
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      } finally {
        setLoading(false)
      }
    }
    getUserData()
  }, [])

  // Load User Teams
  useEffect(() => {
    if (!currentUser) return
    async function fetchTeams() {
      const { data } = await supabase
        .from('team_members')
        .select(`
          team_id,
          team_role,
          teams (
            id,
            name
          )
        `)
        .eq('user_id', currentUser.id)
      
      if (data) {
        const formatted = data.map(tm => ({
          id: tm.team_id,
          name: tm.teams?.name || 'Unnamed Team',
          role: tm.team_role
        }))
        setUserTeams(formatted)
      }
    }
    fetchTeams()
  }, [currentUser])

  // Pre-fill selected led team
  useEffect(() => {
    if (ledTeams.length > 0 && !selectedLedTeamId) {
      setSelectedLedTeamId(ledTeams[0].id)
    }
  }, [ledTeams, selectedLedTeamId])

  // Load existing report for form on date change
  useEffect(() => {
    if (!currentUser || !reportDate) return
    async function loadExistingReport() {
      const { data, error } = await supabase
        .from('dis_reports')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('report_date', reportDate)
        .maybeSingle()
      
      if (data) {
        setPositiveLeads(String(data.positive_leads))
        setExpectedRevenue(String(data.expected_revenue))
        setIsEditMode(true)
        setMessage({ type: '', text: '' })
      } else {
        setPositiveLeads('')
        setExpectedRevenue('')
        setIsEditMode(false)
        setMessage({ type: '', text: '' })
      }
    }
    loadExistingReport()
  }, [currentUser, reportDate])

  // Load MTD revenue on date change
  useEffect(() => {
    if (!currentUser || !reportDate) return
    async function loadMTD() {
      setLoadingMTD(true)
      try {
        const monthStr = getMonthStrFromDate(reportDate)
        const amt = await fetchMonthToDateRevenue(currentUser.id, monthStr)
        setMtdRevenue(amt)
      } catch (err) {
        console.error(err)
        setMessage({ type: 'error', text: `Failed to load Month-to-Date revenue: ${err.message}` })
      } finally {
        setLoadingMTD(false)
      }
    }
    loadMTD()
  }, [currentUser, reportDate])

  // Load submission metrics for all led teams
  useEffect(() => {
    if (!currentUser || ledTeams.length === 0) return
    async function fetchTeamMetrics() {
      const metrics = {}
      for (const team of ledTeams) {
        try {
          const { data: mems } = await supabase
            .from('team_members')
            .select(`
              user_id,
              profiles ( platform_role )
            `)
            .eq('team_id', team.id)

          const nonAdminMems = mems
            ? mems.filter(m => m.profiles && m.profiles.platform_role !== 'admin')
            : []
          const memberIds = nonAdminMems.map(m => m.user_id)

          let submittedCount = 0
          if (memberIds.length > 0) {
            const { count } = await supabase
              .from('dis_reports')
              .select('*', { count: 'exact', head: true })
              .in('user_id', memberIds)
              .eq('report_date', teamSelectedDate)
            submittedCount = count || 0
          }

          metrics[team.id] = {
            total: memberIds.length,
            submitted: submittedCount
          }
        } catch (err) {
          console.error("Error loading team metrics:", err)
        }
      }
      setTeamMetrics(metrics)
    }
    fetchTeamMetrics()
  }, [currentUser, ledTeams, teamSelectedDate])

  const handleOpenEdit = (report) => {
    setEditingReport(report)
    setEditLeads(String(report.positive_leads))
    setEditExpected(String(report.expected_revenue))
    setEditError('')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingReport) return
    setEditSaving(true)
    setEditError('')
    try {
      const { error } = await supabase
        .from('dis_reports')
        .update({
          positive_leads: parseInt(editLeads) || 0,
          expected_revenue: parseFloat(editExpected) || 0
        })
        .eq('id', editingReport.id)

      if (error) throw error

      await loadTeamData()
      setEditingReport(null)
    } catch (err) {
      console.error(err)
      setEditError(err.message || "Failed to update report.")
    } finally {
      setEditSaving(false)
    }
  }

  // Load History
  const fetchHistory = async () => {
    if (!currentUser) return
    setLoadingHistory(true)
    const { data } = await supabase
      .from('dis_reports')
      .select(`
        *,
        teams (
          name
        )
      `)
      .eq('user_id', currentUser.id)
      .order('report_date', { ascending: false })
      
    if (data) setHistory(data)
    setLoadingHistory(false)
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab])

  // Load Team Lead Data
  const loadTeamData = async () => {
    if (!currentUser || !selectedLedTeamId) return
    setLoadingTeamData(true)
    
    try {
      // 1. Fetch team members (excluding admins)
      const { data: mems } = await supabase
        .from('team_members')
        .select(`
          user_id,
          team_role,
          profiles (
            id,
            first_name,
            last_name,
            email,
            platform_role
          )
        `)
        .eq('team_id', selectedLedTeamId)
      
      const nonAdminMems = mems
        ? mems.filter(m => m.profiles && m.profiles.platform_role !== 'admin')
        : []

      const memberUserIds = nonAdminMems.map(m => m.user_id)

      // 2. Fetch reports based on filter
      let reps = []
      let submittedIds = new Set()

      if (memberUserIds.length > 0) {
        let query = supabase
          .from('dis_reports')
          .select(`
            *,
            profiles (
              first_name,
              last_name,
              email
            )
          `)
          .in('user_id', memberUserIds)
          
        if (teamFilterPeriod === 'date') {
          query = query.eq('report_date', teamSelectedDate)
        } else {
          let days = 7
          if (teamFilterPeriod === '2weeks') days = 14
          if (teamFilterPeriod === '1month') days = 30
          
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - days)
          const cutoffStr = cutoffDate.toISOString().split('T')[0]
          query = query.gte('report_date', cutoffStr).lte('report_date', new Date().toISOString().split('T')[0])
        }
        
        const { data: repsData } = await query.order('report_date', { ascending: false })
        reps = repsData || []

        // Calculate missing for the selected date
        const { data: todayReps } = await supabase
          .from('dis_reports')
          .select('user_id')
          .in('user_id', memberUserIds)
          .eq('report_date', teamSelectedDate)
          
        submittedIds = new Set(todayReps?.map(r => r.user_id) || [])
      }
      
      const missing = nonAdminMems.filter(m => !submittedIds.has(m.user_id))

      // 3. Fetch monthly revenues for this team to calculate team-specific stats
      let revs = []
      if (memberUserIds.length > 0) {
        const { data: revsData } = await supabase
          .from('monthly_revenues')
          .select('*')
          .eq('team_id', selectedLedTeamId)
        revs = revsData || []
      }
      
      setTeamMembers(nonAdminMems)
      setTeamSubmissions(reps)
      setTeamRevenues(revs)
      setMissingTeamSubmissions(missing)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTeamData(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'team' && selectedLedTeamId) {
      loadTeamData()
    }
  }, [activeTab, selectedLedTeamId, teamFilterPeriod, teamSelectedDate])

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser) return
    
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const monthStr = getMonthStrFromDate(reportDate)
      const latestMtd = await fetchMonthToDateRevenue(currentUser.id, monthStr)

      const reportDataObj = {
        user_id: currentUser.id,
        team_id: null,
        report_date: reportDate,
        positive_leads: parseInt(positiveLeads) || 0,
        revenue_generated: latestMtd, // Auto-filled from monthly_revenues
        expected_revenue: parseFloat(expectedRevenue) || 0
      }
      
      const { error } = await supabase
        .from('dis_reports')
        .upsert(reportDataObj, { onConflict: 'user_id,report_date' })
        
      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: isEditMode ? "DIS report updated successfully!" : "DIS report submitted successfully!" 
      })
      
      // Force trigger reload of existing report state
      setIsEditMode(true)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || "Failed to submit report." })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading DIS Module...</div>

  if (userTeams.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔒</div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto' }}>
          You must belong to at least one team to submit daily information sheets (DIS). Please contact your administrator.
        </p>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Operational Sales Sheets</div>
        <h1 className="apple-title-large">Daily Information Sheet (DIS)</h1>
        <p className="apple-lead">
          Submit and audit your daily sales metrics, positive leads, and revenue targets.
        </p>
      </div>

      {/* ===== NAVIGATION TABS (Apple Pill Selector) ===== */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
        <div className="apple-pill-tabs">
          <button
            onClick={() => setActiveTab('submit')}
            className={`apple-pill-tab ${activeTab === 'submit' ? 'active' : ''}`}
          >
            📝 Submit DIS
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`apple-pill-tab ${activeTab === 'history' ? 'active' : ''}`}
          >
            📂 My History
          </button>
          {isTeamLead && (
            <button
              onClick={() => setActiveTab('team')}
              className={`apple-pill-tab ${activeTab === 'team' ? 'active' : ''}`}
            >
              👥 Team Reports
            </button>
          )}
        </div>
      </div>

      {/* ===== TAB CONTENT: SUBMIT FORM ===== */}
      {activeTab === 'submit' && (
        <div className="apple-card" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '20px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
            {isEditMode ? '🔒 View DIS Report' : '📝 Log New DIS Report'}
          </h3>

          {isEditMode && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '24px',
              background: 'rgba(255, 69, 58, 0.08)',
              border: '1px solid rgba(255, 69, 58, 0.25)',
              color: 'var(--apple-accent-red)',
              fontSize: '0.85rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <div>
                <strong>DIS Report Locked:</strong> You have submitted a report for this date. Submissions cannot be edited once locked. Contact your team lead for changes.
              </div>
            </div>
          )}

          {message.text && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              background: message.type === 'success' ? 'rgba(48, 213, 200, 0.08)' : 'rgba(255, 69, 58, 0.08)',
              border: `1px solid ${message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)'}`,
              color: message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)',
              fontSize: '0.88rem',
              fontWeight: '500'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Auto-filled details */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              background: 'rgba(255,255,255,0.01)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: '1px solid var(--apple-border)' 
            }} className="apple-two-col-grid">
              <div>
                <label className="apple-form-label" style={{ marginBottom: '4px' }}>Reporter & Team</label>
                <span style={{ fontWeight: '600', color: '#ffffff', display: 'block', fontSize: '0.95rem' }}>
                  {profile ? `${profile.first_name} ${profile.last_name}` : '...'}
                </span>
                <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px', marginTop: '4px', textTransform: 'capitalize' }}>
                  {userTeams.map(t => t.name).join(', ') || 'No Assigned Team'}
                </span>
              </div>
              <div>
                <label className="apple-form-label" style={{ marginBottom: '4px' }}>MTD Revenue (All Teams)</label>
                <span style={{ fontWeight: '700', color: 'var(--apple-accent-green)', display: 'block', fontSize: '1.2rem' }}>
                  {loadingMTD ? 'Calculating...' : `$${mtdRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
                <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
                  Billing Month: {getMonthStrFromDate(reportDate) || 'None'}
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label className="apple-form-label">DIS Report Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="apple-form-control"
              />
            </div>

            {/* Metrics */}
            <div className="apple-two-col-grid">
              <div>
                <label className="apple-form-label">Positive Leads</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={positiveLeads}
                  onChange={(e) => setPositiveLeads(e.target.value)}
                  required
                  className="apple-form-control"
                  disabled={isEditMode}
                />
              </div>
              <div>
                <label className="apple-form-label">Expected Revenue ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={expectedRevenue}
                  onChange={(e) => setExpectedRevenue(e.target.value)}
                  required
                  className="apple-form-control"
                  disabled={isEditMode}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isEditMode}
              className="apple-btn apple-btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '12px' }}
            >
              {submitting ? 'Submitting...' : isEditMode ? '🔒 Locked (Submitted)' : '🚀 Log DIS Report'}
            </button>
          </form>
        </div>
      )}

      {/* ===== TAB CONTENT: HISTORY LIST ===== */}
      {activeTab === 'history' && (
        <div className="apple-card">
          <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>DIS Submission History</h3>
          {loadingHistory ? (
            <div style={{ color: 'var(--apple-text-secondary)' }}>Loading history...</div>
          ) : history.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="apple-desktop-table-container" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--apple-border)', borderRadius: '14px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--apple-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Positive Leads</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Revenue Generated (MTD)</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Expected Revenue</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--apple-border)', fontSize: '0.92rem' }}>
                        <td style={{ padding: '16px 20px', fontWeight: '600', color: '#ffffff' }}>
                          {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                        </td>
                        <td style={{ padding: '16px 20px', textTransform: 'capitalize', color: 'var(--apple-text-secondary)' }}>
                          {row.teams?.name || userTeams.map(t => t.name).join(', ') || 'None'}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: row.positive_leads > 0 ? 'var(--apple-accent-orange)' : 'var(--apple-text-secondary)' }}>
                          {row.positive_leads}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: row.revenue_generated > 0 ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)' }}>
                          ${Number(row.revenue_generated).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: row.expected_revenue > 0 ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)' }}>
                          ${Number(row.expected_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setReportDate(row.report_date)
                              setActiveTab('submit')
                            }}
                            className="apple-btn apple-btn-secondary"
                            style={{ padding: '6px 14px !important', fontSize: '0.8rem', borderRadius: '12px !important' }}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards List View */}
              <div className="apple-mobile-list-card">
                {history.map(row => (
                  <div key={row.id} className="apple-mobile-list-item" style={{ gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--apple-border)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
                        {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                      </span>
                      <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px', textTransform: 'capitalize' }}>
                        {row.teams?.name || userTeams.map(t => t.name).join(', ') || 'None'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--apple-text-secondary)' }}>Positive Leads:</span>
                        <span style={{ fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{row.positive_leads}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--apple-text-secondary)' }}>MTD Revenue:</span>
                        <span style={{ fontWeight: '700', color: 'var(--apple-accent-green)' }}>${Number(row.revenue_generated).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--apple-text-secondary)' }}>Expected Revenue:</span>
                        <span style={{ fontWeight: '700', color: 'var(--apple-accent-blue)' }}>${Number(row.expected_revenue).toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setReportDate(row.report_date)
                        setActiveTab('submit')
                      }}
                      className="apple-btn apple-btn-secondary"
                      style={{ 
                        width: '100%', 
                        padding: '10px !important', 
                        fontSize: '0.85rem', 
                        marginTop: '4px',
                        borderRadius: '10px !important'
                      }}
                    >
                      ✏️ Edit Report
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>No past reports submitted.</p>
          )}
        </div>
      )}

      {/* ===== TAB CONTENT: TEAM LEAD VIEW ===== */}
      {activeTab === 'team' && isTeamLead && (
        <div className="apple-pane-layout">
          
          {/* LEFT SIDEBAR: Teams List */}
          <div className="apple-left-pane">
            <div className="apple-kicker" style={{ paddingLeft: '4px', marginBottom: '12px' }}>
              My Teams Ledger
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ledTeams.map(team => {
                const isSelected = selectedLedTeamId === team.id
                const stats = teamMetrics[team.id] || { total: 0, submitted: 0 }
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedLedTeamId(team.id)}
                    className="apple-card"
                    style={{
                      padding: '16px 20px !important',
                      background: isSelected ? 'rgba(0, 113, 227, 0.08) !important' : 'var(--apple-card) !important',
                      borderColor: isSelected ? 'var(--apple-accent-blue) !important' : 'var(--apple-border) !important',
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontWeight: '700', fontSize: '1rem', textTransform: 'capitalize', color: '#ffffff' }}>{team.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
                      {stats.submitted} / {stats.total} submitted today
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR CONTENT: Selected Team Details */}
          <div className="apple-right-pane">
            {selectedLedTeamId ? (() => {
              const currentTeam = ledTeams.find(t => t.id === selectedLedTeamId)
              
              // Aggregates for the selected team
              const teamUserLatestRevenue = {}
              let totalLeads = 0
              let totalExpected = 0
              for (const r of teamSubmissions) {
                totalLeads += Number(r.positive_leads)
                totalExpected += Number(r.expected_revenue)
                if (teamUserLatestRevenue[r.user_id] === undefined) {
                  const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
                  const revRecord = teamRevenues.find(
                    rv => rv.user_id === r.user_id && 
                          rv.team_id === selectedLedTeamId && 
                          rv.revenue_month === monthStr
                  )
                  teamUserLatestRevenue[r.user_id] = revRecord ? Number(revRecord.amount) : 0
                }
              }
              const totalRevenue = Object.values(teamUserLatestRevenue).reduce((acc, val) => acc + val, 0)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Team Filter Control Panel */}
                  <div className="apple-card" style={{ padding: '20px !important' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h3 className="apple-title-small" style={{ margin: 0, textTransform: 'capitalize' }}>{currentTeam?.name} DIS Ledger</h3>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                          Manage performance reports and audit daily team entries.
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                        <div>
                          <label className="apple-form-label" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>Timeframe</label>
                          <div className="apple-pill-tabs" style={{ padding: '2px' }}>
                            {[
                              { value: 'date', label: 'Single Day' },
                              { value: '1week', label: '1 W' },
                              { value: '2weeks', label: '2 W' },
                              { value: '1month', label: '1 M' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setTeamFilterPeriod(opt.value)}
                                className={`apple-pill-tab ${teamFilterPeriod === opt.value ? 'active' : ''}`}
                                style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {teamFilterPeriod === 'date' && (
                          <div>
                            <label className="apple-form-label" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>Select Date</label>
                            <input
                              type="date"
                              value={teamSelectedDate}
                              onChange={(e) => setTeamSelectedDate(e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className="apple-form-control"
                              style={{ padding: '6px 12px !important', fontSize: '0.82rem !important', width: '135px', borderRadius: '10px !important' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Team summary header stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div className="apple-card" style={{ padding: '16px 20px !important', background: 'rgba(48, 213, 200, 0.03) !important', border: '1px solid rgba(48, 213, 200, 0.15) !important' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>This Month MTD</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="apple-card" style={{ padding: '16px 20px !important', background: 'rgba(0, 113, 227, 0.03) !important', border: '1px solid rgba(0, 113, 227, 0.15) !important' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Expected Revenue</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>${totalExpected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="apple-card" style={{ padding: '16px 20px !important', background: 'rgba(255, 159, 10, 0.03) !important', border: '1px solid rgba(255, 159, 10, 0.15) !important' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Positive Leads</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{totalLeads}</div>
                    </div>
                  </div>

                  {/* Missing reports block */}
                  {teamFilterPeriod === 'date' && (
                    <div className="apple-card" style={{ border: '1px solid rgba(255, 69, 58, 0.15) !important', background: 'rgba(255, 69, 58, 0.02) !important', padding: '20px !important' }}>
                      <h4 style={{ color: 'var(--apple-accent-red)', fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                        ⚠️ Missing DIS Submissions ({missingTeamSubmissions.length})
                      </h4>
                      {missingTeamSubmissions.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                          {missingTeamSubmissions.map(m => (
                            <div key={m.user_id} style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--apple-border)', borderRadius: '10px' }}>
                              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.85rem' }}>{m.profiles?.first_name} {m.profiles?.last_name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>{m.profiles?.email}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--apple-accent-green)', fontStyle: 'italic', margin: 0, fontSize: '0.88rem', fontWeight: '500' }}>🎉 Great! All active team members have logged their daily DIS report.</p>
                      )}
                    </div>
                  )}

                  {/* Submissions grid */}
                  <div>
                    <h4 className="apple-title-small" style={{ marginBottom: '16px' }}>Submitted Team Reports</h4>
                    {loadingTeamData ? (
                      <div style={{ color: 'var(--apple-text-secondary)' }}>Loading submissions...</div>
                    ) : teamSubmissions.length > 0 ? (
                      <div className="dis-grid">
                        {teamSubmissions.map(row => {
                          const monthStr = `${row.report_date.split('-')[0]}-${row.report_date.split('-')[1]}-01`
                          const revRecord = teamRevenues.find(
                            rv => rv.user_id === row.user_id && 
                                  rv.team_id === selectedLedTeamId && 
                                  rv.revenue_month === monthStr
                          )
                          const teamSpecificRevenue = revRecord ? Number(revRecord.amount) : 0

                          return (
                            <div 
                              key={row.id} 
                              className="apple-card" 
                              style={{ 
                                padding: '20px !important', 
                                background: 'rgba(255, 255, 255, 0.015) !important',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '12px' 
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '1rem' }}>{row.profiles?.first_name} {row.profiles?.last_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>{row.profiles?.email}</div>
                              </div>

                              {teamFilterPeriod !== 'date' && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', borderBottom: '1px solid var(--apple-border)', paddingBottom: '8px' }}>
                                  Date: {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                                </div>
                              )}

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--apple-text-secondary)' }}>Positive Leads:</span>
                                  <span style={{ fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{row.positive_leads}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--apple-text-secondary)' }}>MTD Revenue:</span>
                                  <span style={{ fontWeight: '700', color: 'var(--apple-accent-green)' }}>${teamSpecificRevenue.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--apple-text-secondary)' }}>Expected Revenue:</span>
                                  <span style={{ fontWeight: '700', color: 'var(--apple-accent-blue)' }}>${Number(row.expected_revenue).toFixed(2)}</span>
                                </div>
                              </div>

                              <div style={{ borderTop: '1px solid var(--apple-border)', marginTop: 'auto', paddingTop: '12px' }}>
                                <button
                                  onClick={() => handleOpenEdit(row)}
                                  className="apple-btn apple-btn-secondary"
                                  style={{ 
                                    padding: '6px 14px !important', 
                                    fontSize: '0.8rem', 
                                    width: '100%', 
                                    borderRadius: '10px !important' 
                                  }}
                                >
                                  ✏️ Edit Report
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>No reports submitted for the selected timeframe.</p>
                    )}
                  </div>
                </div>
              )
            })() : (
              <div className="apple-card" style={{ color: 'var(--apple-text-secondary)', textAlign: 'center', padding: '40px' }}>
                Select a team from the left to view reports.
              </div>
            )}
          </div>

        </div>
      )}

      {/* EDIT MODAL FOR TEAM LEAD (Apple Overlay Sheet) */}
      {editingReport && (
        <div className="apple-modal-overlay" onClick={() => setEditingReport(null)}>
          <div className="apple-modal-card" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setEditingReport(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              &times;
            </button>

            <h3 className="apple-title-small" style={{ marginBottom: '16px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
              ✏️ Override DIS Report
            </h3>

            {editError && (
              <div style={{ padding: '10px', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid var(--apple-accent-red)', color: 'var(--apple-accent-red)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <span className="apple-form-label" style={{ marginBottom: '2px' }}>Team Member</span>
              <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem' }}>
                {editingReport.profiles?.first_name} {editingReport.profiles?.last_name}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
                Report Day: {new Date(editingReport.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
              </span>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="apple-form-label">Positive Leads</label>
                <input
                  type="number"
                  min="0"
                  value={editLeads}
                  onChange={(e) => setEditLeads(e.target.value)}
                  required
                  className="apple-form-control"
                />
              </div>
              <div>
                <label className="apple-form-label">Expected Revenue ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editExpected}
                  onChange={(e) => setEditExpected(e.target.value)}
                  required
                  className="apple-form-control"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="apple-btn apple-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="apple-btn apple-btn-primary"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

```

---

### File: `src\pages\user\UserHome.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\user\UserHome.jsx`

```jsx
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import {
  sumRevenues,
  normalizeMonth,
  getLastNMonths,
  formatRevenueMonthShort,
  getEffectiveTargetAmount
} from '../../utils/revenueUtils'

export default function UserHome({ user, isAdminView }) {
  const [profile, setProfile] = useState(null)
  const [userTeams, setUserTeams] = useState([])
  const [userRevenues, setUserRevenues] = useState([])
  const [userTargets, setUserTargets] = useState([])
  const [latestReport, setLatestReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return

      try {
        const [profileRes, teamsRes, revRes, reportsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('team_members').select('team_role, teams(id, name)').eq('user_id', user.id),
          supabase.from('monthly_revenues').select('*').eq('user_id', user.id),
          supabase.from('dis_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false }).limit(1)
        ])
        
        if (profileRes.data) setProfile(profileRes.data)
        if (teamsRes.data) {
          const formatted = teamsRes.data.map(tm => ({
            id: tm.teams?.id,
            name: tm.teams?.name || 'Unnamed Team',
            role: tm.team_role
          }))
          setUserTeams(formatted)
        }
        if (revRes.data) setUserRevenues(revRes.data)
        if (reportsRes.data && reportsRes.data.length > 0) setLatestReport(reportsRes.data[0])

        // Keep page working even if monthly_targets table is not migrated yet.
        const { data: targetsData, error: targetsError } = await supabase
          .from('monthly_targets')
          .select('*')
          .eq('user_id', user.id)
        if (!targetsError && targetsData) setUserTargets(targetsData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  // Calculate current month's revenue sum across all user's teams
  const thisMonthRevenue = useMemo(() => {
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const currentRevs = userRevenues.filter(r => normalizeMonth(r.revenue_month) === monthStr)
    return sumRevenues(currentRevs)
  }, [userRevenues])

  // Calculate all-time revenue sum
  const allTimeRevenue = useMemo(() => {
    return sumRevenues(userRevenues)
  }, [userRevenues])

  const thisMonthTarget = useMemo(() => {
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    return userTeams.reduce((sum, team) => {
      return sum + getEffectiveTargetAmount(userTargets, user?.id, team.id, monthStr)
    }, 0)
  }, [userTargets, userTeams, user])

  const targetAchievement = useMemo(() => {
    if (thisMonthTarget <= 0) return 0
    return (thisMonthRevenue / thisMonthTarget) * 100
  }, [thisMonthRevenue, thisMonthTarget])

  const targetHistory = useMemo(() => {
    return getLastNMonths(6).map(month => {
      const expected = userTeams.reduce((sum, team) => {
        return sum + getEffectiveTargetAmount(userTargets, user?.id, team.id, month)
      }, 0)
      const reached = userRevenues
        .filter(r => normalizeMonth(r.revenue_month) === month)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      return { month, expected, reached }
    })
  }, [userTargets, userRevenues, userTeams, user])

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading your dashboard...</div>

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 48px)' }}>
        <div className="apple-kicker">Performance Center</div>
        <h1 className="apple-title-large">
          {isAdminView 
            ? `Dashboard: ${profile?.first_name || user?.user_metadata?.full_name || 'Member'}` 
            : `Welcome, ${profile?.first_name || user?.user_metadata?.full_name || 'Member'}!`}
        </h1>
        <p className="apple-lead">
          {isAdminView 
            ? `Detailed metrics, team assignments, and target achievements.` 
            : `Here is an elegant overview of your teams, active revenue metrics, and performance.`}
        </p>
      </div>

      {/* Main Grid Wrapper */}
      <div className="apple-responsive-grid">
        
        {/* LEFT COLUMN: Profile & Teams Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: My Profile & Teams */}
          <div className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>My Profile</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Email Address</div>
                <div style={{ fontSize: '1rem', fontWeight: '500', color: '#ffffff' }}>{profile?.email || user?.email}</div>
              </div>
              
              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Phone Number</div>
                <div style={{ fontSize: '1rem', fontWeight: '500', color: '#ffffff' }}>{profile?.phone || 'Not provided'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>My Active Teams</div>
                {userTeams.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {userTeams.map(t => (
                      <span 
                        key={t.id} 
                        className={t.role === 'lead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-green'}
                        style={{ textTransform: 'capitalize' }}
                      >
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: t.role === 'lead' ? 'var(--apple-accent-orange)' : 'var(--apple-accent-green)',
                          boxShadow: t.role === 'lead' ? '0 0 6px var(--apple-accent-orange)' : '0 0 6px var(--apple-accent-green)'
                        }}></span>
                        {t.name} ({t.role})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                    No Teams Assigned (Please contact Admin)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions */}
          {!isAdminView && (
            <div className="apple-card">
              <h3 className="apple-title-small" style={{ marginBottom: '16px' }}>Quick Actions</h3>
              <div className="apple-two-col-grid">
                <Link 
                  to="/dis" 
                  className="apple-btn apple-btn-secondary" 
                  style={{ 
                    textAlign: 'center', 
                    padding: '16px 8px !important', 
                    flexDirection: 'column', 
                    gap: '8px',
                    borderRadius: '16px !important'
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>📝</span>
                  <span style={{ fontSize: '0.85rem' }}>Submit Daily DIS</span>
                </Link>
                <Link 
                  to="/revenue" 
                  className="apple-btn apple-btn-secondary" 
                  style={{ 
                    textAlign: 'center', 
                    padding: '16px 8px !important', 
                    flexDirection: 'column', 
                    gap: '8px',
                    borderRadius: '16px !important'
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>💰</span>
                  <span style={{ fontSize: '0.85rem' }}>Submit Revenue</span>
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Statistics & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 3: Revenue Metrics */}
          <div className="apple-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 className="apple-title-small" style={{ margin: 0 }}>Revenue Summary</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--apple-border)', 
                borderRadius: '14px', 
                padding: '16px' 
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>This Month</div>
                <div className="apple-stat-hero" style={{ color: 'var(--apple-accent-green)' }}>
                  ${thisMonthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--apple-border)', 
                borderRadius: '14px', 
                padding: '16px' 
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>All Time Total</div>
                <div className="apple-stat-hero" style={{ color: '#ffffff' }}>
                  ${allTimeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(0, 113, 227, 0.04)', 
              border: '1px solid rgba(0, 113, 227, 0.2)', 
              borderRadius: '14px', 
              padding: '18px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Monthly Target</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
                    ${thisMonthTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Target Achievement</div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    color: targetAchievement >= 100 ? 'var(--apple-accent-green)' : 'var(--apple-accent-orange)' 
                  }}>
                    {thisMonthTarget > 0 ? `${targetAchievement.toFixed(1)}%` : 'No Active Target'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid var(--apple-border)', 
              borderRadius: '14px', 
              padding: '16px' 
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Target vs Reached (Last 6 Months)
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                gap: '8px' 
              }}>
                {targetHistory.map(row => (
                  <div 
                    key={row.month} 
                    style={{ 
                      padding: '8px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--apple-border)', 
                      background: 'rgba(255, 255, 255, 0.01)',
                      textAlign: 'center' 
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', fontWeight: '600', marginBottom: '4px' }}>
                      {formatRevenueMonthShort(row.month).split(" '")[0]}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--apple-accent-blue)', fontWeight: '500' }}>T: ${row.expected.toFixed(0)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--apple-accent-green)', fontWeight: '600' }}>R: ${row.reached.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Latest DIS Report */}
          <div className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Latest Daily DIS Report</h3>
            
            {latestReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderBottom: '1px solid var(--apple-border)', 
                  paddingBottom: '12px' 
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>Report Date</span>
                  <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>
                    {new Date(latestReport.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                  </span>
                </div>
                
                <div className="apple-two-col-grid">
                  <div style={{ 
                    textAlign: 'center', 
                    background: 'rgba(0, 113, 227, 0.03)', 
                    border: '1px solid rgba(0, 113, 227, 0.15)', 
                    borderRadius: '10px', 
                    padding: '12px' 
                  }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Expected Revenue</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
                      ${Number(latestReport.expected_revenue).toFixed(2)}
                    </div>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center', 
                    background: 'rgba(255, 159, 10, 0.03)', 
                    border: '1px solid rgba(255, 159, 10, 0.15)', 
                    borderRadius: '10px', 
                    padding: '12px' 
                  }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Positive Leads</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--apple-accent-orange)' }}>
                      {latestReport.positive_leads}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: '0 0 16px 0', fontSize: '0.9rem' }}>
                  {isAdminView ? "This user hasn't submitted any daily reports yet." : "You haven't submitted any daily reports yet."}
                </p>
                {!isAdminView && (
                  <Link to="/dis" className="apple-btn apple-btn-secondary" style={{ padding: '8px 20px !important', fontSize: '0.85rem' }}>
                    Create First Report
                  </Link>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}

```

---

### File: `src\pages\user\UserRevenue.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\user\UserRevenue.jsx`

```jsx
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  getLastNMonths,
  toRevenueMonthString,
  formatRevenueMonth,
  formatRevenueMonthShort,
  normalizeMonth,
  filterRevenuesByPeriod,
  sumRevenues,
  TIME_PERIOD_OPTIONS,
  getAvailableYears,
  MONTH_NAMES,
  isFutureMonth,
  calculateAverageRevenueData
} from '../../utils/revenueUtils'
import AverageRevenueChart from '../../components/charts/AverageRevenueChart'

export default function UserRevenue({ user, isAdminView }) {
  const [revenues, setRevenues] = useState([])
  const [teams, setTeams] = useState([]) // teams user belongs to
  const [loading, setLoading] = useState(true)

  // Form state
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-indexed
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editingRecord, setEditingRecord] = useState(null) // track if we're editing

  // Filter state
  const [periodFilter, setPeriodFilter] = useState(12) // default: last 12 months
  
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear())
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth()) // 0-indexed
  const [isAllTime, setIsAllTime] = useState(false)
  
  const [memberships, setMemberships] = useState([])
  const [allTeams, setAllTeams] = useState([])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    try {
      const [membershipsRes, allTeamsRes, revDataRes] = await Promise.all([
        supabase.from('team_members').select('team_id, team_role, teams(id, name)').eq('user_id', user.id),
        supabase.from('teams').select('*'),
        supabase.from('monthly_revenues').select('*, teams(name)').eq('user_id', user.id).order('revenue_month', { ascending: false })
      ])

      const memData = membershipsRes.data || []
      setMemberships(memData)
      setAllTeams(allTeamsRes.data || [])

      const userTeams = memData
        .filter(m => m.teams?.id)
        .map(m => ({
          id: m.teams.id,
          name: m.teams?.name || 'Unnamed Team'
        }))
      setTeams(userTeams)
      if (userTeams.length > 0 && !selectedTeam) {
        setSelectedTeam(userTeams[0].id)
      }

      setRevenues(revDataRes.data || [])
    } catch (err) {
      console.error('Error loading revenue data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Computed values
  const filteredRevenues = useMemo(
    () => filterRevenuesByPeriod(revenues, periodFilter),
    [revenues, periodFilter]
  )
  const filteredTotal = useMemo(() => sumRevenues(filteredRevenues), [filteredRevenues])
  const allTimeTotal = useMemo(() => sumRevenues(revenues), [revenues])
  const last12Total = useMemo(() => sumRevenues(filterRevenuesByPeriod(revenues, 12)), [revenues])

  // Build a lookup: 'YYYY-MM-01__teamId' → revenue record (for quick edit detection)
  const revenueMap = useMemo(() => {
    const map = {}
    for (const r of revenues) {
      const key = `${normalizeMonth(r.revenue_month)}__${r.team_id}`
      map[key] = r
    }
    return map
  }, [revenues])

  const uniqueTeamIds = useMemo(() => {
    const activeTeamIds = memberships.map(m => m.team_id)
    const revTeamIds = revenues.map(r => r.team_id)
    return [...new Set([...activeTeamIds, ...revTeamIds])]
  }, [memberships, revenues])

  // Generate the last 12 months for the breakdown grid
  const last12Months = useMemo(() => getLastNMonths(12), [])

  const selectedHistoryMonth = useMemo(() => toRevenueMonthString(historyYear, historyMonth), [historyYear, historyMonth])

  const selectedMonthRevenues = useMemo(() => {
    if (isAllTime) return revenues
    if (!selectedHistoryMonth) return []
    return revenues.filter(r => normalizeMonth(r.revenue_month) === selectedHistoryMonth)
  }, [revenues, selectedHistoryMonth, isAllTime])

  const selectedMonthTotal = useMemo(() => {
    return sumRevenues(selectedMonthRevenues)
  }, [selectedMonthRevenues])

  // Helper: find existing record for current form selection
  function getExistingRecord() {
    if (!selectedTeam) return null
    const key = `${toRevenueMonthString(selectedYear, selectedMonth)}__${selectedTeam}`
    return revenueMap[key] || null
  }

  // =====================
  // FORM HANDLERS
  // =====================
  // mode: 'add' = add amount to existing, 'replace' = overwrite with new amount
  async function handleSubmit(e, mode = 'replace') {
    if (e) e.preventDefault()
    setMessage({ type: '', text: '' })

    // Validation
    if (!selectedTeam) {
      setMessage({ type: 'error', text: 'Please select a team.' })
      return
    }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount greater than 0.' })
      return
    }
    if (isFutureMonth(selectedYear, selectedMonth)) {
      setMessage({ type: 'error', text: 'Cannot add revenue for a future month.' })
      return
    }

    setSaving(true)
    const revenueMonth = toRevenueMonthString(selectedYear, selectedMonth)
    const existing = getExistingRecord()

    // Calculate final amount
    const finalAmount = (mode === 'add' && existing)
      ? Number(existing.amount) + numAmount
      : numAmount

    try {
      const { error } = await supabase
        .from('monthly_revenues')
        .upsert(
          {
            user_id: user.id,
            team_id: selectedTeam,
            revenue_month: revenueMonth,
            amount: finalAmount,
            entered_by: user.id
          },
          { onConflict: 'user_id,team_id,revenue_month' }
        )

      if (error) throw error

      const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
      let successText
      if (editingRecord) {
        successText = `Revenue updated to $${finalAmount.toFixed(2)} for ${monthLabel}!`
      } else if (mode === 'add' && existing) {
        successText = `Added $${numAmount.toFixed(2)} to ${monthLabel}. New total: $${finalAmount.toFixed(2)}`
      } else {
        successText = `Revenue of $${finalAmount.toFixed(2)} saved for ${monthLabel}!`
      }

      setMessage({ type: 'success', text: successText })
      setAmount('')
      setEditingRecord(null)
      await loadData() // refresh
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(record) {
    const d = new Date(record.revenue_month)
    setSelectedYear(d.getFullYear())
    setSelectedMonth(d.getMonth())
    setSelectedTeam(record.team_id)
    setAmount(String(Number(record.amount)))
    setEditingRecord(record)
    setMessage({ type: '', text: '' })
    // Scroll to form
    document.getElementById('revenue-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingRecord(null)
    setAmount('')
    setMessage({ type: '', text: '' })
  }

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading revenue data...</div>

  const averageData = calculateAverageRevenueData(revenues)

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Revenue Tracking</div>
        <h1 className="apple-title-large">
          {isAdminView ? 'Revenue Details' : 'My Revenue'}
        </h1>
        {!isAdminView && (
          <p className="apple-lead">
            Manage, log, and audit your monthly revenue contributions across active teams.
          </p>
        )}
      </div>

      {/* ===== ADD / EDIT REVENUE FORM ===== */}
      {!isAdminView && (
        <div id="revenue-form" className="apple-card" style={{
          marginBottom: '32px',
          background: editingRecord ? 'rgba(0, 113, 227, 0.04) !important' : 'var(--apple-card) !important',
          borderColor: editingRecord ? 'rgba(0, 113, 227, 0.3) !important' : 'var(--apple-border) !important',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="apple-title-small" style={{ margin: 0, color: editingRecord ? 'var(--apple-accent)' : '#fff' }}>
              {editingRecord ? '✏️ Edit Revenue Contribution' : '➕ Log New Revenue'}
            </h3>
            {editingRecord && (
              <button
                onClick={handleCancelEdit}
                className="apple-btn apple-btn-secondary"
                style={{ padding: '6px 14px !important', fontSize: '0.8rem', borderRadius: '14px !important' }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          {teams.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
              <p>You are not assigned to any active teams yet. Contact an administrator to add revenue contributions.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>

                {/* Team Picker */}
                <div>
                  <label className="apple-form-label">Team</label>
                  <select
                    value={selectedTeam}
                    onChange={e => setSelectedTeam(e.target.value)}
                    className="apple-form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Year Picker */}
                <div>
                  <label className="apple-form-label">Year</label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="apple-form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    {getAvailableYears().map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Month Picker */}
                <div>
                  <label className="apple-form-label">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="apple-form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx} disabled={isFutureMonth(selectedYear, idx)}>
                        {name}{isFutureMonth(selectedYear, idx) ? ' (future)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="apple-form-label">Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="apple-form-control"
                  />
                </div>
              </div>

              {/* Message Banner */}
              {message.text && (
                <div style={{
                  padding: '12px 16px', 
                  marginBottom: '20px', 
                  borderRadius: '10px',
                  background: message.type === 'error' ? 'rgba(255, 69, 58, 0.1)' : 'rgba(48, 213, 200, 0.1)',
                  border: `1px solid ${message.type === 'error' ? 'var(--apple-accent-red)' : 'rgba(48, 213, 200, 0.3)'}`,
                  color: message.type === 'error' ? 'var(--apple-accent-red)' : 'var(--apple-accent-green)',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  {message.text}
                </div>
              )}

              {/* Smart submit picker */}
              {(() => {
                const existing = getExistingRecord()
                const numAmount = parseFloat(amount)
                const hasValidAmount = !isNaN(numAmount) && numAmount > 0

                // EDIT MODE
                if (editingRecord) {
                  return (
                    <button type="submit" className="apple-btn apple-btn-primary" disabled={saving} style={{ width: '100%' }}>
                      {saving ? 'Saving...' : 'Update Contribution'}
                    </button>
                  )
                }

                // EXISTING RECORD CONFLICT
                if (existing && hasValidAmount) {
                  const existingAmt = Number(existing.amount)
                  const newTotal = existingAmt + numAmount
                  return (
                    <div>
                      <div style={{
                        padding: '12px 16px', 
                        marginBottom: '16px', 
                        borderRadius: '10px',
                        background: 'rgba(0, 113, 227, 0.08)', 
                        border: '1px solid rgba(0, 113, 227, 0.25)',
                        color: '#93c5fd', 
                        fontSize: '0.85rem'
                      }}>
                        📋 <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> already has a recorded contribution of <strong>${existingAmt.toFixed(2)}</strong>.
                      </div>
                      <div className="apple-two-col-grid">
                        <button
                          type="button"
                          className="apple-btn"
                          disabled={saving}
                          onClick={() => handleSubmit(null, 'add')}
                          style={{
                            background: 'linear-gradient(135deg, #28cd41, #30d5c8)',
                            color: '#ffffff'
                          }}
                        >
                          {saving ? 'Saving...' : `Add to Month → $${newTotal.toFixed(2)}`}
                        </button>
                        <button
                          type="button"
                          className="apple-btn"
                          disabled={saving}
                          onClick={() => handleSubmit(null, 'replace')}
                          style={{
                            background: 'linear-gradient(135deg, #ff9f0a, #ff453a)',
                            color: '#ffffff'
                          }}
                        >
                          {saving ? 'Saving...' : `Overwrite Total → $${numAmount.toFixed(2)}`}
                        </button>
                      </div>
                    </div>
                  )
                }

                // RECORD EXISTS but empty amount
                if (existing && !hasValidAmount) {
                  return (
                    <div>
                      <div style={{
                        padding: '12px 16px', 
                        marginBottom: '16px', 
                        borderRadius: '10px',
                        background: 'rgba(0, 113, 227, 0.08)', 
                        border: '1px solid rgba(0, 113, 227, 0.25)',
                        color: '#93c5fd', 
                        fontSize: '0.85rem'
                      }}>
                        📋 <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> has an existing contribution of <strong>${Number(existing.amount).toFixed(2)}</strong>. Enter an amount above to modify.
                      </div>
                      <button type="submit" className="apple-btn apple-btn-primary" disabled style={{ width: '100%', opacity: 0.4 }}>
                        Enter numeric amount
                      </button>
                    </div>
                  )
                }

                // NORMAL LOGGING
                return (
                  <button type="submit" className="apple-btn apple-btn-primary" disabled={saving} style={{ width: '100%' }}>
                    {saving ? 'Saving...' : 'Log Contribution'}
                  </button>
                )
              })()}
            </form>
          )}
        </div>
      )}

      {/* ===== SUMMARY CARDS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>

        {/* All-Time Total */}
        <div className="apple-card" style={{
          background: 'linear-gradient(135deg, rgba(48, 213, 200, 0.08), rgba(0, 113, 227, 0.08)) !important',
          border: '1px solid rgba(48, 213, 200, 0.2) !important',
          textAlign: 'center',
          padding: '24px !important'
        }}>
          <h3 style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>All-Time Revenue</h3>
          <div style={{ fontSize: '2.4rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
            ${allTimeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Last 12 Months */}
        <div className="apple-card" style={{
          textAlign: 'center',
          padding: '24px !important'
        }}>
          <h3 style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Last 12 Months</h3>
          <div style={{ fontSize: '2.4rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
            ${last12Total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <AverageRevenueChart data={averageData} title={isAdminView ? "Average Performance Trend" : "My Average Performance Trend"} />
      </div>

      {/* ===== MY TEAMS BREAKDOWN ===== */}
      <div className="apple-card" style={{ marginBottom: '32px' }}>
        <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>My Teams Breakdown</h3>
        
        {uniqueTeamIds.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Combined Section (Multi-team users) */}
            {uniqueTeamIds.length > 1 && (() => {
              const combinedAllTime = sumRevenues(revenues)
              const combinedMonthMap = {}
              for (const r of revenues) {
                const mStr = normalizeMonth(r.revenue_month)
                combinedMonthMap[mStr] = (combinedMonthMap[mStr] || 0) + Number(r.amount)
              }

              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.06), rgba(48, 213, 200, 0.06))',
                  border: '1px solid rgba(0, 113, 227, 0.2)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 4px 20px rgba(0, 113, 227, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem' }}>Combined Performance</span>
                      <span className="apple-badge apple-badge-blue" style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '0.65rem' }}>
                        All Active Teams
                      </span>
                    </div>
                    <span style={{ fontWeight: '800', color: 'var(--apple-accent-blue)', fontSize: '1.15rem' }}>
                      ${combinedAllTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Monthly Breakdown (Combined)
                  </div>
                  
                  {/* Swipeable responsive month strip */}
                  <div style={{ overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
                    <div style={{ display: 'flex', gap: '8px', minWidth: '450px' }}>
                      {last12Months.slice(0, 6).map(monthStr => {
                        const amt = combinedMonthMap[monthStr] || 0
                        return (
                          <div key={monthStr} style={{
                            flex: 1,
                            background: amt > 0 ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255,255,255,0.015)',
                            border: `1px solid ${amt > 0 ? 'rgba(0, 113, 227, 0.2)' : 'var(--apple-border)'}`,
                            borderRadius: '8px',
                            padding: '8px 4px',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>
                              {formatRevenueMonthShort(monthStr).split(" '")[0]}
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '0.8rem', color: amt > 0 ? '#ffffff' : 'rgba(255,255,255,0.1)' }}>
                              ${amt > 0 ? amt.toFixed(0) : 0}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Individual Teams Section */}
            {uniqueTeamIds.map(teamId => {
              const teamObj = allTeams.find(t => t.id === teamId)
              if (!teamObj) return null

              const memObj = memberships.find(m => m.team_id === teamId)
              const teamRole = memObj ? memObj.team_role : 'former member'

              const teamRevs = revenues.filter(r => r.team_id === teamId)
              const teamAllTime = sumRevenues(teamRevs)

              const teamMonthMap = {}
              for (const r of teamRevs) {
                teamMonthMap[normalizeMonth(r.revenue_month)] = Number(r.amount)
              }

              return (
                <div key={teamId} style={{
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid var(--apple-border)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                        {uniqueTeamIds.length > 1 ? `${teamObj.name} Performance` : teamObj.name}
                      </span>
                      <span 
                        className={
                          teamRole === 'lead' 
                            ? 'apple-badge apple-badge-orange' 
                            : teamRole === 'former member' 
                              ? 'apple-badge apple-badge-red' 
                              : 'apple-badge apple-badge-green'
                        } 
                        style={{ marginLeft: '8px', padding: '1px 6px', fontSize: '0.65rem', textTransform: 'capitalize' }}
                      >
                        {teamRole}
                      </span>
                    </div>
                    <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem' }}>
                      ${teamAllTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Swipeable responsive month strip */}
                  <div style={{ overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
                    <div style={{ display: 'flex', gap: '6px', minWidth: '450px' }}>
                      {last12Months.slice(0, 6).map(monthStr => {
                        const amt = teamMonthMap[monthStr] || 0
                        return (
                          <div key={monthStr} style={{
                            flex: 1,
                            background: amt > 0 ? 'rgba(48, 213, 200, 0.06)' : 'rgba(255,255,255,0.015)',
                            border: `1px solid ${amt > 0 ? 'rgba(48, 213, 200, 0.15)' : 'var(--apple-border)'}`,
                            borderRadius: '6px',
                            padding: '6px 2px',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '0.58rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>
                              {formatRevenueMonthShort(monthStr).split(" '")[0]}
                            </div>
                            <div style={{ fontWeight: '600', fontSize: '0.75rem', color: amt > 0 ? 'var(--apple-accent-green)' : 'rgba(255,255,255,0.1)' }}>
                              ${amt > 0 ? amt.toFixed(0) : 0}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>
            No assigned team records found.
          </p>
        )}
      </div>

      {/* ===== REVENUE HISTORY ===== */}
      <div className="apple-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 className="apple-title-small" style={{ margin: 0 }}>Revenue Contributions Audit</h3>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
              Select a month and year to view team performance breakdowns.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: '#ffffff', 
              fontSize: '0.88rem', 
              cursor: 'pointer', 
              background: 'rgba(255,255,255,0.04)', 
              padding: '8px 14px', 
              borderRadius: '12px', 
              border: '1px solid var(--apple-border)',
              fontWeight: '500'
            }}>
              <input
                type="checkbox"
                checked={isAllTime}
                onChange={e => setIsAllTime(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--apple-accent)' }}
              />
              All Time
            </label>
            <select
              value={historyMonth}
              onChange={e => setHistoryMonth(Number(e.target.value))}
              disabled={isAllTime}
              className="apple-form-control"
              style={{
                width: 'auto',
                padding: '8px 14px !important',
                fontSize: '0.88rem !important',
                fontWeight: '600',
                opacity: isAllTime ? 0.4 : 1,
                cursor: isAllTime ? 'not-allowed' : 'pointer',
                borderRadius: '12px !important'
              }}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={historyYear}
              onChange={e => setHistoryYear(Number(e.target.value))}
              disabled={isAllTime}
              className="apple-form-control"
              style={{
                width: 'auto',
                padding: '8px 14px !important',
                fontSize: '0.88rem !important',
                fontWeight: '600',
                opacity: isAllTime ? 0.4 : 1,
                cursor: isAllTime ? 'not-allowed' : 'pointer',
                borderRadius: '12px !important'
              }}
            >
              {getAvailableYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Month Summary banner */}
        <div style={{
          padding: '16px 20px',
          marginBottom: '20px',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--apple-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ color: 'var(--apple-text-secondary)', fontWeight: '500', fontSize: '0.9rem' }}>
            Combined Total for {isAllTime ? 'All Time' : (selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : '')}
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
            ${selectedMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {selectedMonthRevenues.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="apple-desktop-table-container" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--apple-border)', borderRadius: '14px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--apple-border)' }}>
                    {isAllTime && <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Month</th>}
                    <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</th>
                    <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Amount</th>
                    {!isAdminView && <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '100px' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedMonthRevenues.map((record) => (
                    <tr key={record.id} style={{
                      borderBottom: '1px solid var(--apple-border)',
                      background: editingRecord?.id === record.id ? 'rgba(0,113,227,0.06)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}>
                      {isAllTime && (
                        <td style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                          {formatRevenueMonth(normalizeMonth(record.revenue_month))}
                        </td>
                      )}
                      <td style={{ padding: '16px 24px', fontWeight: '600', color: '#ffffff' }}>
                        {record.teams?.name || 'Unknown Team'}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
                        ${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {!isAdminView && (
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEdit(record)}
                            className="apple-btn apple-btn-secondary"
                            style={{ padding: '6px 14px !important', fontSize: '0.8rem', borderRadius: '12px !important' }}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="apple-mobile-list-card">
              {selectedMonthRevenues.map((record) => (
                <div key={record.id} className="apple-mobile-list-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      {isAllTime && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>
                          {formatRevenueMonth(normalizeMonth(record.revenue_month))}
                        </div>
                      )}
                      <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem', textTransform: 'capitalize' }}>
                        {record.teams?.name || 'Unknown Team'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: '700', color: 'var(--apple-accent-green)', fontSize: '1.1rem' }}>
                      ${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {!isAdminView && (
                    <button
                      onClick={() => handleEdit(record)}
                      className="apple-btn apple-btn-secondary"
                      style={{ 
                        width: '100%', 
                        padding: '10px !important', 
                        fontSize: '0.85rem', 
                        marginTop: '6px',
                        borderRadius: '10px !important'
                      }}
                    >
                      ✏️ Edit Revenue
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            padding: '40px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed var(--apple-border)',
            borderRadius: '14px',
            textAlign: 'center',
            color: 'var(--apple-text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.9rem' }}>No logged contributions recorded for {isAllTime ? 'all time' : (selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : 'this month')}.</span>
            {teams.length > 0 && !isAllTime && !isAdminView && (
              <button
                type="button"
                className="apple-btn apple-btn-secondary"
                onClick={() => {
                  if (selectedHistoryMonth) {
                    const [y, m] = selectedHistoryMonth.split('-')
                    setSelectedYear(Number(y))
                    setSelectedMonth(Number(m) - 1)
                    setAmount('')
                    document.getElementById('revenue-form')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                style={{
                  padding: '8px 18px !important',
                  fontSize: '0.85rem',
                  borderRadius: '12px !important'
                }}
              >
                Log Revenue for {selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

```

---

### File: `src\pages\user\UserTeam.jsx`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\pages\user\UserTeam.jsx`

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function UserTeam({ user }) {
  const [teamsData, setTeamsData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTeamData() {
      if (!user) return

      try {
        // 1. Find which teams this user belongs to
        const { data: myMemberships } = await supabase
          .from('team_members')
          .select('team_id, teams(name)')
          .eq('user_id', user.id)

        if (!myMemberships || myMemberships.length === 0) {
          setTeamsData([])
          setLoading(false)
          return
        }

        const teamIds = myMemberships.map(m => m.team_id)

        // 2. Fetch ALL members for those teams
        const { data: allMembers } = await supabase
          .from('team_members')
          .select('team_id, team_role, user_id, profiles(first_name, last_name, email)')
          .in('team_id', teamIds)

        // 3. Fetch ALL revenue for those teams
        const { data: allRevenues } = await supabase
          .from('monthly_revenues')
          .select('team_id, user_id, amount')
          .in('team_id', teamIds)

        // 4. Organize data by team
        const organizedTeams = myMemberships.map(membership => {
          const tId = membership.team_id
          const teamName = membership.teams.name
          
          const members = (allMembers || []).filter(m => m.team_id === tId).map(member => {
            // Sum up revenue for this specific member in this specific team
            const memberRevenues = (allRevenues || []).filter(r => r.team_id === tId && r.user_id === member.user_id)
            const totalRev = memberRevenues.reduce((sum, r) => sum + Number(r.amount), 0)
            
            return {
              ...member,
              total_revenue: totalRev
            }
          })

          // Sort members by revenue (highest first)
          members.sort((a, b) => b.total_revenue - a.total_revenue)

          const teamTotalRevenue = (allRevenues || [])
            .filter(r => r.team_id === tId)
            .reduce((sum, r) => sum + Number(r.amount), 0)

          return {
            id: tId,
            name: teamName,
            total_revenue: teamTotalRevenue,
            members: members
          }
        })

        setTeamsData(organizedTeams)
      } catch (error) {
        console.error("Error fetching team data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [user])

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading team data...</div>

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Collaboration Network</div>
        <h1 className="apple-title-large">My Teams</h1>
        <p className="apple-lead">
          View your teammates, their roles, and their direct revenue contributions.
        </p>
      </div>

      {teamsData.length === 0 ? (
        <div className="apple-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>👥</div>
          <h3 className="apple-title-medium">You are not assigned to any teams</h3>
          <p className="apple-lead" style={{ marginTop: '8px' }}>Please contact an administrator to be added to an active team.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {teamsData.map(team => (
            <div key={team.id} className="apple-card" style={{ padding: '0 !important', overflow: 'hidden' }}>
              
              {/* Team Header */}
              <div style={{ 
                padding: '24px clamp(16px, 4vw, 32px)', 
                background: 'rgba(255,255,255,0.01)', 
                borderBottom: '1px solid var(--apple-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <h2 className="apple-title-medium" style={{ margin: 0, textTransform: 'capitalize' }}>{team.name}</h2>
                  <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem', fontWeight: '500', marginTop: '2px' }}>
                    {team.members.length} {team.members.length === 1 ? 'Member' : 'Members'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Team Total Revenue</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
                    ${team.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {team.members.map((member, idx) => (
                  <div key={member.user_id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '20px clamp(16px, 4vw, 32px)',
                    borderBottom: idx < team.members.length - 1 ? '1px solid var(--apple-border)' : 'none',
                    background: member.user_id === user.id ? 'rgba(0, 113, 227, 0.04)' : 'transparent',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '240px', flex: '1' }}>
                      <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '50%', 
                        background: member.user_id === user.id 
                          ? 'linear-gradient(135deg, #0071e3, #3b82f6)' 
                          : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        color: '#ffffff',
                        fontSize: '1rem',
                        boxShadow: member.user_id === user.id ? '0 0 12px rgba(0, 113, 227, 0.3)' : 'none',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {member.profiles?.first_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {member.profiles?.first_name} {member.profiles?.last_name}
                          {member.user_id === user.id && (
                            <span className="apple-badge apple-badge-blue" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>You</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginTop: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                          <span>{member.profiles?.email}</span>
                          <span style={{ color: 'var(--apple-border-strong)' }}>•</span>
                          <span className={member.team_role === 'lead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-green'} style={{ padding: '2px 8px', fontSize: '0.65rem', textTransform: 'capitalize' }}>
                            {member.team_role}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      textAlign: 'right', 
                      fontWeight: '700', 
                      fontSize: '1.25rem', 
                      color: member.total_revenue > 0 ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)',
                      marginLeft: 'auto'
                    }}>
                      ${member.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

```

---

### File: `src\supabaseClient.js`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\supabaseClient.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
```

---

### File: `src\utils\analyticsUtils.js`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\utils\analyticsUtils.js`

```javascript
import { normalizeMonth, getLastNMonths, parseRevenueMonth, formatRevenueMonthShort } from './revenueUtils'

/**
 * Returns the team mapping as a helper.
 */
function getTeamMap(teams) {
  const map = {}
  teams.forEach(t => {
    map[t.id] = t.name
  })
  return map
}

/**
 * Section 1 - Revenue Trend Line
 * Calculates monthly revenue trend for all teams + total.
 * Returns chronological array of: { period, monthStr, Total, [teamName1], [teamName2]... }
 */
export function calculateMonthlyTrend(revenues, teams, months) {
  const teamMap = getTeamMap(teams)
  
  return months.map(month => {
    const monthRevs = revenues.filter(r => normalizeMonth(r.revenue_month) === month)
    const row = {
      period: formatRevenueMonthShort(month),
      monthStr: month,
      Total: monthRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    }
    
    // Initialize all teams to 0 to keep lines consistent
    teams.forEach(t => {
      row[t.name] = 0
    })
    
    monthRevs.forEach(r => {
      const teamName = teamMap[r.team_id]
      if (teamName) {
        row[teamName] = (row[teamName] || 0) + Number(r.amount || 0)
      }
    })
    
    return row
  })
}

/**
 * Section 2 - Expected vs Actual Revenue
 * Calculates monthly expected (from DIS) vs actual revenue (from monthly_revenues).
 * Supports filtering by a specific team.
 */
export function calculateExpectedVsActual(disReports, revenues, months, selectedTeamId, memberships) {
  return months.map(month => {
    let monthRevs = revenues.filter(r => normalizeMonth(r.revenue_month) === month)
    let monthReports = disReports.filter(r => normalizeMonth(r.report_date) === month)
    
    if (selectedTeamId && selectedTeamId !== 'all') {
      monthRevs = monthRevs.filter(r => r.team_id === selectedTeamId)
      
      const teamMemberUserIds = new Set(
        memberships.filter(m => m.team_id === selectedTeamId).map(m => m.user_id)
      )
      
      monthReports = monthReports.filter(r => {
        if (r.team_id === selectedTeamId) return true
        if (teamMemberUserIds.has(r.user_id)) return true
        // Also fallback to checking if there is a revenue record for this user under this team for this month
        return revenues.some(
          rv => rv.user_id === r.user_id && rv.team_id === selectedTeamId && normalizeMonth(rv.revenue_month) === month
        )
      })
    }
    
    const expected = monthReports.reduce((sum, r) => sum + Number(r.expected_revenue || 0), 0)
    const actual = monthRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const accuracy = expected > 0 ? Math.round((actual / expected) * 100) : 0
    
    return {
      period: formatRevenueMonthShort(month),
      monthStr: month,
      Expected: expected,
      Actual: actual,
      Accuracy: accuracy
    }
  })
}

/**
 * Section 3 - DIS Compliance Tracker (Calendar Heatmap)
 * Prepares GitHub-style contribution grid for the specified range.
 */
export function buildCalendarHeatmapData(disReports, profiles, memberships, startDate, endDate) {
  const activeUserIds = new Set(
    memberships
      .filter(m => {
        const profile = profiles.find(p => p.id === m.user_id)
        return profile && profile.platform_role !== 'admin'
      })
      .map(m => m.user_id)
  )
  const expectedCount = activeUserIds.size
  
  const reportsByDate = {}
  disReports.forEach(r => {
    if (activeUserIds.has(r.user_id)) {
      reportsByDate[r.report_date] = (reportsByDate[r.report_date] || 0) + 1
    }
  })
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const data = []
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    const count = reportsByDate[dateStr] || 0
    const rate = expectedCount > 0 ? (count / expectedCount) * 100 : 0
    
    let level = 0
    if (count > 0) {
      if (rate < 50) level = 1
      else if (rate < 80) level = 2
      else level = 3
    } else if (!isWeekend && expectedCount > 0) {
      level = 1
    }
    
    data.push({
      date: dateStr,
      count,
      total: expectedCount,
      rate: Math.round(rate),
      isWeekend,
      level
    })
  }
  
  return data
}

/**
 * Section 3 - Team Compliance bar charts
 * Calculate overall compliance rates (%) per team.
 */
export function calculateTeamComplianceRates(teams, disReports, memberships, profiles, startDate, endDate) {
  const weekdays = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      weekdays.push(`${year}-${month}-${day}`)
    }
  }
  
  const weekdaySet = new Set(weekdays)
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
  
  return teams.map(team => {
    const teamMems = memberships.filter(m => m.team_id === team.id && nonAdminIds.has(m.user_id))
    const teamMemberIds = new Set(teamMems.map(m => m.user_id))
    
    const expected = teamMems.length * weekdays.length
    const actual = disReports.filter(r => 
      teamMemberIds.has(r.user_id) && 
      weekdaySet.has(r.report_date)
    ).length
    
    const rate = expected > 0 ? Math.round((actual / expected) * 100) : 0
    
    return {
      id: team.id,
      name: team.name,
      membersCount: teamMems.length,
      expected,
      actual,
      rate
    }
  }).sort((a, b) => b.rate - a.rate)
}

/**
 * Section 4 - Team Comparison Radar
 * Returns normalized 0-100 scores for 5 axes: Revenue, Growth, DIS Compliance, Leads, Efficiency.
 */
export function calculateTeamRadarScores(teams, revenues, disReports, memberships, profiles, months) {
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
  
  if (months.length === 0) return { radarData: [], rawTeams: [] }
  
  const sortedMonths = [...months].sort()
  const startMonthStr = sortedMonths[0]
  const endMonthStr = sortedMonths[sortedMonths.length - 1]
  
  const startDate = parseRevenueMonth(startMonthStr)
  const endDate = new Date(parseRevenueMonth(endMonthStr))
  endDate.setMonth(endDate.getMonth() + 1)
  endDate.setDate(endDate.getDate() - 1)
  
  const weekdaySet = new Set()
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      weekdaySet.add(`${year}-${month}-${day}`)
    }
  }
  
  const weekdaysCount = weekdaySet.size
  const latestMonth = sortedMonths[sortedMonths.length - 1]
  const prevMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null
  
  const rawTeams = teams.map(team => {
    const teamMems = memberships.filter(m => m.team_id === team.id && nonAdminIds.has(m.user_id))
    const teamMemberIds = new Set(teamMems.map(m => m.user_id))
    
    const teamPeriodRevs = revenues.filter(r => r.team_id === team.id && months.includes(normalizeMonth(r.revenue_month)))
    const revenue = teamPeriodRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    
    const latestRev = revenues
      .filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === latestMonth)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const prevRev = prevMonth
      ? revenues
          .filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === prevMonth)
          .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : 0
    const growth = prevRev > 0 
      ? Math.max(0, ((latestRev - prevRev) / prevRev) * 100)
      : (latestRev > 0 ? 100 : 0)
      
    const expectedDIS = teamMems.length * weekdaysCount
    const actualDIS = disReports.filter(r => 
      teamMemberIds.has(r.user_id) && 
      weekdaySet.has(r.report_date)
    ).length
    const compliance = expectedDIS > 0 ? (actualDIS / expectedDIS) * 100 : 0
    
    const teamPeriodReports = disReports.filter(r => 
      teamMemberIds.has(r.user_id) && 
      weekdaySet.has(r.report_date)
    )
    const leads = teamPeriodReports.reduce((sum, r) => sum + Number(r.positive_leads || 0), 0)
    const efficiency = teamMems.length > 0 ? revenue / teamMems.length : 0
    
    return {
      id: team.id,
      name: team.name,
      revenue,
      growth,
      compliance,
      leads,
      efficiency,
      membersCount: teamMems.length
    }
  })
  
  const maxRevenue = Math.max(...rawTeams.map(t => t.revenue), 1)
  const maxGrowth = Math.max(...rawTeams.map(t => t.growth), 1)
  const maxLeads = Math.max(...rawTeams.map(t => t.leads), 1)
  const maxEfficiency = Math.max(...rawTeams.map(t => t.efficiency), 1)
  
  const subjects = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'growth', label: 'Growth' },
    { key: 'compliance', label: 'DIS Compliance' },
    { key: 'leads', label: 'Leads' },
    { key: 'efficiency', label: 'Efficiency' }
  ]
  
  const radarData = subjects.map(sub => {
    const row = { subject: sub.label }
    rawTeams.forEach(t => {
      let score = 0
      if (sub.key === 'revenue') score = (t.revenue / maxRevenue) * 100
      else if (sub.key === 'growth') score = (t.growth / maxGrowth) * 100
      else if (sub.key === 'compliance') score = t.compliance
      else if (sub.key === 'leads') score = (t.leads / maxLeads) * 100
      else if (sub.key === 'efficiency') score = (t.efficiency / maxEfficiency) * 100
      
      row[t.name] = Math.round(score)
    })
    return row
  })
  
  return { radarData, rawTeams }
}

/**
 * Section 5 - Revenue Distribution (Pareto)
 * Computes individual revenue contributions and cumulative percentage.
 */
export function calculateParetoData(revenues, profiles, selectedTeamId, memberships, months) {
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
  
  let targetUserIds = nonAdminIds
  if (selectedTeamId && selectedTeamId !== 'all') {
    targetUserIds = new Set(
      memberships
        .filter(m => m.team_id === selectedTeamId && nonAdminIds.has(m.user_id))
        .map(m => m.user_id)
    )
  }
  
  const userRevs = Array.from(targetUserIds).map(userId => {
    const profile = profiles.find(p => p.id === userId)
    const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown'
    
    const userPeriodRevs = revenues.filter(
      r => r.user_id === userId && months.includes(normalizeMonth(r.revenue_month))
    )
    const total = userPeriodRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    
    return {
      userId,
      name,
      revenue: total
    }
  }).sort((a, b) => b.revenue - a.revenue)
  
  const totalSum = userRevs.reduce((sum, u) => sum + u.revenue, 0)
  
  let cumulativeSum = 0
  const paretoData = userRevs.map(u => {
    cumulativeSum += u.revenue
    const cumulativePercent = totalSum > 0 ? Math.round((cumulativeSum / totalSum) * 100) : 0
    return {
      ...u,
      cumulativePercent
    }
  })
  
  return {
    paretoData,
    totalSum,
    concentrationStats: {
      top20PercentRevenue: getConcentrationPercentage(userRevs, totalSum, 0.2),
      zeroRevenueCount: userRevs.filter(u => u.revenue === 0).length,
      totalCount: userRevs.length
    }
  }
}

function getConcentrationPercentage(sortedUsers, totalSum, fraction) {
  if (totalSum === 0 || sortedUsers.length === 0) return 0
  const count = Math.max(1, Math.round(sortedUsers.length * fraction))
  const topSum = sortedUsers.slice(0, count).reduce((sum, u) => sum + u.revenue, 0)
  return Math.round((topSum / totalSum) * 100)
}

/**
 * Calculates current DIS submission streak for a user.
 */
export function calculateDISStreak(disReports, userId, currentDateStr) {
  const userReports = new Set(
    disReports
      .filter(r => r.user_id === userId)
      .map(r => r.report_date)
  )
  
  let streak = 0
  let d = new Date(currentDateStr)
  
  const todayStr = d.toISOString().split('T')[0]
  const submittedToday = userReports.has(todayStr)
  
  if (!submittedToday) {
    // If they haven't submitted today, skip today and start checking from yesterday.
    d.setDate(d.getDate() - 1)
  }
  
  for (let i = 0; i < 30; i++) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const checkDateStr = `${year}-${month}-${day}`
    
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    if (userReports.has(checkDateStr)) {
      streak++
    } else if (!isWeekend) {
      break
    }
    
    d.setDate(d.getDate() - 1)
  }
  
  return streak
}

/**
 * Section 6 - Performer Rankings
 * Calculates performance lists (top performers and those needing attention).
 */
export function calculatePerformerStatus(revenues, profiles, disReports, memberships, teams, months, currentDateStr) {
  const chronological = [...months].sort()
  const m1 = chronological[chronological.length - 1]
  const m2 = chronological.length > 1 ? chronological[chronological.length - 2] : null
  const m3 = chronological.length > 2 ? chronological[chronological.length - 3] : null
  
  const teamMap = getTeamMap(teams)
  
  const userTeamIds = {}
  memberships.forEach(m => {
    if (!userTeamIds[m.user_id]) userTeamIds[m.user_id] = []
    userTeamIds[m.user_id].push(m.team_id)
  })
  
  const last30Days = []
  const end = new Date(currentDateStr)
  const start = new Date(currentDateStr)
  start.setDate(start.getDate() - 29)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      last30Days.push(`${year}-${month}-${day}`)
    }
  }
  const weekdaysCount = last30Days.length
  
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  
  return nonAdminProfiles.map(p => {
    const userTeams = (userTeamIds[p.id] || []).map(tid => teamMap[tid]).filter(Boolean)
    
    const m1Rev = revenues
      .filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === m1)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const m2Rev = m2
      ? revenues
          .filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === m2)
          .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : 0
    const m3Rev = m3
      ? revenues
          .filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === m3)
          .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : 0
      
    // Sparkline (last 6 months)
    const sparkline = chronological.slice(-6).map(m => {
      return revenues
        .filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === m)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    })
    
    const streak = calculateDISStreak(disReports, p.id, currentDateStr)
    
    const userReports = disReports.filter(r => r.user_id === p.id && last30Days.includes(r.report_date))
    const complianceRate = weekdaysCount > 0 ? Math.round((userReports.length / weekdaysCount) * 100) : 0
    
    let status = 'Stable'
    if (m2 && m3) {
      if (m1Rev > m2Rev && m2Rev > m3Rev) status = 'Rising'
      else if (m1Rev < m2Rev && m2Rev < m3Rev) status = 'Declining'
    } else if (m2) {
      if (m1Rev > m2Rev) status = 'Rising'
      else if (m1Rev < m2Rev) status = 'Declining'
    }
    
    const hasDeclinedConsecutive = m2 && m3 && m1Rev < m2Rev && m2Rev < m3Rev
    const needsAttention = hasDeclinedConsecutive || (weekdaysCount > 0 && complianceRate < 50)
    
    return {
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      teams: userTeams.join(', ') || 'No Team',
      m1Revenue: m1Rev,
      m2Revenue: m2Rev,
      sparkline,
      streak,
      complianceRate,
      status,
      needsAttention
    }
  })
}

```

---

### File: `src\utils\revenueUtils.js`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\src\utils\revenueUtils.js`

```javascript
/**
 * Shared revenue utility functions.
 * All "month" values use the first of the month: 'YYYY-MM-01'
 */

/**
 * Returns an array of month strings ('YYYY-MM-01') for the last N months,
 * starting from the current month and going backwards.
 * Example for N=3 in May 2026: ['2026-05-01','2026-04-01','2026-03-01']
 */
export function getLastNMonths(n = 12) {
  const months = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(toRevenueMonthString(d.getFullYear(), d.getMonth()))
  }
  return months
}

/**
 * Returns months that admins can assign targets for.
 * Current/upcoming months are listed first, followed by recent past months.
 */
export function getTargetAssignmentMonths(pastMonths = 11, futureMonths = 12) {
  const months = []
  const now = new Date()

  for (let i = 0; i <= futureMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(toRevenueMonthString(d.getFullYear(), d.getMonth()))
  }

  for (let i = 1; i <= pastMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(toRevenueMonthString(d.getFullYear(), d.getMonth()))
  }

  return months
}

/**
 * Returns an array of month strings for the last N *completed* months.
 * This explicitly excludes the current ongoing month.
 * Example for N=3 in May 2026: ['2026-04-01','2026-03-01','2026-02-01']
 */
export function getLastNCompletedMonths(n = 12) {
  const months = []
  const now = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(toRevenueMonthString(d.getFullYear(), d.getMonth()))
  }
  return months
}

/**
 * Converts year (number) and month (0-indexed) to 'YYYY-MM-01' string.
 */
export function toRevenueMonthString(year, month) {
  const m = String(month + 1).padStart(2, '0')
  return `${year}-${m}-01`
}

/**
 * Parses a revenue_month string ('YYYY-MM-01' or 'YYYY-MM-DD') into a Date.
 */
export function parseRevenueMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/**
 * Formats a revenue_month string into a human-readable label.
 * '2026-05-01' → 'May 2026'
 */
export function formatRevenueMonth(dateStr) {
  const d = parseRevenueMonth(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

/**
 * Short month format: '2026-05-01' → 'May '26'
 */
export function formatRevenueMonthShort(dateStr) {
  const d = parseRevenueMonth(dateStr)
  return d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' })
}

/**
 * Filter revenue records to only those within the last N months from today.
 * If n is null/undefined/0, returns all records (all-time).
 */
export function filterRevenuesByPeriod(revenues, n) {
  if (!n) return revenues
  const cutoffMonths = getLastNMonths(n)
  const cutoffSet = new Set(cutoffMonths)
  return revenues.filter(r => cutoffSet.has(normalizeMonth(r.revenue_month)))
}

/**
 * Filter revenue records to only those within the last N *completed* months.
 * Excludes the current month to prevent incomplete data from skewing averages.
 */
export function filterRevenuesByCompletedPeriod(revenues, n) {
  if (!n) return revenues
  const cutoffMonths = getLastNCompletedMonths(n)
  const cutoffSet = new Set(cutoffMonths)
  return revenues.filter(r => cutoffSet.has(normalizeMonth(r.revenue_month)))
}

/**
 * Normalize a date string to 'YYYY-MM-01' regardless of the day value.
 * Handles both 'YYYY-MM-01' and ISO strings from Supabase.
 */
export function normalizeMonth(dateStr) {
  if (!dateStr) return ''
  // Handle ISO datetime strings like '2026-05-01T00:00:00+00:00'
  const dateOnly = dateStr.substring(0, 10)
  const [y, m] = dateOnly.split('-')
  return `${y}-${m}-01`
}

/**
 * Finds the latest target assigned on or before a month.
 * Target rows act like effective dates: one assignment continues until changed.
 */
export function getEffectiveTarget(targets, userId, teamId, month) {
  const monthKey = normalizeMonth(month)
  if (!monthKey || !userId || !teamId) return null

  return targets
    .filter(t =>
      t.user_id === userId &&
      t.team_id === teamId &&
      normalizeMonth(t.target_month) <= monthKey
    )
    .sort((a, b) => normalizeMonth(b.target_month).localeCompare(normalizeMonth(a.target_month)))[0] || null
}

export function getEffectiveTargetAmount(targets, userId, teamId, month) {
  const target = getEffectiveTarget(targets, userId, teamId, month)
  return target ? Number(target.target_amount || 0) : 0
}

export function sumEffectiveTargets(targets, userIds, teamId, month) {
  return userIds.reduce((sum, userId) => {
    return sum + getEffectiveTargetAmount(targets, userId, teamId, month)
  }, 0)
}

/**
 * Sum the amounts in an array of revenue records.
 */
export function sumRevenues(revenues) {
  return revenues.reduce((sum, r) => sum + Number(r.amount || 0), 0)
}

/**
 * Predefined filter options for time periods.
 */
export const TIME_PERIOD_OPTIONS = [
  { label: 'This Month', value: 1 },
  { label: 'Last 2 Months', value: 2 },
  { label: 'Last 3 Months', value: 3 },
  { label: 'Last 6 Months', value: 6 },
  { label: 'Last 12 Months', value: 12 },
  { label: 'All Time', value: 0 },
]

/**
 * Build a map of month → revenue amount for a given set of revenue records.
 * Key: 'YYYY-MM-01', Value: amount (number).
 */
export function buildMonthlyRevenueMap(revenues) {
  const map = {}
  for (const r of revenues) {
    const key = normalizeMonth(r.revenue_month)
    map[key] = (map[key] || 0) + Number(r.amount || 0)
  }
  return map
}

/**
 * Get years for the year picker — from 2023 to current year.
 */
export function getAvailableYears() {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= 2023; y--) {
    years.push(y)
  }
  return years
}

/**
 * Month names (0-indexed array).
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Check if a year/month combo is in the future.
 */
export function isFutureMonth(year, month) {
  const now = new Date()
  const target = new Date(year, month, 1)
  const current = new Date(now.getFullYear(), now.getMonth(), 1)
  return target > current
}

/**
 * Calculates average revenue across standard time periods for a chart.
 */
export function calculateAverageRevenueData(revenues) {
  const periods = [
    { label: '1M', value: 1 },
    { label: '2M', value: 2 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
    { label: 'All Time', value: 0 },
  ]
  
  return periods.map(p => {
    const filtered = filterRevenuesByPeriod(revenues, p.value)
    const sum = sumRevenues(filtered)
    
    let average = 0
    if (p.value > 0) {
      average = sum / p.value
    } else {
      // All Time: divide by unique active months
      const uniqueMonths = new Set(revenues.map(r => normalizeMonth(r.revenue_month))).size
      average = uniqueMonths > 0 ? sum / uniqueMonths : 0
    }
    
    return {
      period: p.label,
      average: Number(average.toFixed(2))
    }
  })
}

```

---

### File: `admin_setup.sql`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\admin_setup.sql`

```sql
-- ==========================================
-- SUPER ADMIN & TEAM LEAD SECURITY DEFINERS
-- ==========================================

-- 1. Helper function: Check if current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND platform_role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Helper function: Check if current user is a Team Lead for a specific team
CREATE OR REPLACE FUNCTION public.is_team_lead(check_team_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = auth.uid() 
      AND team_id = check_team_id 
      AND team_role = 'lead'
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ==========================================
-- UPDATE EXISTING RLS POLICIES FOR ADMINS
-- ==========================================
-- We add 'OR is_admin()' to policies so admins have universal access.

-- Profiles: Admins can do anything
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (is_admin());

-- Teams: Admins can do anything
DROP POLICY IF EXISTS "Admins can manage all teams" ON teams;
CREATE POLICY "Admins can manage all teams" ON teams FOR ALL USING (is_admin());

-- Team Members: Admins can do anything
DROP POLICY IF EXISTS "Admins can manage all team members" ON team_members;
CREATE POLICY "Admins can manage all team members" ON team_members FOR ALL USING (is_admin());

-- Monthly Revenues: Admins can do anything
DROP POLICY IF EXISTS "Admins can manage all revenues" ON monthly_revenues;
CREATE POLICY "Admins can manage all revenues" ON monthly_revenues FOR ALL USING (is_admin());


-- ==========================================
-- UPDATE RLS POLICIES FOR TEAM LEADS
-- ==========================================

-- Monthly Revenues: Team Leads can insert/update/select revenue for their specific team
DROP POLICY IF EXISTS "Team Leads can view team revenues" ON monthly_revenues;
CREATE POLICY "Team Leads can view team revenues" 
ON monthly_revenues FOR SELECT 
USING (is_team_lead(team_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Team Leads can insert team revenues" ON monthly_revenues;
CREATE POLICY "Team Leads can insert team revenues" 
ON monthly_revenues FOR INSERT 
WITH CHECK (is_team_lead(team_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Team Leads can update team revenues" ON monthly_revenues;
CREATE POLICY "Team Leads can update team revenues" 
ON monthly_revenues FOR UPDATE 
USING (is_team_lead(team_id) OR auth.uid() = user_id);

```

---

### File: `eslint.config.js`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\eslint.config.js`

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])

```

---

### File: `index.html`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>my-app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

---

### File: `package.json`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\package.json`

```json
{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.106.1",
    "@vercel/speed-insights": "^2.0.0",
    "lucide-react": "^1.16.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router-dom": "^7.15.1",
    "recharts": "^3.8.1"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "vite": "^8.0.12"
  }
}

```

---

### File: `schema.sql`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\schema.sql`

```sql
-- 1. Create Profiles Table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  first_name text,
  last_name text,
  phone text,
  email text,
  platform_role text default 'user' not null, -- 'admin' or 'user'. We will update this manually in Supabase.
  is_deactivated boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS for profiles
alter table public.profiles enable row level security;

-- 2. Create Teams Table
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS for teams
alter table public.teams enable row level security;

-- 3. Create Team Members Table
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  team_role text default 'member' not null, -- 'lead' or 'member'. We will update this manually in Supabase.
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, team_id) -- A user can only join a specific team once
);

-- Turn on RLS for team members
alter table public.team_members enable row level security;

-- 4. Create Monthly Revenues Table
create table public.monthly_revenues (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  revenue_month date not null, -- e.g., '2023-10-01'
  amount numeric(12, 2) default 0.00 not null,
  entered_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, team_id, revenue_month) -- Only one record per user, per team, per month
);

-- Turn on RLS for monthly revenues
alter table public.monthly_revenues enable row level security;

-- ==========================================
-- BASIC ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- PROFILES: Users can view and update their own profile.
create policy "Users can view own profile." on profiles for select using (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile." on profiles for insert with check (auth.uid() = id);

-- TEAMS: Everyone can view teams. Only admins can insert/update (enforced via Supabase UI for now, so we just allow read).
create policy "Anyone can view teams." on teams for select using (true);

-- TEAM MEMBERS: Users can view memberships if they belong to the team. Users can insert themselves into a team.
create policy "Users can view team members of their teams" on team_members for select using (
  exists (select 1 from team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid())
);
create policy "Users can join a team." on team_members for insert with check (auth.uid() = user_id);

-- MONTHLY REVENUES: Users can view and insert their own revenues.
create policy "Users can view own revenues." on monthly_revenues for select using (auth.uid() = user_id);
create policy "Users can insert own revenues." on monthly_revenues for insert with check (auth.uid() = user_id);
create policy "Users can update own revenues." on monthly_revenues for update using (auth.uid() = user_id);

-- Note: We can add more complex policies later for Team Leads to view/edit their members' profiles and revenues.

```

---

### File: `seed.js`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\seed.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0'
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
})

async function seed() {
  console.log("Starting seed process using Official Supabase API...")

  console.log("Fetching Existing Teams...")
  const { data: teams, error: teamsError } = await supabase.from('teams').select('id').limit(8)
  if (teamsError || !teams || teams.length < 8) {
    console.error("Could not fetch 8 teams. Error:", teamsError)
    return;
  }
  const teamIds = teams.map(t => t.id)

  const users = []
  console.log("Signing up 58 test users (this ensures perfect GoTrue auth state)...")
  for (let i = 1; i <= 58; i++) {
    const email = `testuser${i}@example.com`
    const password = 'password123'
    
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      console.error(`Error signing up ${email}:`, authError.message)
      continue
    }
    
    const userId = authData.user.id
    users.push(userId)

    await supabase.from('profiles').upsert({
      id: userId,
      first_name: 'Test',
      last_name: `User ${i}`,
      phone: `555-020${i}`,
      email: email,
      platform_role: 'user',
      profile_completed: true
    })
  }

  console.log("Assigning users to teams...")
  const memberships = []
  
  for (let i = 0; i < 56; i++) {
    const teamIndex = Math.floor(i / 8)
    const role = (i % 8 === 0) ? 'lead' : 'member'
    if (users[i]) {
      memberships.push({ user_id: users[i], team_id: teamIds[teamIndex], team_role: role })
    }
  }
  
  if (users[56]) memberships.push({ user_id: users[56], team_id: teamIds[7], team_role: 'lead' })
  if (users[57]) memberships.push({ user_id: users[57], team_id: teamIds[7], team_role: 'member' })
  for (let i = 48; i < 54; i++) {
    if (users[i]) memberships.push({ user_id: users[i], team_id: teamIds[7], team_role: 'member' })
  }

  const { error: memError } = await supabase.from('team_members').upsert(memberships, { onConflict: 'user_id, team_id' })
  if (memError) console.error("Membership error:", memError)

  console.log("Generating monthly revenues...")
  const revenues = []
  for (const m of memberships) {
    revenues.push({
      user_id: m.user_id,
      team_id: m.team_id,
      revenue_month: '2023-10-01',
      amount: Math.floor(Math.random() * 5000 + 1000),
      entered_by: m.user_id
    })
  }
  
  const { error: revError } = await supabase.from('monthly_revenues').upsert(revenues, { onConflict: 'user_id, team_id, revenue_month' })
  if (revError) console.error("Revenue error:", revError)

  console.log("Seed complete! You can now login with testuser1@example.com / password123")
}

seed()

```

---

### File: `test_query.js`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\test_query.js`

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== PROFILES ===");
  const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email, platform_role');
  console.log(JSON.stringify(profiles, null, 2));

  console.log("\n=== TEAMS ===");
  const { data: teams } = await supabase.from('teams').select('*');
  console.log(JSON.stringify(teams, null, 2));

  console.log("\n=== TEAM MEMBERS ===");
  const { data: members } = await supabase.from('team_members').select('user_id, team_id, team_role');
  console.log(JSON.stringify(members, null, 2));

  console.log("\n=== MONTHLY REVENUES ===");
  const { data: revenues } = await supabase.from('monthly_revenues').select('*');
  console.log(JSON.stringify(revenues, null, 2));
}

main().catch(err => console.error(err));

```

---

### File: `vercel.json`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/((?!assets/|favicon.svg|.*\\.).*)",
      "destination": "/index.html"
    }
  ]
}

```

---

### File: `vite.config.js`
**Path**: `c:\Users\ajayv\OneDrive\Desktop\Ideallabs_automated\my-app\vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
  },
})

```

---

