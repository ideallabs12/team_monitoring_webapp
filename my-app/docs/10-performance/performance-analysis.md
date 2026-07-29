# Performance Analysis

## Current Performance Characteristics

### Bundle Size Concerns
- **No code splitting** configured in `vite.config.js`
- All routes, admin pages, and user pages are bundled into a single JS file
- Large dependencies included for all users regardless of role (Recharts, Jodit, React Quill, html2canvas, jsPDF, XLSX)
- Estimated uncompressed bundle: REQUIRES MEASUREMENT (likely 2-5MB)

### In-Memory Caching (Page-Level)
Several admin pages use module-level caching to avoid re-fetching data on component remount:

```javascript
let adminHomeCache = { loaded: false, teams: [], profiles: [], revenues: [], ... }
let adminRevCache = { loaded: false, ... }
let adminDisCache = { loaded: false, ... }
let adminAnalyticsCache = { ... }
```

**Pros**: Avoids redundant Supabase API calls for the same session  
**Cons**: 
- Cache is never invalidated (data can be stale within a session)
- No cache expiry or invalidation strategy
- Stale data requires full page reload to refresh

### No React Query / SWR
No data fetching library. All caching is manual and inconsistent. Some pages always re-fetch on mount (no caching at all).

### Large Components
Components with significant render complexity:

| Component | Size | Concern |
|-----------|------|---------|
| AdminTeams.jsx | 83KB | 1 component managing all team operations |
| AdminUsers.jsx | 70KB | All user management in one component |
| CopyStats.jsx | 61KB | Multiple chart types + export logic combined |
| AdminHome.jsx | 58KB | Dashboard with multiple chart types |
| UserRevenue.jsx | 55KB | Complex form + history in one component |

### Recharts Performance
Multiple pages render several Recharts charts simultaneously. Recharts renders SVG via React, which can be slow for large datasets. No virtualization or data sampling is applied.

---

## Realtime WebSocket Connections

The app maintains multiple concurrent WebSocket connections:

| Connection | Purpose | Always Open |
|-----------|---------|-------------|
| presence (online-users) | User online tracking | YES |
| system_settings | Maintenance mode | YES |
| announcements | Push notifications | YES |
| profiles (user-specific) | Deactivation detection | YES |
| Admin pages (various) | Live data updates | Only on specific pages |

**Concern**: 4+ always-open WebSocket connections per user, even when idle. This is a minor scalability concern at small scale.

---

## Known Performance Anti-Patterns

### 1. No Pagination
- `AdminUsers.jsx` fetches ALL profiles
- `AdminDis.jsx` fetches reports for selected date only (good)
- `AdminRevenue.jsx` fetches ALL revenues
- `CopyStats.jsx` fetches ALL revenues + ALL DIS reports
- At scale (100+ users, 12+ months), these queries will return very large datasets

### 2. Parallel Data Fetching (Good Pattern Used)
Most pages use `Promise.all()` for parallel fetching:
```javascript
const [teamsRes, profilesRes, revRes] = await Promise.all([
  supabase.from('teams').select('*'),
  supabase.from('profiles').select('*'),
  supabase.from('monthly_revenues').select('*')
])
```
This is efficient and avoids waterfall fetching.

### 3. requestAnimationFrame in AdminHome Ticker
The ticker tape animation uses `requestAnimationFrame` in a tight loop. It includes cleanup:
```javascript
return () => cancelAnimationFrame(raf)
```
This is correctly implemented.

### 4. No Image Optimization
- Public images served from `public/` directory
- No WebP conversion, no lazy loading, no responsive images
- Supabase Storage media is served as-is

### 5. Large CSS File
`index.css` is ~75KB uncompressed. While it compresses well with gzip, it is a large single CSS file with no critical CSS extraction.

---

## Performance Opportunities

1. **Code Splitting** — Implement dynamic imports for admin routes (they're never used by regular employees)
2. **Pagination** — Add server-side pagination to Users, Revenue, and DIS admin pages
3. **React Query** — Replace manual caching with proper cache invalidation
4. **Virtualization** — Use react-window or similar for large lists
5. **Lazy Load Images** — Add `loading="lazy"` to media in announcements
6. **Bundle Analysis** — Run `vite-bundle-visualizer` to identify large dependencies

---

## Scalability Assessment

| Scale | Status |
|-------|--------|
| 1-50 users | GOOD — current architecture works well |
| 50-200 users | MEDIUM — some queries will be slow without pagination |
| 200+ users | POOR — unbounded data fetches will time out or OOM |

The app was clearly built for a small team. The primary scalability risks are:
- Fetching all profiles/revenues without pagination
- No query limit on `monthly_revenues` SELECT (could be thousands of rows)
- No index verification for common query patterns
