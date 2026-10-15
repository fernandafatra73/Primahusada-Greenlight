-- Hitungan biaya kontrakan per bulan (tombol "Hitungan" di navbar).
CREATE TABLE "HitunganKontrakan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "sewa" DECIMAL NOT NULL DEFAULT 0,
    "listrik" DECIMAL NOT NULL DEFAULT 0,
    "air" DECIMAL NOT NULL DEFAULT 0,
    "pinjam" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "HitunganKontrakan_tahun_bulan_idx" ON "HitunganKontrakan"("tahun", "bulan");
