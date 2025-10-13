-- CreateTable
CREATE TABLE "rejection_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entry_date" DATETIME NOT NULL,
    "shift" TEXT NOT NULL,
    "batch_no" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "rejection_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
