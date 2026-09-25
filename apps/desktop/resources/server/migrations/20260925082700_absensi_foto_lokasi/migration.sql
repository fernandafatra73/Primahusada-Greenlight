-- Foto selfie dan titik lokasi saat absensi, terpisah untuk datang dan pulang.
ALTER TABLE "AbsensiAdminKlinik" ADD COLUMN "fotoDatang" TEXT;
ALTER TABLE "AbsensiAdminKlinik" ADD COLUMN "latDatang" REAL;
ALTER TABLE "AbsensiAdminKlinik" ADD COLUMN "lngDatang" REAL;
ALTER TABLE "AbsensiAdminKlinik" ADD COLUMN "akurasiDatang" REAL;
ALTER TABLE "AbsensiAdminKlinik" ADD COLUMN "fotoPulang" TEXT;
ALTER TABLE "AbsensiAdminKlinik" ADD COLUMN "latPulang" REAL;
ALTER TABLE "AbsensiAdminKlinik" ADD COLUMN "lngPulang" REAL;
ALTER TABLE "AbsensiAdminKlinik" ADD COLUMN "akurasiPulang" REAL;
