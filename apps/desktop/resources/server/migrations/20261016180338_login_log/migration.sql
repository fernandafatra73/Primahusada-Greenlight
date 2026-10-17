-- CreateTable
CREATE TABLE "LoginLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "loginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terakhirAktif" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" DATETIME,
    "foto" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LoginLog_loginAt_idx" ON "LoginLog"("loginAt");
