import { describe, expect, test } from 'vitest';
import { clockAngles, nextSecondTurns } from '../../apps/web/src/lib/clockAngles.ts';

describe('clockAngles', () => {
  test('12:00:00 points every hand at 12', () => {
    expect(clockAngles(new Date(2026, 9, 8, 12, 0, 0))).toEqual({ hour: 0, minute: 0, second: 0 });
  });

  test('3:00:00 puts the hour hand at 90 degrees', () => {
    expect(clockAngles(new Date(2026, 9, 8, 15, 0, 0)).hour).toBe(90);
  });

  test('hour and minute hands move between marks', () => {
    const a = clockAngles(new Date(2026, 9, 8, 9, 30, 30));
    expect(a.hour).toBeCloseTo(9 * 30 + 15 + 0.25);
    expect(a.minute).toBeCloseTo(183);
    expect(a.second).toBe(180);
  });

  test('second hand adds full turns so it keeps moving forward', () => {
    expect(clockAngles(new Date(2026, 9, 8, 10, 0, 5), 2).second).toBe(5 * 6 + 720);
  });
});

describe('nextSecondTurns', () => {
  test('counts a turn when the seconds wrap from 59 to 0', () => {
    expect(nextSecondTurns(59, 0, 3)).toBe(4);
  });

  test('keeps the count within a minute', () => {
    expect(nextSecondTurns(10, 11, 3)).toBe(3);
  });
});
