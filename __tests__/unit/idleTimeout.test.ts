import { describe, expect, test } from 'vitest';
import { IDLE_LOGOUT_MS, isIdleExpired } from '../../apps/web/src/lib/idleTimeout.ts';

describe('isIdleExpired', () => {
  test('defaults to a 30 minute limit', () => {
    expect(IDLE_LOGOUT_MS).toBe(30 * 60 * 1000);
  });

  test('is not expired just under the limit', () => {
    expect(isIdleExpired(0, IDLE_LOGOUT_MS - 1)).toBe(false);
  });

  test('is expired exactly at the limit', () => {
    expect(isIdleExpired(0, IDLE_LOGOUT_MS)).toBe(true);
  });

  test('is expired well past the limit, e.g. after the computer slept', () => {
    expect(isIdleExpired(1_000, 1_000 + 5 * IDLE_LOGOUT_MS)).toBe(true);
  });

  test('honours a custom limit', () => {
    expect(isIdleExpired(0, 5_000, 10_000)).toBe(false);
    expect(isIdleExpired(0, 10_000, 10_000)).toBe(true);
  });
});
