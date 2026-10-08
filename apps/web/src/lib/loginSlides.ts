// Slide latar halaman login: berganti otomatis sesuai durasi masing-masing.
// Foto tiap slide disimpan di src/image/slide-<id>.(jpg|jpeg|png|webp); slide
// pertama memakai foto sambutan (selamat-datang.*). Selama fotonya belum ada,
// slide tampil sebagai kartu berwarna berisi judul dan daftar isinya.

const MINUTE_MS = 60_000;

export interface LoginSlide {
  readonly id: string;
  /** Judul besar di atas slide; null untuk slide yang fotonya sudah memuat tulisan sendiri. */
  readonly title: string | null;
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
    items: ['Rayto 7600', 'Fotometer', 'Ruang Laboratorium'],
    durationMs: MINUTE_MS,
  },
  { id: 'farmasi', title: 'Farmasi', items: ['Ruang Obat'], durationMs: MINUTE_MS },
  { id: 'hrd', title: 'HRD', items: ['Ruang HRD', 'Tim Prima Husada'], durationMs: MINUTE_MS },
];

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
