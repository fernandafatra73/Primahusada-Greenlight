-- CreateTable
CREATE TABLE "Expertise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pemeriksaan" TEXT,
    "klinis" TEXT,
    "namaPenyakit" TEXT,
    "fotoDataUrl" TEXT,
    "kesan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
