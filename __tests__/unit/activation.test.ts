import { describe, expect, test } from 'vitest';
import {
  addActivationDuration,
  buildOwnerWaLink,
  computeActivationCode,
  formatRequestCode,
  isValidActivationYears,
  OWNER_WA_NUMBER_INTL,
  OWNER_WA_NUMBER_LOCAL,
  parseRequestCode,
  verifyActivationCode,
} from '../../apps/api/src/lib/activation.ts';
import { isLisensiAktif } from '../../apps/api/src/routes/activation.ts';

describe('formatRequestCode / parseRequestCode', () => {
  test('round-trips installId and cycle', () => {
    const code = formatRequestCode('cabc123def456', 3);
    expect(code).toBe('cabc123def456.3');
    expect(parseRequestCode(code)).toEqual({ installId: 'cabc123def456', cycle: 3 });
  });

  test('trims surrounding whitespace', () => {
    expect(parseRequestCode('  cabc123.2  ')).toEqual({ installId: 'cabc123', cycle: 2 });
  });

  test('rejects malformed input', () => {
    for (const bad of ['', 'no-dot', '.5', 'abc.', 'abc.0', 'abc.-1', 'abc.x']) {
      expect(parseRequestCode(bad)).toBeNull();
    }
  });
});

describe('computeActivationCode / verifyActivationCode', () => {
  test('is deterministic for the same installId, cycle and years', () => {
    const a = computeActivationCode('install-1', 1, 1);
    const b = computeActivationCode('install-1', 1, 1);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}-Y1$/);
  });

  test('differs across installId, cycle or years', () => {
    const base = computeActivationCode('install-1', 1, 1);
    expect(computeActivationCode('install-2', 1, 1)).not.toBe(base);
    expect(computeActivationCode('install-1', 2, 1)).not.toBe(base);
    expect(computeActivationCode('install-1', 1, 20)).not.toBe(base);
  });

  test('accepts the correct code regardless of case or dashes, and returns its embedded years', () => {
    const code = computeActivationCode('install-1', 1, 1);
    expect(verifyActivationCode('install-1', 1, code)).toBe(1);
    expect(verifyActivationCode('install-1', 1, code.toLowerCase())).toBe(1);
    expect(verifyActivationCode('install-1', 1, code.replace('-', ''))).toBe(1);
    expect(verifyActivationCode('install-1', 1, ` ${code} `)).toBe(1);

    const longCode = computeActivationCode('install-1', 1, 20);
    expect(verifyActivationCode('install-1', 1, longCode)).toBe(20);
  });

  test('rejects a wrong or unrelated code', () => {
    const code = computeActivationCode('install-1', 1, 1);
    expect(verifyActivationCode('install-1', 2, code)).toBeNull();
    expect(verifyActivationCode('install-2', 1, code)).toBeNull();
    expect(verifyActivationCode('install-1', 1, 'ZZZZZ-ZZZZZ-Y1')).toBeNull();
  });

  test('rejects a tampered years suffix even if the digest part matches another code', () => {
    const oneYearCode = computeActivationCode('install-1', 1, 1);
    const tampered = oneYearCode.replace('-Y1', '-Y20');
    expect(verifyActivationCode('install-1', 1, tampered)).toBeNull();
  });

  test('rejects malformed or out-of-range years suffixes', () => {
    expect(verifyActivationCode('install-1', 1, '12345-67890-Y0')).toBeNull();
    expect(verifyActivationCode('install-1', 1, '12345-67890-Y101')).toBeNull();
    expect(verifyActivationCode('install-1', 1, '12345-67890')).toBeNull();
  });
});

describe('isValidActivationYears', () => {
  test('accepts integers from 1 to 100', () => {
    expect(isValidActivationYears(1)).toBe(true);
    expect(isValidActivationYears(20)).toBe(true);
    expect(isValidActivationYears(100)).toBe(true);
  });

  test('rejects zero, negative, fractional or too-large values', () => {
    expect(isValidActivationYears(0)).toBe(false);
    expect(isValidActivationYears(-1)).toBe(false);
    expect(isValidActivationYears(1.5)).toBe(false);
    expect(isValidActivationYears(101)).toBe(false);
  });
});

describe('addActivationDuration', () => {
  test('adds exactly the given number of years', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(addActivationDuration(from, 1).getUTCFullYear()).toBe(2027);
    expect(addActivationDuration(from, 20).getUTCFullYear()).toBe(2046);
  });
});

describe('buildOwnerWaLink', () => {
  test('points at the owner WhatsApp number with the request code in the message', () => {
    const link = buildOwnerWaLink('install-1.1');
    expect(link).toBe(
      `https://wa.me/${OWNER_WA_NUMBER_INTL}?text=${encodeURIComponent(
        'Halo, saya minta kode aktivasi Primahusada.\nKode permintaan: install-1.1',
      )}`,
    );
    expect(OWNER_WA_NUMBER_LOCAL).toBe('085719325557');
    expect(OWNER_WA_NUMBER_INTL).toBe('6285719325557');
  });
});

describe('isLisensiAktif', () => {
  test('is false when never activated', () => {
    expect(isLisensiAktif({ activatedAt: null, expiresAt: null })).toBe(false);
  });

  test('is false once expiresAt has passed', () => {
    expect(
      isLisensiAktif({ activatedAt: new Date('2020-01-01'), expiresAt: new Date('2020-01-02') }),
    ).toBe(false);
  });

  test('is true while within the activation window', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(isLisensiAktif({ activatedAt: new Date(), expiresAt: future })).toBe(true);
  });
});
