# Testing

## Current State
**There is NO test suite in this application.**

No testing framework or testing infrastructure is present:
- No `*.test.js` or `*.spec.js` files found
- No `__tests__/` directories
- No test configuration files (jest.config.js, vitest.config.js, playwright.config.ts)
- No test scripts in package.json (beyond lint)
- No CI/CD pipeline to run tests
- No snapshot files

## What Exists

### Manual Testing Only
The application is entirely manually tested. There is no automated testing of any kind:
- No unit tests (component logic, utility functions)
- No integration tests (Supabase queries, auth flows)
- No end-to-end tests (user workflows)
- No API tests (Supabase API, Edge Function)

### Linting
ESLint is configured:
```
eslint ^10.3.0
eslint-plugin-react-hooks
eslint-plugin-react-refresh
```
This is the only automated code quality check in place.

## Test Coverage: NONE

| Test Type | Coverage |
|-----------|---------|
| Unit Tests | 0% |
| Integration Tests | 0% |
| E2E Tests | 0% |
| Performance Tests | 0% |
| Security Tests | 0% |
| API Tests | 0% |

## Debug/Dev Scripts (Not Tests)

Root-level JavaScript files appear to be ad-hoc debug/admin scripts:
- `debug2.js` — Purpose: REQUIRES INSPECTION
- `debug_teams.js` — Purpose: REQUIRES INSPECTION
- `export_users.js` — One-time export script for user data
- `export_users_excel.js` — One-time export script for Excel format

These are NOT test files. They appear to be ad-hoc data management scripts written during development.

## High-Priority Test Areas If Testing Is Added

### Unit Tests (for utility functions)
1. `revenueUtils.js` — `normalizeMonth`, `getLastNMonths`, `sumRevenues`, `getEffectiveTargetAmount`
2. `milestoneUtils.js` — `calculateMilestones`
3. `analyticsUtils.js` — `calculateMonthlyTrend`, `calculateExpectedVsActual`
4. Revenue calculations in `AdminRevenue.jsx` and `AdminHome.jsx`

### Integration Tests
1. Supabase authentication flow (sign in, sign out, session restore)
2. Profile creation flow
3. Revenue upsert and retrieval
4. DIS submission and holiday blocking

### E2E Tests (Playwright or Cypress)
1. Complete login → dashboard flow
2. Admin: create team → add member → set target
3. User: submit DIS report → see submission in admin view
4. Attendance check-in flow (requires mocking GPS)
5. Announcement creation → user notification

## Recommended Testing Stack
Given the existing technology choices:
- **Unit/Integration**: Vitest (Vite-native, fast)
- **E2E**: Playwright (handles OAuth flows, better browser support than Cypress)
- **Mocking**: Supabase Jest Mock or manual mocking

## Risk Without Tests

Given that this is a production system managing financial data (revenue, targets), the absence of any testing presents significant operational risk:
- Revenue calculation bugs could go undetected
- Authorization logic changes could accidentally open/close access
- Data migration errors could silently corrupt records
- No regression safety net for feature additions
