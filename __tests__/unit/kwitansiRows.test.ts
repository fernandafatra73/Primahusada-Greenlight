import { describe, expect, test } from 'vitest';
import {
  buildKwitansiRows,
  hitungRincianKwitansi,
  normalisasiJumlah,
} from '../../apps/web/src/lib/kwitansiRows.ts';

describe('hitungRincianKwitansi', () => {
  test('multiplies unit price by quantity and sums the total', () => {
    const hasil = hitungRincianKwitansi([
      { nama: 'Thorax', harga: 20000, jumlah: 2 },
      { nama: 'Biaya Pendaftaran', harga: 15000 },
    ]);

    expect(hasil.baris).toEqual([
      { nama: 'Thorax', jumlah: 2, subtotal: 40000 },
      { nama: 'Biaya Pendaftaran', jumlah: 1, subtotal: 15000 },
    ]);
    expect(hasil.total).toBe(55000);
  });

  test('returns zero total for no rows', () => {
    expect(hitungRincianKwitansi([]).total).toBe(0);
  });
});

describe('normalisasiJumlah', () => {
  test('treats missing, zero, negative and NaN quantities as 1', () => {
    expect(normalisasiJumlah(undefined)).toBe(1);
    expect(normalisasiJumlah(0)).toBe(1);
    expect(normalisasiJumlah(-3)).toBe(1);
    expect(normalisasiJumlah(Number.NaN)).toBe(1);
  });

  test('floors fractional quantities', () => {
    expect(normalisasiJumlah(2.7)).toBe(2);
  });
});

describe('buildKwitansiRows', () => {
  test('pads with numbered empty rows up to five', () => {
    const rows = buildKwitansiRows([{ nama: 'Biaya Pendaftaran', jumlah: 1, hargaFormatted: 'Rp 20.000' }]);

    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ no: 1, nama: 'Biaya Pendaftaran', jumlah: '1', hargaFormatted: 'Rp 20.000' });
    expect(rows.slice(1).map((r) => r.no)).toEqual([2, 3, 4, 5]);
    expect(rows.slice(1).every((r) => r.nama === '' && r.jumlah === '' && r.hargaFormatted === '')).toBe(true);
  });

  test('keeps every item when there are more than the minimum', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ nama: `Item ${i + 1}`, jumlah: 1, hargaFormatted: 'Rp 1' }));

    const rows = buildKwitansiRows(items);

    expect(rows).toHaveLength(7);
    expect(rows[6]?.nama).toBe('Item 7');
  });

  test('returns only empty rows when there are no items', () => {
    expect(buildKwitansiRows([]).map((r) => r.nama)).toEqual(['', '', '', '', '']);
  });
});
