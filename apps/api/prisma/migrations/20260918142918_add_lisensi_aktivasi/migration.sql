-- CreateTable
CREATE TABLE "LisensiAktivasi" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "installId" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
