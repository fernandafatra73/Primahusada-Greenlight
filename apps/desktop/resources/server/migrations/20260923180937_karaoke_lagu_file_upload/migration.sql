-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KaraokeLagu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "judul" TEXT NOT NULL,
    "penyanyi" TEXT,
    "url" TEXT,
    "fileData" TEXT,
    "hasFile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_KaraokeLagu" ("createdAt", "id", "judul", "penyanyi", "updatedAt", "url") SELECT "createdAt", "id", "judul", "penyanyi", "updatedAt", "url" FROM "KaraokeLagu";
DROP TABLE "KaraokeLagu";
ALTER TABLE "new_KaraokeLagu" RENAME TO "KaraokeLagu";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
