/** Penanganan baris rincian kwitansi yang bisa disunting sebelum dicetak.
 *
 * Kwitansi adalah dokumen uang, jadi angkanya tidak boleh diam-diam salah:
 * harga yang tidak terbaca ditolak, bukan dianggap nol. */

export interface RincianInput {
  readonly nama: string;
  readonly harga: number;
}

/** Nama baris yang boleh ditulis di kwitansi, atau null bila kosong. */
export function normalizeNamaRincian(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return trimmed === '' ? null : trimmed.slice(0, 120);
}

/** Membaca harga dari isian pengguna.
 *
 * Menerima angka biasa maupun tulisan berpemisah ribuan ("50.000", "50,000")
 * karena orang mengetik apa adanya. Nilai negatif, bukan angka, atau pecahan
 * yang tak terhingga ditolak dengan null — bukan dijadikan 0, supaya salah
 * ketik tidak berubah jadi baris gratis tanpa ada yang sadar. */
export function parseHarga(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (trimmed === '') return null;
  // Pemisah ribuan dibuang; hanya angka dan satu tanda desimal yang tersisa.
  const bersih = trimmed.replace(/[.,\s](?=\d{3}\b)/g, '').replace(/,/g, '.');
  if (!/^\d+(\.\d+)?$/.test(bersih)) return null;

  const angka = Number(bersih);
  return Number.isFinite(angka) && angka >= 0 ? angka : null;
}

/** Jumlah seluruh baris. Dihitung dari angka, bukan dari teks yang sudah
 * diformat, supaya totalnya selalu cocok dengan rinciannya. */
export function totalRincian(items: readonly { readonly harga: number }[]): number {
  return items.reduce((jumlah, item) => jumlah + item.harga, 0);
}

/** Memeriksa satu baris kiriman; mengembalikan pesan kesalahan atau null. */
export function validasiRincian(nama: unknown, harga: unknown): string | null {
  if (typeof nama !== 'string' || normalizeNamaRincian(nama) === null) {
    return 'Nama rincian wajib diisi';
  }
  if (parseHarga(harga) === null) {
    return 'Harga tidak valid — isi angka tidak negatif';
  }
  return null;
}
