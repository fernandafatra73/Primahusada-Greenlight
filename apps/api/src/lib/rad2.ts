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

/** Tanggal format YYYY-MM-DD (dari input type="date"); null bila tidak valid. */
function parseTanggal(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const date = new Date(`${value.trim()}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.trim() ? null : date;
}

/** Validasi body create/update Rad2 (update mengirim seluruh field, jadi aturannya sama). */
export function parseRad2Input(body: unknown): Rad2ParseResult {
  if (!isRecord(body)) return { ok: false, error: 'Data tidak valid' };

  const nama = requiredText(body.nama);
  if (!nama) return { ok: false, error: 'Nama wajib diisi' };
  const umur = wholeNumber(body.umur, RAD2_UMUR_MAX);
  if (umur === null) return { ok: false, error: `Umur harus angka bulat 0–${RAD2_UMUR_MAX}` };
  const tanggal = parseTanggal(body.tanggal);
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
