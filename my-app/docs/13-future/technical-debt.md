# Technical Debt & Future Recommendations

## Technical Debt Register

### CRITICAL Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-001 | Real user data files in repository | repo root | Privacy violation, data exposure |
| TD-002 | No test coverage | Entire codebase | Cannot safely refactor |
| TD-003 | AI Edge Function callable without auth | supabase/functions/ai-analytics | Financial risk, security |

---

### HIGH Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-004 | No code splitting | vite.config.js | Large bundle for all users |
| TD-005 | No environment separation (dev/prod) | supabaseClient.js | Dev changes affect production DB |
| TD-006 | dis_reports and monthly_targets not in schema | database_schema.sql | Schema is incomplete documentation |
| TD-007 | 83KB AdminTeams.jsx single file | AdminTeams.jsx | Unmaintainable, hard to debug |
| TD-008 | 70KB AdminUsers.jsx single file | AdminUsers.jsx | Unmaintainable, hard to debug |
| TD-009 | Unbounded data fetches (no pagination) | Multiple admin pages | Will fail at scale |
| TD-010 | Open RLS on speakers table | Database | Any user can modify speaker data |
| TD-011 | Prop drilling for auth state | App.jsx → pages | State management complexity grows |

---

### MEDIUM Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-012 | No error tracking service | Entire codebase | Silent failures in production |
| TD-013 | Stale cache with no invalidation | Admin pages | Users see outdated data within session |
| TD-014 | Dual rich text editor libraries | package.json | Bundle size waste |
| TD-015 | xlsx in devDependencies | package.json | Build inconsistency |
| TD-016 | Duplicate route (audit-logs vs auditlogs) | App.jsx | Confusion, dead route |
| TD-017 | featureAccess only client-side enforced | Frontend | Executives can bypass UI restrictions |
| TD-018 | Hardcoded master admin email in 6+ places | Multiple files | Brittle, hard to change |
| TD-019 | No Content Security Policy | vercel.json | XSS risk from stored HTML |
| TD-020 | Missing error boundaries | App.jsx | Unhandled React errors crash entire app |
| TD-021 | hooks/ directory empty | src/hooks/ | Custom hooks not extracted |
| TD-022 | Testing.jsx (56KB) in virtual templates | virtualtemplates/ | Unclear if production or dev artifact |
| TD-023 | ipify.org external dependency for attendance | Attendance.jsx | Third-party downtime = attendance failure |

---

### LOW Priority

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| TD-024 | No pagination in user-facing tables | User pages | Cosmetic for current scale |
| TD-025 | profiles.team_id redundant with team_members | Database | Data could diverge |
| TD-026 | No service layer / repository pattern | Architecture | Business logic scattered |
| TD-027 | No TypeScript | Entire codebase | Runtime type errors possible |
| TD-028 | Business logic in UI components | Page components | Hard to test in isolation |
| TD-029 | No image optimization pipeline | public/ | Slightly slower load times |
| TD-030 | Capacitor appId is com.ideallabs.myapp (placeholder) | capacitor.config.json | Wrong ID for app stores |
| TD-031 | Electron appId in package.json needs verification | package.json | Build inconsistency |

---

## Recommended Roadmap

### Immediate Actions (Before Any Feature Work)
1. **Remove sensitive files from repository** (TD-001)
2. **Enable JWT verification on AI Edge Function** (TD-003)
3. **Create staging Supabase project** (TD-005)
4. **Add dis_reports and monthly_targets to schema file** (TD-006)

### Short Term (1-2 Months)
5. **Add error tracking** (Sentry or similar) (TD-012)
6. **Add Vitest unit tests** for `revenueUtils.js`, `milestoneUtils.js`, `analyticsUtils.js` (TD-002)
7. **Split AdminTeams.jsx and AdminUsers.jsx** into smaller components (TD-007, TD-008)
8. **Add server-side pagination** to admin user/revenue tables (TD-009)
9. **Fix speakers table RLS** to require admin access (TD-010)
10. **Move shared auth state to Context** instead of prop drilling (TD-011)

### Medium Term (3-6 Months)
11. **Implement Vite code splitting** for admin vs user routes (TD-004)
12. **Add React Query** for data fetching and cache management (TD-013)
13. **Add Content Security Policy** headers (TD-019)
14. **Add React Error Boundaries** to prevent full-app crashes (TD-020)
15. **Extract custom hooks** from complex components (TD-021)
16. **Replace ipify.org** with an internal IP check or Supabase Edge Function (TD-023)

### Long Term (6+ Months)
17. **Add TypeScript** incrementally (TD-027)
18. **Implement proper service layer** for business logic (TD-026, TD-028)
19. **Add E2E tests** for critical workflows (TD-002)
20. **Investigate service worker** for true background push notifications

---

## Current State Assessment

| Dimension | Score (1-5) | Notes |
|-----------|------------|-------|
| Code Organization | 2/5 | Large monolithic components, no feature structure |
| Security | 2/5 | Good foundation (RLS, JWT) but significant gaps |
| Performance | 3/5 | Works well at current scale, will struggle at growth |
| Maintainability | 2/5 | No tests, large files, inconsistent patterns |
| Scalability | 2/5 | No pagination, unbounded fetches |
| Documentation | 1/5 → 4/5 | Was 1/5 before this discovery phase |
| Feature Completeness | 4/5 | Rich feature set for the business domain |
| User Experience | 4/5 | Apple-inspired design, responsive, dark mode |

**Overall**: The application is a well-functioning MVP that serves its business purpose effectively. However, it carries significant technical debt that should be addressed before major feature expansion or scale increase.
