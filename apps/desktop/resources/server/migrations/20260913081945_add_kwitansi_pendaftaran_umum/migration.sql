-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PendaftaranUmum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noRegistrasi" TEXT NOT NULL,
    "namaPasien" TEXT NOT NULL,
    "umur" TEXT,
    "jenisKelamin" TEXT,
    "alamat" TEXT,
    "telpon" TEXT,
    "tanggalMasuk" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dokterPengirim" TEXT,
    "klinis" TEXT,
    "admin" TEXT,
    "foto" TEXT,
    "ruangan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU',
    "biayaPendaftaran" DECIMAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'BELUM_LUNAS',
    "petugasKasir" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PendaftaranUmum" ("admin", "alamat", "createdAt", "dokterPengirim", "foto", "id", "jenisKelamin", "klinis", "namaPasien", "noRegistrasi", "ruangan", "status", "tanggalMasuk", "telpon", "umur", "updatedAt") SELECT "admin", "alamat", "createdAt", "dokterPengirim", "foto", "id", "jenisKelamin", "klinis", "namaPasien", "noRegistrasi", "ruangan", "status", "tanggalMasuk", "telpon", "umur", "updatedAt" FROM "PendaftaranUmum";
DROP TABLE "PendaftaranUmum";
ALTER TABLE "new_PendaftaranUmum" RENAME TO "PendaftaranUmum";
CREATE UNIQUE INDEX "PendaftaranUmum_noRegistrasi_key" ON "PendaftaranUmum"("noRegistrasi");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
