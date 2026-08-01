# MASTER APPLICATION DOCUMENTATION

## 1. DOCUMENT CONTROL

- **Document Title**: Master Application Documentation
- **Application Name**: All-Hands (Ideallabs / Signature Global Conferences)
- **Documentation Purpose**: Single authoritative source of technical and functional knowledge.
- **Current Documentation Version**: 1.0
- **Last Synchronized Date**: 2026-07-31 11:38:17
- **Last Synchronized Commit**: 8cb9412f69347348950b6adb8f5e2e7aa43aab5e
- **Documentation Status**: Active / Live

**Source of Truth:**
The application source code represents the actual implementation.
This document describes the current implementation as accurately as possible.
If existing documentation conflicts with the actual implementation: SOURCE CODE > OLD DOCUMENTATION.


## 2. EXECUTIVE APPLICATION OVERVIEW

### Source: CURRENT_STATE_REPORT.md

# All-Hands — Current State Report
**Generated**: July 2026  
**Scope**: Full architecture discovery and analysis  
**Status**: Active Development — Attendance Module Refactored & Enhanced

---

## Executive Summary

All-Hands is an **active, production-deployed internal operations portal** for Ideallabs / Signature Global Conferences. It is a React 19 SPA backed entirely by Supabase (no custom server). The application is feature-complete for its domain and works well at current scale.

The platform centralizes: revenue tracking, daily activity reporting (DIS), attendance, team management, reviews, announcements, analytics, and AI-powered insights for a small-to-medium sales team organization.

**It is ready for continued operation but carries significant technical debt that should be addressed before major scaling.**

---

## Application Identity

| Property | Value |
|----------|-------|
| Application Name | All-Hands |
| Organization | Ideallabs / Signature Global Conferences |
| Type | Internal Employee Operations Portal |
| Architecture | React SPA + Supabase BaaS |
| Deployment | Vercel (Web), Electron (Desktop), Capacitor (Android — unverified) |
| Auth Provider | Supabase Auth (Email/Password + Google OAuth) |
| Database | Supabase PostgreSQL (Project: pzalalbpxlwtcnmkaegb) |
| Master Admin | signatureglobalconferences@gmail.com |

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (Email + Google) | LIVE | Fully functional |
| Admin Dashboard | LIVE | Real-time KPIs, charts, ticker tape |
| Revenue Management | LIVE | Admin entry + user view |
| DIS Daily Reporting | LIVE | Submission + holiday/lock controls |
| Team Management | LIVE | Full CRUD with targets |
| User Management | LIVE | Activate/deactivate, control panel |
| Leaderboard | LIVE | Conditionally shown via system_settings |
| Milestones | LIVE | All-time achievement records |
| Analytics Dashboard | LIVE | Charts + demo data seeder |
| AI Analytics | LIVE | GPT-4o via OpenRouter |
| Attendance (GPS/IP) | LIVE (UPGRADED) | Advanced filtering, Late/Early tracking, My Logs |
| Announcements | LIVE | Rich text, media, push notifications |
| Reviews / Write-Ups | LIVE | Event-based submission system |
| Audit Logs | LIVE | 6 activity log tabs |
| System Settings | LIVE | Maintenance, DIS, holidays |
| Role Manager | LIVE | Master admin only |
| Data Export | LIVE | Excel export for 4 data types |
| Copy Stats Tool | LIVE | Revenue/DIS copy, JPEG, PDF export |
| Speaker Management | LIVE | Embedded in CopyStats |
| Virtual Templates | PARTIAL | One template active (Speaker Pass) |
| Sales Executive Module | LIVE | Sales call logging |
| Team Analytics | LIVE | Team-lead accessible |
| Team DIS Report | LIVE | Team-lead accessible |

---

## Technology Status

| Component | Technology | Version | Status |
|-----------|-----------|---------|--------|
| Frontend Framework | React | 19.2.6 | ✅ Current |
| Build Tool | Vite | 8.x | ✅ Current |
| Routing | React Router DOM | 7.x | ✅ Current |
| Backend | Supabase | Latest | ✅ Active |
| Deployment | Vercel | — | ✅ Active |
| Charts | Recharts | 3.x | ✅ Current |
| Icons | Lucide React | 1.x | ✅ Current |
| AI | GPT-4o via OpenRouter | — | ✅ Active |
| Desktop | Electron | 43.x | ⚠️ Configured, status UNKNOWN |
| Mobile | Capacitor/Android | 8.x | ⚠️ Configured, status UNKNOWN |

---

## Database Status

| Table | Schema Documented | RLS Enabled | Notes |
|-------|------------------|-------------|-------|
| profiles | ✅ | ✅ | Core user table |
| teams | ✅ | ✅ | |
| team_members | ✅ | ✅ | |
| monthly_revenues | ✅ | ✅ | |
| audit_logs | ✅ | ✅ | Append-only design |
| sales_analytics | ✅ | ✅ | |
| events | ✅ | ✅ | |
| reviews | ✅ | ✅ | |
| attendance_logs | ✅ | ✅ | |
| office_locations | ✅ | ✅ | |
| office_ips | ✅ | ✅ | |
| announcements | ✅ | ✅ | RLS has gaps |
| announcement_views | ✅ | ✅ | SELECT policy is too open |
| notifications | ✅ | ✅ | |
| notification_reads | ✅ | ✅ | SELECT policy is too open |
| system_settings | ✅ | ✅ | Single-row with CHECK |
| holidays | ✅ | ✅ | |
| speakers | ✅ | ⚠️ | Anyone can write speakers |
| speaker_timeline_events | ✅ | ⚠️ | Anyone can append |
| **dis_reports** | **❌ NOT IN SCHEMA** | UNKNOWN | Used heavily in code |
| **monthly_targets** | **❌ NOT IN SCHEMA** | UNKNOWN | Used heavily in code |

---

## Security Status

| Issue | Severity | Status |
|-------|----------|--------|
| Real user data in repository | CRITICAL | UNRESOLVED |
| AI Edge Function no auth | HIGH | UNRESOLVED |
| No rate limiting on AI | HIGH | UNRESOLVED |
| Open RLS on speakers | HIGH | UNRESOLVED |
| No dev/prod separation | MEDIUM | UNRESOLVED |
| Client-side-only feature access | MEDIUM | UNRESOLVED |
| No CSP headers | MEDIUM | UNRESOLVED |
| Hardcoded master admin email | LOW | UNRESOLVED |
| No audit trail for destructive ops | LOW | UNRESOLVED |

---

## Scalability Status

| Concern | Current Impact | Scale Threshold |
|---------|---------------|----------------|
| No pagination on admin tables | None (small team) | ~100+ users |
| No code splitting | Slight perf overhead | Any scale |
| Module-level caching (no invalidation) | Occasional stale data | Current |
| Multiple WS connections per user | Minor overhead | 500+ concurrent users |
| Unbounded monthly_revenues fetch | None (current data) | 500+ revenue records |

**Current team size**: Based on the small-team context, scalability is NOT an immediate concern.

---

## Items That REQUIRE VERIFICATION

These items could not be confirmed from the repository alone:

1. **Production URL** — Vercel domain not found in any config file
2. **Electron deployment** — Is the desktop app distributed to any users?
3. **Android/Capacitor deployment** — Is the mobile app on any device/store?
4. **Vercel auto-deploy branch** — Which git branch triggers production?
5. **Vercel Speed Insights** — Is it initialized in the app code?
6. **dis_reports RLS policies** — Table not in schema file
7. **monthly_targets RLS policies** — Table not in schema file
8. **Supabase plan** — Free vs Pro vs Team (affects storage, bandwidth, and function invocations)
9. **Google OAuth configuration** — Redirect URIs configured in Supabase/Google Console
10. **OpenRouter API key** — Is it a paid key with rate limits?
11. **Email service for password reset** — Supabase default vs custom SMTP
12. **Storage bucket policies** — Are review_photos and announcements_media buckets public?
13. **debug2.js and debug_teams.js contents** — Not inspected
14. **Node.js version requirement** — Not specified in package.json engines field

---

## Readiness Assessment

| Readiness For | Level | Notes |
|---------------|-------|-------|
| Continued operation at current scale | READY | No blocking issues |
| New feature development | READY WITH CAUTION | Tech debt should be tracked |
| Onboarding new developers | PARTIALLY READY | Docs now exist; no tests |
| Scaling to 2x current users | READY | Small buffer |
| Scaling to 10x current users | NOT READY | Pagination, code splitting needed |
| Security audit | NOT READY | Multiple open issues |
| External review/compliance | NOT READY | Data in repo, no formal controls |


---

### Source: 01-overview/project-overview.md

﻿# Project Overview

## Project Name
**All-Hands** — Internal Operations Portal for Ideallabs / Signature Global Conferences

## Application Description
All-Hands is a comprehensive internal employee operations and monitoring portal. It is a private, invite-only SPA (Single Page Application) built for a specific company. The application centralizes management of teams, revenue tracking, daily activity reporting (DIS), attendance, employee reviews, announcements, and performance analytics.

## Production Deployment
- **Hosting**: Vercel (SPA with rewrite rules in `vercel.json`)
- **Domain**: REQUIRES VERIFICATION (not found in config files)
- **Dev Server**: Vite on port 5173

## Platform Targets
1. **Web (Primary)** — Deployed on Vercel, accessed via browser
2. **Desktop** — Electron wrapper (`electron/main.cjs`) configured for Windows
3. **Mobile** — Capacitor configured for Android (`capacitor.config.json`)

> Note: Only the web deployment is confirmed active.

## Organization
- **Company**: Ideallabs / Signature Global Conferences
- **Master Admin Email**: `signatureglobalconferences@gmail.com` (hardcoded throughout codebase)
- **Branding**: "All-Hands" with logo `allhands_logo_cropped.png`

## Repository Structure Summary

```
my-app/
├── src/
│   ├── App.jsx                  # Root component with routing
│   ├── main.jsx                 # React entry point
│   ├── supabaseClient.js        # Supabase client (hardcoded credentials)
│   ├── index.css                # Global CSS (75KB)
│   ├── components/              # Shared UI components
│   ├── pages/
│   │   ├── admin/               # 18 admin pages + virtual templates
│   │   ├── user/                # 16 user pages
│   │   └── homeprofile/         # Auth/profile pages (6 files)
│   ├── utils/                   # 4 utility modules
│   └── hooks/                   # Empty directory
├── supabase/
│   ├── config.toml              # Local Supabase dev config
│   └── functions/ai-analytics/  # Supabase Edge Function (OpenRouter/GPT-4o)
├── electron/main.cjs            # Electron desktop wrapper
├── android/                     # Capacitor Android project
├── public/                      # Static assets
├── database_schema.sql          # Full SQL migration history (1007 lines)
├── vercel.json                  # Vercel SPA routing config
├── vite.config.js               # Vite build config
├── package.json                 # Dependencies
└── capacitor.config.json        # Capacitor mobile config
```

