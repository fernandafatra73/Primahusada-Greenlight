-- CreateTable
CREATE TABLE "TradingMinPlus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hargaAcuan" DECIMAL NOT NULL,
    "keterangan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
