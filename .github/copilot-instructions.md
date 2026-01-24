## SkinLytix — Quick instructions for AI coding agents

This file gives focused, actionable knowledge so an AI can be productive immediately in this repo.

- Stack & entry points
  - Vite + React + TypeScript app. Root entry: `src/main.tsx` -> `src/App.tsx`.
  - Pages live in `src/pages/*`. Components live in `src/components/*`.
  - Project uses the `@` path alias (see `tsconfig.json`) — import like `import X from "@/components/.."`.

- How to run / common commands
  - Install: use your package manager (repo expects npm/yarn/bun). package.json scripts:
    - `npm run dev` → starts Vite dev server (host ::, port 8080 by default).
    - `npm run build` / `npm run build:dev` → production/dev build.
    - `npm run preview` → preview a built app.
    - `npm run lint` → runs ESLint across the repo.

- Important env vars and how features toggle
  - `VITE_SUPABASE_URL` — Supabase project URL used by the client in `src/integrations/supabase/client.ts`.
  - `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key.
  - `VITE_USE_FUNCTIONS_PROXY` ("true"/"false") — when true and `VITE_SUPABASE_URL` is set, Vite proxies `/functions` to Supabase Edge Functions (see `vite.config.ts`).

- Integrations & where to look
  - Supabase client: `src/integrations/supabase/client.ts` (auto-generated header; do not edit if generated).
  - Serverless / Edge functions live under `supabase/functions/` — common function names: `analyze-product`, `explain-ingredients`, `extract-ingredients`, `find-dupes`, `image-proxy`, etc. Use `/functions` proxy in dev when `VITE_USE_FUNCTIONS_PROXY=true`.
  - React Query is used app-wide (`@tanstack/react-query` in `src/App.tsx` — `QueryClientProvider`).
  - OCR and image processing: `tesseract.js` is a dependency and used by client-side OCR flows (search for `tesseract` in `src/`).

- Routing & auth patterns
  - App routes are declared in `src/App.tsx`. Protected UI paths wrap components with `AppProtectedRoute` and `ProtectedRoute` components (`src/components/ProtectedRoute.tsx` and `src/components/AppProtectedRoute.tsx`). Follow this pattern for new pages that require auth.
  - Session refresh logic is implemented in `App.tsx` (`SessionRefreshGate`) using `supabase.auth.getSession()` and `supabase.auth.refreshSession()`.

- UI / styling conventions
  - Uses Tailwind + shadcn-style component patterns. Many UI primitives live under `src/components/ui/*`.
  - `lovable-tagger` is enabled in dev (vite plugin in `vite.config.ts`) — it tags components during development. Avoid changing or removing it without running the app to confirm behavior.

- Code & folder conventions
  - Pages: `src/pages/*` export default React components used by routes. Place new route components here and add the route in `src/App.tsx` above the catch-all `*` route.
  - Components: small, focused components in `src/components/`. Reusable UI primitives are in `src/components/ui/`.
  - Integrations/services: `src/integrations/*` — put SDK clients and typed wrappers here (example: Supabase client + `types.ts`).

- Tests / linting / safety
  - There is no test script in package.json; linting is provided: `npm run lint`.
  - Keep TypeScript paths in sync with `tsconfig.app.json` if adding aliases.

- Examples & quick edits
  - Add a protected page: create `src/pages/NewTool.tsx`, then add a route in `src/App.tsx` wrapped with `<AppProtectedRoute><ProtectedRoute>...</ProtectedRoute></AppProtectedRoute>`.
  - Call a Supabase Edge Function locally: with `VITE_USE_FUNCTIONS_PROXY=true`, POST to `/functions/<function-name>` on the dev server (port 8080).

- Files to inspect when debugging common issues
  - Dev server proxy / env issues: `vite.config.ts` and `.env*` files.
  - Auth/session bugs: `src/integrations/supabase/client.ts`, `src/components/AppProtectedRoute.tsx`, and `src/App.tsx` (SessionRefreshGate).
  - Edge function behavior: `supabase/functions/<name>/index.ts` (or similar) and the corresponding client call in the frontend.

If anything here is unclear or you'd like more examples (small PRs, tests, or a runbook for deploying functions), tell me which area to expand and I'll iterate.
