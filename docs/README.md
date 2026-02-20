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
- `src/lib/api.ts` normalizes `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_API_HOST`.
- All fetches now route through the same base (`/api/v1`) to avoid split configs.
- For SSE (`EventSource`), use `API_V1_BASE` + `/experiments/.../stream` to match the API prefix.

### Recommended env vars
Use these to keep the UI and API consistent:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`
- `NEXT_PUBLIC_API_HOST=http://localhost:8000`

See `docs/ENVIRONMENT.md` for the full path normalization notes.

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
- Generator endpoints rely on SAT solver availability; if unavailable, UI actions will error until configured.

See `identity-factory-ui/docs/ROUTES_AND_COMPONENTS.md` for the route/component map.
