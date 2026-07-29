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
- jsPDF for PDF export
- Mobile share API support

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
