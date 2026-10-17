/** Status masa aktivasi aplikasi; data dari GET /api/aktivasi-aplikasi. */

export interface AktivasiAplikasi {
  readonly tanggalAktivasi: string;
  readonly lamaBulan: number;
  /** Hari pertama aplikasi terkunci (YYYY-MM-DD). */
  readonly berakhir: string;
}

export type StatusAktivasi =
  | { readonly jenis: 'belum' }
  | { readonly jenis: 'aktif'; readonly sisaHari: number }
  | { readonly jenis: 'berakhir' };

/** Sama dengan LAMA_AKTIVASI_BULAN di API. */
export const PILIHAN_LAMA_AKTIVASI: readonly { readonly bulan: number; readonly label: string }[] = [
  { bulan: 1, label: '1 bulan' },
  { bulan: 3, label: '3 bulan' },
  { bulan: 6, label: '6 bulan' },
  { bulan: 12, label: '1 tahun' },
  { bulan: 24, label: '2 tahun' },
  { bulan: 60, label: '5 tahun' },
];

export function labelLamaAktivasi(bulan: number): string {
  return PILIHAN_LAMA_AKTIVASI.find((p) => p.bulan === bulan)?.label ?? `${bulan} bulan`;
}

/** Tanggal lokal hari ini sebagai YYYY-MM-DD (bukan UTC, supaya pergantian hari ikut jam komputer klinik). */
export function tanggalHariIni(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hariSejakEpoch(tanggal: string): number {
  const [y, m, d] = tanggal.split('-').map(Number);
  return Math.round(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** Tanpa data aktivasi = belum diaktifkan; mulai tanggal `berakhir` = sudah berakhir. */
export function statusAktivasi(aktivasi: AktivasiAplikasi | null, hariIni: string): StatusAktivasi {
  if (!aktivasi) return { jenis: 'belum' };
  if (hariIni >= aktivasi.berakhir) return { jenis: 'berakhir' };
  return { jenis: 'aktif', sisaHari: hariSejakEpoch(aktivasi.berakhir) - hariSejakEpoch(hariIni) };
}

/**
 * Saklar penguncian masa aktivasi. Sementara dihentikan atas permintaan klinik
 * (17 Okt 2026): semua menu tampil seperti biasa walau belum diaktifkan atau
 * masa aktivasinya berakhir. Kode aktivasi & Perpanjang Aktivasi tetap berfungsi;
 * ubah ke `true` untuk mengunci lagi.
 */
export const PENGUNCIAN_AKTIVASI_AKTIF = false;

export function isAplikasiTerkunci(status: StatusAktivasi): boolean {
  return status.jenis !== 'aktif';
}

/** "2026-10-17" -> "17 Oktober 2026". */
export function formatTanggalPanjang(tanggal: string): string {
  const [y, m, d] = tanggal.split('-').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
