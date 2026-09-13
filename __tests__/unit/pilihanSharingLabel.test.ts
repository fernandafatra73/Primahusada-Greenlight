import { describe, expect, test } from 'vitest';
import { formatSharingShort } from '../../apps/web/src/lib/pilihanSharing.ts';

describe('formatSharingShort', () => {
  test('uses "rb" for thousands', () => {
    expect(formatSharingShort(18000)).toBe('18rb');
    expect(formatSharingShort(88000)).toBe('88rb');
    expect(formatSharingShort(12500)).toBe('12,5rb');
  });

  test('uses "jt" for millions', () => {
    expect(formatSharingShort(1_000_000)).toBe('1jt');
    expect(formatSharingShort(1_500_000)).toBe('1,5jt');
  });

  test('keeps small amounts as plain numbers', () => {
    expect(formatSharingShort(0)).toBe('0');
    expect(formatSharingShort(500)).toBe('500');
  });
});
