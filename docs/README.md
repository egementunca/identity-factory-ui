# Identity Factory UI - Codebase Guide

## Purpose
The Identity Factory UI is a Next.js 14 application for exploring identity circuits, running generator jobs, browsing multiple databases, and experimenting with local_mixing workflows. It includes interactive circuit playgrounds and ECA57-specific tooling.

## Quickstart
- Node.js 18+ required.
- Install deps: `npm install`
- Run dev server: `npm run dev`
- Backend API expected at `http://localhost:8000`

## Project structure
- `src/app/` - App Router pages (routes).
- `src/components/` - UI building blocks (playgrounds, database views, charts).
- `src/components/database/` - Database explorer widgets.
- `src/components/generators/` - Generator cards and run list.
- `src/components/playground-v2/` - Second-generation playground UI.
- `src/hooks/` - API hooks (`useFactory`).
- `src/lib/api.ts` - API client for backend calls.
- `src/types/api.ts` - Shared type definitions.
- `src/app/globals.css` - Theme and global styles.
- `setup.sh` - Local setup helper (creates `.env.local`).

## API integration notes
- `src/lib/api.ts` hard-codes `API_BASE` as `http://localhost:8000/api/v1`.
- `next.config.js` defines `NEXT_PUBLIC_API_BASE_URL` and a rewrite for `/api/v1/*`, but `src/lib/api.ts` does not use it.
- Several components call `fetch('http://localhost:8000/...')` directly and do not use the shared API client.
- The experiments page uses `NEXT_PUBLIC_API_URL` (not `NEXT_PUBLIC_API_BASE_URL`).

## UI subsystems
- Dashboard (overview + quick links + stats).
- Generators (run orchestration and status tracking).
- Database explorer (main DB + SAT + Go + cluster + irreducible).
- Circuit Playground (drag-and-drop circuit building).
- Playground v2 (multi-tab, advanced tooling).
- ECA57 Playground and ECA57 LMDB Explorer.
- Experiments (local_mixing experiment runner with live SSE logs).

## Tests
- Jest configuration is present (`jest.config.js`, `jest.setup.js`).
- No route-level tests are currently wired in the codebase.

## Known integration gaps
These are useful for cleanup/refactor planning:
- `CircuitsDatabaseView` expects `permutation_hash` and `created_at` fields that are not present in the current API response.
- `CircuitsDatabaseView` uses `limit` query param, but the API expects `page` and `size`.
- `getDimensionGroupCircuits` uses a `details` query param that the API does not accept.
- `enableDebugLogging` and `disableDebugLogging` are stubs in `src/lib/api.ts`.
- Mixed environment variables (`NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_API_BASE_URL`).
- Legacy components (`Header`, `Sidebar`, `MainContent`, `DimensionGroupsTable`, `GateCompositionsTable`, `RepresentativesTable`, `CircuitDetails`) are not referenced by any current page.

See `identity-factory-ui/docs/ROUTES_AND_COMPONENTS.md` for the route/component map.

