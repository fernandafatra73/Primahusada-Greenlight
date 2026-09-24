import { describe, expect, test } from 'vitest';
import type { PlacedTile } from '../../apps/web/src/lib/gaplek.ts';
import {
  ROW_H,
  ROW_W,
  TILE_LONG,
  TILE_SHORT,
  ZONE_SIZE,
  chainWidths,
  isDoubleTile,
  layoutSnake,
  rowCount,
  tileFootprint,
} from '../../apps/web/src/lib/gaplekLayout.ts';

const tile = (a: number, b: number): PlacedTile => [a, b];

describe('isDoubleTile', () => {
  test('recognises a double', () => {
    expect(isDoubleTile(tile(4, 4))).toBe(true);
    expect(isDoubleTile(tile(0, 0))).toBe(true);
  });

  test('a mixed tile is not a double', () => {
    expect(isDoubleTile(tile(3, 5))).toBe(false);
  });
});

describe('tileFootprint', () => {
  test('a double takes only its short side, because it lies crosswise', () => {
    expect(tileFootprint(tile(6, 6))).toBe(TILE_SHORT);
    expect(tileFootprint(tile(6, 5))).toBe(TILE_LONG);
  });
});

describe('layoutSnake', () => {
  test('packs a row tight, with no gaps between pieces', () => {
    const slots = layoutSnake([50, 50, 50]);
    expect(slots.map((s) => s.x)).toEqual([0, 50, 100]);
    expect(slots.every((s) => s.y === 0)).toBe(true);
  });

  test('turns back the other way once a row is full', () => {
    // Tiga potong 150 lebar muat dalam satu baris (376), yang keempat tidak.
    const slots = layoutSnake([150, 150, 150]);

    expect(slots[0]?.y).toBe(0);
    expect(slots[1]?.y).toBe(0);
    expect(slots[2]?.y).toBe(ROW_H);
  });

  test('the second row runs right to left', () => {
    const slots = layoutSnake([200, 200, 100]);

    // Baris pertama mulai dari kiri.
    expect(slots[0]?.x).toBe(0);
    // Baris kedua mulai dari tepi kanan dan bergerak ke kiri.
    expect(slots[1]?.x).toBe(ROW_W - 200);
    expect(slots[2]?.x).toBe(ROW_W - 300);
  });

  test('alternates direction again on the third row', () => {
    const slots = layoutSnake([376, 376, 50]);
    expect(slots[0]?.y).toBe(0);
    expect(slots[1]?.y).toBe(ROW_H);
    expect(slots[2]?.y).toBe(ROW_H * 2);
    expect(slots[2]?.x).toBe(0);
  });

  test('keeps a piece wider than a row instead of dropping it', () => {
    const slots = layoutSnake([ROW_W + 40]);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.x).toBe(0);
  });

  test('handles an empty chain', () => {
    expect(layoutSnake([])).toEqual([]);
  });
});

describe('chainWidths', () => {
  test('wraps the tiles between the two drop zones', () => {
    const widths = chainWidths([tile(6, 6), tile(6, 3)]);
    expect(widths).toEqual([ZONE_SIZE, TILE_SHORT, TILE_LONG, ZONE_SIZE]);
  });

  test('an empty board is just the two zones', () => {
    expect(chainWidths([])).toEqual([ZONE_SIZE, ZONE_SIZE]);
  });
});

describe('rowCount', () => {
  test('counts the rows the chain actually occupies', () => {
    expect(rowCount(layoutSnake([50, 50]))).toBe(1);
    expect(rowCount(layoutSnake([200, 200]))).toBe(2);
    expect(rowCount(layoutSnake([]))).toBe(1);
  });
});
