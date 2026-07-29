# Security Analysis

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
