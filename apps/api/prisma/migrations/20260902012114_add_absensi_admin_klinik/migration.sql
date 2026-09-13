-- CreateTable
CREATE TABLE "AbsensiAdminKlinik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminKlinikId" TEXT NOT NULL,
    "namaKaryawan" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "jamDatang" TEXT,
    "jamPulang" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SuratPeringatanAdminKlinik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaKaryawan" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL DEFAULT 'Admin Klinik',
    "level" TEXT NOT NULL,
    "nomorSurat" TEXT,
    "tanggalSurat" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alasan" TEXT NOT NULL,
    "tempatSurat" TEXT,
    "namaPenandatangan" TEXT,
    "jabatanPenandatangan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AbsensiAdminKlinik_adminKlinikId_tanggal_key" ON "AbsensiAdminKlinik"("adminKlinikId", "tanggal");
