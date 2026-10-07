/** Aturan data menu "Lisensi" (berkas perizinan klinik): pasangan kategori/jenis
 * yang sah dan jenis berkas yang boleh diunggah. Daftar ini harus sejalan dengan
 * `LISENSI_TABS` di `apps/web/src/lib/lisensi.ts`. */

export const LISENSI_JENIS_BY_KATEGORI: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  rtrw: ['warga', 'pejabat'],
  desa: ['warga', 'pejabat'],
  camat: ['dokumen'],
  puskesmas: ['pejabat'],
  dinas: ['dokumen'],
  filmbadge: ['perjanjian', 'pembayaran', 'tld'],
  bapeten: ['sertifikat', 'uji-fungsi', 'pengisian'],
  terpadu: ['langkah'],
};

/** Bagian yang hanya boleh berisi satu entri (tanda tangan pejabat di bawah daftar). */
const SINGLE_ENTRY_JENIS: ReadonlySet<string> = new Set(['pejabat']);

/** Surat boleh berupa foto/scan atau PDF; tanda tangan selalu PNG dari kanvas. */
export const LISENSI_BERKAS_MEDIA_TYPES: ReadonlyArray<string> = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

export const LISENSI_NAMA_MAX_LENGTH = 200;
export const LISENSI_KETERANGAN_MAX_LENGTH = 1000;

export function isLisensiJenis(kategori: string, jenis: string): boolean {
  return LISENSI_JENIS_BY_KATEGORI[kategori]?.includes(jenis) ?? false;
}

export function isSingleEntryJenis(jenis: string): boolean {
  return SINGLE_ENTRY_JENIS.has(jenis);
}

/** Media type dari data URL base64, atau `null` bila bukan data URL. */
export function dataUrlMediaType(value: string): string | null {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,/.exec(value);
  return match ? (match[1] ?? null) : null;
}

/** Pesan error bila `value` adalah data URL dengan jenis file yang tidak diizinkan; `null` bila boleh. */
export function validateLisensiBerkas(value: string): string | null {
  const mediaType = dataUrlMediaType(value);
  if (mediaType === null) return 'Berkas tidak valid';
  if (!LISENSI_BERKAS_MEDIA_TYPES.includes(mediaType)) {
    return 'Berkas harus berupa gambar (JPEG, PNG, GIF, WEBP) atau PDF';
  }
  return null;
}

/** `YYYY-MM-DD` atau ISO → Date; `null` untuk kosong; `undefined` bila formatnya tidak valid. */
export function parseLisensiTanggal(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === null || value === undefined || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