## Key Architectural Facts
- **No separate backend** — all data goes directly from the browser to Supabase
- **Client-side authorization** — role checks in React components, NOT in a backend
- **Hardcoded Supabase credentials** — URL and anon key embedded in `supabaseClient.js` (security risk)
- **One Edge Function** — `ai-analytics` for AI-powered insights via OpenRouter
- **In-memory module caching** — admin pages use module-level cache objects to prevent re-fetching on remount
- **Sensitive files in repo** — `users_export.csv`, `users_teams.xlsx`, `users_teams_final.xlsx` contain real user data and are checked into the repository root


---


## 3. BUSINESS DOMAIN

### Source: 01-overview/business-overview.md

﻿# Business Overview

## What Does This Application Do?

All-Hands is an **internal employee performance management platform** for a conference/events company (Signature Global Conferences / Ideallabs). It serves as the single source of truth for tracking team and individual performance across multiple dimensions.

## Target Users

| User Type | Description |
|-----------|-------------|
| **Master Admin** | Single super-user (signatureglobalconferences@gmail.com). Has access to all features including role manager |
| **Admin** | Company administrators. Can manage all data, set targets, approve reviews, manage announcements |
| **Executive** | Read-only admin variant. Can view dashboards but cannot edit data (feature access configurable) |
| **Team Lead** | Sales team leaders. Can view their team data, submit DIS for team, manage team targets |
| **Employee (User)** | Regular sales representatives. Can submit their own data and view their performance |
| **Sales Executive** | Special user type. Can log sales analytics (calls, speaker interactions) |

## Core Business Purpose

The company runs **conference/event sales operations** where employees sell conference packages to potential speakers and attendees. The platform tracks:

1. **Revenue** — Monthly revenue closed by each sales representative per team
2. **DIS (Daily Information System)** — Daily self-reporting of positive leads and expected revenue
3. **Attendance** — GPS and IP-based check-in/check-out tracking
4. **Reviews** — Post-event write-ups and review submissions by employees
5. **Speaker Management** — CRM-like tracking of speaker relationships, payment status, and outreach
6. **Team Performance** — Analytics, leaderboards, and milestone tracking across teams

## Business Workflows

### Revenue Cycle
1. Employee closes a sale
2. Admin or Team Lead logs the revenue amount in the system for that month
3. Revenue is tracked against monthly targets
4. Analytics dashboards show company-wide and team-level performance

### Daily Reporting (DIS)
1. Each working day, employees submit a DIS report
2. DIS includes: positive leads count, expected revenue for the month
3. Admins can see who has/hasn't submitted each day
4. Team leads can see their team's DIS activity
5. DIS data feeds into analytics as "expected vs actual" revenue comparison

### Attendance
1. Employee opens the Attendance page
2. System checks GPS location against office locations (Haversine formula)
3. System checks IP address against whitelisted office IPs
4. Employee checks in (and later checks out)
5. Employees can submit exception requests if outside office (WFH, field work)
6. Admins can approve/reject exception requests

### Employee Onboarding
1. New employee signs up (email/password or Google OAuth)
2. Employee is redirected to Complete Profile page
3. Employee fills in name, phone, selects their team
4. Profile is created with `is_deactivated: true` (pending admin approval)
5. Admin activates the account via User Control Panel
6. Employee can now access the platform

### Review/Write-Up Cycle
1. Admin creates an event (with optional target team and social media links)
2. Employees submit reviews for that event (title, context, optional photo)
3. Admin reviews submissions, provides feedback, and changes status (pending/approved/rejected)
4. Admin can create write-ups linking to social media posts

## Core Entities

| Entity | Description |
|--------|-------------|
| `profiles` | All users (employees, team leads, admins, executives) |
| `teams` | Sales teams (e.g., Team A, Team B) |
| `team_members` | Many-to-many: users belong to teams with roles (lead/member) |
| `monthly_revenues` | Monthly revenue records per user per team |
| `dis_reports` | Daily activity reports by users |
| `monthly_targets` | Revenue targets set per user per team per month |
| `attendance_logs` | Check-in/check-out records |
| `audit_logs` | System activity log (logins, page views, revenue changes) |
| `announcements` | Company-wide announcements with media |
| `notifications` | Push notification records |
| `events` | Review events created by admin |
| `reviews` | Employee review submissions |
| `sales_analytics` | Call/meeting logs by sales executives |
| `speakers` | Speaker CRM records |
| `speaker_timeline_events` | Immutable history of speaker status changes |
| `office_locations` | GPS coordinates of office locations |
| `office_ips` | Whitelisted IP addresses for attendance |
| `holidays` | Holiday calendar (blocks DIS submissions) |
| `system_settings` | Global platform settings (maintenance mode, leaderboard toggle, etc.) |


---


## 4. USER TYPES AND ROLES

### Source: 06-authentication/authorization.md

﻿# Authorization

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


---


## 5. COMPLETE TECHNOLOGY STACK

### Source: 01-overview/technology-stack.md

﻿# Technology Stack

## Frontend

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Framework | React | ^19.2.6 | Latest React with Concurrent Features |
| Language | JavaScript (JSX) | ES Modules | No TypeScript |
| Build Tool | Vite | ^8.0.12 | With @vitejs/plugin-react ^6.0.1 |
| Routing | React Router DOM | ^7.15.1 | BrowserRouter, client-side routing |
| State Management | React useState/useContext | Built-in | No Redux/Zustand/Jotai |
| Data Fetching | Supabase JS client | ^2.106.1 | Direct DB queries from browser |
| Form Handling | Native HTML forms | N/A | No form library (react-hook-form, etc.) |
| UI Components | Custom (Vanilla CSS) | N/A | No component library (MUI, Shadcn, etc.) |
| Icons | Lucide React | ^1.16.0 | Icon library |
| Charts | Recharts | ^3.8.1 | Area, Bar, Pie, Composed charts |
| Rich Text Editor | Jodit React | ^5.3.21 | Used in Announcements creation |
| Rich Text Editor 2 | React Quill New | ^3.8.3 | Used in some forms |
| Markdown Render | React Markdown | ^10.1.0 | Used in AI Analytics response display |
| PDF Generation | html2pdf.js | ^0.14.0 | PDF export |
| PDF Generation 2 | jsPDF | ^4.2.1 | Used in CopyStats |
| Image Capture | html2canvas | ^1.4.1 | Used for image/PDF generation |
| Grid Layout | react-grid-layout | ^2.2.3 | Used in virtual templates |
| Analytics | @vercel/speed-insights | ^2.0.0 | Vercel Speed Insights tracking |
| CSS | Vanilla CSS | N/A | ~75KB global stylesheet (index.css) |

## Backend / Data

| Category | Technology | Notes |
|----------|-----------|-------|
| Backend Architecture | Supabase (BaaS) | No custom backend server |
| Database | PostgreSQL (Supabase hosted) | Project ID: pzalalbpxlwtcnmkaegb |
| ORM/Query Builder | Supabase JS Client | Direct table queries, no ORM |
| Authentication | Supabase Auth | Email/password + Google OAuth |
| Authorization | Supabase RLS + client-side checks | Hybrid (DB-level + frontend) |
| Realtime | Supabase Realtime | postgres_changes subscriptions + presence |
| File Storage | Supabase Storage | Buckets: review_photos, announcements_media |
| Edge Functions | Supabase Edge Functions (Deno) | 1 function: ai-analytics |
| AI/LLM | OpenRouter API | GPT-4o model via openrouter.ai |

## Build & Tooling

| Category | Technology | Version |
|----------|-----------|---------|
| Linter | ESLint | ^10.3.0 |
| ESLint Plugins | eslint-plugin-react-hooks, eslint-plugin-react-refresh | - |
| TypeScript Types | @types/react, @types/react-dom | ^19.x |

## Desktop Packaging

| Category | Technology | Version |
|----------|-----------|---------|
| Desktop Wrapper | Electron | ^43.1.0 |
| Build System | electron-builder | ^26.15.3 |
| App ID | com.ideallabs.allhands | - |
| Process Manager | concurrently | ^10.0.3 |

## Mobile

| Category | Technology | Version |
|----------|-----------|---------|
| Mobile Bridge | Capacitor (Core) | ^8.4.1 |
| Android Target | @capacitor/android | ^8.4.1 |
| Mobile CLI | @capacitor/cli | ^8.4.1 |
| App ID | com.ideallabs.myapp | Note: Different ID from Electron |

## Data Export (Dev Scripts)

| Category | Technology | Version |
|----------|-----------|---------|
| Excel Export | xlsx | ^0.18.5 (devDependency) |

## External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Database + Auth + Storage + Realtime | Supabase | Core backend infrastructure |
| AI/LLM | OpenRouter (openrouter.ai) | AI analytics via GPT-4o |
| Deployment | Vercel | Web hosting |
| Performance Monitoring | Vercel Speed Insights | Web vitals tracking |

## What Is NOT Present
- No TypeScript
- No CSS framework (Tailwind, Bootstrap, Material UI)
- No state management library (Redux, Zustand, MobX)
- No form validation library (Zod, Yup, react-hook-form)
- No testing framework (Jest, Vitest, Cypress, Playwright)
- No API documentation (Swagger, OpenAPI)
- No server-side rendering (Next.js, Remix)
- No GraphQL
- No Docker/containerization
- No CI/CD pipeline configuration (beyond Vercel auto-deploy)
- No environment variable files (.env) found in repository


---

### Source: 12-dependencies/dependencies.md

﻿# Dependencies

## Runtime Dependencies

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.6 | UI framework |
| react-dom | ^19.2.6 | React DOM renderer |
| react-router-dom | ^7.15.1 | Client-side routing |

### Backend / Data
| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.106.1 | Supabase client (DB, Auth, Realtime, Storage) |

### UI / Components
| Package | Version | Purpose |
|---------|---------|---------|
| lucide-react | ^1.16.0 | Icon library (100+ icons used across pages) |
| recharts | ^3.8.1 | Charts: Area, Bar, Pie, ComposedChart |
| jodit-react | ^5.3.21 | Rich text editor for Announcements |
| react-quill-new | ^3.8.3 | Alternative rich text editor |
| react-markdown | ^10.1.0 | Markdown rendering (AI Analytics) |
| react-grid-layout | ^2.2.3 | Grid/drag-drop layout system |

