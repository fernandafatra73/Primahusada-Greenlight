export const STRUKTUR_JABATAN = [
  'pimpinan',
  'dokter-penanggung-jawab',
  'hrd',
  'radiologi',
  'laboratorium',
  'kebersihan',
  'admin',
] as const;

export type StrukturJabatan = (typeof STRUKTUR_JABATAN)[number];

export const STRUKTUR_NAMA_MAX_LENGTH = 100;

export function isStrukturJabatan(value: unknown): value is StrukturJabatan {
  return typeof value === 'string' && (STRUKTUR_JABATAN as readonly string[]).includes(value);
}

/** Foto boleh kosong (hapus), path upload yang sudah tersimpan, atau data URL gambar baru. */
export function isValidStrukturFoto(value: string): boolean {
  return value === '' || value.startsWith('/uploads/') || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}
