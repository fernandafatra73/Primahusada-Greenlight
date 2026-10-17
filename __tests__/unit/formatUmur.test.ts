import { describe, expect, test } from 'vitest';
import { formatUmurDetail } from '../../apps/web/src/lib/format.ts';

// Acuan memakai jam 12 siang lokal supaya tanggalnya tidak bergeser oleh zona waktu.
function acuan(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d, 12).toISOString();
}

describe('formatUmurDetail', () => {
  test('always writes years, months and days', () => {
    expect(formatUmurDetail('2000-03-10', acuan(2026, 10, 17))).toBe('26 Thn 7 bln 7 hr');
  });

  test('writes zero parts explicitly', () => {
    expect(formatUmurDetail('2000-10-17', acuan(2026, 10, 17))).toBe('26 Thn 0 bln 0 hr');
    expect(formatUmurDetail('2026-10-01', acuan(2026, 10, 17))).toBe('0 Thn 0 bln 16 hr');
  });

  test('counts days from the last monthly birthday when the day has not come yet', () => {
    // Lahir tgl 20; per 17 Okt bulan Oktober belum genap → 6 bulan sejak 20 Apr, lalu 27 hari sejak 20 Sep.
    expect(formatUmurDetail('2026-03-20', acuan(2026, 10, 17))).toBe('0 Thn 6 bln 27 hr');
  });

  test('clamps a 31st birth date to shorter months', () => {
    // Ulang bulan Februari 2026 jatuh di tgl 28.
    expect(formatUmurDetail('2025-01-31', acuan(2026, 3, 1))).toBe('1 Thn 1 bln 1 hr');
  });

  test('handles a birth date after the reference date and invalid input', () => {
    expect(formatUmurDetail('2027-01-01', acuan(2026, 10, 17))).toBe('0 Thn 0 bln 0 hr');
    expect(formatUmurDetail('bukan-tanggal', acuan(2026, 10, 17))).toBe('—');
  });
});
