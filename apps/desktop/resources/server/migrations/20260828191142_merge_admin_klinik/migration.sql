/*
  Warnings:

  - You are about to drop the `AdminPendaftaran` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PetugasAdminKlinik` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PetugasKasir` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AdminPendaftaran";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PetugasAdminKlinik";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PetugasKasir";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AdminKlinik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "noHp" TEXT,
    "statusHadir" TEXT,
    "statusTanggal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
