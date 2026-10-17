/** Validasi lembar "Excel" Hasil Perbulan (Keuangan > Hasil Perbulan > Excel). */

import type { Parsed } from './loginLog.js';

const KUNCI_SEL = /^[A-Z]{1,3}[1-9]\d{0,4}$/;
const SEL_MAKS = 5000;
const ISI_SEL_MAKS = 1000;

export type LembarCells = Readonly<Record<string, string>>;

/** Menerima peta sel -> isi mentah (nilai atau rumus "=..."), menolak bentuk lain. */
export function parseLembarCells(value: unknown): Parsed<LembarCells> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'cells harus berupa objek sel' };
  }
  const entries = Object.entries(value);
  if (entries.length > SEL_MAKS) return { ok: false, error: 'Terlalu banyak sel' };
  const cells: Record<string, string> = {};
  for (const [key, raw] of entries) {
    if (!KUNCI_SEL.test(key)) return { ok: false, error: `Alamat sel tidak valid: ${key}` };
    if (typeof raw !== 'string') return { ok: false, error: `Isi sel ${key} harus teks` };
    if (raw.length > ISI_SEL_MAKS) return { ok: false, error: `Isi sel ${key} terlalu panjang` };
    // Sel kosong tidak disimpan supaya lembar tetap ringkas.
    if (raw !== '') cells[key] = raw;
  }
  return { ok: true, data: cells };
}

/** Membaca JSON yang tersimpan; data rusak dianggap belum pernah disimpan. */
export function bacaLembarTersimpan(json: string): LembarCells | null {
  try {
    const parsed = parseLembarCells(JSON.parse(json));
    return parsed.ok ? parsed.data : null;
  } catch {
    return null;
  }
}
