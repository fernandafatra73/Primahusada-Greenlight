// Slide latar halaman login: berganti otomatis sesuai durasi masing-masing.
// Foto tiap slide disimpan di src/image/slide-<id>.(jpg|jpeg|png|webp); slide
// pertama memakai foto sambutan (selamat-datang.*). Foto slide ditampilkan utuh
// apa adanya (biasanya kolase yang sudah berlabel); selama fotonya belum ada,
// slide tampil sebagai kartu berwarna berisi judul dan daftar isinya.

const MINUTE_MS = 60_000;

export interface LoginSlide {
  readonly id: string;
  /** Judul besar pada kartu pengganti foto; null untuk slide sambutan. */
  readonly title: string | null;
  /** Judul juga ditempel di atas foto, untuk foto yang tidak memuat tulisan namanya sendiri. */
  readonly titleOnPhoto?: boolean;
  /** Isi slide, ditampilkan di bawah judul. */
  readonly items: readonly string[];
  readonly durationMs: number;
}

export const LOGIN_SLIDES: readonly LoginSlide[] = [
  { id: 'prima-husada', title: null, items: [], durationMs: MINUTE_MS },
  { id: 'poliklinik', title: 'Poliklinik', items: ['Ruang Praktek Dokter'], durationMs: MINUTE_MS },
  {
    id: 'radiologi',
    title: 'Radiologi',
    items: ['Alat Rontgen', 'Alat USG', 'Ruang Operator'],
    durationMs: 1.5 * MINUTE_MS,
  },
  {
    id: 'laboratorium',
    title: 'Lab',
    titleOnPhoto: true,
    items: ['Rayto 7600', 'Fotometer', 'Ruang Laboratorium'],
    durationMs: MINUTE_MS,
  },
  { id: 'farmasi', title: 'Farmasi', items: ['Ruang Obat'], durationMs: MINUTE_MS },
  { id: 'hrd', title: 'HRD', items: ['Ruang HRD', 'Tim Prima Husada'], durationMs: MINUTE_MS },
  // Slide animasi: pesawat Prima Husada lepas landas, lalu melintas kiri ke kanan
  // menembus awan (lihat TakeoffSlide; urutan waktunya di login.css).
  { id: 'menuju-2035', title: 'Menuju Prima Husada 2035', items: [], durationMs: 1.5 * MINUTE_MS },
];

/** Slide yang digambar sebagai animasi pesawat lepas landas, bukan foto/kartu biasa. */
export const TAKEOFF_SLIDE_ID = 'menuju-2035';

const IMAGE_EXTENSION = /\.(jpe?g|png|webp)$/i;

/**
 * URL foto untuk slide `id` dari hasil import.meta.glob (path file → URL),
 * atau null bila src/image/slide-<id>.* belum ada.
 */
export function slideImageUrl(urlsByPath: Readonly<Record<string, string>>, id: string): string | null {
  const fileName = `slide-${id}`.toLowerCase();
  for (const [path, url] of Object.entries(urlsByPath)) {
    const base = path.split('/').pop() ?? '';
    if (IMAGE_EXTENSION.test(base) && base.replace(IMAGE_EXTENSION, '').toLowerCase() === fileName) return url;
  }
  return null;
}

/** Slide berikutnya; setelah slide terakhir kembali ke slide pertama. */
export function nextSlideIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return (index + 1) % count;
}
