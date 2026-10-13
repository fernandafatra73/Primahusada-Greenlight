-- Nama dan foto pejabat per posisi (Pengaturan > Struktur Organisasi).
CREATE TABLE "StrukturOrganisasi" (
    "jabatan" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL DEFAULT '',
    "foto" TEXT,
    "updatedAt" DATETIME NOT NULL
);
