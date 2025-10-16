# Website LC Project Overview

## Product Goals
- Track daily cartridge rejections with strict lookup lists for lines, shifts, stages, and authorised approvers.【F:README.md†L1-L40】
- Capture dump-to-annealing and matrix-to-pouch batch closures, including material balances, rejection tallies, and downstream dispatch readiness.【F:README.md†L41-L86】
- Provide templates and APIs for bulk Excel uploads while validating every row against shared schema rules.【F:README.md†L18-L39】

## Frontend Architecture
- Vite + React + TypeScript entry point wires React Query and the router at boot so all pages share caching and navigation state.【F:client/src/main.tsx†L1-L17】
- `App.tsx` handles role selection (QA/QC/Production), Material UI theming, and guarded navigation links before mounting the routed workspaces.【F:client/src/App.tsx†L1-L123】【F:client/src/App.tsx†L194-L267】
- Rejection capture combines lookup-driven forms, a recent entries table, and Excel uploads, with React Query powering data fetches and toast feedback.【F:client/src/pages/RejectionFormPage.tsx†L1-L83】
- The batch closure console lets QA operators load a batch, add dump or matrix lots, and either fill forms or inspect submitted lots in read-only views.【F:client/src/pages/BatchClosurePage.tsx†L1-L119】【F:client/src/pages/BatchClosurePage.tsx†L262-L329】
- Dump closure forms auto-sum detail rows into the summary panel, enforce material tallies, and POST structured payloads to the API.【F:client/src/components/BatchClosureForm.tsx†L1-L118】【F:client/src/components/BatchClosureForm.tsx†L240-L329】
- Matrix closure forms mirror the live totals pattern, capture rejection stages, and normalise outputs for QC follow-up.【F:client/src/components/MatrixClosureForm.tsx†L1-L120】【F:client/src/components/MatrixClosureForm.tsx†L328-L427】
- QC intake focuses on pending matrix lots, shows flow metrics, and patches QC consumed/retained counts back to the server with derived dispatch quantities.【F:client/src/pages/QcIntakePage.tsx†L1-L131】【F:client/src/pages/QcIntakePage.tsx†L177-L264】
- Dispatch details aggregate closures by batch, reveal QC status, and keep a future dispatch form stub for logistics teams.【F:client/src/pages/DispatchDetailsPage.tsx†L1-L117】【F:client/src/pages/DispatchDetailsPage.tsx†L135-L202】
- Dashboard visualises rejection totals per day/line and surfaces closure snapshots using the shared aggregation helper.【F:client/src/pages/DashboardPage.tsx†L1-L101】【F:client/src/pages/DashboardPage.tsx†L108-L183】

## Data Aggregation Utilities
- `aggregateClosuresByBatch` consolidates dump and matrix lots into a single batch flow row, tracking QC completion, pouch output, and dispatch readiness for downstream views.【F:client/src/utils/closureFlow.ts†L1-L94】【F:client/src/utils/closureFlow.ts†L96-L158】

## Backend Services
- Express server loads environment config, applies CORS/Helmet/Morgan, exposes health checks, and mounts modular routers under `/api`.【F:server/src/server.ts†L1-L40】
- Lookups return canonical lines, shifts, rejection types, and equipment lists for the forms to remain in sync with validation rules.【F:server/src/routes/lookups.ts†L1-L20】
- Rejection routes cover CRUD, batch-number listings, and Excel imports with Zod-validated payloads and Prisma persistence.【F:server/src/routes/rejections.ts†L1-L118】
- Batch closure routes normalise detail rows, compute flow summaries, auto-add missing schema columns, and expose QC patch endpoints.【F:server/src/routes/batch-closures.ts†L1-L199】【F:server/src/routes/batch-closures.ts†L200-L314】
- Reports deliver grouped rejection totals and per-batch stage breakdowns for dashboard charts.【F:server/src/routes/reports.ts†L1-L66】

## Validation & Schema
- Zod schemas enforce shared line/stage enumerations, flow summaries, and matrix stage payloads to keep API submissions consistent across clients.【F:server/src/validation.ts†L1-L109】【F:server/src/validation.ts†L160-L207】
- Prisma models map the SQLite tables for rejections and batch closures, with generated clients targeting both native and Windows binaries.【F:server/prisma/schema.prisma†L1-L44】【F:server/prisma/schema.prisma†L46-L79】
