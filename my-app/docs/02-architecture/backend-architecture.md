# Backend Architecture

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
