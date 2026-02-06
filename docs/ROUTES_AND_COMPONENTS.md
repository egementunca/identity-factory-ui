# Identity Factory UI - Routes and Components

This document maps routes to page files, key components, and backend dependencies.

## Routes

| Route | Page file | Key components | Backend endpoints |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | `Navigation`, `StatsCards` | `GET /api/v1/stats`, `GET /api/v1/dim-groups` |
| `/generators` | `src/app/generators/page.tsx` | `GeneratorCard`, `RunsList` | `GET /api/v1/generators/`, `POST /api/v1/generators/run`, `GET /api/v1/generators/runs/`, `POST /api/v1/generators/runs/{id}/cancel`, `DELETE /api/v1/generators/runs/{id}` |
| `/databases` | `src/app/databases/page.tsx` | `DualDatabaseView`, `CircuitsDatabaseView`, `GoDatabaseView`, `IrreducibleDatabaseView` | `GET /api/v1/sat-database/*`, `GET /api/v1/go-database/*`, `GET /api/v1/cluster-database/*`, `GET /api/v1/irreducible/*`, `GET /api/v1/stats`, `GET /api/v1/circuits` |
| `/wire-shuffler` | `src/app/wire-shuffler/page.tsx` | Wire shuffler explorer UI | `GET /api/v1/wire-shuffler/stats`, `GET /api/v1/wire-shuffler/metrics-summary`, `GET /api/v1/wire-shuffler/permutations`, `GET /api/v1/wire-shuffler/circuits` |
| `/cluster` | `src/app/cluster/page.tsx` | `ClusterDatabaseView` | `GET /api/v1/cluster-database/*` |
| `/playground` | `src/app/playground/page.tsx` | `CircuitPlayground` | None (local-only calculations) |
| `/playground-v2` | `src/app/playground-v2/page.tsx` | `PlaygroundPro`, `CircuitCanvasV2`, `ToolPanel`, `RightPanel`, `StatusBar` | None (local-only calculations) |
| `/eca57-playground` | `src/app/eca57-playground/page.tsx` | `ECA57Playground`, `SkeletonGraph` | None (local-only calculations) |
| `/eca57-explorer` | `src/app/eca57-explorer/page.tsx` | ECA57 LMDB explorer UI + inline SVG diagrams | `GET /api/v1/eca57-lmdb/*` |
| `/experiments` | `src/app/experiments/page.tsx` | `InfoTooltip`, `HeatmapViewer` | `GET /api/v1/experiments/presets`, `POST /api/v1/experiments/start`, `GET /api/v1/experiments/{id}/stream`, `GET /api/v1/experiments/{id}/results` |
| `/skeleton-explorer` | `src/app/skeleton-explorer/page.tsx` | Inline `CircuitDiagram`, `CollisionChainGraph`, `CircuitDetailModal` | `GET /api/v1/skeleton/explorer/stats`, `GET /api/v1/skeleton/explorer/taxonomies/{width}`, `GET /api/v1/skeleton/explorer/circuits/{width}`, `GET /api/v1/skeleton/explorer/circuit/{width}/{taxonomy}/{index}` |

Notes:
- `CircuitsDatabaseView` and `IrreducibleDatabaseView` fetch directly from `http://localhost:8000` instead of using `src/lib/api.ts`.
- The SAT/Go/Cluster views are driven by `DualDatabaseView` with separate fetch paths.

## Component groups

### Database explorers
- `src/components/database/CircuitsDatabaseView.tsx` - Main DB table (expects legacy fields).
- `src/components/database/DualDatabaseView.tsx` - SAT/Go/Cluster summary + sample circuits.
- `src/components/database/GoDatabaseView.tsx` - Go DB file listing and circuit sampling.
- `src/components/database/ClusterDatabaseView.tsx` - Cluster circuit browser with diagram rendering.
- `src/components/database/IrreducibleDatabaseView.tsx` - Irreducible DB browser + generation trigger.

### Generator workflow
- `src/components/generators/GeneratorCard.tsx` - Generator configuration card.
- `src/components/generators/RunsList.tsx` - Run status list with cancel/delete.
- `src/hooks/useFactory.ts` - Hooks for generator + stats polling.
- `src/lib/api.ts` - Generator API client.

### Playgrounds
- `src/components/CircuitPlayground.tsx` - Drag-and-drop circuit editor with live metrics.
- `src/components/ECA57Playground.tsx` - ECA57-specific editor with collision graph + cycle notation.
- `src/components/CircuitCanvas.tsx` / `GateToolbox.tsx` / `MetricsPanel.tsx` - Base playground UI.
- `src/components/playground-v2/*` - Second-generation playground with tabs and tool panels.

### ECA57 explorer
- `src/app/eca57-explorer/page.tsx` - LMDB explorer with circuit diagrams, skeleton graph, and equivalence views.
- `src/components/SkeletonGraph.tsx` - Reusable collision graph display.

### Skeleton identity explorer
- `src/app/skeleton-explorer/page.tsx` - Browser for skeleton identity circuits (fully noncommuting) from local_mixing/db.
- Inline components: `CircuitDiagram`, `CollisionChainGraph`, `CircuitDetailModal`, `CircuitCard`.

### Experiments
- `src/app/experiments/page.tsx` - Experiment builder + live run logs.
- `src/components/experiments/HeatmapViewer.tsx` - Heatmap rendering.

### Shared UI
- `src/components/Navigation.tsx` - Primary navigation bar for the app.
- `src/components/InfoTooltip.tsx` - Tooltip for parameter explanations.

