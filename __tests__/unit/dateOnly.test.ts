import { describe, expect, test } from 'vitest';
import { parseDateOnly, registrationTimestamp } from '../../apps/api/src/lib/dateOnly.ts';

describe('parseDateOnly', () => {
  test('parses YYYY-MM-DD as UTC midnight', () => {
    expect(parseDateOnly(' 2026-09-15 ')).toEqual(new Date('2026-09-15T00:00:00.000Z'));
  });

  test('rejects other formats and impossible dates', () => {
    for (const value of ['15-09-2026', '2026-9-15', '2026-02-30', '', undefined, 20260915]) {
      expect(parseDateOnly(value)).toBeNull();
    }
  });
});

describe('registrationTimestamp', () => {
  const now = new Date('2026-09-15T08:30:00.000Z');

  test('uses the current time when tanggal is empty or today', () => {
    expect(registrationTimestamp(undefined, now)).toBe(now);
    expect(registrationTimestamp('  ', now)).toBe(now);
    expect(registrationTimestamp('2026-09-15', now)).toBe(now);
  });

  test('uses the chosen date for another day', () => {
    expect(registrationTimestamp('2026-09-10', now)).toEqual(new Date('2026-09-10T00:00:00.000Z'));
  });

  test('returns null for an invalid tanggal', () => {
    expect(registrationTimestamp('10/09/2026', now)).toBeNull();
  });
});
