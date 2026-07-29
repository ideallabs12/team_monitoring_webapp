# Data Flow

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
