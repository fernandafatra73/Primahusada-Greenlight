/** Batas atas nominal supaya salah ketik (mis. kelebihan nol) tertolak. */
export const SHARING_NOMINAL_MAX = 100_000_000;

export const SHARING_KETERANGAN_MAX_LENGTH = 200;

/** Nominal sharing dalam rupiah (bilangan bulat 0..SHARING_NOMINAL_MAX) dari angka atau teks angka; null bila tidak valid. */
export function parseSharingNominal(value: unknown): number | null {
  let num = Number.NaN;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    num = Number(value.trim());
  }
  if (!Number.isInteger(num) || num < 0 || num > SHARING_NOMINAL_MAX) return null;
  return num;
}

/** Keterangan pilihan sharing yang sudah dirapikan; null bila kosong atau bukan teks. */
export function normalizeSharingKeterangan(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, SHARING_KETERANGAN_MAX_LENGTH) : null;
}
