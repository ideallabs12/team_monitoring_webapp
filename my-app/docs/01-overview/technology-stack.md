# Technology Stack

## Frontend

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Framework | React | ^19.2.6 | Latest React with Concurrent Features |
| Language | JavaScript (JSX) | ES Modules | No TypeScript |
| Build Tool | Vite | ^8.0.12 | With @vitejs/plugin-react ^6.0.1 |
| Routing | React Router DOM | ^7.15.1 | BrowserRouter, client-side routing |
| State Management | React useState/useContext | Built-in | No Redux/Zustand/Jotai |
| Data Fetching | Supabase JS client | ^2.106.1 | Direct DB queries from browser |
| Form Handling | Native HTML forms | N/A | No form library (react-hook-form, etc.) |
| UI Components | Custom (Vanilla CSS) | N/A | No component library (MUI, Shadcn, etc.) |
| Icons | Lucide React | ^1.16.0 | Icon library |
| Charts | Recharts | ^3.8.1 | Area, Bar, Pie, Composed charts |
| Rich Text Editor | Jodit React | ^5.3.21 | Used in Announcements creation |
| Rich Text Editor 2 | React Quill New | ^3.8.3 | Used in some forms |
| Markdown Render | React Markdown | ^10.1.0 | Used in AI Analytics response display |
| PDF Generation | html2pdf.js | ^0.14.0 | PDF export |
| PDF Generation 2 | jsPDF | ^4.2.1 | Used in CopyStats |
| Image Capture | html2canvas | ^1.4.1 | Used for image/PDF generation |
| Grid Layout | react-grid-layout | ^2.2.3 | Used in virtual templates |
| Analytics | @vercel/speed-insights | ^2.0.0 | Vercel Speed Insights tracking |
| CSS | Vanilla CSS | N/A | ~75KB global stylesheet (index.css) |

## Backend / Data

| Category | Technology | Notes |
|----------|-----------|-------|
| Backend Architecture | Supabase (BaaS) | No custom backend server |
| Database | PostgreSQL (Supabase hosted) | Project ID: pzalalbpxlwtcnmkaegb |
| ORM/Query Builder | Supabase JS Client | Direct table queries, no ORM |
| Authentication | Supabase Auth | Email/password + Google OAuth |
| Authorization | Supabase RLS + client-side checks | Hybrid (DB-level + frontend) |
| Realtime | Supabase Realtime | postgres_changes subscriptions + presence |
| File Storage | Supabase Storage | Buckets: review_photos, announcements_media |
| Edge Functions | Supabase Edge Functions (Deno) | 1 function: ai-analytics |
| AI/LLM | OpenRouter API | GPT-4o model via openrouter.ai |

## Build & Tooling

| Category | Technology | Version |
|----------|-----------|---------|
| Linter | ESLint | ^10.3.0 |
| ESLint Plugins | eslint-plugin-react-hooks, eslint-plugin-react-refresh | - |
| TypeScript Types | @types/react, @types/react-dom | ^19.x |

## Desktop Packaging

| Category | Technology | Version |
|----------|-----------|---------|
| Desktop Wrapper | Electron | ^43.1.0 |
| Build System | electron-builder | ^26.15.3 |
| App ID | com.ideallabs.allhands | - |
| Process Manager | concurrently | ^10.0.3 |

## Mobile

| Category | Technology | Version |
|----------|-----------|---------|
| Mobile Bridge | Capacitor (Core) | ^8.4.1 |
| Android Target | @capacitor/android | ^8.4.1 |
| Mobile CLI | @capacitor/cli | ^8.4.1 |
| App ID | com.ideallabs.myapp | Note: Different ID from Electron |

## Data Export (Dev Scripts)

| Category | Technology | Version |
|----------|-----------|---------|
| Excel Export | xlsx | ^0.18.5 (devDependency) |

## External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Database + Auth + Storage + Realtime | Supabase | Core backend infrastructure |
| AI/LLM | OpenRouter (openrouter.ai) | AI analytics via GPT-4o |
| Deployment | Vercel | Web hosting |
| Performance Monitoring | Vercel Speed Insights | Web vitals tracking |

## What Is NOT Present
- No TypeScript
- No CSS framework (Tailwind, Bootstrap, Material UI)
- No state management library (Redux, Zustand, MobX)
- No form validation library (Zod, Yup, react-hook-form)
- No testing framework (Jest, Vitest, Cypress, Playwright)
- No API documentation (Swagger, OpenAPI)
- No server-side rendering (Next.js, Remix)
- No GraphQL
- No Docker/containerization
- No CI/CD pipeline configuration (beyond Vercel auto-deploy)
- No environment variable files (.env) found in repository
