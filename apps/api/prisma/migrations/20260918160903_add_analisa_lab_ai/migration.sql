-- CreateTable
CREATE TABLE "AnalisaLabAi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaPasien" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "parameterData" TEXT NOT NULL,
    "namaPenyakit" TEXT,
    "kesan" TEXT,
    "isDraftAi" BOOLEAN NOT NULL DEFAULT false,
    "petugasLabNama" TEXT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
