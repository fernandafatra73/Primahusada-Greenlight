/** Perhitungan menu "Hitungan" (biaya kontrakan per bulan). */

export const NAMA_BULAN: ReadonlyArray<string> = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export interface NominalKontrakan {
  readonly sewa: string | number;
  readonly listrik: string | number;
  readonly air: string | number;
  readonly pinjam: string | number;
}

function toAngka(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Jumlah = Sewa − Listrik − Air − Pinjam; nilai kosong/tidak valid dihitung 0. */
export function jumlahKontrakan(item: NominalKontrakan): number {
  return toAngka(item.sewa) - toAngka(item.listrik) - toAngka(item.air) - toAngka(item.pinjam);
}

export interface TotalKontrakan {
  readonly sewa: number;
  readonly listrik: number;
  readonly air: number;
  readonly pinjam: number;
  readonly jumlah: number;
}

export interface RekapTahunan<T> {
  readonly tahun: number;
  readonly items: ReadonlyArray<T>;
  readonly total: TotalKontrakan;
}

/** Kelompokkan baris per tahun (urut tahun naik) beserta total tahunannya. */
export function rekapTahunan<T extends NominalKontrakan & { readonly tahun: number }>(
  items: ReadonlyArray<T>,
): RekapTahunan<T>[] {
  const byTahun = new Map<number, T[]>();
  for (const item of items) {
    const list = byTahun.get(item.tahun);
    if (list) list.push(item);
    else byTahun.set(item.tahun, [item]);
  }
  return [...byTahun.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tahun, list]) => ({
      tahun,
      items: list,
      total: list.reduce<TotalKontrakan>(
        (acc, item) => ({
          sewa: acc.sewa + toAngka(item.sewa),
          listrik: acc.listrik + toAngka(item.listrik),
          air: acc.air + toAngka(item.air),
          pinjam: acc.pinjam + toAngka(item.pinjam),
          jumlah: acc.jumlah + jumlahKontrakan(item),
        }),
        { sewa: 0, listrik: 0, air: 0, pinjam: 0, jumlah: 0 },
      ),
    }));
}

export function namaBulan(bulan: number): string {
  return NAMA_BULAN[bulan - 1] ?? String(bulan);
}
