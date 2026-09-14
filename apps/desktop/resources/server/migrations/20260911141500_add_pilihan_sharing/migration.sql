-- CreateTable
CREATE TABLE "PilihanSharing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nominal" INTEGER NOT NULL,
    "keterangan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PilihanSharing_nominal_key" ON "PilihanSharing"("nominal");

-- Seed: pilihan yang sebelumnya tertulis langsung di form Registrasi Radiologi.
INSERT INTO "PilihanSharing" ("id", "nominal", "keterangan", "updatedAt") VALUES
    ('pilihan-sharing-18000', 18000, 'Thorax Anak (< 10 th) — dr. Anna Diah', CURRENT_TIMESTAMP),
    ('pilihan-sharing-20000', 20000, 'Thorax Dewasa (≥ 10 th) — dr. Anna Diah', CURRENT_TIMESTAMP),
    ('pilihan-sharing-33000', 33000, 'Thorax Anak (< 10 th) — dr. Eva / dr. Iman', CURRENT_TIMESTAMP),
    ('pilihan-sharing-35000', 35000, 'Thorax Dewasa (≥ 10 th) — dr. Eva / dr. Iman', CURRENT_TIMESTAMP),
    ('pilihan-sharing-58000', 58000, 'Shoulder Joint', CURRENT_TIMESTAMP),
    ('pilihan-sharing-88000', 88000, 'Lumbosacral', CURRENT_TIMESTAMP),
    ('pilihan-sharing-50000', 50000, 'Standar Dokter', CURRENT_TIMESTAMP),
    ('pilihan-sharing-0', 0, 'Tanpa Sharing', CURRENT_TIMESTAMP);
