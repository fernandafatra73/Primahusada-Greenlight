import { parseDateOnly } from './dateOnly.js';

/** Batas atas nominal rupiah supaya salah ketik (mis. kelebihan nol) tertolak. */
export const RAD2_NOMINAL_MAX = 100_000_000;

export const RAD2_UMUR_MAX = 150;

export interface Rad2Input {
  readonly nama: string;
  readonly umur: number;
  readonly alamat: string | null;
  readonly tanggal: Date;
  readonly pemeriksaan: string;
  readonly pengirim: string;
  readonly klinis: string | null;
  readonly kesan: string | null;
  readonly radiologi: string | null;
  readonly harga: number;
  readonly sharing: number;
}

export type Rad2ParseResult =
  | { readonly ok: true; readonly data: Rad2Input }
  | { readonly ok: false; readonly error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function wholeNumber(value: unknown, max: number): number | null {
  let num = Number.NaN;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    num = Number(value.trim());
  }
  if (!Number.isInteger(num) || num < 0 || num > max) return null;
  return num;
}

/** Validasi body create/update Rad2 (update mengirim seluruh field, jadi aturannya sama). */
export function parseRad2Input(body: unknown): Rad2ParseResult {
  if (!isRecord(body)) return { ok: false, error: 'Data tidak valid' };

  const nama = requiredText(body.nama);
  if (!nama) return { ok: false, error: 'Nama wajib diisi' };
  const umur = wholeNumber(body.umur, RAD2_UMUR_MAX);
  if (umur === null) return { ok: false, error: `Umur harus angka bulat 0–${RAD2_UMUR_MAX}` };
  const tanggal = parseDateOnly(body.tanggal);
  if (!tanggal) return { ok: false, error: 'Tanggal tidak valid (format YYYY-MM-DD)' };
  const pemeriksaan = requiredText(body.pemeriksaan);
  if (!pemeriksaan) return { ok: false, error: 'Pemeriksaan wajib diisi' };
  const pengirim = requiredText(body.pengirim);
  if (!pengirim) return { ok: false, error: 'Pengirim wajib diisi' };
  const harga = wholeNumber(body.harga, RAD2_NOMINAL_MAX);
  if (harga === null) return { ok: false, error: 'Harga harus angka bulat 0 atau lebih' };
  const sharing = wholeNumber(body.sharing, RAD2_NOMINAL_MAX);
  if (sharing === null) return { ok: false, error: 'Sharing harus angka bulat 0 atau lebih' };

  return {
    ok: true,
    data: {
      nama,
      umur,
      alamat: optionalText(body.alamat),
      tanggal,
      pemeriksaan,
      pengirim,
      klinis: optionalText(body.klinis),
      kesan: optionalText(body.kesan),
      radiologi: optionalText(body.radiologi),
      harga,
      sharing,
    },
  };
}

export interface Rad2ListQuery {
  readonly q?: string;
  readonly pengirim?: string;
  /** Tanggal awal (YYYY-MM-DD), inklusif. */
  readonly dari?: string;
  /** Tanggal akhir (YYYY-MM-DD), inklusif. */
  readonly sampai?: string;
}

interface Rad2TextMatch {
  readonly nama?: { readonly contains: string };
  readonly pemeriksaan?: { readonly contains: string };
  readonly pengirim?: { readonly contains: string };
  readonly radiologi?: { readonly contains: string };
}

export interface Rad2ListWhere {
  // Array mutable supaya cocok dengan tipe where milik Prisma.
  readonly OR?: Rad2TextMatch[];
  readonly pengirim?: string;
  readonly tanggal?: { readonly gte?: Date; readonly lt?: Date };
}

export type Rad2FilterResult =
  | { readonly ok: true; readonly where: Rad2ListWhere }
  | { readonly ok: false; readonly error: string };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Susun filter daftar Rad2: pencarian teks, dokter pengirim (persis), dan rentang tanggal.
 * Tanggal disimpan sebagai tengah malam UTC, jadi batas akhir dibuat eksklusif pada hari berikutnya.
 */
export function buildRad2Filter(query: Rad2ListQuery): Rad2FilterResult {
  const where: { -readonly [K in keyof Rad2ListWhere]: Rad2ListWhere[K] } = {};

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { nama: { contains: q } },
      { pemeriksaan: { contains: q } },
      { pengirim: { contains: q } },
      { radiologi: { contains: q } },
    ];
  }

  const pengirim = query.pengirim?.trim();
  if (pengirim) where.pengirim = pengirim;

  const range: { gte?: Date; lt?: Date } = {};
  if (query.dari?.trim()) {
    const dari = parseDateOnly(query.dari);
    if (!dari) return { ok: false, error: 'Tanggal awal tidak valid (format YYYY-MM-DD)' };
    range.gte = dari;
  }
  if (query.sampai?.trim()) {
    const sampai = parseDateOnly(query.sampai);
    if (!sampai) return { ok: false, error: 'Tanggal akhir tidak valid (format YYYY-MM-DD)' };
    range.lt = new Date(sampai.getTime() + ONE_DAY_MS);
  }
  if (range.gte && range.lt && range.gte >= range.lt) {
    return { ok: false, error: 'Tanggal awal tidak boleh setelah tanggal akhir' };
  }
  if (range.gte || range.lt) where.tanggal = range;

  return { ok: true, where };
}
