/** Tanggal format YYYY-MM-DD (dari input type="date") sebagai tengah malam UTC; null bila tidak valid. */
export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed ? null : date;
}

/**
 * Waktu registrasi dari tanggal pilihan user. Bila tanggalnya sama dengan hari ini
 * (atau tidak diisi), jam sekarang dipakai supaya urutan registrasi hari ini tetap benar.
 */
export function registrationTimestamp(tanggal: string | undefined, now: Date): Date | null {
  if (tanggal === undefined || tanggal.trim() === '') return now;
  const date = parseDateOnly(tanggal);
  if (!date) return null;
  return date.toISOString().slice(0, 10) === now.toISOString().slice(0, 10) ? now : date;
}
