-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LaporanPajakBulanan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "modul" TEXT NOT NULL DEFAULT 'RADIOLOGI',
    "harga" DECIMAL NOT NULL DEFAULT 0,
    "biayaSewaTempat" DECIMAL NOT NULL DEFAULT 0,
    "biayaListrikAir" DECIMAL NOT NULL DEFAULT 0,
    "gajiFernanda" DECIMAL NOT NULL DEFAULT 0,
    "gajiChalimatusadiah" DECIMAL NOT NULL DEFAULT 0,
    "gajiRiki" DECIMAL NOT NULL DEFAULT 0,
    "gajiAgung" DECIMAL NOT NULL DEFAULT 0,
    "gajiKaryawan1" DECIMAL NOT NULL DEFAULT 0,
    "gajiKaryawan2" DECIMAL NOT NULL DEFAULT 0,
    "bahanRoentgen" DECIMAL NOT NULL DEFAULT 0,
    "peralatanRoentgen" DECIMAL NOT NULL DEFAULT 0,
    "penyusutanManual" DECIMAL NOT NULL DEFAULT 0,
    "perbaikanAlat" DECIMAL NOT NULL DEFAULT 0,
    "hargaPeralatan" DECIMAL NOT NULL DEFAULT 0,
    "tarifPenyusutanTahunanPersen" DECIMAL NOT NULL DEFAULT 10,
    "piutangUsaha" DECIMAL NOT NULL DEFAULT 0,
    "perlengkapan" DECIMAL NOT NULL DEFAULT 0,
    "utangUsaha" DECIMAL NOT NULL DEFAULT 0,
    "modalAwalTahun" DECIMAL NOT NULL DEFAULT 0,
    "kasAwalTahun" DECIMAL NOT NULL DEFAULT 0,
    "akumulasiPenyusutanAwalTahun" DECIMAL NOT NULL DEFAULT 0,
    "tarifPajakPersen" DECIMAL NOT NULL DEFAULT 0.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LaporanPajakBulanan" ("akumulasiPenyusutanAwalTahun", "bahanRoentgen", "biayaListrikAir", "biayaSewaTempat", "bulan", "createdAt", "gajiAgung", "gajiChalimatusadiah", "gajiFernanda", "gajiKaryawan1", "gajiKaryawan2", "gajiRiki", "harga", "hargaPeralatan", "id", "kasAwalTahun", "modalAwalTahun", "modul", "penyusutanManual", "peralatanRoentgen", "perbaikanAlat", "perlengkapan", "piutangUsaha", "tarifPenyusutanTahunanPersen", "updatedAt", "utangUsaha", "year") SELECT "akumulasiPenyusutanAwalTahun", "bahanRoentgen", "biayaListrikAir", "biayaSewaTempat", "bulan", "createdAt", "gajiAgung", "gajiChalimatusadiah", "gajiFernanda", "gajiKaryawan1", "gajiKaryawan2", "gajiRiki", "harga", "hargaPeralatan", "id", "kasAwalTahun", "modalAwalTahun", "modul", "penyusutanManual", "peralatanRoentgen", "perbaikanAlat", "perlengkapan", "piutangUsaha", "tarifPenyusutanTahunanPersen", "updatedAt", "utangUsaha", "year" FROM "LaporanPajakBulanan";
DROP TABLE "LaporanPajakBulanan";
ALTER TABLE "new_LaporanPajakBulanan" RENAME TO "LaporanPajakBulanan";
CREATE UNIQUE INDEX "LaporanPajakBulanan_year_bulan_modul_key" ON "LaporanPajakBulanan"("year", "bulan", "modul");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
