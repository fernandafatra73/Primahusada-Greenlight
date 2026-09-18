-- CreateTable
CREATE TABLE "Rad2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "umur" INTEGER NOT NULL,
    "alamat" TEXT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pemeriksaan" TEXT NOT NULL,
    "pengirim" TEXT NOT NULL,
    "klinis" TEXT,
    "kesan" TEXT,
    "radiologi" TEXT,
    "harga" DECIMAL NOT NULL DEFAULT 0,
    "sharing" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
