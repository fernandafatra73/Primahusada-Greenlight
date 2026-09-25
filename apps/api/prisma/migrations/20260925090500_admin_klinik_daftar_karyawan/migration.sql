-- Kolom tambahan untuk Daftar Karyawan di tab Admin Klinik.
ALTER TABLE "AdminKlinik" ADD COLUMN "nk" TEXT;
ALTER TABLE "AdminKlinik" ADD COLUMN "alamat" TEXT;
ALTER TABLE "AdminKlinik" ADD COLUMN "bagian" TEXT;
ALTER TABLE "AdminKlinik" ADD COLUMN "foto" TEXT;
ALTER TABLE "AdminKlinik" ADD COLUMN "keterangan" TEXT;
