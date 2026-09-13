-- CreateTable
CREATE TABLE "Usg" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaPasien" TEXT NOT NULL,
    "regCode" TEXT,
    "jenisPemeriksaan" TEXT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotoDataUrl" TEXT NOT NULL,
    "analisa" TEXT,
    "kesan" TEXT,
    "radiologNama" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
