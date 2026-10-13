import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

export const SIMPAN_DATA_KATEGORI = [
  'excel',
  'word',
  'foto',
  'video',
  'aplikasi',
  'program',
  'lainnya',
] as const;

export type SimpanDataKategori = (typeof SIMPAN_DATA_KATEGORI)[number];

export const SIMPAN_DATA_SUBDIR = 'simpan-data';
export const SIMPAN_DATA_MAX_BYTES = 512 * 1024 * 1024;
export const SIMPAN_DATA_NAMA_MAX_LENGTH = 200;
export const SIMPAN_DATA_KETERANGAN_MAX_LENGTH = 1000;

const KATEGORI_BY_EXTENSION: Readonly<Record<string, SimpanDataKategori>> = {
  '.xls': 'excel',
  '.xlsx': 'excel',
  '.xlsm': 'excel',
  '.csv': 'excel',
  '.doc': 'word',
  '.docx': 'word',
  '.rtf': 'word',
  '.odt': 'word',
  '.jpg': 'foto',
  '.jpeg': 'foto',
  '.png': 'foto',
  '.gif': 'foto',
  '.webp': 'foto',
  '.bmp': 'foto',
  '.mp4': 'video',
  '.mkv': 'video',
  '.avi': 'video',
  '.mov': 'video',
  '.wmv': 'video',
  '.webm': 'video',
  '.exe': 'aplikasi',
  '.msi': 'aplikasi',
  '.apk': 'aplikasi',
  '.zip': 'program',
  '.rar': 'program',
  '.7z': 'program',
  '.bat': 'program',
  '.js': 'program',
  '.py': 'program',
  '.ps1': 'program',
};

export function isSimpanDataKategori(value: unknown): value is SimpanDataKategori {
  return typeof value === 'string' && (SIMPAN_DATA_KATEGORI as readonly string[]).includes(value);
}

/// Tebakan kategori dari ekstensi, dipakai saat pengguna tidak memilih sendiri.
export function kategoriDariNamaBerkas(fileName: string): SimpanDataKategori {
  return KATEGORI_BY_EXTENSION[extname(fileName).toLowerCase()] ?? 'lainnya';
}

/// Nama file di disk dibuat acak; hanya ekstensi asli yang dipertahankan (setelah
/// dibersihkan) supaya input pengguna tidak bisa menyisipkan path traversal.
export function buatNamaBerkasTersimpan(fileName: string): string {
  const ext = extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 10);
  return `${randomUUID()}${ext === '.' ? '' : ext}`;
}
