-- CreateTable
CREATE TABLE "TradingLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resistance" DECIMAL NOT NULL,
    "support" DECIMAL NOT NULL,
    "keterangan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
