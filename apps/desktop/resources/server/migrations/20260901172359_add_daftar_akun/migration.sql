-- CreateTable
CREATE TABLE "DaftarAkun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaAkun" TEXT NOT NULL,
    "gmail" TEXT,
    "password" TEXT,
    "nomorHp" TEXT,
    "otentikator" TEXT,
    "passwordGmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
