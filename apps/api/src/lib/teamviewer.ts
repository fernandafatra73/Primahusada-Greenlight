/** Penunjang tombol "Sambung (TeamViewer)" di menu Koneksi Ke PH — sama
 * pola amannya dengan lib/anydesk.ts: ID tujuan wajib lolos
 * `normalizeTeamViewerId` sebelum dipakai sebagai argumen proses. */

import { existsSync } from 'node:fs';

/** ID TeamViewer, biasanya 9–10 digit. */
const ID_PATTERN = /^\d{6,12}$/;

export function normalizeTeamViewerId(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const digitsOnly = trimmed.replace(/[\s-]/g, '');
  return ID_PATTERN.test(digitsOnly) ? digitsOnly : null;
}

/** Menyisipkan spasi tiap tiga angka, seperti tampilan ID di TeamViewer. */
export function formatTeamViewerId(id: string): string {
  return id.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Lokasi pemasangan TeamViewer yang lazim di Windows. Daftarnya tetap dan
 * tidak berasal dari masukan pengguna. */
export const TEAMVIEWER_CANDIDATE_PATHS: readonly string[] = [
  'C:\\Program Files\\TeamViewer\\TeamViewer.exe',
  'C:\\Program Files (x86)\\TeamViewer\\TeamViewer.exe',
];

/** Berkas TeamViewer yang benar-benar ada, atau null bila belum terpasang.
 *
 * `exists` bisa diganti di tes supaya tidak bergantung pada isi komputer. */
export function findTeamViewerExecutable(
  candidates: readonly string[] = TEAMVIEWER_CANDIDATE_PATHS,
  exists: (path: string) => boolean = existsSync,
): string | null {
  for (const path of candidates) {
    if (exists(path)) return path;
  }
  return null;
}
