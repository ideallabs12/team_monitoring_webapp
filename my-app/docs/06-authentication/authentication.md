# Authentication

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
