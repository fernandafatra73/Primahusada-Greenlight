import { describe, expect, test } from 'vitest';
import {
  AKURASI_KASAR_METER,
  formatCoordinate,
  isAkurasiMemadai,
  isNullIsland,
  mapsUrl,
  normalizeCoordinate,
} from '../../apps/api/src/lib/geoLocation.ts';

describe('normalizeCoordinate', () => {
  test('accepts a normal reading', () => {
    expect(normalizeCoordinate(-6.912345, 107.61, 18)).toEqual({
      lat: -6.912345,
      lng: 107.61,
      akurasi: 18,
    });
  });

  test('accepts the edges of both ranges', () => {
    expect(normalizeCoordinate(90, 180)?.lat).toBe(90);
    expect(normalizeCoordinate(-90, -180)?.lng).toBe(-180);
  });

  test('rejects readings outside the possible range', () => {
    expect(normalizeCoordinate(91, 0)).toBeNull();
    expect(normalizeCoordinate(-91, 0)).toBeNull();
    expect(normalizeCoordinate(0, 181)).toBeNull();
    expect(normalizeCoordinate(0, -181)).toBeNull();
  });

  test('rejects anything that is not a finite number', () => {
    const rubbish = [
      ['-6.9', '107.6'],
      [null, null],
      [undefined, undefined],
      [Number.NaN, 0],
      [0, Number.POSITIVE_INFINITY],
      [{}, []],
    ];
    const accepted = rubbish.filter(([lat, lng]) => normalizeCoordinate(lat, lng) !== null);
    expect(accepted).toEqual([]);
  });

  test('treats a missing or negative accuracy as not reported', () => {
    expect(normalizeCoordinate(-6.9, 107.6)?.akurasi).toBeNull();
    expect(normalizeCoordinate(-6.9, 107.6, -5)?.akurasi).toBeNull();
    expect(normalizeCoordinate(-6.9, 107.6, 'dekat')?.akurasi).toBeNull();
  });

  test('keeps an accuracy of exactly zero', () => {
    expect(normalizeCoordinate(-6.9, 107.6, 0)?.akurasi).toBe(0);
  });
});

describe('isNullIsland', () => {
  test('flags 0,0, which means the device failed rather than sat in the ocean', () => {
    expect(isNullIsland({ lat: 0, lng: 0, akurasi: null })).toBe(true);
  });

  test('leaves a real reading alone', () => {
    expect(isNullIsland({ lat: -6.9, lng: 107.6, akurasi: 10 })).toBe(false);
    expect(isNullIsland({ lat: 0, lng: 107.6, akurasi: 10 })).toBe(false);
  });
});

describe('formatCoordinate', () => {
  test('writes six decimals, without pretending to more precision', () => {
    expect(formatCoordinate({ lat: -6.9123456789, lng: 107.61, akurasi: null })).toBe(
      '-6.912346, 107.610000',
    );
  });
});

describe('mapsUrl', () => {
  test('builds a map link for the point', () => {
    expect(mapsUrl({ lat: -6.9, lng: 107.6, akurasi: null })).toBe(
      'https://www.google.com/maps?q=-6.9,107.6',
    );
  });
});

describe('isAkurasiMemadai', () => {
  test('accepts a GPS-grade reading', () => {
    expect(isAkurasiMemadai({ lat: -6.9, lng: 107.6, akurasi: 20 })).toBe(true);
    expect(isAkurasiMemadai({ lat: -6.9, lng: 107.6, akurasi: AKURASI_KASAR_METER })).toBe(true);
  });

  test('rejects a reading too coarse to prove attendance', () => {
    expect(isAkurasiMemadai({ lat: -6.9, lng: 107.6, akurasi: 5000 })).toBe(false);
  });

  test('rejects a reading with no accuracy at all', () => {
    expect(isAkurasiMemadai({ lat: -6.9, lng: 107.6, akurasi: null })).toBe(false);
  });
});
