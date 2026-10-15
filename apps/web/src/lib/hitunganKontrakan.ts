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
  readonly pinjam2: string | number;
}

function toAngka(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Jumlah = Sewa − Listrik − Air − Pinjaman 1 − Pinjaman 2; nilai kosong/tidak valid dihitung 0. */
export function jumlahKontrakan(item: NominalKontrakan): number {
  return (
    toAngka(item.sewa) - toAngka(item.listrik) - toAngka(item.air) - toAngka(item.pinjam) - toAngka(item.pinjam2)
  );
}

export interface TotalKontrakan {
  readonly sewa: number;
  readonly listrik: number;
  readonly air: number;
  readonly pinjam: number;
  readonly pinjam2: number;
  readonly jumlah: number;
}

export interface RekapTahunan<T> {
  readonly tahun: number;
  readonly items: ReadonlyArray<T>;
  readonly total: TotalKontrakan;
}

/**
 * Kelompokkan baris per tahun (urut tahun lalu bulan naik) beserta total tahunannya.
 * Sewa adalah saldo berjalan (Sewa bulan ini = Jumlah bulan lalu), jadi Sewa tidak
 * dijumlahkan: total Sewa = Sewa bulan pertama tahun itu, pengurangnya dijumlahkan,
 * dan total Jumlah = Sewa awal dikurangi semua pengurang tersebut.
 */
export function rekapTahunan<T extends NominalKontrakan & { readonly tahun: number; readonly bulan: number }>(
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
    .map(([tahun, unsorted]) => {
      const list = [...unsorted].sort((a, b) => a.bulan - b.bulan);
      const pengurang = list.reduce(
        (acc, item) => ({
          listrik: acc.listrik + toAngka(item.listrik),
          air: acc.air + toAngka(item.air),
          pinjam: acc.pinjam + toAngka(item.pinjam),
          pinjam2: acc.pinjam2 + toAngka(item.pinjam2),
        }),
        { listrik: 0, air: 0, pinjam: 0, pinjam2: 0 },
      );
      const sewa = list[0] ? toAngka(list[0].sewa) : 0;
      return {
        tahun,
        items: list,
        total: { sewa, ...pengurang, jumlah: jumlahKontrakan({ sewa, ...pengurang }) },
      };
    });
}

export interface IsianBulanBerikutnya {
  readonly bulan: number;
  readonly tahun: number;
  readonly sewa: number;
}

/**
 * Isian awal untuk bulan baru: bulan sesudah data terakhir (Desember → Januari
 * tahun berikutnya), dengan Sewa = Jumlah bulan terakhir. Null kalau belum ada data.
 */
export function isianBulanBerikutnya<T extends NominalKontrakan & { readonly bulan: number; readonly tahun: number }>(
  items: ReadonlyArray<T>,
): IsianBulanBerikutnya | null {
  let terakhir: T | null = null;
  for (const item of items) {
    if (!terakhir || item.tahun * 12 + item.bulan > terakhir.tahun * 12 + terakhir.bulan) terakhir = item;
  }
  if (!terakhir) return null;
  return {
    bulan: terakhir.bulan === 12 ? 1 : terakhir.bulan + 1,
    tahun: terakhir.bulan === 12 ? terakhir.tahun + 1 : terakhir.tahun,
    sewa: jumlahKontrakan(terakhir),
  };
}

export function namaBulan(bulan: number): string {
  return NAMA_BULAN[bulan - 1] ?? String(bulan);
}
