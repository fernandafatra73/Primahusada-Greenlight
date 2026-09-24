import { describe, expect, test } from 'vitest';
import {
  TIME_CONTROLS,
  findTimeControl,
  formatClock,
  isLowTime,
} from '../../apps/web/src/lib/chessClock.ts';

describe('formatClock', () => {
  test('shows minutes and seconds below an hour', () => {
    expect(formatClock(5 * 60_000)).toBe('5:00');
    expect(formatClock(10 * 60_000)).toBe('10:00');
    expect(formatClock(62_000)).toBe('1:02');
  });

  test('shows hours once there is an hour or more left', () => {
    expect(formatClock(60 * 60_000)).toBe('1:00:00');
    expect(formatClock(59 * 60_000 + 59_000)).toBe('59:59');
  });

  test('rounds up so the clock only reads 0:00 when time is truly gone', () => {
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(999)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
  });

  test('never shows negative time', () => {
    expect(formatClock(-5000)).toBe('0:00');
  });
});

describe('findTimeControl', () => {
  test('finds each offered control', () => {
    expect(findTimeControl('5m').ms).toBe(300_000);
    expect(findTimeControl('10m').ms).toBe(600_000);
    expect(findTimeControl('1j').ms).toBe(3_600_000);
    expect(findTimeControl('tanpa-batas').ms).toBeNull();
  });

  test('falls back to the first control for an unknown id', () => {
    expect(findTimeControl('tidak-ada')).toBe(TIME_CONTROLS[0]);
  });
});

describe('isLowTime', () => {
  test('flags the last 30 seconds', () => {
    expect(isLowTime(31_000)).toBe(false);
    expect(isLowTime(30_000)).toBe(true);
    expect(isLowTime(0)).toBe(true);
  });
});
