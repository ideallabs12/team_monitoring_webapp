# Dependencies

## Runtime Dependencies

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.6 | UI framework |
| react-dom | ^19.2.6 | React DOM renderer |
| react-router-dom | ^7.15.1 | Client-side routing |

### Backend / Data
| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.106.1 | Supabase client (DB, Auth, Realtime, Storage) |

### UI / Components
| Package | Version | Purpose |
|---------|---------|---------|
| lucide-react | ^1.16.0 | Icon library (100+ icons used across pages) |
| recharts | ^3.8.1 | Charts: Area, Bar, Pie, ComposedChart |
| jodit-react | ^5.3.21 | Rich text editor for Announcements |
| react-quill-new | ^3.8.3 | Alternative rich text editor |
| react-markdown | ^10.1.0 | Markdown rendering (AI Analytics) |
| react-grid-layout | ^2.2.3 | Grid/drag-drop layout system |

### Export / Document Generation
| Package | Version | Purpose |
|---------|---------|---------|
| html2canvas | ^1.4.1 | DOM-to-image capture |
| jspdf | ^4.2.1 | PDF generation |
| html2pdf.js | ^0.14.0 | Combined html2canvas + jsPDF helper |
| xlsx | ^0.18.5 | Excel file generation |

### Analytics / Monitoring
| Package | Version | Purpose |
|---------|---------|---------|
| @vercel/speed-insights | ^2.0.0 | Vercel web vitals tracking |

---

## Development Dependencies

### Build Tools
| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^8.0.12 | Build tool and dev server |
| @vitejs/plugin-react | ^6.0.1 | React HMR for Vite |

### Desktop
| Package | Version | Purpose |
|---------|---------|---------|
| electron | ^43.1.0 | Desktop app wrapper |
| electron-builder | ^26.15.3 | Electron packaging |
| concurrently | ^10.0.3 | Run vite dev + electron concurrently |

### Mobile
| Package | Version | Purpose |
|---------|---------|---------|
| @capacitor/android | ^8.4.1 | Android Capacitor plugin |
| @capacitor/cli | ^8.4.1 | Capacitor CLI |
| @capacitor/core | ^8.4.1 | Capacitor core |

### Linting
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^10.3.0 | Code linting |
| @eslint/js | ^10.3.0 | ESLint JS config |
| eslint-plugin-react-hooks | ^5.1.0-rc.0 | Hooks linting rules |
| eslint-plugin-react-refresh | ^0.4.9 | React Refresh linting |
| globals | ^16.0.0 | Global variables for ESLint |

### Types
| Package | Version | Purpose |
|---------|---------|---------|
| @types/react | ^19.0.6 | TypeScript types for React |
| @types/react-dom | ^19.0.3 | TypeScript types for React DOM |

---

## Dependency Concerns

### 1. xlsx Listed as devDependency but Used at Runtime
`xlsx` (SheetJS) is used in `AdminExportData.jsx` for generating Excel files at runtime. It is incorrectly listed as a `devDependency`. This could cause issues in strict production builds.

### 2. Both jodit-react AND react-quill-new Included
Two rich text editor libraries are bundled:
- `jodit-react` (used in AdminAnnouncements)
- `react-quill-new` (used elsewhere — REQUIRES VERIFICATION)

This doubles the rich text editor footprint unnecessarily.

### 3. Both html2canvas AND html2pdf.js Included
`html2pdf.js` internally depends on `html2canvas` and `jsPDF`. Having `html2canvas` and `jsPDF` also listed separately creates potential version conflicts.

### 4. Large Bundle Impact
High-impact bundle size contributions:
- `recharts` — charting library (~250KB gzipped)
- `jodit-react` — rich text editor (~300KB gzipped)
- `react-quill-new` — another rich text editor (~100KB)
- `html2canvas` + `jsPDF` + `html2pdf.js` — export tools (~500KB)
- `xlsx` — Excel generation (~200KB)

Total: ~1.3MB+ of "optional feature" dependencies loaded for all users, including employees who never export data.

### 5. Version Compatibility
React 19 is the latest release. All dependencies need to be compatible with React 19. Some older packages may have peer dependency warnings. No audit has been performed.

### 6. Security Audit
No `npm audit` has been run or documented. For a production financial management system, periodic security audits of dependencies are important.

---

## Outdated Package Checks

REQUIRES RUNNING: `npm outdated` to see current outdated packages.

---

## Recommended Actions (Without Changes)
- Run `npm audit` to identify vulnerable packages
- Run `npm outdated` to understand version drift
- Verify `react-quill-new` is actually used (to see if it can be removed)
- Move `xlsx` from devDependencies to dependencies
