-- CreateTable
CREATE TABLE "AktivasiAplikasi" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "tanggalAktivasi" DATETIME NOT NULL,
    "lamaBulan" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
