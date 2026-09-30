/** Bagian data pendaftaran (Pasien) yang dipakai untuk mengisi form Rad2. */
export interface PendaftaranForRad2 {
  readonly nama: string;
  readonly umur: number;
  readonly alamat: string | null;
  readonly klinis: string | null;
  readonly kesan: string | null;
  readonly createdAt: string;
  readonly totalHarga: string;
  readonly pengirim: { readonly nama: string };
  readonly radiolog: { readonly nama: string } | null;
  readonly pemeriksaan: readonly { readonly nama: string }[];
}

/** Nilai awal form Rad2 (semua string, sama seperti state form). */
export interface Rad2FormFill {
  readonly nama: string;
  readonly umur: string;
  readonly alamat: string;
  readonly tanggal: string;
  readonly pemeriksaan: string;
  readonly pengirim: string;
  readonly klinis: string;
  readonly kesan: string;
  readonly radiologi: string;
  readonly harga: string;
}

function localDateIso(iso: string, fallback: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Petakan satu pendaftaran ke isian form Rad2. Beberapa pemeriksaan digabung dengan
 * koma; tanggal memakai hari pendaftaran (waktu lokal), `fallbackTanggal` bila tidak valid.
 */
export function pendaftaranToRad2Fill(p: PendaftaranForRad2, fallbackTanggal: string): Rad2FormFill {
  return {
    nama: p.nama,
    umur: String(p.umur),
    alamat: p.alamat ?? '',
    tanggal: localDateIso(p.createdAt, fallbackTanggal),
    pemeriksaan: p.pemeriksaan
      .map((x) => x.nama.trim())
      .filter(Boolean)
      .join(', '),
    pengirim: p.pengirim.nama,
    klinis: p.klinis ?? '',
    kesan: p.kesan ?? '',
    radiologi: p.radiolog?.nama ?? '',
    harga: String(Math.round(Number(p.totalHarga) || 0)),
  };
}
