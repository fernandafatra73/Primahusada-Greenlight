import { describe, expect, test } from 'vitest';
import { samaIsi, teksBaru, toggleId } from '../../apps/web/src/lib/inlineEdit.ts';

describe('toggleId', () => {
  test('adds a missing id at the end and removes an existing one', () => {
    expect(toggleId(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
});

describe('samaIsi', () => {
  test('ignores order and duplicates', () => {
    expect(samaIsi(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(samaIsi(['a', 'a', 'b'], ['b', 'a'])).toBe(true);
  });

  test('detects added or removed ids', () => {
    expect(samaIsi(['a'], ['a', 'b'])).toBe(false);
    expect(samaIsi(['a', 'c'], ['a', 'b'])).toBe(false);
  });
});

describe('teksBaru', () => {
  test('returns the trimmed new text when it changed', () => {
    expect(teksBaru('Budi', '  Budi Santoso ')).toBe('Budi Santoso');
  });

  test('returns null when empty or unchanged (nothing to save)', () => {
    expect(teksBaru('Budi', '   ')).toBeNull();
    expect(teksBaru('Budi', ' Budi ')).toBeNull();
  });
});
