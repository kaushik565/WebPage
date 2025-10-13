/*
  Warnings:

  - Added the required column `batch_number` to the `batch_closures` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_batch_closures" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stage_type" TEXT NOT NULL DEFAULT 'DumpToAnnealing',
    "batch_number" TEXT NOT NULL,
    "lot_label" TEXT,
    "lot_number" INTEGER,
    "closure_given_by" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "production_date" DATETIME NOT NULL,
    "status" TEXT,
    "total_accepted" INTEGER,
    "total_annealing" INTEGER,
    "line_clearance_datetime" DATETIME,
    "line_closure_time" TEXT,
    "batch_quantity" INTEGER,
    "total_rejections" INTEGER,
    "dump_total_rejections" INTEGER,
    "remarks" TEXT,
    "component_summary" TEXT,
    "detail_rows" TEXT,
    "detail_totals" TEXT,
    "stage_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_batch_closures" ("batch_quantity", "closure_given_by", "component_summary", "created_at", "detail_rows", "detail_totals", "dump_total_rejections", "id", "line_clearance_datetime", "line_closure_time", "lot_label", "lot_number", "production_date", "remarks", "shift", "stage_data", "stage_type", "status", "total_accepted", "total_annealing", "total_rejections", "updated_at") SELECT "batch_quantity", "closure_given_by", "component_summary", "created_at", "detail_rows", "detail_totals", "dump_total_rejections", "id", "line_clearance_datetime", "line_closure_time", "lot_label", "lot_number", "production_date", "remarks", "shift", "stage_data", "stage_type", "status", "total_accepted", "total_annealing", "total_rejections", "updated_at" FROM "batch_closures";
DROP TABLE "batch_closures";
ALTER TABLE "new_batch_closures" RENAME TO "batch_closures";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
