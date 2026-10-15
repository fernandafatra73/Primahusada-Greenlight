/** Validasi input menu "Hitungan" (biaya kontrakan per bulan). */

export interface HitunganKontrakanBody {
  bulan?: number;
  tahun?: number;
  sewa?: number;
  listrik?: number;
  air?: number;
  pinjam?: number;
  pinjam2?: number;
}

export interface HitunganKontrakanData {
  readonly bulan: number;
  readonly tahun: number;
  readonly sewa: number;
  readonly listrik: number;
  readonly air: number;
  readonly pinjam: number;
  readonly pinjam2: number;
}

export type HitunganKontrakanParse =
  | { readonly ok: true; readonly data: HitunganKontrakanData }
  | { readonly ok: false; readonly error: string };

const NOMINAL_FIELDS = [
  ['sewa', 'Sewa'],
  ['listrik', 'Listrik'],
  ['air', 'Air'],
  ['pinjam', 'Pinjaman 1'],
  ['pinjam2', 'Pinjaman 2'],
] as const;

/**
 * Menggabungkan body request dengan nilai lama (untuk PATCH, field yang tidak
 * dikirim tetap memakai nilai lama; untuk POST nilai lama default 0).
 */
export function parseHitunganKontrakanBody(
  body: HitunganKontrakanBody,
  existing: Partial<HitunganKontrakanData> = {},
): HitunganKontrakanParse {
  const bulan = Number(body.bulan ?? existing.bulan);
  if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
    return { ok: false, error: 'Bulan harus 1 sampai 12' };
  }
  const tahun = Number(body.tahun ?? existing.tahun);
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
    return { ok: false, error: 'Tahun tidak valid' };
  }

  const nominal: Record<(typeof NOMINAL_FIELDS)[number][0], number> = {
    sewa: 0,
    listrik: 0,
    air: 0,
    pinjam: 0,
    pinjam2: 0,
  };
  for (const [key, label] of NOMINAL_FIELDS) {
    const value = Number(body[key] ?? existing[key] ?? 0);
    if (!Number.isFinite(value) || value < 0) {
      return { ok: false, error: `${label} tidak valid` };
    }
    nominal[key] = value;
  }

  return { ok: true, data: { bulan, tahun, ...nominal } };
}
