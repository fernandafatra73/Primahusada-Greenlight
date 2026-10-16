import { formatRupiah } from './format.ts';
import { hitungRincianKwitansi } from './kwitansiRows.ts';
import { terbilangRupiah } from './terbilang.ts';
import type { KwitansiPendaftaranUmumData } from '../pdf/KwitansiPendaftaranUmumDocument.tsx';

/** Satu baris yang diketik langsung di blangko Kwitansi2 (semua masih teks input). */
export interface Kwitansi2Baris {
  readonly nama: string;
  readonly jumlah: string;
  /** Harga satuan, boleh berisi titik/"Rp"; hanya digitnya yang dipakai. */
  readonly harga: string;
}

export interface Kwitansi2Form {
  readonly noKwitansi: string;
  readonly sudahTerimaDari: string;
  /** null = ikuti nama layanan pada tabel; string = diketik manual. */
  readonly untukPembayaran: string | null;
  readonly tanggal: string;
  readonly tanggalTtd: string;
  readonly penerima: string;
  readonly baris: readonly Kwitansi2Baris[];
}

export const KWITANSI2_MIN_BARIS = 5;

export const BARIS_KOSONG: Kwitansi2Baris = { nama: '', jumlah: '', harga: '' };

/** "Rp 20.000" / "20.000" / "20000" -> 20000; teks tanpa digit -> 0. */
export function parseHarga(teks: string): number {
  const digit = teks.replace(/\D/g, '');
  return digit ? Number(digit) : 0;
}

function barisTerisi(b: Kwitansi2Baris): boolean {
  return b.nama.trim() !== '' || parseHarga(b.harga) > 0;
}

/** Baris yang terisi, dengan harga per baris = harga satuan x jumlah. */
export function hitungKwitansi2(baris: readonly Kwitansi2Baris[]): ReturnType<typeof hitungRincianKwitansi> {
  return hitungRincianKwitansi(
    baris.filter(barisTerisi).map((b) => ({
      nama: b.nama.trim(),
      harga: parseHarga(b.harga),
      jumlah: b.jumlah.trim() === '' ? undefined : Number(b.jumlah),
    })),
  );
}

export function untukPembayaranOtomatis(baris: readonly Kwitansi2Baris[]): string {
  return hitungKwitansi2(baris)
    .baris.map((b) => b.nama)
    .filter((nama) => nama !== '')
    .join(', ');
}

/** Rincian tersimpan -> baris blangko, ditambah baris kosong sampai minimal 5. */
export function barisAwalKwitansi2(rincian: readonly { nama: string; harga: number }[]): Kwitansi2Baris[] {
  const baris: Kwitansi2Baris[] = rincian.map((r) => ({ nama: r.nama, jumlah: '1', harga: String(r.harga) }));
  while (baris.length < KWITANSI2_MIN_BARIS) baris.push(BARIS_KOSONG);
  return baris;
}

export function buildKwitansi2PdfData(form: Kwitansi2Form, logoSrc: string): KwitansiPendaftaranUmumData {
  const { baris, total } = hitungKwitansi2(form.baris);
  return {
    logoSrc,
    noKwitansi: form.noKwitansi,
    sudahTerimaDari: form.sudahTerimaDari.trim(),
    untukPembayaran: (form.untukPembayaran ?? untukPembayaranOtomatis(form.baris)).trim(),
    tanggal: form.tanggal.trim(),
    items: baris.map((b) => ({ nama: b.nama, jumlah: b.jumlah, hargaFormatted: formatRupiah(b.subtotal) })),
    totalFormatted: formatRupiah(total),
    terbilang: terbilangRupiah(total),
    tanggalTtd: form.tanggalTtd.trim(),
    penerimaNama: form.penerima.trim(),
  };
}
