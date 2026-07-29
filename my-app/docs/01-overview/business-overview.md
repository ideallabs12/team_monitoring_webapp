# Business Overview

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
