-- CreateTable
CREATE TABLE "LaporanGajiLabel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modul" TEXT NOT NULL DEFAULT 'RADIOLOGI',
    "labelFernanda" TEXT NOT NULL DEFAULT 'Fernanda',
    "labelChalimatusadiah" TEXT NOT NULL DEFAULT 'Chalimatusadiah',
    "labelRiki" TEXT NOT NULL DEFAULT 'Riki',
    "labelAgung" TEXT NOT NULL DEFAULT 'Agung',
    "labelKaryawan1" TEXT NOT NULL DEFAULT 'Karyawan 1',
    "labelKaryawan2" TEXT NOT NULL DEFAULT 'Karyawan 2',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LaporanGajiLabel_modul_key" ON "LaporanGajiLabel"("modul");
