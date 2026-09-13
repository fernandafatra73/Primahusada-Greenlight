-- CreateTable
CREATE TABLE "PemakaianFilm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pemakaianHarian" INTEGER NOT NULL DEFAULT 0,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "tanggalPembelian" DATETIME,
    "jumlahPembelian" INTEGER NOT NULL DEFAULT 0,
    "hargaPembelian" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
