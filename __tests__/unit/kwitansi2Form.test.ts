import { describe, expect, test } from 'vitest';
import { formatRupiah } from '../../apps/web/src/lib/format.ts';
import {
  BARIS_KOSONG,
  barisAwalKwitansi2,
  buildKwitansi2PdfData,
  hitungKwitansi2,
  parseHarga,
  untukPembayaranOtomatis,
  type Kwitansi2Form,
} from '../../apps/web/src/lib/kwitansi2Form.ts';

function form(overrides: Partial<Kwitansi2Form> = {}): Kwitansi2Form {
  return {
    noKwitansi: 'PH001',
    sudahTerimaDari: ' Siti ',
    untukPembayaran: null,
    tanggal: '16/10/2026',
    tanggalTtd: '16 Oktober 2026',
    penerima: ' Dewi ',
    baris: [
      { nama: 'Thorax', jumlah: '2', harga: '20.000' },
      { nama: 'Biaya Pendaftaran', jumlah: '', harga: 'Rp 15.000' },
      BARIS_KOSONG,
    ],
    ...overrides,
  };
}

describe('parseHarga', () => {
  test('keeps only digits', () => {
    expect(parseHarga('Rp 20.000')).toBe(20000);
    expect(parseHarga('15000')).toBe(15000);
    expect(parseHarga('')).toBe(0);
    expect(parseHarga('abc')).toBe(0);
  });
});

describe('hitungKwitansi2', () => {
  test('skips blank rows and multiplies unit price by quantity', () => {
    const hasil = hitungKwitansi2(form().baris);

    expect(hasil.baris).toEqual([
      { nama: 'Thorax', jumlah: 2, subtotal: 40000 },
      { nama: 'Biaya Pendaftaran', jumlah: 1, subtotal: 15000 },
    ]);
    expect(hasil.total).toBe(55000);
  });

  test('keeps a row that has only a price', () => {
    expect(hitungKwitansi2([{ nama: '', jumlah: '', harga: '5000' }]).total).toBe(5000);
  });
});

describe('untukPembayaranOtomatis', () => {
  test('joins the typed service names', () => {
    expect(untukPembayaranOtomatis(form().baris)).toBe('Thorax, Biaya Pendaftaran');
  });
});

describe('barisAwalKwitansi2', () => {
  test('pads saved rincian to five rows with quantity 1', () => {
    const baris = barisAwalKwitansi2([{ nama: 'Biaya Pendaftaran', harga: 20000 }]);

    expect(baris).toHaveLength(5);
    expect(baris[0]).toEqual({ nama: 'Biaya Pendaftaran', jumlah: '1', harga: '20000' });
    expect(baris.slice(1).every((b) => b.nama === '' && b.harga === '')).toBe(true);
  });
});

describe('buildKwitansi2PdfData', () => {
  test('uses the typed values and the automatic purpose text', () => {
    const data = buildKwitansi2PdfData(form(), 'logo');

    expect(data.sudahTerimaDari).toBe('Siti');
    expect(data.penerimaNama).toBe('Dewi');
    expect(data.untukPembayaran).toBe('Thorax, Biaya Pendaftaran');
    expect(data.items).toEqual([
      { nama: 'Thorax', jumlah: 2, hargaFormatted: formatRupiah(40000) },
      { nama: 'Biaya Pendaftaran', jumlah: 1, hargaFormatted: formatRupiah(15000) },
    ]);
    expect(data.totalFormatted).toBe(formatRupiah(55000));
    expect(data.terbilang).toBe('Lima puluh lima ribu rupiah');
  });

  test('prefers a manually typed purpose', () => {
    expect(buildKwitansi2PdfData(form({ untukPembayaran: 'Rontgen' }), '').untukPembayaran).toBe('Rontgen');
  });
});
