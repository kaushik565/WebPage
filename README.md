# Website LC – Rejection Tracking Module

## Requirements Summary
- Capture daily rejection data per production shift (manual entry or Excel import).
- Record dump insertion to annealing and matrix pallet filling to pouch packing batch closure details via manual entry.
- Fixed lookup lists:
  - Lines: A, B, C, D, E, G
  - Shifts: A, B, C
  - Stages: VI-1, VI-3, Vacuum, VI-4
  - Updated by: LR NAIDU, P.L.SAI KAUSHIK, A.SAI KUMAR, U.SRINIVAS, N.CHAKRADHAR, K.VARMA, ROHINI, S.NARENDRA, S.RAJU
  - Stage-specific rejection types and line-specific equipment IDs as provided.
- Fields per rejection entry:
  - `date` (stored as ISO, displayed/entered as `dd/MM/yyyy`, required)
  - `shift` (enum: A/B/C, required)
- `batch_no` (string, required, 10 characters e.g. `MVANC00001`)
  - `line` (enum, required)
  - `stage` (enum, required)
  - `equipment_id` (line-filtered list for stage VI-1, auto-set to `NA` for other stages)
  - `rejection_type` (enum filtered by stage, required)
  - `quantity` (positive integer, required)
  - `updated_by` (enum, required)

## Proposed Architecture
- **Frontend**: React + Vite + TypeScript + Material UI. Pages for:
  - Rejection entry form with cascading dropdowns, queue-before-submit workflow, validation, and Excel upload.
  - Rejection list / dashboard placeholder.
  - Batch closure workspace with dedicated forms for Dump → Annealing and Matrix → Pouch stages, plus recent activity list.
  - Client-side data fetching via React Query.
- **Backend**: Node.js (Express) + TypeScript.
  - REST endpoints for CRUD on rejections + lookup metadata.
  - Bulk submission endpoint (`POST /api/rejections/bulk`) to persist multiple queued records in one operation.
  - Batch closure endpoint (`POST /api/batch-closures`) supporting stage-specific payloads.
  - Excel upload endpoint (`POST /api/rejections/upload`) that accepts `.xlsx/.xls`, validates each row, and persists valid records.
  - Input validation via Zod schemas.
- **Database**: SQLite via Prisma ORM for local development (easily switched to PostgreSQL later).
  - Table `rejection_entries` with schema:
    ```sql
    id INTEGER PRIMARY KEY AUTOINCREMENT
    entry_date DATE NOT NULL
    shift TEXT NOT NULL
    batch_no TEXT NOT NULL
    line TEXT NOT NULL
    stage TEXT NOT NULL
    equipment_id TEXT NOT NULL
    rejection_type TEXT NOT NULL
    quantity INTEGER CHECK(quantity > 0) NOT NULL
    updated_by TEXT NOT NULL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ```
- **Reporting**:
 - `/reports/rejections/daily` returns totals grouped by date/shift/line for dashboard charts.
  - `/reports/rejections/by-batch?batchNo=...` returns total quantity and stage breakdown for a specific batch.

## Excel Import Template
Upload files must include a header row with the following columns:

- `Date` (format `dd/MM/yyyy`)
- `Shift`
- `BatchNo`
- `Line`
- `Stage`
- `EquipmentId` (only used for stage `VI-1`; leave blank/`NA` for others)
- `RejectionType`
- `Quantity`
- `UpdatedBy`

Rows failing validation are reported back with row numbers and reasons. Valid rows insert even if some rows fail (response includes both `inserted` count and `errors`).

## Next Steps
1. Install dependencies for both apps:
   - `cd server && npm install`
   - `cd client && npm install`
2. Copy `.env.example` to `.env` inside `server/` and adjust values if needed.
3. Generate the Prisma client and run migrations:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
4. Start the backend (`npm run dev`) and frontend (`npm run dev` in `client/`).
5. Open http://localhost:5173 to use the Rejections form and dashboards.

## Batch Closure Data Entry
- Navigate to `Batch Closure` in the top navigation to access two tabs:
  1. **Dump → Annealing**: captures component totals (Filter Rod/Dump 2/Sample Filter) and detailed dump insertion rows with auto totals.
  2. **Matrix → Pouch**: captures pallet material totals, inline child parts, rejection stage counts, and yield tables.
- Header section (shared) records lot information, shift, dates/times, totals, and remarks.
- The workspace prompts for a 10-character batch number and automatically adapts the layout depending on cartridge type (NC, L, LR) so only the relevant fields are shown.
- Use the `Add New Lot` button to jump straight into the next lot for the same batch; each submission is stored individually but pre-filled with the shared batch number.
- Recent submissions (across both stages) appear beside the forms with stage labels for quick reference.
