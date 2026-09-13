-- CreateTable
CREATE TABLE "SharingRadiolog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaPemeriksaan" TEXT NOT NULL,
    "sharingNominal" DECIMAL NOT NULL,
    "totalSharing" DECIMAL NOT NULL,
    "radiologId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SharingRadiolog_radiologId_fkey" FOREIGN KEY ("radiologId") REFERENCES "Radiolog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
