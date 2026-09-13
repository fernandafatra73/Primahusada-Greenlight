-- CreateTable
CREATE TABLE "ReagenReminderSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "tanggal" INTEGER NOT NULL DEFAULT 20,
    "pesan" TEXT NOT NULL DEFAULT 'Perhatian, sudah tanggal 20. Segera hitung stock opname laboratorium, dan lakukan pembelian jika stok kurang.',
    "updatedAt" DATETIME NOT NULL
);
