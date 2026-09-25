-- Arsip hasil pembacaan AI (AI Foto & AI Banding 2), terpisah dari AnalisaFotoAi.
CREATE TABLE "TabelAi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaPenyakit" TEXT,
    "foto" TEXT NOT NULL,
    "hasilAnalisa" TEXT NOT NULL,
    "asal" TEXT,
    "namaPasien" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
