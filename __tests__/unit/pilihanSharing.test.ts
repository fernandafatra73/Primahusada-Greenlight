import { describe, expect, test } from 'vitest';
import {
  normalizeSharingKeterangan,
  parseSharingNominal,
  SHARING_KETERANGAN_MAX_LENGTH,
  SHARING_NOMINAL_MAX,
} from '../../apps/api/src/lib/pilihanSharing.ts';

describe('parseSharingNominal', () => {
  test('accepts non-negative integers given as numbers or numeric strings', () => {
    expect(parseSharingNominal(18000)).toBe(18000);
    expect(parseSharingNominal(0)).toBe(0);
    expect(parseSharingNominal(' 35000 ')).toBe(35000);
    expect(parseSharingNominal(SHARING_NOMINAL_MAX)).toBe(SHARING_NOMINAL_MAX);
  });

  test('rejects negative, fractional, too large and non-numeric values', () => {
    expect(parseSharingNominal(-1)).toBeNull();
    expect(parseSharingNominal(1500.5)).toBeNull();
    expect(parseSharingNominal(SHARING_NOMINAL_MAX + 1)).toBeNull();
    expect(parseSharingNominal('18rb')).toBeNull();
    expect(parseSharingNominal('')).toBeNull();
    expect(parseSharingNominal('   ')).toBeNull();
    expect(parseSharingNominal(Number.NaN)).toBeNull();
    expect(parseSharingNominal(null)).toBeNull();
    expect(parseSharingNominal(undefined)).toBeNull();
    expect(parseSharingNominal({ nominal: 18000 })).toBeNull();
  });
});

describe('normalizeSharingKeterangan', () => {
  test('trims text and turns empty or non-string values into null', () => {
    expect(normalizeSharingKeterangan('  Thorax Anak  ')).toBe('Thorax Anak');
    expect(normalizeSharingKeterangan('   ')).toBeNull();
    expect(normalizeSharingKeterangan(undefined)).toBeNull();
    expect(normalizeSharingKeterangan(123)).toBeNull();
  });

  test('truncates overly long text', () => {
    const long = 'a'.repeat(SHARING_KETERANGAN_MAX_LENGTH + 50);
    expect(normalizeSharingKeterangan(long)).toHaveLength(SHARING_KETERANGAN_MAX_LENGTH);
  });
});
