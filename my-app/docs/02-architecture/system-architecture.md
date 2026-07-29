# System Architecture

## Architecture Overview

All-Hands is a **client-heavy Single Page Application (SPA)** with no custom backend server. All backend operations are handled by Supabase (a Backend-as-a-Service platform).

```
┌─────────────────────────────────────────────────────┐
│                   USER BROWSER                       │
│                                                     │
│  React SPA (Vite build, deployed on Vercel)         │
│  ┌─────────────────────────────────────────────┐    │
│  │  App.jsx (Router + Auth State)              │    │
│  │  ├── Layout (Navbar/Sidebar)                │    │
│  │  ├── Admin Pages                            │    │
│  │  └── User Pages                             │    │
│  └─────────────────────────────────────────────┘    │
│                        │                            │
│              Supabase JS Client                     │
│         (supabaseClient.js — anon key)              │
└──────────────────────────┬──────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────┐
│              SUPABASE PLATFORM                      │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  PostgreSQL  │  │  Auth        │  │ Storage   │ │
│  │  (with RLS)  │  │  (JWT)       │  │ Buckets   │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │  Realtime    │  │  Edge Functions (Deno)       │ │
│  │  (WS/Presence│  │  └── ai-analytics            │ │
│  └──────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                           │
                    (OpenRouter API)
                           │
                    ┌──────▼──────┐
                    │  GPT-4o     │
                    │ (via OpenRouter)
                    └─────────────┘
```

## Architecture Patterns

### 1. Client-Side SPA (Primary Pattern)
- React with Vite
- React Router DOM v7 for client-side routing
- Vercel serves `index.html` for all routes (via `vercel.json` rewrite rules)
- No server-side rendering

### 2. Direct DB Access Pattern (BaaS)
- Frontend components call `supabase.from('table').select()` directly
- No API abstraction layer between frontend and database
- Row Level Security (RLS) in PostgreSQL is the primary authorization mechanism
- The anon JWT token is passed with every request automatically by the Supabase client

### 3. Provider Pattern (Context API)
- `PresenceProvider` — wraps the entire app to track who is online via Supabase Realtime presence
- Used in: `App.jsx` wraps `<PresenceProvider>` around `<Router>`

### 4. Module-Level Caching Pattern
Several admin pages cache fetched data at the module level to avoid re-fetching on remount:
```javascript
let adminHomeCache = { loaded: false, teams: [], profiles: [], revenues: [], ... }
```
This is a custom pattern (NOT React Query or SWR). It persists across component mounts within the same page session.

### 5. Route-Based Code Structure
- No feature-based structure
- Pages are organized by user role: `pages/admin/`, `pages/user/`, `pages/homeprofile/`
- Each page is a self-contained component that fetches its own data

### 6. Outlet Context Pattern
Admin pages share data via React Router `<Outlet context={...}>`:
```javascript
// AdminLayout.jsx passes context
<Outlet context={{ user, profile, isExecutive, featureAccess }} />
// Admin pages receive it
const { user, featureAccess } = useOutletContext()
```

## Key Data Flow

### Authentication Flow
```
Browser → supabase.auth.getSession() → JWT token stored in localStorage
    ↓
App.jsx checkProfile() → supabase.from('profiles').select(...)
    ↓
State: [user, hasProfile, isAdmin, isExecutive, featureAccess, isDeactivated]
    ↓
React Router redirects based on state
```

### Realtime Subscriptions (Active)
1. `system_settings` — maintenance mode, leaderboard toggle
2. `announcements` — push notifications for new announcements
3. `profiles` (user-specific) — account deactivation/feature access changes
4. `online-users` — presence channel for active user tracking
5. Various admin pages subscribe to `postgres_changes` for live updates

## Deployment Architecture

```
GitHub Repository
       │
       ▼ (auto-deploy on push)
    Vercel
       │
       ├── Serves built React SPA (dist/)
       ├── All routes → /index.html (via vercel.json rewrite)
       └── Vercel Speed Insights enabled
```

## Desktop Architecture (Electron)
```
Electron Main Process (electron/main.cjs)
    ├── Creates BrowserWindow (1200x800)
    ├── Dev: loads http://127.0.0.1:5173
    └── Prod: loads dist/index.html
```
The Electron app is essentially a wrapper around the same web application. No additional native APIs are used.

## Mobile Architecture (Capacitor)
```
Capacitor (com.ideallabs.myapp)
    └── WebView → wraps dist/ web build
    └── Android project in android/
```
Same web build runs in a WebView on Android. Status of mobile deployment: REQUIRES VERIFICATION.
