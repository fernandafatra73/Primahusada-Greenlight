import { describe, expect, test } from 'vitest';
import { buildKwitansiRows } from '../../apps/web/src/lib/kwitansiRows.ts';

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
