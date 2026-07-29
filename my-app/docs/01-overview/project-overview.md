# Project Overview

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
