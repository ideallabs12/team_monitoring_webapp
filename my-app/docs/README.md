# All-Hands — Architecture Documentation Index

## Overview
This `/docs` directory contains the complete architecture discovery and documentation for the All-Hands internal operations portal.

**Documentation Phase**: ACTIVE DEVELOPMENT — Attendance module has been successfully refactored and enhanced with new features.  
**Date**: July 2026  
**Status**: Active

---

## Document Index

### 01 — Project Overview
| Document | Description |
|----------|------------|
| [project-overview.md](./01-overview/project-overview.md) | Repository structure, platform targets, unique characteristics |
| [business-overview.md](./01-overview/business-overview.md) | Business domain, user types, workflows, core entities |
| [technology-stack.md](./01-overview/technology-stack.md) | All technologies, libraries, versions, and what is NOT present |

### 02 — Architecture
| Document | Description |
|----------|------------|
| [system-architecture.md](./02-architecture/system-architecture.md) | Full system diagram, patterns, deployment architecture |
| [application-structure.md](./02-architecture/application-structure.md) | File tree, component sizes, code organization |
| [frontend-architecture.md](./02-architecture/frontend-architecture.md) | React patterns, routing, CSS design system, data fetching |
| [backend-architecture.md](./02-architecture/backend-architecture.md) | Supabase patterns, Edge Function, RPC functions, error handling |
| [data-flow.md](./02-architecture/data-flow.md) | 13 key data flows documented step-by-step |

### 03 — Features
| Document | Description |
|----------|------------|
| [feature-inventory.md](./03-features/feature-inventory.md) | All 30 features documented with status, files, and details |

### 04 — Routes
| Document | Description |
|----------|------------|
| [route-inventory.md](./04-routes/route-inventory.md) | All 45+ routes with access level, role, and component |

### 05 — Database
| Document | Description |
|----------|------------|
| [database-overview.md](./05-database/database-overview.md) | DB technology, tables summary, storage buckets, functions |
| [tables.md](./05-database/tables.md) | Full schema for all 21 tables with column details |
| [relationships.md](./05-database/relationships.md) | ERD overview, cascade behaviors, known issues |
| [security-policies.md](./05-database/security-policies.md) | All RLS policies documented with security issues flagged |

### 06 — Authentication & Authorization
| Document | Description |
|----------|------------|
| [authentication.md](./06-authentication/authentication.md) | Auth flows, Supabase Auth config, session management |
| [authorization.md](./06-authentication/authorization.md) | Roles, feature access system, frontend/DB authorization |

### 07 — Integrations
| Document | Description |
|----------|------------|
| [integrations.md](./07-integrations/integrations.md) | All 11 integrations: Supabase, OpenRouter, Vercel, etc. |

### 08 — Deployment
| Document | Description |
|----------|------------|
| [deployment.md](./08-deployment/deployment.md) | Vercel, Electron, Capacitor, local dev, CI/CD gap |

### 09 — Security
| Document | Description |
|----------|------------|
| [security-analysis.md](./09-security/security-analysis.md) | Full security audit with severity ratings and findings |

### 10 — Performance
| Document | Description |
|----------|------------|
| [performance-analysis.md](./10-performance/performance-analysis.md) | Bundle analysis, caching, anti-patterns, scalability assessment |

### 11 — Testing
| Document | Description |
|----------|------------|
| [testing.md](./11-testing/testing.md) | Current state (no tests), risk assessment, recommendations |

### 12 — Dependencies
| Document | Description |
|----------|------------|
| [dependencies.md](./12-dependencies/dependencies.md) | All NPM packages, concerns, audit recommendations |

### 13 — Future / Technical Debt
| Document | Description |
|----------|------------|
| [technical-debt.md](./13-future/technical-debt.md) | 31 documented tech debt items, roadmap, state assessment |

---

## Key Findings Summary

### ✅ What Works Well
- Comprehensive feature set for the business domain
- Apple-inspired design system with dark/light mode
- Real-time features (presence, push notifications)
- Supabase RLS provides a solid database security foundation
- Parallel data fetching pattern (Promise.all) used consistently
- Responsive layouts with mobile support

### ⚠️ Critical Issues
1. **Real user data in repository** — CSV and Excel files with employee data
2. **AI Edge Function has no authentication** — Anyone can invoke it
3. **No test coverage whatsoever**
4. **No dev/prod separation** — Developers modify production data

### ⚠️ High Priority Issues  
5. **No code splitting** — Single bundle for all roles
6. **No pagination** — Admin tables fetch unbounded data
7. **Missing schema for dis_reports and monthly_targets**
8. **Overly large components** (83KB AdminTeams.jsx, 70KB AdminUsers.jsx)
9. **Open RLS on speakers table**

### ℹ️ UNKNOWN / REQUIRES VERIFICATION
- Production Vercel domain URL
- Whether Capacitor/Android build is deployed to users
- Whether Vercel Speed Insights is initialized in app code
- Electron build and packaging status
- Which git branch triggers auto-deploy
- RLS policies for dis_reports and monthly_targets
- Full contents of debug scripts
- Node.js version requirement
