# Deployment & Hosting

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
