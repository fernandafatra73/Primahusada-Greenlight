/** Penunjang fitur "Koneksi Ke PH": menemukan AnyDesk yang terpasang dan
 * memeriksa alamat tujuan sebelum dipakai.
 *
 * Endpoint penyambung menjalankan program di komputer ini, jadi alamat tujuan
 * tidak boleh dipercaya begitu saja. `normalizeAnydeskAddress` sengaja dibuat
 * ketat: hanya nomor ID atau alias AnyDesk yang lolos, sehingga tidak ada
 * peluang menyelipkan argumen atau perintah lain lewat kolom isian. */

import { existsSync } from 'node:fs';

/** Nomor ID AnyDesk, biasanya 9–10 digit dan ditulis berspasi (123 456 789). */
const ID_PATTERN = /^\d{6,12}$/;

/** Alias AnyDesk, mis. "pendaftaran-ph@ad". */
const ALIAS_PATTERN = /^[a-z0-9][a-z0-9._-]{1,62}@ad$/i;

/** Mengubah isian pengguna jadi alamat AnyDesk yang aman dipakai sebagai
 * argumen, atau null bila bukan alamat yang sah.
 *
 * Spasi dan tanda hubung pemisah dibuang lebih dulu karena AnyDesk menampilkan
 * ID dengan spasi, dan orang biasa menyalinnya apa adanya. */
export function normalizeAnydeskAddress(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  if (ALIAS_PATTERN.test(trimmed)) return trimmed.toLowerCase();

  const digitsOnly = trimmed.replace(/[\s-]/g, '');
  if (ID_PATTERN.test(digitsOnly)) return digitsOnly;

  return null;
}

/** Menyisipkan spasi tiap tiga angka supaya ID enak dibaca, seperti tampilan
 * AnyDesk sendiri. Alias dikembalikan apa adanya. */
export function formatAnydeskId(address: string): string {
  if (!/^\d+$/.test(address)) return address;
  return address.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Lokasi pemasangan AnyDesk yang lazim di Windows. Daftarnya tetap dan tidak
 * berasal dari masukan pengguna. */
export const ANYDESK_CANDIDATE_PATHS: readonly string[] = [
  'C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe',
  'C:\\Program Files\\AnyDesk\\AnyDesk.exe',
];

/** Berkas AnyDesk yang benar-benar ada, atau null bila belum terpasang.
 *
 * `exists` bisa diganti di tes supaya tidak bergantung pada isi komputer. */
export function findAnydeskExecutable(
  candidates: readonly string[] = ANYDESK_CANDIDATE_PATHS,
  exists: (path: string) => boolean = existsSync,
): string | null {
  for (const path of candidates) {
    if (exists(path)) return path;
  }
  return null;
}

/** Membaca ID dari keluaran `AnyDesk.exe --get-id`, yang hanya berisi angka
 * dan bisa disertai baris kosong. */
export function parseAnydeskIdOutput(output: string): string | null {
  const digits = output.trim().replace(/\s/g, '');
  return ID_PATTERN.test(digits) ? digits : null;
}
