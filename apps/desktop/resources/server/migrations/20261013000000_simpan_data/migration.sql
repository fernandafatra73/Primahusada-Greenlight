-- Arsip berkas Mega Data > Simpan Data.
CREATE TABLE "SimpanData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "keterangan" TEXT,
    "berkas" TEXT NOT NULL,
    "berkasNama" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SimpanData_kategori_idx" ON "SimpanData"("kategori");
