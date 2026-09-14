-- CreateTable
CREATE TABLE "CandleAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "candleOpen" DATETIME NOT NULL,
    "pola" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CandleAlert_createdAt_idx" ON "CandleAlert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandleAlert_symbol_timeframe_candleOpen_pola_key" ON "CandleAlert"("symbol", "timeframe", "candleOpen", "pola");
