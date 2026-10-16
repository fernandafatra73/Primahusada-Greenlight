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