### Export / Document Generation
| Package | Version | Purpose |
|---------|---------|---------|
| html2canvas | ^1.4.1 | DOM-to-image capture |
| jspdf | ^4.2.1 | PDF generation |
| html2pdf.js | ^0.14.0 | Combined html2canvas + jsPDF helper |
| xlsx | ^0.18.5 | Excel file generation |

### Analytics / Monitoring
| Package | Version | Purpose |
|---------|---------|---------|
| @vercel/speed-insights | ^2.0.0 | Vercel web vitals tracking |

---

## Development Dependencies

### Build Tools
| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^8.0.12 | Build tool and dev server |
| @vitejs/plugin-react | ^6.0.1 | React HMR for Vite |

### Desktop
| Package | Version | Purpose |
|---------|---------|---------|
| electron | ^43.1.0 | Desktop app wrapper |
| electron-builder | ^26.15.3 | Electron packaging |
| concurrently | ^10.0.3 | Run vite dev + electron concurrently |

### Mobile
| Package | Version | Purpose |
|---------|---------|---------|
| @capacitor/android | ^8.4.1 | Android Capacitor plugin |
| @capacitor/cli | ^8.4.1 | Capacitor CLI |
| @capacitor/core | ^8.4.1 | Capacitor core |

### Linting
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^10.3.0 | Code linting |
| @eslint/js | ^10.3.0 | ESLint JS config |
| eslint-plugin-react-hooks | ^5.1.0-rc.0 | Hooks linting rules |
| eslint-plugin-react-refresh | ^0.4.9 | React Refresh linting |
| globals | ^16.0.0 | Global variables for ESLint |

### Types
| Package | Version | Purpose |
|---------|---------|---------|
| @types/react | ^19.0.6 | TypeScript types for React |
| @types/react-dom | ^19.0.3 | TypeScript types for React DOM |

---

## Dependency Concerns

### 1. xlsx Listed as devDependency but Used at Runtime
`xlsx` (SheetJS) is used in `AdminExportData.jsx` for generating Excel files at runtime. It is incorrectly listed as a `devDependency`. This could cause issues in strict production builds.

### 2. Both jodit-react AND react-quill-new Included
Two rich text editor libraries are bundled:
- `jodit-react` (used in AdminAnnouncements)
- `react-quill-new` (used elsewhere — REQUIRES VERIFICATION)

This doubles the rich text editor footprint unnecessarily.

### 3. Both html2canvas AND html2pdf.js Included
`html2pdf.js` internally depends on `html2canvas` and `jsPDF`. Having `html2canvas` and `jsPDF` also listed separately creates potential version conflicts.

### 4. Large Bundle Impact
High-impact bundle size contributions:
- `recharts` — charting library (~250KB gzipped)
- `jodit-react` — rich text editor (~300KB gzipped)
- `react-quill-new` — another rich text editor (~100KB)
- `html2canvas` + `jsPDF` + `html2pdf.js` — export tools (~500KB)
- `xlsx` — Excel generation (~200KB)

Total: ~1.3MB+ of "optional feature" dependencies loaded for all users, including employees who never export data.

### 5. Version Compatibility
React 19 is the latest release. All dependencies need to be compatible with React 19. Some older packages may have peer dependency warnings. No audit has been performed.

### 6. Security Audit
No `npm audit` has been run or documented. For a production financial management system, periodic security audits of dependencies are important.

---

## Outdated Package Checks

REQUIRES RUNNING: `npm outdated` to see current outdated packages.

---

## Recommended Actions (Without Changes)
- Run `npm audit` to identify vulnerable packages
- Run `npm outdated` to understand version drift
- Verify `react-quill-new` is actually used (to see if it can be removed)
- Move `xlsx` from devDependencies to dependencies


---


## 6. COMPLETE REPOSITORY STRUCTURE

### Source: 02-architecture/application-structure.md

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


---


## 7. APPLICATION ARCHITECTURE

### Source: 02-architecture/system-architecture.md

﻿# System Architecture

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


---

### Source: 02-architecture/frontend-architecture.md

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


---

### Source: 02-architecture/backend-architecture.md

﻿# Backend Architecture

## Overview
There is NO custom backend server. The application uses **Supabase** as a Backend-as-a-Service (BaaS). All "backend" operations are:

1. **Direct Supabase JS Client calls** from the browser (PostgREST API)
2. **One Supabase Edge Function** deployed on Deno runtime (`ai-analytics`)
3. **PostgreSQL database functions** called as RPC via the Supabase client

## Supabase Project
- **Project URL**: `https://pzalalbpxlwtcnmkaegb.supabase.co`
- **Anon Key**: Hardcoded in `src/supabaseClient.js` (publicly visible — this is expected for anon keys, but noted)
- **Storage Key**: `ideallabs-auth` (in localStorage)

## Supabase Client Configuration
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'ideallabs-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})
```

## API Layer — PostgREST (via Supabase)
All database operations use the Supabase JS client which calls Supabase's PostgREST API:

```javascript
// Example: fetch all teams
supabase.from('teams').select('*')

// Example: join with relations
supabase.from('dis_reports').select('*, profiles(first_name, last_name), teams(name)')

// Example: RPC function call
supabase.rpc('get_db_size')

// Example: storage upload
supabase.storage.from('announcements_media').upload(filePath, file)
```

## Edge Function: `ai-analytics`

**File**: `supabase/functions/ai-analytics/index.ts`
**Runtime**: Deno
**JWT Verification**: DISABLED (`verify_jwt = false` in config.toml)

### Purpose
Proxies AI requests from the frontend to OpenRouter API (GPT-4o).

### Request Flow
```
Browser → supabase.functions.invoke('ai-analytics', { body: { prompt: '...' } })
       → Edge Function
       → fetch('https://openrouter.ai/api/v1/chat/completions', ...)
       ← Response (markdown text from GPT-4o)
       ← Browser renders with ReactMarkdown
```

### Security Concern
- `verify_jwt = false` means ANYONE can call this edge function without authentication
- The OpenRouter API key is stored as a Supabase secret (`open_router_api`)
- No rate limiting implemented in the edge function itself

## PostgreSQL RPC Functions
The following stored procedures are called via `supabase.rpc()`:

| Function | Purpose | Called From |
|----------|---------|-------------|
| `get_db_size()` | Returns DB size in MB (numeric) | AdminSettings |
| `get_exact_db_size()` | Returns DB size in bytes (bigint) | AdminSettings |
| `get_db_storage_stats()` | Returns JSON with used/remaining space | AdminSettings |
| `deactivate_inactive_users(days)` | Batch-deactivates users who haven't logged in | AdminSettings |
| `is_admin()` | Checks if current user is admin/executive | Used in RLS policies |
| `is_team_lead(team_id)` | Checks if current user is a team lead | Used in RLS policies |

## Authentication Backend (Supabase Auth)

- **Provider**: Supabase Auth (GoTrue under the hood)
- **Methods**: Email/password, Google OAuth
- **JWT Expiry**: 1 hour (`jwt_expiry = 3600`)
- **Refresh Token**: Enabled with rotation
- **Session Storage**: localStorage with key `ideallabs-auth`

### Auth Operations Used
```javascript
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signUp({ email, password })
supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/' } })
supabase.auth.signOut()
supabase.auth.getSession()
supabase.auth.onAuthStateChange(callback)
supabase.auth.resetPasswordForEmail(email, { redirectTo: '...' })
supabase.auth.updateUser({ password: newPassword })
supabase.auth.refreshSession()
supabase.auth.getUser()
```

## Realtime Backend (Supabase Realtime)

Supabase Realtime is used for two purposes:

### 1. postgres_changes — Server → Client Push
Tables enabled for realtime (via `ALTER PUBLICATION supabase_realtime ADD TABLE ...`):
- `audit_logs`
- `reviews`
- `events`
- `announcements`
- `notifications`
- `announcement_views`
- `system_settings`

### 2. Presence — User Online Status
Channel: `online-users`
- Each authenticated user broadcasts their presence data
- Presence state is tracked in `PresenceProvider.jsx`

## Data Access Patterns

### SELECT (Read)
Most reads are straightforward `.select()` calls. Admins typically fetch all records; users fetch only their own (enforced by RLS).

### INSERT
```javascript
// Insert audit log on login
supabase.from('audit_logs').insert({ user_id, action_type, details })

// Insert revenue
supabase.from('monthly_revenues').insert({ user_id, team_id, revenue_month, amount })
```

### UPDATE / UPSERT
```javascript
// Upsert profile
supabase.from('profiles').upsert(profileData)

