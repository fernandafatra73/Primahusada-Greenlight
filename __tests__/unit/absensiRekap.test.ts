import { describe, expect, test } from 'vitest';
import { calcHariAbsen, calcPersentaseKehadiran, countHariKerja } from '../../apps/api/src/lib/absensiRekap.ts';

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

describe('calcHariAbsen', () => {
  test('is the working days not attended', () => {
    expect(calcHariAbsen(200, 230)).toBe(30);
  });

  test('is zero for a perfect record', () => {
    expect(calcHariAbsen(230, 230)).toBe(0);
  });

  test('never goes negative when attendance exceeds working days', () => {
    // Bisa terjadi bila ada absensi di hari Minggu, yang bukan hari kerja.
    expect(calcHariAbsen(235, 230)).toBe(0);
  });

  test('counts every working day as absent when nobody came', () => {
    expect(calcHariAbsen(0, 230)).toBe(230);
  });
});
