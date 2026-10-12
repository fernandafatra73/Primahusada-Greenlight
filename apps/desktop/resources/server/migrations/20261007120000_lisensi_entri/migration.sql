-- Berkas perizinan klinik (menu Lisensi).
CREATE TABLE "LisensiEntri" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kategori" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "keterangan" TEXT,
    "tanggal" DATETIME,
    "berkas" TEXT,
    "berkasNama" TEXT,
    "selesai" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LisensiEntri_kategori_jenis_idx" ON "LisensiEntri"("kategori", "jenis");
