-- CreateTable
CREATE TABLE "KodeAktivasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kode" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "dipakaiPada" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "KodeAktivasi_kode_key" ON "KodeAktivasi"("kode");

-- CreateIndex
CREATE INDEX "KodeAktivasi_tanggal_idx" ON "KodeAktivasi"("tanggal");
