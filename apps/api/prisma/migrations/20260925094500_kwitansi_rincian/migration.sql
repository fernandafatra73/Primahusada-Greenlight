-- Baris rincian kwitansi yang bisa disunting sebelum dicetak, dipakai bersama
-- oleh kwitansi pendaftaran umum, radiologi, laboratorium, dan farmasi.
CREATE TABLE "KwitansiRincian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jenis" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "harga" DECIMAL NOT NULL DEFAULT 0,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "KwitansiRincian_jenis_nomor_idx" ON "KwitansiRincian"("jenis", "nomor");
