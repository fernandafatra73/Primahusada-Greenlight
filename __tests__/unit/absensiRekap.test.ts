import { describe, expect, test } from 'vitest';
import { calcPersentaseKehadiran, countHariKerja } from '../../apps/api/src/lib/absensiRekap.ts';

describe('countHariKerja', () => {
  test('excludes Sundays across a full past year', () => {
    // 2025 dimulai hari Rabu, bukan tahun kabisat (365 hari, 52 hari Minggu).
    const now = new Date('2026-01-15T10:00:00');
    expect(countHariKerja(2025, now)).toBe(313);
  });

  test('stops at "now" for the current year instead of Dec 31', () => {
    const now = new Date('2026-01-08T09:00:00'); // Kamis
    // 1-8 Jan 2026 = 8 hari, memuat 1 hari Minggu (4 Jan).
    expect(countHariKerja(2026, now)).toBe(7);
  });

  test('returns 0 for a year entirely in the future', () => {
    const now = new Date('2026-01-01T00:00:00');
    expect(countHariKerja(2030, now)).toBe(0);
  });
});

describe('calcPersentaseKehadiran', () => {
  test('rounds to one decimal place', () => {
    expect(calcPersentaseKehadiran(1, 210)).toBeCloseTo(0.5, 5);
  });

  test('returns 0 when hariKerja is 0 to avoid dividing by zero', () => {
    expect(calcPersentaseKehadiran(5, 0)).toBe(0);
  });

  test('returns 100 for full attendance', () => {
    expect(calcPersentaseKehadiran(210, 210)).toBe(100);
  });
});
