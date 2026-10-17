-- CreateTable
CREATE TABLE "LembarExcelBulanan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "modul" TEXT NOT NULL DEFAULT 'RADIOLOGI',
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LembarExcelBulanan_year_modul_key" ON "LembarExcelBulanan"("year", "modul");
