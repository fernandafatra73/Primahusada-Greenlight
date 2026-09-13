-- CreateTable
CREATE TABLE "TradingHargaBeli" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hargaBeli" DECIMAL NOT NULL,
    "keterangan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
