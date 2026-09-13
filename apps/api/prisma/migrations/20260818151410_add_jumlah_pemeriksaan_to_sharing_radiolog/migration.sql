-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SharingRadiolog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaPemeriksaan" TEXT NOT NULL,
    "jumlahPemeriksaan" INTEGER NOT NULL DEFAULT 1,
    "sharingNominal" DECIMAL NOT NULL,
    "totalSharing" DECIMAL NOT NULL,
    "radiologId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SharingRadiolog_radiologId_fkey" FOREIGN KEY ("radiologId") REFERENCES "Radiolog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SharingRadiolog" ("createdAt", "id", "namaPemeriksaan", "radiologId", "sharingNominal", "totalSharing", "updatedAt") SELECT "createdAt", "id", "namaPemeriksaan", "radiologId", "sharingNominal", "totalSharing", "updatedAt" FROM "SharingRadiolog";
DROP TABLE "SharingRadiolog";
ALTER TABLE "new_SharingRadiolog" RENAME TO "SharingRadiolog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
