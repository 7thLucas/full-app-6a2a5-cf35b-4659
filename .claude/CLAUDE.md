# Project Overview
- Purpose: **Susie Q's Diner — Food-Safety Compliance app**. Restaurant staff upload mandatory training certificates, signed SOPs, and assessment results; an AI judgment engine evaluates each upload and the system tracks per-employee compliance. Built on top of a modular RBAC SaaS base template.
- High-level system type: Compliance / Admin Dashboard (SaaS base template, re-skinned + re-contented for the diner case).

# App Context (CURRENT APP — read this first)
This repo is a **fork of `quantumbytes-template-base`** (the sibling reference repo). The product logic is intentionally kept aligned with that base; only **branding, theme/colors, copy, departments, and the seed** differ. When changing logic, prefer matching the base; when changing look/feel/content, keep it diner-specific.

- **Brand:** "Susie Q's" — logo is `logo.png` (rosy-pink wordmark, transparent bg), wired via `BrandMark` in `app/lib/compliance-theme.tsx`.
- **Theme:** "Fresh Kitchen" pink/plum palette (NOT green). Tokens live in `app/lib/compliance-theme.tsx` (`--accent #B85C72`, `--ink #3B1C26` plum header, `--paper #FBF5F1` blush cream; `--ok` stays green for the "Compliant/pass" chip only). The `.cmp` class scopes these CSS vars. Do NOT reintroduce the old green/insurance palette.
- **Roles:** internal `UserRole` is `"HR" | "Employee"`. `HR` is displayed as **"Manager / Owner" (Susie Q)** — do NOT rename the internal value (keeps session/redirect/backend untouched). Manager lands on `/hr/dashboard`, staff on `/employee/dashboard`.
- **Departments / stations:** `Department = "All" | "Kitchen" | "Front-of-House" | "Cleaning"` (defined in `app/lib/compliance-demo.ts`). These replaced the old `Sales/Compliance`.
- **Demo accounts** (`app/lib/compliance-demo.ts`, password `Demo@123`): Susie Q (Manager/`All`), Jack Turner (Kitchen), Emily Carter (Front-of-House), Mike Bennett (Cleaning). Demo auth is client-side via localStorage (`susie-q-compliance-demo-session`).
- **Compliance pages (the app surface):** `app/routes/_index.tsx` (landing), `app/routes/login.tsx`, `app/routes/hr.dashboard.tsx` (Manager console), `app/routes/employee.dashboard.tsx` (staff). Shared helpers: `app/lib/compliance-theme.tsx`, `app/lib/compliance-demo.ts`, `app/lib/compliance-api.client.ts`.
- **Judgment engine:** the compliance UI talks to the generic `judgment` module via `/api/judgment/*` (the `compliance-api.client.ts` adapter maps diner configs/submissions onto judgment configs). The `judgment.*` routes are the generic engine — leave them generic. Status is **verdict-driven** (AI `result.verdict` of `pass`/`ready` ⇒ Submitted, else Needs Review). There is intentionally **NO numeric quiz-score input field** — score thresholds (e.g. SOP's "min 80%") live inside each criterion's `passCriteria` text so the AI infers them from the uploaded evidence.
- **Seed:** `app/modules/judgment/judgment.seed.ts` seeds the diner SOP configs (Food Safety→Kitchen, Allergy Awareness→Front-of-House, Sanitation→Cleaning, Signed SOP→All), idempotent upsert on `pluginId`. Source SOP: Susie Q's Diner Compliance SOP v1.0.
- **Submit upload contract:** the submit route mounts `upload.array("files")` — the multipart field MUST be `"files"` (the `/parse` route uses `upload.single("file")`).
- **Demo asset:** `Food-Safety-Certificate-Jack-Turner.pdf` (repo root) is a Kitchen-compliant sample cert (score 92%, future expiry); generator at `scripts/make-cert-pdf.cjs`.

# Tech Stack
- Framework: Remix (Vite plugin) + Express (Custom Server)
- Language: TypeScript
- Routing: Remix Flat Routes (Frontend), Express Router (Backend)
- State Management: React Hooks + local Context (ui-specific)
- Styling: Tailwind CSS + shadcn/ui
- Backend: Express + MongoDB (Mongoose & Typegoose)

# Project Structure
- `/app/api/` → Express backend operations (controllers, models, services, guards, and middleware).
- `/app/modules/` → Isolated feature modules containing their own backend logic (`api/`), UI (`components/`), and logic (`hooks/`).
- `/app/components/` → Shared UI building blocks (primarily shadcn/ui primitives) and layout structures.
- `/app/routes/` → Frontend pages utilizing Remix Flat Routes convention.
- `/app/hooks/` → Shared data-fetching and permission hooks.

# Architecture Rules
- Main layout/component used: `app/root.tsx` serves as the global HTML shell. Admin pages typically use `app/components/admin/admin-sidebar.tsx` or matching portal layouts.
- How pages are structured: Flat file structure in `app/routes/`. Pages act as compositional layers, bringing in components and hooks from modules rather than housing thick logic directly.
- How modules are organized: Existing or injected modules are self-contained within `/app/modules/<module-name>/`.
- Naming conventions: `kebab-case` for all files (e.g., `user-profile.controller.ts`).
- Import conventions: Always use `~/` alias to import from the `app/` folder.

# Module Integration Rules (CRITICAL)
- **Where UI components should be injected:** Compose module-specific UI within the Remix pages at `app/routes/`. Build the inner workings inside `app/modules/<module-name>/components/`.
- **Where global components should be mounted:** Mount floating widgets, sidebars, or global assistants inside `app/root.tsx` alongside the `<Outlet />` or within standard layout wrappers in `app/components/portal/layout/`.
- **How routes should be registered:** 
  - Frontend: Create files in `app/routes/` directly (e.g., `app/routes/admin+/feature.tsx`).
  - Backend: Register inside `app/api/routes.ts`. Custom module APIs should be injected right before or within the `<AUTO-GENERATED:ROUTES>` boundary using `router.use()`.
- **How APIs/services are connected:** Frontend hooks in `app/modules/<module-name>/hooks/` call API endpoints mounted in the Express `routes.ts`. Endpoints are protected by `authGuard` and `permissionGuard`.
- **How modules are structured internally:**
  - `api/` (controllers, services, models, routes config)
  - `components/` (React UI features)
  - `hooks/` (React data fetching state)
- **Expected file paths for module integration:** 
  - Module Base: `app/modules/[feature-name]/`
  - Integration Point (UI): `app/routes/[section]+/[feature-name].tsx`  
  - Integration Point (API): Import logic inside `app/api/routes.ts`.

# MODULE FOLDER RULES (MANDATORY)
- Do NOT manually create any new top-level folder under `app/modules/*` (for example `app/modules/new-module`).
- Top-level `app/modules/<slug>` folders must be created automatically.
- You MAY edit files and add subfolders inside an injected module (`app/modules/<slug>/*`) as needed for integration/composability.
- Do not finish the build while the injected scaffold is still unused.
- If you need a brand-new non-scaffold area, create it outside `app/modules/*` (for example under `app/*` directly).

# Integration Patterns (Examples)

*Adding a UI widget to a page:*
```tsx
// app/routes/admin+/dashboard.tsx
import { FeatureWidget } from "~/modules/feature/components/feature-widget";

export default function DashboardPage() {
  return (
    <div className="p-4">
      <FeatureWidget />
    </div>
  );
}
```

*Adding a backend/API handler from a module:*
```typescript
// app/api/routes.ts
// 1. Import module routes
import featureRoutes from "~/modules/feature/api/routes";

// 2. Register with base path
router.use("/feature", authGuard, featureRoutes);
```

# Constraints
- **DO NOT** modify frontend primitives in `app/components/ui/` (shadcn/ui contracts must remain stable).
- **DO NOT** remove or deeply alter `app/root.tsx` routing structures or `<Toaster/>` providers.
- **Always** use standard `api-response.ts` formatting helpers for all API controller returns.
- **RESTRICT** API access using `authGuard` and `permissionGuard` from `~/api/middleware/auth.guard`.
- **Files that should NOT be modified:** `server.ts`, core middleware configs, toolconfigs (`vite.config.ts`, `remix.config.js`) unless explicitly creating a systemic change.

# Efficiency Rules (FOR AGENTS)
- Do NOT scan the entire codebase.
- Do NOT read unrelated files.
- Always rely on this `claude.md`.
- Only access files when strictly necessary to make targeted edits.
- Prefer minimal edits over rewrites.

# Summary for Agent
- **Where to integrate:** Use existing/injected modules in `/app/modules/`, wire UI in `/app/routes/`, and merge API routes into `/app/api/routes.ts`.
- **New area rule:** Create brand-new areas under `app/*` directly, not as new top-level folders in `app/modules/*` since this will created automatically.
- **Key files to touch:** `/app/routes/*` (for pages), `/app/api/routes.ts` (for backend routing).
- **What to avoid:** Changing `/app/components/ui/*` primitives, bypassing API response standard formats, and modifying core `/server.ts` or bundler config files.
