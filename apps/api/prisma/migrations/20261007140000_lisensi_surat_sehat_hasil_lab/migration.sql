-- Surat sehat dan hasil lab tahunan karyawan (menu Lisensi).
CREATE TABLE "LisensiSuratSehat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tahun" INTEGER NOT NULL,
    "nomorSurat" TEXT,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT,
    "tempatTanggalLahir" TEXT,
    "jenisKelamin" TEXT,
    "alamat" TEXT,
    "tanggalPeriksa" DATETIME NOT NULL,
    "tinggiBadan" TEXT,
    "beratBadan" TEXT,
    "tekananDarah" TEXT,
    "nadi" TEXT,
    "butaWarna" TEXT,
    "kesimpulan" TEXT NOT NULL DEFAULT 'SEHAT',
    "keperluan" TEXT,
    "catatan" TEXT,
    "namaDokter" TEXT NOT NULL,
    "sipDokter" TEXT,
    "ttdDokter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LisensiHasilLab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tahun" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT,
    "tanggalPeriksa" DATETIME NOT NULL,
    "catatan" TEXT,
    "berkas" TEXT,
    "berkasNama" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LisensiHasilLabItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hasilLabId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "hasil" TEXT NOT NULL,
    "satuan" TEXT,
    "nilaiNormal" TEXT,
    CONSTRAINT "LisensiHasilLabItem_hasilLabId_fkey" FOREIGN KEY ("hasilLabId") REFERENCES "LisensiHasilLab" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LisensiSuratSehat_tahun_idx" ON "LisensiSuratSehat"("tahun");

-- CreateIndex
CREATE INDEX "LisensiHasilLab_tahun_idx" ON "LisensiHasilLab"("tahun");

-- CreateIndex
CREATE INDEX "LisensiHasilLabItem_hasilLabId_idx" ON "LisensiHasilLabItem"("hasilLabId");
