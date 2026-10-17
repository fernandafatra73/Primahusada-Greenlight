/** Validasi lembar "Excel" Hasil Perbulan (Keuangan > Hasil Perbulan > Excel). */

import type { Parsed } from './loginLog.js';

const KUNCI_SEL = /^[A-Z]{1,3}[1-9]\d{0,4}$/;
const WARNA = /^#[0-9a-fA-F]{6}$/;
const SEL_MAKS = 5000;
const ISI_SEL_MAKS = 1000;
const SHEET_MAKS = 20;
const NAMA_SHEET_MAKS = 31;
const BARIS_MAKS = 500;
const KOLOM_MAKS = 52;
const UKURAN_MAKS = 1000;

export type LembarCells = Readonly<Record<string, string>>;

export interface LembarGaya {
  readonly b?: true;
  readonly i?: true;
  readonly al?: 'left' | 'center' | 'right';
  readonly fill?: string;
  readonly color?: string;
  readonly border?: true;
  readonly fmt?: 'angka' | 'desimal' | 'rupiah' | 'persen';
}

export interface LembarSheet {
  readonly name: string;
  readonly cells: LembarCells;
  readonly styles: Readonly<Record<string, LembarGaya>>;
  readonly colWidths: Readonly<Record<string, number>>;
  readonly rowHeights: Readonly<Record<string, number>>;
  readonly rows: number;
  readonly cols: number;
}

export interface LembarWorkbook {
  readonly version: 2;
  readonly sheets: readonly LembarSheet[];
}

function adalahObjek(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Menerima peta sel -> isi mentah (nilai atau rumus "=..."), menolak bentuk lain. */
export function parseLembarCells(value: unknown): Parsed<LembarCells> {
  if (!adalahObjek(value)) return { ok: false, error: 'cells harus berupa objek sel' };
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

function bacaGaya(value: unknown): LembarGaya {
  if (!adalahObjek(value)) return {};
  const g: { -readonly [K in keyof LembarGaya]: LembarGaya[K] } = {};
  if (value.b === true) g.b = true;
  if (value.i === true) g.i = true;
  if (value.al === 'left' || value.al === 'center' || value.al === 'right') g.al = value.al;
  if (typeof value.fill === 'string' && WARNA.test(value.fill)) g.fill = value.fill;
  if (typeof value.color === 'string' && WARNA.test(value.color)) g.color = value.color;
  if (value.border === true) g.border = true;
  if (value.fmt === 'angka' || value.fmt === 'desimal' || value.fmt === 'rupiah' || value.fmt === 'persen') {
    g.fmt = value.fmt;
  }
  return g;
}

function parseGayaMap(value: unknown): Parsed<Record<string, LembarGaya>> {
  if (value === undefined) return { ok: true, data: {} };
  if (!adalahObjek(value)) return { ok: false, error: 'styles harus berupa objek' };
  const entries = Object.entries(value);
  if (entries.length > SEL_MAKS) return { ok: false, error: 'Terlalu banyak gaya sel' };
  const out: Record<string, LembarGaya> = {};
  for (const [key, g] of entries) {
    if (!KUNCI_SEL.test(key)) return { ok: false, error: `Alamat gaya tidak valid: ${key}` };
    const gaya = bacaGaya(g);
    if (Object.keys(gaya).length > 0) out[key] = gaya;
  }
  return { ok: true, data: out };
}

function parseUkuranMap(value: unknown, nama: string): Parsed<Record<string, number>> {
  if (value === undefined) return { ok: true, data: {} };
  if (!adalahObjek(value)) return { ok: false, error: `${nama} harus berupa objek` };
  const out: Record<string, number> = {};
  for (const [key, ukuran] of Object.entries(value)) {
    if (!/^\d{1,4}$/.test(key)) return { ok: false, error: `Indeks ${nama} tidak valid: ${key}` };
    if (typeof ukuran !== 'number' || !Number.isFinite(ukuran) || ukuran <= 0 || ukuran > UKURAN_MAKS) {
      return { ok: false, error: `Ukuran ${nama} tidak valid` };
    }
    out[key] = Math.round(ukuran);
  }
  return { ok: true, data: out };
}

function batasi(value: unknown, min: number, maks: number, bawaan: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maks, Math.max(min, Math.trunc(value)))
    : bawaan;
}

function parseSheet(value: unknown): Parsed<LembarSheet> {
  if (!adalahObjek(value)) return { ok: false, error: 'Sheet tidak valid' };
  const nama = typeof value.name === 'string' ? value.name.trim() : '';
  if (nama === '' || nama.length > NAMA_SHEET_MAKS) return { ok: false, error: 'Nama sheet tidak valid' };
  const cells = parseLembarCells(value.cells ?? {});
  if (!cells.ok) return cells;
  const styles = parseGayaMap(value.styles);
  if (!styles.ok) return styles;
  const colWidths = parseUkuranMap(value.colWidths, 'colWidths');
  if (!colWidths.ok) return colWidths;
  const rowHeights = parseUkuranMap(value.rowHeights, 'rowHeights');
  if (!rowHeights.ok) return rowHeights;
  return {
    ok: true,
    data: {
      name: nama,
      cells: cells.data,
      styles: styles.data,
      colWidths: colWidths.data,
      rowHeights: rowHeights.data,
      rows: batasi(value.rows, 1, BARIS_MAKS, 40),
      cols: batasi(value.cols, 1, KOLOM_MAKS, 17),
    },
  };
}

/** Menerima workbook v2 (beberapa sheet beserta gaya dan ukuran) dan menyaring isinya. */
export function parseLembarWorkbook(value: unknown): Parsed<LembarWorkbook> {
  if (!adalahObjek(value) || !Array.isArray(value.sheets)) {
    return { ok: false, error: 'workbook harus berisi daftar sheet' };
  }
  if (value.sheets.length === 0 || value.sheets.length > SHEET_MAKS) {
    return { ok: false, error: `Jumlah sheet harus 1-${SHEET_MAKS}` };
  }
  const sheets: LembarSheet[] = [];
  const dipakai = new Set<string>();
  for (const mentah of value.sheets) {
    const sheet = parseSheet(mentah);
    if (!sheet.ok) return sheet;
    const kunci = sheet.data.name.toLowerCase();
    if (dipakai.has(kunci)) return { ok: false, error: `Nama sheet ganda: ${sheet.data.name}` };
    dipakai.add(kunci);
    sheets.push(sheet.data);
  }
  return { ok: true, data: { version: 2, sheets } };
}

/**
 * Membaca JSON tersimpan. Format lama (peta sel saja) dibungkus menjadi satu sheet;
 * data rusak dianggap belum pernah disimpan.
 */
export function bacaLembarTersimpan(json: string): LembarWorkbook | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (adalahObjek(parsed) && Array.isArray(parsed.sheets)) {
      const wb = parseLembarWorkbook(parsed);
      return wb.ok ? wb.data : null;
    }
    const cells = parseLembarCells(parsed);
    if (!cells.ok) return null;
    return {
      version: 2,
      sheets: [{ name: 'Hasil Perbulan', cells: cells.data, styles: {}, colWidths: {}, rowHeights: {}, rows: 40, cols: 17 }],
    };
  } catch {
    return null;
  }
}
