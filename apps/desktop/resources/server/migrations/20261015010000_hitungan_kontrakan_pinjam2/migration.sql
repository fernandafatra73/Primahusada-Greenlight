-- Hitungan Kontrakan: kolom Pinjaman 2 (kolom "pinjam" yang lama menjadi Pinjaman 1).
ALTER TABLE "HitunganKontrakan" ADD COLUMN "pinjam2" DECIMAL NOT NULL DEFAULT 0;
