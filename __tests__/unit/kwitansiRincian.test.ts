import { describe, expect, test } from 'vitest';
import {
  normalizeNamaRincian,
  parseHarga,
  totalRincian,
  validasiRincian,
} from '../../apps/api/src/lib/kwitansiRincian.ts';

describe('normalizeNamaRincian', () => {
  test('trims and collapses runs of whitespace', () => {
    expect(normalizeNamaRincian('  Biaya   Pendaftaran  ')).toBe('Biaya Pendaftaran');
  });

  test('rejects an empty or whitespace-only name', () => {
    expect(normalizeNamaRincian('')).toBeNull();
    expect(normalizeNamaRincian('   ')).toBeNull();
  });

  test('caps a very long name rather than storing it whole', () => {
    expect(normalizeNamaRincian('a'.repeat(200))).toHaveLength(120);
  });
});

describe('parseHarga', () => {
  test('accepts a plain number', () => {
    expect(parseHarga(50000)).toBe(50000);
    expect(parseHarga('50000')).toBe(50000);
  });

  test('accepts the thousands separators people actually type', () => {
    expect(parseHarga('50.000')).toBe(50000);
    expect(parseHarga('50,000')).toBe(50000);
    expect(parseHarga('1.250.000')).toBe(1250000);
  });

  test('accepts zero, for a line given free of charge', () => {
    expect(parseHarga(0)).toBe(0);
    expect(parseHarga('0')).toBe(0);
  });

  // Ini dokumen uang: salah ketik harus ditolak, bukan diam-diam jadi nol.
  test('rejects anything that is not a usable amount', () => {
    const rubbish = ['', '   ', 'gratis', '50rb', '-5000', -1, Number.NaN, null, undefined, {}, '1.2.3.4'];
    const accepted = rubbish.filter((input) => parseHarga(input) !== null);
    expect(accepted).toEqual([]);
  });

  test('rejects a negative number written as text', () => {
    expect(parseHarga('-50000')).toBeNull();
  });
});

describe('totalRincian', () => {
  test('adds every line', () => {
    expect(totalRincian([{ harga: 50000 }, { harga: 10000 }, { harga: 2500 }])).toBe(62500);
  });

  test('an empty receipt totals zero', () => {
    expect(totalRincian([])).toBe(0);
  });

  test('a free line does not change the total', () => {
    expect(totalRincian([{ harga: 50000 }, { harga: 0 }])).toBe(50000);
  });
});

describe('validasiRincian', () => {
  test('passes a well-formed line', () => {
    expect(validasiRincian('Administrasi', '10.000')).toBeNull();
  });

  test('complains about a missing name', () => {
    expect(validasiRincian('  ', 10000)).toContain('Nama');
  });

  test('complains about an unusable price', () => {
    expect(validasiRincian('Administrasi', 'sepuluh ribu')).toContain('Harga');
  });

  test('complains about a name that is not text at all', () => {
    expect(validasiRincian(42, 10000)).toContain('Nama');
  });
});
