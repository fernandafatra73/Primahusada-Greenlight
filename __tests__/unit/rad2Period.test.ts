import { describe, expect, test } from 'vitest';
import { formatIsoDay, resolveRad2Period } from '../../apps/web/src/lib/rad2Period.ts';

const noCustom = { dari: '', sampai: '' };

describe('resolveRad2Period', () => {
  test('semua has no bounds', () => {
    expect(resolveRad2Period('semua', new Date(2026, 8, 30), noCustom)).toEqual({
      dari: '',
      sampai: '',
      label: 'Semua tanggal',
    });
  });

  test('hari-ini is the current local day', () => {
    expect(resolveRad2Period('hari-ini', new Date(2026, 8, 30, 23, 59), noCustom)).toEqual({
      dari: '2026-09-30',
      sampai: '2026-09-30',
      label: 'Hari ini (30-09-2026)',
    });
  });

  test('minggu-ini runs Monday to Sunday', () => {
    // Rabu 30 September 2026
    const mid = resolveRad2Period('minggu-ini', new Date(2026, 8, 30), noCustom);
    expect(mid.dari).toBe('2026-09-28');
    expect(mid.sampai).toBe('2026-10-04');
    // Senin tetap minggu yang sama, Minggu termasuk minggu yang berakhir hari itu
    expect(resolveRad2Period('minggu-ini', new Date(2026, 8, 28), noCustom).dari).toBe('2026-09-28');
    const sunday = resolveRad2Period('minggu-ini', new Date(2026, 9, 4), noCustom);
    expect(sunday.dari).toBe('2026-09-28');
    expect(sunday.sampai).toBe('2026-10-04');
  });

  test('bulan-ini covers the first to the last day, including leap February', () => {
    expect(resolveRad2Period('bulan-ini', new Date(2026, 8, 15), noCustom)).toMatchObject({
      dari: '2026-09-01',
      sampai: '2026-09-30',
    });
    expect(resolveRad2Period('bulan-ini', new Date(2028, 1, 10), noCustom)).toMatchObject({
      dari: '2028-02-01',
      sampai: '2028-02-29',
    });
  });

  test('custom passes the chosen dates through, allowing open ends', () => {
    const now = new Date(2026, 8, 30);
    expect(resolveRad2Period('custom', now, { dari: '2026-09-01', sampai: '2026-09-10' })).toEqual({
      dari: '2026-09-01',
      sampai: '2026-09-10',
      label: 'Custom (01-09-2026 s/d 10-09-2026)',
    });
    expect(resolveRad2Period('custom', now, { dari: '2026-09-01', sampai: '' }).label).toBe('Custom (mulai 01-09-2026)');
    expect(resolveRad2Period('custom', now, noCustom).label).toBe('Custom');
  });
});

describe('formatIsoDay', () => {
  test('reorders to day-month-year and leaves other strings alone', () => {
    expect(formatIsoDay('2026-09-05')).toBe('05-09-2026');
    expect(formatIsoDay('bukan tanggal')).toBe('bukan tanggal');
  });
});
