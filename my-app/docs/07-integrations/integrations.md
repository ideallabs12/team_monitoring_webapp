# External Integrations

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