// Update system settings
supabase.from('system_settings').update({ maintenance_mode: true }).eq('id', 1)
```

### DELETE
```javascript
// Delete all DIS reports (admin only, danger operation)
supabase.from('dis_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
```

### Storage Operations
```javascript
// Upload file
supabase.storage.from('announcements_media').upload(filePath, file)

// Get public URL
supabase.storage.from('announcements_media').getPublicUrl(filePath)
```

## Error Handling Pattern
Most pages use:
```javascript
try {
  const { data, error } = await supabase.from('table').select()
  if (error) throw error
  setState(data)
} catch (err) {
  console.error('Error:', err)
  setErrorMsg(err.message)
}
```
No global error boundary. No centralized error logging service.

## Business Logic Location
All business logic lives in the **frontend React components** or **utility files**:
- `utils/revenueUtils.js` — revenue calculations, month formatting
- `utils/analyticsUtils.js` — analytics chart data calculations
- `utils/milestoneUtils.js` — milestone achievement calculations
- Individual page components contain their own data transformation logic

There is NO dedicated service layer.


---

### Source: 02-architecture/data-flow.md

﻿# Data Flow

## 1. User Registration Flow
```
User → Login page (Sign Up tab)
     → supabase.auth.signUp({ email, password })
     → Supabase Auth creates user in auth.users
     → App.jsx onAuthStateChange fires (SIGNED_IN event)
     → checkProfile() → supabase.from('profiles').select() → No profile found
     → setHasProfile(false)
     → Router → /complete-profile
     → User fills form (name, phone, team)
     → supabase.from('profiles').upsert({ is_deactivated: true, platform_role: 'employee' })
     → supabase.auth.updateUser({ data: { profile_completed: true } })
     → onComplete() → setHasProfile(true)
     → Router → /home (but account is deactivated)
     → User sees RestrictedAccessView ("Account deactivated")
     → Admin activates account in AdminUserControlPanel
     → supabase Realtime fires UPDATE on profiles for this user
     → App.jsx profileChannel listener → setIsDeactivated(false)
     → User can now access the platform
```

## 2. Login Flow
```
User → Login page (Login tab)
     → supabase.auth.signInWithPassword({ email, password })
     → Supabase Auth validates credentials
     → JWT issued, stored in localStorage (key: 'ideallabs-auth')
     → onAuthStateChange fires (SIGNED_IN)
     → checkProfile() → fetches profile row
     → Determines: isAdmin (platform_role = 'admin'|'executive'), featureAccess, isDeactivated
     → Logs to audit_logs: { action_type: 'login', details: { email, device } }
     → Router redirects:
         Admin → /admin/home
         New user (no profile) → /complete-profile
         Deactivated user → sees RestrictedAccessView
         Regular user → /home
```

## 3. Google OAuth Login Flow
```
User → "Continue with Google" button
     → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/' })
     → Browser redirects to Google consent page
     → Google redirects back to app with code
     → Supabase Auth handles code exchange
     → App.jsx detectSessionInUrl: true catches the URL params
     → Same flow as email login from checkProfile() onwards
     → If new Google user: name pre-filled from Google metadata in CompleteProfile
```

## 4. Logout Flow
```
User → Logout button (Navbar or Sidebar)
     → supabase.auth.signOut()
     → Supabase clears localStorage session
     → onAuthStateChange fires (SIGNED_OUT)
     → App.jsx handleSession → resets all state to null/false
     → Router → /
```

## 5. Password Reset Flow
```
User → /forgot-password page
     → Enters email
     → supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })
     → Supabase sends reset email (using Supabase's default email service)
     → User clicks link in email → redirected to /reset-password
     → detectSessionInUrl: true handles the hash params
     → User enters new password
     → supabase.auth.updateUser({ password: newPassword })
     → Redirect to /
```

## 6. Revenue Entry Flow (Admin)
```
Admin → /admin/revenue page
      → Selects user + team + month + amount
      → supabase.from('monthly_revenues').upsert({ user_id, team_id, revenue_month, amount, entered_by })
      → On conflict (user_id, team_id, revenue_month): updates existing record
      → supabase.from('audit_logs').insert({ action_type: 'revenue_added', details: {...} })
      → UI refreshes data
```

## 7. DIS Submission Flow (User)
```
User → /dis page
     → Selects date (defaults to today)
     → Checks system_settings for dis_locked and dis_allow_past
     → Checks holidays table for today's date
     → Checks if existing report exists for that date
     → Fills positive_leads, expected_revenue
     → supabase.from('dis_reports').upsert({ user_id, team_id, report_date, positive_leads, expected_revenue })
     → On conflict (user_id, team_id, report_date): updates
     → MTD revenue is displayed (fetched from monthly_revenues)
     → Admin sees submission on /admin/dis page
```

## 8. Attendance Check-In Flow (User)
```
User → /attendance page
     → System checks featureAccess.attendance (whitelist)
     → runChecks('in') triggered
     → Promise.all:
         [1] navigator.geolocation.getCurrentPosition() → GPS coordinates
         [2] fetch('https://api.ipify.org?format=json') → current IP
     → Compare GPS to office_locations (Haversine formula, 300m radius)
     → Compare IP to office_ips table
     → If in office: supabase.from('attendance_logs').insert({ status: 'present', ... })
     → If not in office: show Exception form
     → Exception submitted: supabase.from('attendance_logs').insert({ status: 'pending_approval', exception_reason: '...' })
     → Admin approves/rejects in /admin/attendance
```

## 9. AI Analytics Flow
```
Admin → /admin/ai-analytics page
      → Page fetches: profiles, monthly_revenues, dis_reports, teams
      → Pre-processes data: calculateTrends() → JSON summary object
      → User clicks "Generate AI Story" or asks custom question
      → Builds prompt string with the JSON summary
      → supabase.functions.invoke('ai-analytics', { body: { prompt } })
      → Edge Function → fetch('https://openrouter.ai/api/v1/chat/completions', ...)
                       → model: 'openai/gpt-4o'
      ← AI response (markdown text)
      ← ReactMarkdown renders the response
```

## 10. Announcement Push Notification Flow
```
Admin → /admin/announcements page
      → Creates announcement with title, content, media
      → supabase.storage.from('announcements_media').upload(...)
      → supabase.from('announcements').insert({ title, content, media_urls, status: 'published' })
      → Supabase Realtime fires INSERT event on announcements table
      → App.jsx annChannel listener fires on all connected clients
      → If announcement.status === 'published' AND Notification.permission === 'granted'
      → new Notification("New Announcement", { body: title, icon: '/allhands_logo_cropped.png' })
      → User's OS shows native browser push notification
```

## 11. Maintenance Mode Flow
```
Admin → /admin/settings page
      → Toggles maintenance_mode switch
      → supabase.from('system_settings').update({ maintenance_mode: true }).eq('id', 1)
      → Supabase Realtime fires UPDATE on system_settings
      → ALL connected clients receive update via App.jsx channel listener
      → setSystemSettings({ maintenance_mode: true })
      → For non-admin users: renders <MaintenanceScreen /> instead of the app
      → Admins are NOT blocked (can still access /admin/*)
```

## 12. Data Export Flow (Admin)
```
Admin → /admin/export-data page
      → Selects data sources (Users, Revenue, DIS, Attendance)
      → Selects field subset for each
      → Applies date range filters
      → supabase.from('profiles').select(...)
      → supabase.from('monthly_revenues').select(...)
      → supabase.from('dis_reports').select(...)
      → supabase.from('attendance_logs').select(...)
      → Joins team data client-side
      → XLSX.utils.aoa_to_sheet() → generates Excel workbook
      → Download to user's browser
```

## 13. Page Tracking Flow
```
User navigates to any page
     → PageTracker.jsx useEffect fires (dependency: location.pathname)
     → Maps pathname to human-readable page name
     → supabase.from('audit_logs').insert({ 
         user_id, 
         action_type: 'user_page_view' or 'admin_page_view',
         details: { path, page_name }
       })
     → Visible in /admin/auditlogs under "Users Page Activity" tab
```


---


## 8. DATABASE ARCHITECTURE & SCHEMA

### Source: 05-database/database-overview.md

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


---

### Source: 05-database/tables.md

﻿# Database Tables

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


---

### Source: 05-database/relationships.md

﻿# Database Relationships

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


---

### Source: 05-database/security-policies.md

﻿# Database Security Policies (RLS)

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


---


## 9. AUTHENTICATION & SECURITY

### Source: 06-authentication/authentication.md

﻿# Authentication

## Authentication Provider
**Supabase Auth** (GoTrue-based JWT authentication)

## Login Methods
1. **Email/Password** — standard email + password authentication
2. **Google OAuth** — "Continue with Google" button

## Authentication Implementation

### Supabase Client Setup (`supabaseClient.js`)
```javascript
createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Keep session in localStorage
    storageKey: 'ideallabs-auth', // localStorage key
    storage: window.localStorage,
    autoRefreshToken: true,       // Auto-refresh JWT before expiry
    detectSessionInUrl: true,     // Handle OAuth callbacks
  }
})
```

### Login Page (`Login.jsx`)
- Toggle between Login and Sign-Up modes
- Email/Password:
  - Login: `supabase.auth.signInWithPassword({ email, password })`
  - Sign Up: `supabase.auth.signUp({ email, password })`
- Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } })`
- Forgot password link → `/forgot-password`

### Session Management (`App.jsx`)
- On mount: `supabase.auth.getSession()` — restores session from localStorage
- Subscribes to `supabase.auth.onAuthStateChange()` for ongoing changes
- Race condition prevention: `profileFetchedFor` ref tracks which user's profile has been loaded
- If same user fires multiple auth events, only one profile fetch occurs

### Profile Check Logic
After authentication, `checkProfile()` runs:
1. Queries `profiles` table: `first_name, profile_completed, platform_role, is_deactivated, feature_access`
2. Sets: `isAdmin`, `isExecutive`, `featureAccess`, `isDeactivated`, `hasProfile`
3. Writes to `audit_logs`: `{ action_type: 'login', details: { email, device } }`
4. If no profile found: checks `auth.user.user_metadata.profile_completed`
5. If auth user invalid (deleted on server): signs out automatically

### Fallback Pattern
If `profiles` query fails (e.g., `is_deactivated` column not yet migrated), falls back to:
```javascript
supabase.from('profiles').select('first_name, profile_completed, platform_role, feature_access')
```

## JWT Configuration
- **Expiry**: 1 hour (3600 seconds)
- **Refresh Token**: Enabled with rotation
- **Reuse Interval**: 10 seconds (prevents token replay attacks)

## Email Confirmation
- `enable_confirmations = false` (per supabase/config.toml)
- New users can sign in immediately without email confirmation

## Password Reset Flow
1. User visits `/forgot-password`
2. Submits email
3. `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
4. Supabase sends email with reset link
5. Link redirects to `/reset-password` with hash params
6. `detectSessionInUrl: true` handles the hash automatically
7. User sets new password via `supabase.auth.updateUser({ password: newPassword })`

## Session Persistence
- Sessions persist in `localStorage` under key `ideallabs-auth`
- `autoRefreshToken: true` silently refreshes before expiry
- On tab switch: if same user already loaded, auth state change is ignored (optimization)

## Logout
```javascript
await supabase.auth.signOut()
// localStorage key 'ideallabs-auth' cleared automatically
// All React state reset to null/false
// Navigate to '/'
```

## New User Flow
1. User signs up → `auth.users` row created
2. No `profiles` row exists yet
3. `hasProfile` set to `false`
4. Redirected to `/complete-profile`
5. Profile created with `is_deactivated: true`
6. Redirected to `/home` but sees "Access Restricted" view
7. Admin must activate the account

## Google OAuth Pre-fill
When user signs in with Google for the first time:
- `user.user_metadata.full_name` / `given_name` / `family_name` are pre-filled in `CompleteProfile.jsx`
- User still must complete the profile form

## Authentication State in React
All auth state is managed in `App.jsx` and passed down:
```
App.jsx state
  ├── user (Supabase auth user object)
  ├── hasProfile (boolean)
  ├── isAdmin (boolean — true for admin AND executive)
  ├── isExecutive (boolean — true only for executive role)
  ├── featureAccess (JSONB object or null)
  ├── isDeactivated (boolean)
  └── loading (boolean — initial auth check in progress)
```

## Known Issues
1. **No email confirmation required** — Anyone who gets an invite link can sign up and exist in auth.users even before an admin activates them
2. **New accounts start as `is_deactivated: true`** — Intentional flow but creates a UX gap (user sees "access restricted" with no clear next step)
3. **No account lockout** — No rate limiting on failed login attempts (Supabase default: 30 sign-ins per 5 minutes)


---

### Source: 09-security/security-analysis.md

﻿# Security Analysis

## Summary Rating

| Category | Level | Notes |
|----------|-------|-------|
| Authentication | GOOD | Supabase Auth, JWT, Google OAuth |
| Data Authorization (DB) | MEDIUM | RLS enabled, but some gaps |
| Frontend Authorization | WEAK | Client-side checks easily bypassed |
| Secret Management | MEDIUM | API keys safe in Edge Functions, but no .env separation |
| Data Privacy | CRITICAL | Real user data files committed to repository |
| Input Validation | WEAK | No server-side validation layer |
| Session Security | GOOD | JWT rotation, auto-refresh |
| Transport Security | GOOD | HTTPS enforced by Vercel and Supabase |
| Dependency Security | UNKNOWN | No audit run |

---

## CRITICAL Issues

### 1. Real User Data in Repository
**Severity**: CRITICAL  
**Files**:
- `users_export.csv` — Contains real employee names, emails, phone numbers, roles
- `users_teams.xlsx` — Employee-team assignments
- `users_teams_final.xlsx` — Employee-team assignments (updated version)

**Risk**: Data exposure, privacy violations, potential legal issues (GDPR/personal data)  
**Action Required**: Immediately remove from repository, rotate if already pushed to a remote

---

## HIGH Issues

### 2. Open Speaker Table RLS
**Severity**: HIGH  
**Tables**: `speakers`, `speaker_timeline_events`  
**Details**: Any authenticated user can create, modify, or read any speaker record. There is no ownership check.  
**Code Evidence**: RLS policies use `USING (true)` for INSERT and UPDATE

### 3. AI Edge Function — No JWT Verification
**Severity**: HIGH  
**File**: `supabase/config.toml` → `verify_jwt = false` for `ai-analytics` function  
**Details**: Anyone with the Supabase project URL can call the Edge Function without authentication. This can be abused to make arbitrary AI calls at company cost.  
**Risk**: Financial (unbounded API costs), prompt injection attacks  
**Config**:
```toml
[functions.ai-analytics]
verify_jwt = false
```

### 4. No Rate Limiting on AI Endpoint
**Severity**: HIGH  
**Details**: The `ai-analytics` Edge Function has no rate limiting. Combined with no JWT verification, a bad actor could make thousands of AI calls per minute.

---

## MEDIUM Issues

### 5. Hardcoded Supabase Credentials
**Severity**: MEDIUM  
**File**: `src/supabaseClient.js`  
**Details**: Supabase URL and anon key are hardcoded as string literals. While anon keys are designed to be "public" per Supabase's model (RLS protects data), this means:
- Credentials cannot be rotated without a code change and redeploy
- No environment separation (dev vs prod use the same credentials)
- Anyone who views the source can access the anon API

### 6. Client-Side-Only Authorization
**Severity**: MEDIUM  
**Details**: Feature access flags (`featureAccess.aiAnalytics`, `featureAccess.attendance`, etc.) are only enforced in the React UI. An authenticated admin/executive can bypass all feature access restrictions by calling the Supabase API directly.

**Example**: An executive with `featureAccess.settings = false` can still call:
```
POST https://pzalalbpxlwtcnmkaegb.supabase.co/rest/v1/system_settings
```
because the database RLS policy uses `is_admin()` which returns true for executives.

### 7. Overly Permissive RLS Policies
**Severity**: MEDIUM  
**Details**:
- `announcements` admin policy uses `USING (true)` — no check on who created it
- `announcement_views` SELECT uses `OR true` — exposes all users' read receipts
- `notification_reads` SELECT uses `OR true` — exposes all users' read receipts

### 8. No Development vs. Production Separation
**Severity**: MEDIUM  
**Details**: Both local development and production use the same Supabase project. Developer testing modifies production data. There is no staging environment.

### 9. No Input Sanitization/Validation
**Severity**: MEDIUM  
**Details**: All user inputs go directly to Supabase without server-side validation:
- Revenue amounts could be negative (no server constraint found)
- No length limits enforced server-side
- XSS risk in rich text editor content (Jodit, React Quill) stored as HTML in `announcements.content`

---

## LOW Issues

### 10. ipify.org Dependency
**Severity**: LOW  
**Details**: Attendance check-in depends on `api.ipify.org`, a free third-party service with no SLA. If it's unavailable, IP-based attendance fails.

### 11. Single Master Admin Email Hardcoded
**Severity**: LOW  
**Details**: `signatureglobalconferences@gmail.com` is hardcoded in 6+ locations in the codebase. If the master admin needs to change email, a code change and redeploy is required.

### 12. No Audit Trail for Sensitive Operations
**Severity**: LOW  
**Details**: The audit_logs table tracks revenue changes and page views, but does NOT track:
- Team member additions/removals
- Target changes
- Account activation/deactivation
- System settings changes

### 13. Unrestricted Signup
**Severity**: LOW  
**Details**: Public signup is enabled (anyone can create an account). Accounts start deactivated, so there's no immediate access, but unused auth.users records accumulate.

---

## INFORMATIONAL

### 14. No error tracking / monitoring
No Sentry, Datadog, or equivalent. Runtime errors are only logged to browser console.

### 15. No Content Security Policy (CSP)
No CSP headers configured in `vercel.json`. This increases XSS risk from stored HTML content (announcements rich text).

### 16. Electron webSecurity not explicitly enabled
`electron/main.cjs` has `webSecurity` commented out. The default is `true` (enabled), which is correct. But an explicit `webSecurity: true` would be clearer.

### 17. Database Schema Gaps
Two major tables (`dis_reports`, `monthly_targets`) are not documented in `database_schema.sql`. Their RLS policies are unknown without direct Supabase dashboard access.


---


## 10. FEATURES & ROUTES

### Source: 03-features/feature-inventory.md

# Feature Inventory

## Core Features

### 1. Authentication
**Status**: Core  
**Purpose**: Secure access control to the platform  
**Who Can Use**: Everyone  
**Methods**: Email/password, Google OAuth  
**Pages**: `/`, `/forgot-password`, `/reset-password`, `/complete-profile`  
**Database**: `auth.users` (Supabase), `profiles`  
**Notes**: New accounts start as deactivated; admin must manually activate

---

### 2. Admin Dashboard
**Status**: Core  
**Purpose**: Real-time overview of company performance  
**Who Can Use**: Admin, Executive  
**Page**: `/admin/home`  
**File**: `AdminHome.jsx` (58KB)  
**Features**:
- Ticker tape of team revenues
- KPI cards: total revenue, DIS submissions today, active teams, top performers
- Revenue trend chart (area chart)
- Team comparison charts (bar chart)
- Pie chart: team revenue distribution
- Who submitted DIS today
- Sales analytics summary (if sales logs exist)
- In-memory cache to avoid re-fetching on remount

---

### 3. Revenue Management (Admin)
**Status**: Core  
**Purpose**: Track and manage monthly revenue for each employee  
**Who Can Use**: Admin, Executive (view only)  
**Page**: `/admin/revenue`  
**File**: `AdminRevenue.jsx` (53KB)  
**Features**:
- Add/edit monthly revenue per user per team
- Revenue vs Target comparison
- Period filters (current month, trailing months)
- Team filtering
- Revenue leaderboard
- Swipe panels on mobile

---

### 4. Revenue Tracking (User)
**Status**: Core  
**Purpose**: Employees view their own revenue history  
**Who Can Use**: Users with `has_revenue_logging !== false`  
**Page**: `/revenue`  
**File**: `UserRevenue.jsx` (55KB)  
**Features**:
- Current month revenue display
- Monthly target progress
- Historical chart
- Team revenue context

---

### 5. DIS — Daily Information System (User)
**Status**: Core  
**Purpose**: Daily self-reporting of positive leads and expected revenue  
**Who Can Use**: All users  
**Page**: `/dis`  
**File**: `UserDis.jsx` (33KB)  
**Features**:
- Submit for primary and secondary team
- Date selection with holiday blocking
- Edit existing submission
- System lock support (dis_locked setting)
- MTD revenue display
- Past submission restriction toggle

---

### 6. DIS Reports (Admin)
**Status**: Core  
**Purpose**: Monitor who has and hasn't submitted DIS each day  
**Who Can Use**: Admin, Executive  
**Page**: `/admin/dis`  
**File**: `AdminDis.jsx` (33KB)  
**Features**:
- Date picker
- Team filter
- Submitted vs Missing members list
- Holiday detection and display
- Month-to-date report summary
- PDF export of DIS reports

---

### 7. Team Management (Admin)
**Status**: Core  
**Purpose**: Create and manage teams and team memberships  
**Who Can Use**: Admin  
**Page**: `/admin/teams`  
**File**: `AdminTeams.jsx` (83KB — LARGEST FILE)  
**Features**:
- Create/rename/delete teams
- Add/remove members
- Set team roles (lead/member)
- Set monthly targets per member per team
- View team revenue summaries
- View DIS submission stats (submitted vs missed)
- Download team revenue as JPEG

---

### 8. User Management (Admin)
**Status**: Core  
**Purpose**: Manage all employee accounts  
**Who Can Use**: Admin  
**Page**: `/admin/users`  
**File**: `AdminUsers.jsx` (70KB)  
**Features**:
- View all users with search/filter
- Activate/deactivate accounts
- View user details
- Link to individual user control panel

---

### 9. User Control Panel (Admin)
**Status**: Core  
**Purpose**: Per-user deep management panel  
**Who Can Use**: Admin  
**Page**: `/admin/users/:id`  
**File**: `AdminUserControlPanel.jsx` (37KB)  
**Features**:
- User profile details
- Revenue history for this user
- DIS history
- Audit log for this user
- Activate/deactivate toggle
- Feature flags management

---

## Important Features

### 10. Analytics Dashboard
**Status**: Important  
**Purpose**: Visual analytics with charts  
**Who Can Use**: Admin, Executive  
**Page**: `/admin/analytics`  
**File**: `AdminAnalytics.jsx` (34KB)  
**Features**:
- Monthly revenue trend line
- Expected vs Actual revenue (DIS vs actual)
- Team comparison
- Individual member breakdown
- Demo data seeding (development aid)

---

### 11. AI Analytics
**Status**: Important  
**Purpose**: AI-powered business insights  
**Who Can Use**: Admin with `featureAccess.aiAnalytics = true`  
**Page**: `/admin/ai-analytics`  
**File**: `AdminAiAnalytics.jsx` (17KB)  
**External Service**: OpenRouter API → GPT-4o  
**Features**:
- Auto-generated AI story from revenue/DIS/profile data
- Custom question input
- Markdown-rendered AI response

---

### 12. Attendance Tracking
**Status**: Important (Recently Upgraded)  
**Purpose**: GPS + IP-based employee attendance check-in/out and comprehensive time tracking  
**Who Can Use**: Users with `featureAccess.attendance = true` or master admin  
**Pages**: `/attendance` (user), `/admin/attendance` (admin)  
**Files**: `src/pages/user/Attendance.jsx`, `src/pages/admin/attendance/` (modularized: `AdminAttendance.jsx`, `AttendanceFilterBar.jsx`, `AttendanceLogsList.jsx`, `AttendanceSettings.jsx`)  
**Features**:
- GPS location validation (Haversine formula, customizable radius per office)
- Fast-path GPS bypass for WFH users or missing office locations
- Low-accuracy (Wi-Fi/IP) geolocation fallback if high-accuracy GPS times out
- IP address validation (compared to office_ips table)
- WFH bypass flag per user
- Exception request flow (with reason)
- Automatic Late Arrival tracking (after 09:40 AM) and Early Departure tracking (before 06:00 PM) handled strictly via UI presentation layer
- **Admin Dashboard**:
  - Unified filter bar (Search, Team, User, Status, Date)
  - Exception filtering
  - Date picker defaulting to current day
  - Team access toggles
- **User Dashboard**:
  - Daily Punch-In/Out interface
  - "My Logs" tab for historical monthly viewing
  - Mobile swipe gestures for month navigation
  - Personal Late/Early badges and Exception notes display

---

### 13. Announcements
**Status**: Important  
**Purpose**: Company-wide announcements with media  
**Who Can Use**: All users (view), Admin (create/manage)  
**Pages**: `/announcements` (user), `/admin/announcements` (admin)  
**Files**: `UserAnnouncements.jsx`, `AdminAnnouncements.jsx`  
**External Service**: Supabase Storage (announcements_media bucket)  
**Features**:
- Rich text editor (Jodit)
- Media upload (images/videos)
- Pin announcements
- Draft/published status
- Read receipts (announcement_views table)
- Analytics (who read it)
- Browser push notifications on new announcements
- Notification management (separate notifications table)

---

### 14. Leaderboard
**Status**: Important (conditionally shown)  
**Purpose**: Competitive ranking of team/member performance  
**Who Can Use**: All users (if `show_leaderboard = true` in system_settings); team leads can access from navbar  
**Pages**: `/leaderboard`, `/admin/leaderboard`  
**File**: `Leaderboard.jsx` (23KB — shared component)  
**Features**:
- Top performers by revenue
- Team-level rankings
- Period filter

---

### 15. Milestones
**Status**: Important  
**Purpose**: Historical achievement records  
**Who Can Use**: All users  
**Pages**: `/milestones`, `/admin/milestones`  
**File**: `Milestones.jsx` (31KB — shared)  
**Features**:
- Highest revenue in a month (member)
- Highest revenue in a month (team)
- Most consistent DIS submitter
- Most positive leads in a month
- Team lead with highest team revenue

---

### 16. Reviews / Write-Ups
**Status**: Important  
**Purpose**: Post-event review and write-up submission system  
**Who Can Use**: All users (submit), Admin (approve, manage events)  
**Pages**: `/reviews`, `/admin/reviews`, `/admin/write-ups`  
**Files**: `UserReviews.jsx`, `AdminReviews.jsx`, `AdminWriteUps.jsx`  
**External Service**: Supabase Storage (review_photos bucket)  
**Features**:
- Admin creates events
- Users submit reviews (title, context, optional photo)
- Admin provides feedback and changes status
- Pen name support for anonymity
- Photo upload
- Paste control (allow_review_paste setting)
- Write-up management with social media links

---

## Secondary Features

### 17. Team Analytics (User)
**Status**: Secondary  
**Purpose**: Charts and insights for team leads  
**Who Can Use**: Team leads  
**Page**: `/team-analytics`  
**File**: `TeamAnalytics.jsx` (37KB)

---

### 18. Team Management (User/Lead)
**Status**: Secondary  
**Purpose**: Team lead view of team performance and targets  
**Who Can Use**: Team leads  
**Page**: `/team-management`  
**File**: `TeamManagement.jsx` (56KB)

---

### 19. Team DIS Report (User/Lead)
**Status**: Secondary  
**Purpose**: Audit DIS submissions for a team  
**Who Can Use**: Team leads  
**Page**: `/team-dis-report`  
**File**: `TeamDisReport.jsx` (21KB)

---

### 20. Sales Executive Analytics
**Status**: Secondary  
**Purpose**: Call and speaker interaction logging for sales executives  
**Who Can Use**: Users with `is_sales_executive = true`  
**Page**: `/sales-analytics`  
**File**: `SalesExecutive.jsx` (20KB)  
**Database**: `sales_analytics` table

---

### 21. Revenue History (User)
**Status**: Secondary  
**Purpose**: Full revenue history with filters  
**Who Can Use**: All users  
**Pages**: `/revenue-history`, `/historical-revenue`  
**Files**: `RevenueHistory.jsx`, `UserHistoricalRevenue.jsx`

---

## Administrative Features

### 22. Audit Logs
**Status**: Administrative  
**Purpose**: System activity audit trail  
**Who Can Use**: Admin with appropriate `featureAccess.auditLogs_*` flags  
**Page**: `/admin/auditlogs`  
**File**: `AdminAuditLogs.jsx`  
**Tabs**:
- Revenue Activity
- Login Activity
- Active Members (real-time via Presence)
- Admin Activity
- Users Page Activity
- Admin Page Activity

---

### 23. System Settings
**Status**: Administrative  
**Purpose**: Global platform configuration  
**Who Can Use**: Admin with `featureAccess.settings = true`  
**Page**: `/admin/settings`  
**File**: `AdminSettings.jsx`  
**Settings**:
- Maintenance mode toggle
- Show/hide leaderboard
- DIS lock toggle
- DIS allow past submissions
- Holiday calendar management
- Review paste control
- Theme toggle
- DB stats display
- Dangerous data operations (delete all DIS, deactivate inactive users)

---

### 24. Role Manager / Feature Access
**Status**: Administrative  
**Purpose**: Manage feature access for admins and executives  
**Who Can Use**: MASTER ADMIN ONLY (`signatureglobalconferences@gmail.com`)  
**Page**: `/admin/role-manager`  
**File**: `AdminRoleManager.jsx`  
**Features**:
- Per-user feature flag management
- Activate/deactivate admin/executive accounts
- Granular audit log tab access control

---

### 25. Data Export
**Status**: Administrative  
**Purpose**: Export operational data to Excel  
**Who Can Use**: Admin  
**Page**: `/admin/export-data`  
**File**: `AdminExportData.jsx`  
**Exports**: Users, Revenue, DIS Reports, Attendance

---

### 26. Copy Stats Tool
**Status**: Administrative  
**Purpose**: Quick copy/export of revenue and DIS data as formatted text, JPEG, or PDF  
**Who Can Use**: Admin  
**Page**: `/admin/copystats`  
**File**: `CopyStats.jsx` (61KB)  
**Features**:
- Revenue bracket analysis
- DIS summary export
- html2canvas for JPEG export
- jsPDF for PDF export (including DIS reports)
- Mobile share API support
- Image download support on mobile devices

---

## Supporting Features

### 27. Speaker Management (CopyStats embedded)
**Status**: Supporting  
**Purpose**: CRM-like tracking of conference speakers  
**Database**: `speakers`, `speaker_timeline_events`  
**Notes**: Embedded within CopyStats.jsx (NOT a separate page). Status management, payment tracking, timeline log.

---

### 28. Virtual Events / Templates
**Status**: Supporting (Early/In Progress)  
**Purpose**: Generate speaker pass invitation documents  
**Pages**: `/virtual-events`, `/virtual-events/template3`, `/virtual-events/testing`  
**Files**: `VirtualTemplatesHome.jsx`, `Template3.jsx`, `Testing.jsx`  
**Notes**: Only one template shown (Speaker Pass Invite). `Testing.jsx` (56KB) appears to be an active development area.

---

### 29. User Settings
**Status**: Supporting  
**Purpose**: User preferences  
**Page**: `/settings`  
**File**: `UserSettings.jsx` (6KB)  
**Features**: Navigation preference (top navbar vs sidebar), theme toggle

---

### 30. Profile Settings
**Status**: Supporting  
**Purpose**: Edit user profile information  
**Page**: `/profile`  
**File**: `ProfileSettings.jsx` (12KB)


---

### Source: 04-routes/route-inventory.md

﻿# Route Inventory

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


---


## 11. INTEGRATIONS & DEPLOYMENT

### Source: 07-integrations/integrations.md

﻿# External Integrations

## 1. Supabase
**Type**: Backend-as-a-Service (BaaS)  
**URL**: `https://pzalalbpxlwtcnmkaegb.supabase.co`  
**Purpose**: Primary backend infrastructure  
**Services Used**:
- PostgreSQL database (PostgREST API)
- Supabase Auth (GoTrue JWT)
- Supabase Realtime (WebSocket, Presence)
- Supabase Storage (file uploads)
- Supabase Edge Functions (Deno)

**Configuration File**: `supabase/config.toml` (local dev config)  
**Client**: `@supabase/supabase-js ^2.106.1`  
**Authentication Method**: Anonymous key (public) + JWT for user operations

---

## 2. OpenRouter API
**Type**: LLM Proxy API  
**URL**: `https://openrouter.ai/api/v1/chat/completions`  
**Purpose**: AI Analytics — translating business data into plain-language insights  
**Model**: `openai/gpt-4o`  
**Called From**: Supabase Edge Function (`supabase/functions/ai-analytics/index.ts`)  
**Authentication**: API key stored as Supabase secret (`open_router_api`)  
**Headers Used**:
```
Authorization: Bearer <open_router_api_key>
HTTP-Referer: https://ideallabs.io
X-Title: IdeallabsAI Analytics
```

**Request Format**: OpenAI-compatible chat completions format  
**Security Notes**: 
- API key is NOT exposed to the browser (correctly stored in Edge Function)
- Edge Function JWT verification is DISABLED (anyone can invoke it without auth)

---

## 3. Vercel
**Type**: Hosting / CDN Platform  
**Purpose**: Web deployment and hosting  
**Configuration**: `vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
This enables SPA routing (all paths serve `index.html`).  
**Vercel Speed Insights**: `@vercel/speed-insights ^2.0.0` — installed and REQUIRES VERIFICATION whether it is initialized in the app code.  
**Deployment**: Auto-deploy on git push (REQUIRES VERIFICATION of which branch triggers production)

---

## 4. Google OAuth
**Type**: Identity Provider  
**Purpose**: Social login ("Continue with Google")  
**Configured In**: Supabase Auth settings (Supabase dashboard, NOT in code files)  
**Redirect URL**: `window.location.origin + '/'`  
**Scope**: Default Google OAuth scopes (email, profile)

---

## 5. Geolocation API (Browser)
**Type**: Browser Web API (not external service)  
**URL**: `navigator.geolocation.getCurrentPosition()`  
**Purpose**: GPS check-in for attendance validation  
**Notes**:
- Uses Haversine formula to calculate distance from office coordinates
- User must grant location permission
- Default radius: 300 meters from office location

---

## 6. IP Geolocation (ipify)
**Type**: External API  
**URL**: `https://api.ipify.org?format=json`  
**Purpose**: Fetch user's current public IP for attendance validation  
**Authentication**: None (free public API)  
**Notes**:
- Called directly from browser
- Returns IP string only: `{"ip": "1.2.3.4"}`
- IP compared against `office_ips` table
- **Reliability concern**: ipify is a free service with no SLA. If it goes down, IP-based attendance check will fail.

---

## 7. Web Notifications API (Browser)
**Type**: Browser Web API  
**Purpose**: Native OS push notifications for new announcements  
**How It Works**:
1. Browser prompts user for notification permission
2. When new announcement is inserted, App.jsx fires a browser notification
3. Uses `new Notification(title, { body, icon })` (NOT service workers)
**Limitations**: 
- Works only when the browser/tab is open (NOT true background push)
- No service worker registered → notifications stop if the app is not open

---

## 8. Web Share API (Browser)
**Type**: Browser Web API  
**Purpose**: Share exported images on mobile  
**Used In**: `CopyStats.jsx`  
**Behavior**: Falls back to standard download on desktop or when `navigator.canShare` is false

---

## 9. html2canvas
**Type**: NPM library  
**Version**: ^1.4.1  
**Purpose**: Convert DOM elements to JPEG images for export  
**Used In**: `CopyStats.jsx` (revenue and DIS reports as images)

---

## 10. jsPDF
**Type**: NPM library  
**Version**: ^4.2.1  
**Purpose**: Generate PDF documents  
**Used In**: `CopyStats.jsx` (DIS report PDF export)

---

## 11. xlsx (SheetJS)
**Type**: NPM library  
**Version**: ^0.18.5 (listed as devDependency)  
**Purpose**: Generate Excel (.xlsx) files  
**Used In**: `AdminExportData.jsx`  
**Note**: Listed as devDependency despite being used at runtime — this may cause build issues in strict production environments.

---

## Integration Risk Assessment

| Integration | Availability | Cost | Risk |
|-------------|-------------|------|------|
| Supabase | High (managed, SLA) | Paid plan | LOW |
| OpenRouter/GPT-4o | High | Per-token cost | MEDIUM (cost control) |
| Vercel | High (CDN, SLA) | Paid plan | LOW |
| Google OAuth | Very High | Free | LOW |
| ipify.org | Unknown | Free | HIGH (no SLA, external dependency) |
| Browser Notifications | Browser-dependent | Free | MEDIUM (requires tab open) |
| html2canvas/jsPDF | npm dependency | Free | LOW |
| xlsx | npm dependency | Free | LOW |

---

## Missing Integrations
- No email service (Supabase default mailer used for auth emails)
- No SMS/WhatsApp notifications
- No analytics platform (e.g., Google Analytics, Mixpanel) — only Vercel Speed Insights
- No error tracking (e.g., Sentry, Datadog)
- No calendar integration
- No Slack/Teams notifications


---

### Source: 08-deployment/deployment.md

﻿# Deployment & Hosting

## Web Deployment (Primary — Vercel)

### Platform
**Vercel** — Static SPA hosting with global CDN

### Configuration
`vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This catches all URL paths and serves `index.html`, enabling client-side routing.

### Build Process
```bash
npm run build  # Runs vite build → creates dist/ directory
```

Vite configuration (`vite.config.js`):
- Plugin: `@vitejs/plugin-react` 
- Output: `dist/` directory
- No code splitting configured → single bundle

### Environment Variables
- **Supabase URL and Anon Key are HARDCODED** in `src/supabaseClient.js`
- No `.env` files found in the repository
- This means the same credentials are used for all environments (dev and production)

### Speed Insights
`@vercel/speed-insights` is installed as a dependency. Whether it is initialized in the app (e.g., in main.jsx or App.jsx) requires verification.

### Deploy Trigger
REQUIRES VERIFICATION: Which git branch/event triggers auto-deploy on Vercel

---

## Desktop Deployment (Electron)

### Platform
Electron (cross-platform desktop wrapper)

### Configuration
- App ID: `com.ideallabs.allhands`
- Icon: `public/allhands_logo_cropped.png`
- Default window: 1200×800px
- `autoHideMenuBar: true`
- `webSecurity` is commented out (enabled by default)

### Entry Point
`electron/main.cjs`

### Build
```bash
# Build scripts referenced in package.json (REQUIRES VERIFICATION)
# electron-builder ^26.15.3 for packaging
```

### Dev Mode
```bash
npm run dev  # Starts Vite dev server on :5173
# Concurrently: electron --dev flag + vite dev server
```

Electron in dev mode loads `http://127.0.0.1:5173`.  
Electron in production loads `dist/index.html`.

### Preload Script
`electron/preload.cjs` exists — contents REQUIRE INSPECTION for any native API exposure.

---

## Mobile Deployment (Capacitor/Android)

### Platform
Capacitor — WebView wrapper for Android

### Configuration
`capacitor.config.json`:
```json
{
  "appId": "com.ideallabs.myapp",
  "appName": "MyApp",
  "webDir": "dist"
}
```

**Note**: App ID `com.ideallabs.myapp` and name "MyApp" are different from the Electron config. These appear to be placeholder values.

### Status
REQUIRES VERIFICATION — whether the Android app has been built, signed, and distributed.

### Android Project
`android/` directory exists in the repository. Capacitor uses the same web build (`dist/`) inside a WebView.

---

## Local Development

### Prerequisites
- Node.js (version REQUIRES VERIFICATION)
- npm

### Start Command
```bash
npm run dev
# Starts Vite dev server at http://localhost:5173
```

### Supabase Local Dev
`supabase/config.toml` is present but local Supabase is not required — the app points to the production Supabase project by default (hardcoded credentials).

---

## CI/CD

**Current State**: NO CI/CD pipeline configuration found.

- No `.github/workflows/` directory
- No `Jenkinsfile` or equivalent
- Deployment likely triggered by manual push to a git branch that Vercel monitors

---

## Deployment Risks

1. **No environment separation** — Dev and production use the same Supabase project and credentials. A developer testing locally modifies real production data.

2. **Hardcoded credentials** — Supabase URL and anon key are committed to the repository. While anon keys are designed to be public, this practice makes rotating credentials difficult.

3. **No staging environment** — Any code push directly affects production.

4. **Single bundle** — No code splitting means a large initial JavaScript bundle is sent to all users regardless of their role.

5. **Missing build verification** — No automated tests run before deployment. The build could fail or ship broken code without detection.

6. **Sensitive files in repository** — `users_export.csv`, `users_teams.xlsx`, `users_teams_final.xlsx` contain real user data and are present in the repository root.

---

## npm Scripts (from package.json)

```json
{
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "electron": "electron .",
  "electron-dev": "concurrently ...",
  "electron-build": "electron-builder ..."
}
```
(Exact script values REQUIRE VERIFICATION against package.json)


---


## 12. PERFORMANCE & TESTING

### Source: 10-performance/performance-analysis.md

﻿# Performance Analysis

## Current Performance Characteristics

### Bundle Size Concerns
- **No code splitting** configured in `vite.config.js`
- All routes, admin pages, and user pages are bundled into a single JS file
- Large dependencies included for all users regardless of role (Recharts, Jodit, React Quill, html2canvas, jsPDF, XLSX)
- Estimated uncompressed bundle: REQUIRES MEASUREMENT (likely 2-5MB)

### In-Memory Caching (Page-Level)
Several admin pages use module-level caching to avoid re-fetching data on component remount:

```javascript
let adminHomeCache = { loaded: false, teams: [], profiles: [], revenues: [], ... }
let adminRevCache = { loaded: false, ... }
let adminDisCache = { loaded: false, ... }
let adminAnalyticsCache = { ... }
```

**Pros**: Avoids redundant Supabase API calls for the same session  
**Cons**: 
- Cache is never invalidated (data can be stale within a session)
- No cache expiry or invalidation strategy
- Stale data requires full page reload to refresh

### No React Query / SWR
No data fetching library. All caching is manual and inconsistent. Some pages always re-fetch on mount (no caching at all).

### Large Components
Components with significant render complexity:

| Component | Size | Concern |
|-----------|------|---------|
| AdminTeams.jsx | 83KB | 1 component managing all team operations |
| AdminUsers.jsx | 70KB | All user management in one component |
| CopyStats.jsx | 61KB | Multiple chart types + export logic combined |
| AdminHome.jsx | 58KB | Dashboard with multiple chart types |
| UserRevenue.jsx | 55KB | Complex form + history in one component |

### Recharts Performance
Multiple pages render several Recharts charts simultaneously. Recharts renders SVG via React, which can be slow for large datasets. No virtualization or data sampling is applied.

---

## Realtime WebSocket Connections

The app maintains multiple concurrent WebSocket connections:

| Connection | Purpose | Always Open |
|-----------|---------|-------------|
| presence (online-users) | User online tracking | YES |
| system_settings | Maintenance mode | YES |
| announcements | Push notifications | YES |
| profiles (user-specific) | Deactivation detection | YES |
| Admin pages (various) | Live data updates | Only on specific pages |

**Concern**: 4+ always-open WebSocket connections per user, even when idle. This is a minor scalability concern at small scale.

---

## Known Performance Anti-Patterns

### 1. No Pagination
- `AdminUsers.jsx` fetches ALL profiles
- `AdminDis.jsx` fetches reports for selected date only (good)
- `AdminRevenue.jsx` fetches ALL revenues
- `CopyStats.jsx` fetches ALL revenues + ALL DIS reports
- At scale (100+ users, 12+ months), these queries will return very large datasets

### 2. Parallel Data Fetching (Good Pattern Used)
Most pages use `Promise.all()` for parallel fetching:
```javascript
const [teamsRes, profilesRes, revRes] = await Promise.all([
  supabase.from('teams').select('*'),
  supabase.from('profiles').select('*'),
  supabase.from('monthly_revenues').select('*')
])
```
This is efficient and avoids waterfall fetching.

### 3. requestAnimationFrame in AdminHome Ticker
The ticker tape animation uses `requestAnimationFrame` in a tight loop. It includes cleanup:
```javascript
return () => cancelAnimationFrame(raf)
```
This is correctly implemented.

### 4. No Image Optimization
- Public images served from `public/` directory
- No WebP conversion, no lazy loading, no responsive images
- Supabase Storage media is served as-is

### 5. Large CSS File
`index.css` is ~75KB uncompressed. While it compresses well with gzip, it is a large single CSS file with no critical CSS extraction.

---

## Performance Opportunities

1. **Code Splitting** — Implement dynamic imports for admin routes (they're never used by regular employees)
2. **Pagination** — Add server-side pagination to Users, Revenue, and DIS admin pages
3. **React Query** — Replace manual caching with proper cache invalidation
4. **Virtualization** — Use react-window or similar for large lists
5. **Lazy Load Images** — Add `loading="lazy"` to media in announcements
6. **Bundle Analysis** — Run `vite-bundle-visualizer` to identify large dependencies

---

## Scalability Assessment

| Scale | Status |
|-------|--------|
| 1-50 users | GOOD — current architecture works well |
| 50-200 users | MEDIUM — some queries will be slow without pagination |
| 200+ users | POOR — unbounded data fetches will time out or OOM |

The app was clearly built for a small team. The primary scalability risks are:
- Fetching all profiles/revenues without pagination
- No query limit on `monthly_revenues` SELECT (could be thousands of rows)
- No index verification for common query patterns


---

### Source: 11-testing/testing.md

﻿# Testing

## Current State
**There is NO test suite in this application.**

No testing framework or testing infrastructure is present:
- No `*.test.js` or `*.spec.js` files found
- No `__tests__/` directories
- No test configuration files (jest.config.js, vitest.config.js, playwright.config.ts)
- No test scripts in package.json (beyond lint)
- No CI/CD pipeline to run tests
- No snapshot files

## What Exists

### Manual Testing Only
The application is entirely manually tested. There is no automated testing of any kind:
- No unit tests (component logic, utility functions)
- No integration tests (Supabase queries, auth flows)
- No end-to-end tests (user workflows)
- No API tests (Supabase API, Edge Function)

### Linting
ESLint is configured:
```
eslint ^10.3.0
eslint-plugin-react-hooks
eslint-plugin-react-refresh
```
This is the only automated code quality check in place.

## Test Coverage: NONE

| Test Type | Coverage |
|-----------|---------|
| Unit Tests | 0% |
| Integration Tests | 0% |
| E2E Tests | 0% |
| Performance Tests | 0% |
| Security Tests | 0% |
| API Tests | 0% |

## Debug/Dev Scripts (Not Tests)

Root-level JavaScript files appear to be ad-hoc debug/admin scripts:
- `debug2.js` — Purpose: REQUIRES INSPECTION
- `debug_teams.js` — Purpose: REQUIRES INSPECTION
- `export_users.js` — One-time export script for user data
- `export_users_excel.js` — One-time export script for Excel format

These are NOT test files. They appear to be ad-hoc data management scripts written during development.

## High-Priority Test Areas If Testing Is Added

### Unit Tests (for utility functions)
1. `revenueUtils.js` — `normalizeMonth`, `getLastNMonths`, `sumRevenues`, `getEffectiveTargetAmount`
2. `milestoneUtils.js` — `calculateMilestones`
3. `analyticsUtils.js` — `calculateMonthlyTrend`, `calculateExpectedVsActual`
4. Revenue calculations in `AdminRevenue.jsx` and `AdminHome.jsx`

### Integration Tests
1. Supabase authentication flow (sign in, sign out, session restore)
2. Profile creation flow
3. Revenue upsert and retrieval
4. DIS submission and holiday blocking

### E2E Tests (Playwright or Cypress)
1. Complete login → dashboard flow
2. Admin: create team → add member → set target
3. User: submit DIS report → see submission in admin view
4. Attendance check-in flow (requires mocking GPS)
5. Announcement creation → user notification

## Recommended Testing Stack
Given the existing technology choices:
- **Unit/Integration**: Vitest (Vite-native, fast)
- **E2E**: Playwright (handles OAuth flows, better browser support than Cypress)
- **Mocking**: Supabase Jest Mock or manual mocking

## Risk Without Tests

Given that this is a production system managing financial data (revenue, targets), the absence of any testing presents significant operational risk:
- Revenue calculation bugs could go undetected
- Authorization logic changes could accidentally open/close access
- Data migration errors could silently corrupt records
- No regression safety net for feature additions


---


## 13. TECHNICAL DEBT & FUTURE

### Source: 13-future/technical-debt.md

﻿# Technical Debt & Future Recommendations

## Technical Debt Register

### CRITICAL Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-001 | Real user data files in repository | repo root | Privacy violation, data exposure |
| TD-002 | No test coverage | Entire codebase | Cannot safely refactor |
| TD-003 | AI Edge Function callable without auth | supabase/functions/ai-analytics | Financial risk, security |

---

### HIGH Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-004 | No code splitting | vite.config.js | Large bundle for all users |
| TD-005 | No environment separation (dev/prod) | supabaseClient.js | Dev changes affect production DB |
| TD-006 | dis_reports and monthly_targets not in schema | database_schema.sql | Schema is incomplete documentation |
| TD-007 | 83KB AdminTeams.jsx single file | AdminTeams.jsx | Unmaintainable, hard to debug |
| TD-008 | 70KB AdminUsers.jsx single file | AdminUsers.jsx | Unmaintainable, hard to debug |
| TD-009 | Unbounded data fetches (no pagination) | Multiple admin pages | Will fail at scale |
| TD-010 | Open RLS on speakers table | Database | Any user can modify speaker data |
| TD-011 | Prop drilling for auth state | App.jsx → pages | State management complexity grows |

---

### MEDIUM Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-012 | No error tracking service | Entire codebase | Silent failures in production |
| TD-013 | Stale cache with no invalidation | Admin pages | Users see outdated data within session |
| TD-014 | Dual rich text editor libraries | package.json | Bundle size waste |
| TD-015 | xlsx in devDependencies | package.json | Build inconsistency |
| TD-016 | Duplicate route (audit-logs vs auditlogs) | App.jsx | Confusion, dead route |
| TD-017 | featureAccess only client-side enforced | Frontend | Executives can bypass UI restrictions |
| TD-018 | Hardcoded master admin email in 6+ places | Multiple files | Brittle, hard to change |
| TD-019 | No Content Security Policy | vercel.json | XSS risk from stored HTML |
| TD-020 | Missing error boundaries | App.jsx | Unhandled React errors crash entire app |
| TD-021 | hooks/ directory empty | src/hooks/ | Custom hooks not extracted |
| TD-022 | Testing.jsx (56KB) in virtual templates | virtualtemplates/ | Unclear if production or dev artifact |
| TD-023 | ipify.org external dependency for attendance | Attendance.jsx | Third-party downtime = attendance failure |

---

### LOW Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-024 | No pagination in user-facing tables | User pages | Cosmetic for current scale |
| TD-025 | profiles.team_id redundant with team_members | Database | Data could diverge |
| TD-026 | No service layer / repository pattern | Architecture | Business logic scattered |
| TD-027 | No TypeScript | Entire codebase | Runtime type errors possible |
| TD-028 | Business logic in UI components | Page components | Hard to test in isolation |
| TD-029 | No image optimization pipeline | public/ | Slightly slower load times |
| TD-030 | Capacitor appId is com.ideallabs.myapp (placeholder) | capacitor.config.json | Wrong ID for app stores |
| TD-031 | Electron appId in package.json needs verification | package.json | Build inconsistency |

---

## Recommended Roadmap

### Immediate Actions (Before Any Feature Work)
1. **Remove sensitive files from repository** (TD-001)
2. **Enable JWT verification on AI Edge Function** (TD-003)
3. **Create staging Supabase project** (TD-005)
4. **Add dis_reports and monthly_targets to schema file** (TD-006)

### Short Term (1-2 Months)
5. **Add error tracking** (Sentry or similar) (TD-012)
6. **Add Vitest unit tests** for `revenueUtils.js`, `milestoneUtils.js`, `analyticsUtils.js` (TD-002)
7. **Split AdminTeams.jsx and AdminUsers.jsx** into smaller components (TD-007, TD-008)
8. **Add server-side pagination** to admin user/revenue tables (TD-009)
9. **Fix speakers table RLS** to require admin access (TD-010)
10. **Move shared auth state to Context** instead of prop drilling (TD-011)

### Medium Term (3-6 Months)
11. **Implement Vite code splitting** for admin vs user routes (TD-004)
12. **Add React Query** for data fetching and cache management (TD-013)
13. **Add Content Security Policy** headers (TD-019)
14. **Add React Error Boundaries** to prevent full-app crashes (TD-020)
15. **Extract custom hooks** from complex components (TD-021)
16. **Replace ipify.org** with an internal IP check or Supabase Edge Function (TD-023)

### Long Term (6+ Months)
17. **Add TypeScript** incrementally (TD-027)
18. **Implement proper service layer** for business logic (TD-026, TD-028)
19. **Add E2E tests** for critical workflows (TD-002)
20. **Investigate service worker** for true background push notifications

---

## Current State Assessment

| Dimension | Score (1-5) | Notes |
|-----------|------------|-------|
| Code Organization | 2/5 | Large monolithic components, no feature structure |
| Security | 2/5 | Good foundation (RLS, JWT) but significant gaps |
| Performance | 3/5 | Works well at current scale, will struggle at growth |
| Maintainability | 2/5 | No tests, large files, inconsistent patterns |
| Scalability | 2/5 | No pagination, unbounded fetches |
| Documentation | 1/5 → 4/5 | Was 1/5 before this discovery phase |
| Feature Completeness | 4/5 | Rich feature set for the business domain |
| User Experience | 4/5 | Apple-inspired design, responsive, dark mode |

**Overall**: The application is a well-functioning MVP that serves its business purpose effectively. However, it carries significant technical debt that should be addressed before major feature expansion or scale increase.


---
