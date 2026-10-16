export interface KwitansiRowInput {
  readonly nama: string;
  readonly jumlah: number;
  readonly hargaFormatted: string;
}

export interface KwitansiRow {
  readonly no: number;
  readonly nama: string;
  /** Kosong untuk baris isian kosong. */
  readonly jumlah: string;
  readonly hargaFormatted: string;
}

export interface RincianDenganJumlah {
  readonly nama: string;
  /** Harga satuan. */
  readonly harga: number;
  /** Kosong dianggap 1. */
  readonly jumlah?: number;
}

/** Jumlah yang tidak valid (kosong, nol, negatif, pecahan) dibulatkan ke bilangan bulat >= 1. */
export function normalisasiJumlah(jumlah: number | undefined): number {
  if (jumlah === undefined || !Number.isFinite(jumlah)) return 1;
  return Math.max(1, Math.floor(jumlah));
}

/** Harga per baris = harga satuan x jumlah; total = jumlah seluruh baris. */
export function hitungRincianKwitansi(rincian: readonly RincianDenganJumlah[]): {
  readonly baris: readonly { readonly nama: string; readonly jumlah: number; readonly subtotal: number }[];
  readonly total: number;
} {
  const baris = rincian.map((r) => {
    const jumlah = normalisasiJumlah(r.jumlah);
    return { nama: r.nama, jumlah, subtotal: r.harga * jumlah };
  });
  return { baris, total: baris.reduce((sum, b) => sum + b.subtotal, 0) };
}

/**
 * Baris tabel kwitansi bergaya formulir: rincian diisi berurutan lalu ditambah
 * baris kosong bernomor sampai minimal `minRows`, seperti blangko kwitansi cetak.
 */
export function buildKwitansiRows(items: readonly KwitansiRowInput[], minRows = 5): KwitansiRow[] {
  const rows: KwitansiRow[] = items.map((item, i) => ({
    no: i + 1,
    nama: item.nama,
    jumlah: String(item.jumlah),
    hargaFormatted: item.hargaFormatted,
  }));
  for (let no = rows.length + 1; no <= minRows; no += 1) {
    rows.push({ no, nama: '', jumlah: '', hargaFormatted: '' });
  }
  return rows;
}
