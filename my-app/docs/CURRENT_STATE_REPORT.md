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
