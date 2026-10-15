import { describe, expect, test } from 'vitest';
import { parseHitunganKontrakanBody } from '../../apps/api/src/lib/hitunganKontrakan.ts';
import { isianBulanBerikutnya, jumlahKontrakan, namaBulan, rekapTahunan } from '../../apps/web/src/lib/hitunganKontrakan.ts';

describe('parseHitunganKontrakanBody', () => {
  test('accepts a full body and defaults missing nominal fields to 0', () => {
    const parsed = parseHitunganKontrakanBody({ bulan: 10, tahun: 2026, sewa: 1500000, listrik: 250000 });
    expect(parsed).toEqual({
      ok: true,
      data: { bulan: 10, tahun: 2026, sewa: 1500000, listrik: 250000, air: 0, pinjam: 0, pinjam2: 0 },
    });
  });

  test('keeps existing values for fields not sent (PATCH)', () => {
    const parsed = parseHitunganKontrakanBody(
      { air: 75000 },
      { bulan: 3, tahun: 2025, sewa: 1000000, listrik: 200000, air: 50000, pinjam: 300000, pinjam2: 40000 },
    );
    expect(parsed).toEqual({
      ok: true,
      data: { bulan: 3, tahun: 2025, sewa: 1000000, listrik: 200000, air: 75000, pinjam: 300000, pinjam2: 40000 },
    });
  });

  test.each([
    [{ bulan: 0, tahun: 2026 }, 'Bulan harus 1 sampai 12'],
    [{ bulan: 13, tahun: 2026 }, 'Bulan harus 1 sampai 12'],
    [{ tahun: 2026 }, 'Bulan harus 1 sampai 12'],
    [{ bulan: 1, tahun: 1999 }, 'Tahun tidak valid'],
    [{ bulan: 1, tahun: 2026.5 }, 'Tahun tidak valid'],
    [{ bulan: 1, tahun: 2026, sewa: -1 }, 'Sewa tidak valid'],
    [{ bulan: 1, tahun: 2026, pinjam: Number.NaN }, 'Pinjaman 1 tidak valid'],
    [{ bulan: 1, tahun: 2026, pinjam2: -5 }, 'Pinjaman 2 tidak valid'],
  ])('rejects %o', (body, error) => {
    expect(parseHitunganKontrakanBody(body)).toEqual({ ok: false, error });
  });
});

describe('jumlahKontrakan', () => {
  test('computes sewa - listrik - air - pinjaman 1 - pinjaman 2 from API strings', () => {
    expect(
      jumlahKontrakan({ sewa: '1500000', listrik: '250000', air: '50000', pinjam: '200000', pinjam2: '100000' }),
    ).toBe(900000);
  });

  test('treats empty or invalid values as 0', () => {
    expect(jumlahKontrakan({ sewa: '100', listrik: 'abc', air: '', pinjam: 5, pinjam2: '' })).toBe(95);
  });
});

describe('namaBulan', () => {
  test('maps 1..12 to Indonesian month names', () => {
    expect(namaBulan(1)).toBe('Januari');
    expect(namaBulan(12)).toBe('Desember');
  });
});

describe('rekapTahunan', () => {
  const row = (
    id: string,
    bulan: number,
    tahun: number,
    sewa: string,
    listrik = '0',
    air = '0',
    pinjam = '0',
    pinjam2 = '0',
  ): {
    id: string;
    bulan: number;
    tahun: number;
    sewa: string;
    listrik: string;
    air: string;
    pinjam: string;
    pinjam2: string;
  } => ({ id, bulan, tahun, sewa, listrik, air, pinjam, pinjam2 });

  test('groups rows per year, sorted by month, with yearly totals', () => {
    const rekap = rekapTahunan([
      row('c', 2, 2026, '875', '200'),
      row('b', 12, 2025, '500', '50'),
      row('a', 1, 2026, '1000', '50', '50', '15', '10'),
    ]);
    expect(rekap.map((r) => r.tahun)).toEqual([2025, 2026]);
    expect(rekap[0]?.items.map((i) => i.id)).toEqual(['b']);
    expect(rekap[0]?.total).toEqual({ sewa: 500, listrik: 50, air: 0, pinjam: 0, pinjam2: 0, jumlah: 450 });
    expect(rekap[1]?.items.map((i) => i.id)).toEqual(['a', 'c']);
  });

  test('yearly total takes Sewa from the first month and subtracts every deduction', () => {
    // Saldo berjalan: Sewa tiap bulan = Jumlah bulan sebelumnya.
    const rekap = rekapTahunan([
      row('jul', 7, 2026, '17000000', '0', '100000'),
      row('agu', 8, 2026, '16900000', '0', '100000', '5000000'),
      row('sep', 9, 2026, '11800000', '0', '1000000'),
      row('okt', 10, 2026, '10800000', '0', '100000'),
    ]);
    expect(rekap[0]?.total).toEqual({
      sewa: 17000000,
      listrik: 0,
      air: 1300000,
      pinjam: 5000000,
      pinjam2: 0,
      jumlah: 10700000,
    });
  });

  test('returns an empty list for no rows', () => {
    expect(rekapTahunan([])).toEqual([]);
  });
});

describe('isianBulanBerikutnya', () => {
  const row = (bulan: number, tahun: number, sewa: string, listrik = '0'): {
    bulan: number;
    tahun: number;
    sewa: string;
    listrik: string;
    air: string;
    pinjam: string;
    pinjam2: string;
  } => ({ bulan, tahun, sewa, listrik, air: '0', pinjam: '0', pinjam2: '0' });

  test('carries the latest month Jumlah into next month Sewa', () => {
    const items = [row(10, 2026, '1500000', '300000'), row(9, 2026, '1500000', '250000')];
    expect(isianBulanBerikutnya(items)).toEqual({ bulan: 11, tahun: 2026, sewa: 1200000 });
  });

  test('rolls December over to January of the next year', () => {
    const items = [row(12, 2025, '1000', '100'), row(3, 2025, '9999')];
    expect(isianBulanBerikutnya(items)).toEqual({ bulan: 1, tahun: 2026, sewa: 900 });
  });

  test('returns null when there is no data yet', () => {
    expect(isianBulanBerikutnya([])).toBeNull();
  });
});
