-- Daftar penanggung jawab (PJ) Laboratorium.
CREATE TABLE "LabPenanggungJawab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "jumlah" DECIMAL NOT NULL DEFAULT 0,
    "admin" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LabPenanggungJawab_tanggal_idx" ON "LabPenanggungJawab"("tanggal");
