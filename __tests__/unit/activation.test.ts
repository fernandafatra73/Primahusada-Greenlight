import { describe, expect, test } from 'vitest';
import {
  ACTIVATION_DURATION_DAYS,
  addActivationDuration,
  buildOwnerWaLink,
  computeActivationCode,
  formatRequestCode,
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
  test('is deterministic for the same installId and cycle', () => {
    const a = computeActivationCode('install-1', 1);
    const b = computeActivationCode('install-1', 1);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
  });

  test('differs across installId or cycle', () => {
    const base = computeActivationCode('install-1', 1);
    expect(computeActivationCode('install-2', 1)).not.toBe(base);
    expect(computeActivationCode('install-1', 2)).not.toBe(base);
  });

  test('accepts the correct code regardless of case or dashes', () => {
    const code = computeActivationCode('install-1', 1);
    expect(verifyActivationCode('install-1', 1, code)).toBe(true);
    expect(verifyActivationCode('install-1', 1, code.toLowerCase())).toBe(true);
    expect(verifyActivationCode('install-1', 1, code.replace('-', ''))).toBe(true);
    expect(verifyActivationCode('install-1', 1, ` ${code} `)).toBe(true);
  });

  test('rejects a wrong or unrelated code', () => {
    const code = computeActivationCode('install-1', 1);
    expect(verifyActivationCode('install-1', 2, code)).toBe(false);
    expect(verifyActivationCode('install-2', 1, code)).toBe(false);
    expect(verifyActivationCode('install-1', 1, 'ZZZZZ-ZZZZZ')).toBe(false);
  });
});

describe('addActivationDuration', () => {
  test('adds exactly the configured license duration in days', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const until = addActivationDuration(from);
    const diffDays = (until.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(ACTIVATION_DURATION_DAYS);
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
