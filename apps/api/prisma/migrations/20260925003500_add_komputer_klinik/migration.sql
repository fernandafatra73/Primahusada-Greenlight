-- CreateTable
CREATE TABLE "KomputerKlinik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "anydeskId" TEXT NOT NULL,
    "lokasi" TEXT,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
