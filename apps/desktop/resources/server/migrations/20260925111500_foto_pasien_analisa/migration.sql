-- Arsip foto pasien beserta analisanya, diisi dari modal Edit3 di halaman Pasien.
CREATE TABLE "FotoPasienAnalisa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pasienId" TEXT NOT NULL,
    "namaPasien" TEXT NOT NULL,
    "foto" TEXT NOT NULL,
    "analisa" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "FotoPasienAnalisa_pasienId_idx" ON "FotoPasienAnalisa"("pasienId");
