import { describe, expect, test } from 'vitest';
import { insertTextAt } from '../../apps/web/src/lib/insertText.ts';

describe('insertTextAt', () => {
  test('fills an empty text without separators', () => {
    expect(insertTextAt('', 'Cor normal', 0, 0)).toEqual({ text: 'Cor normal', cursor: 10 });
  });

  test('appends on a new line when the cursor is at the end of existing text', () => {
    expect(insertTextAt('Pulmo normal', 'Cor normal', 12, 12)).toEqual({
      text: 'Pulmo normal\nCor normal',
      cursor: 23,
    });
  });

  test('does not double the newline when the text already ends with one', () => {
    expect(insertTextAt('Pulmo normal\n', 'Cor normal', 13, 13).text).toBe('Pulmo normal\nCor normal');
  });

  test('inserts in the middle and separates from the following text', () => {
    expect(insertTextAt('A\nB', 'X', 2, 2)).toEqual({ text: 'A\nX\nB', cursor: 3 });
  });

  test('replaces the selected range, even when start and end are reversed', () => {
    expect(insertTextAt('awal LAMA akhir', 'BARU', 9, 5).text).toBe('awal \nBARU\n akhir');
  });

  test('clamps out-of-range positions to the text bounds', () => {
    expect(insertTextAt('abc', 'X', 99, 120)).toEqual({ text: 'abc\nX', cursor: 5 });
    expect(insertTextAt('abc', 'X', -3, -1)).toEqual({ text: 'X\nabc', cursor: 1 });
  });
});
