import { describe, expect, test } from 'vitest';
import {
  detectFvg,
  detectSinyalPembalikan,
  rsi,
  sma,
  type OhlcCandle,
} from '../../apps/web/src/lib/indikatorTrading.ts';

function candle(i: number, open: number, high: number, low: number, close: number): OhlcCandle {
  return { openTime: i * 60_000, open, high, low, close };
}

describe('sma', () => {
  test('averages a sliding window and is null until the window is full', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe('rsi', () => {
  test('is 100 for a strictly rising series and 0 for a strictly falling one', () => {
    const naik = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(rsi(naik, 14)[14]).toBe(100);
    expect(rsi([...naik].reverse(), 14)[19]).toBe(0);
  });

  test('matches the Wilder formula on a known series', () => {
    const closes = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28,
    ];
    const values = rsi(closes, 14);
    expect(values.slice(0, 14).every((v) => v === null)).toBe(true);
    expect(values[14]).toBeCloseTo(70.46, 1);
  });
});

describe('detectFvg', () => {
  test('finds a bullish gap and marks when price later fills it', () => {
    const candles = [
      candle(0, 100, 101, 99, 100.5),
      candle(1, 100.5, 104, 100.5, 103.8),
      candle(2, 103.8, 106, 102, 105), // low 102 > high 101 → gap 101-102
      candle(3, 105, 105.5, 103, 104),
      candle(4, 104, 104.2, 100.8, 101), // low 100.8 ≤ 101 → filled
    ];
    expect(detectFvg(candles, 0)).toEqual([{ arah: 'BULLISH', startIndex: 0, top: 102, bottom: 101, filledIndex: 4 }]);
  });

  test('finds an open bearish gap and ignores gaps below the minimum size', () => {
    const candles = [
      candle(0, 100, 101, 99, 99.5),
      candle(1, 99.5, 99.6, 96, 96.2),
      candle(2, 96.2, 97, 95, 95.5), // high 97 < low 99 → gap 97-99
    ];
    expect(detectFvg(candles, 0)).toEqual([{ arah: 'BEARISH', startIndex: 0, top: 99, bottom: 97, filledIndex: null }]);
    expect(detectFvg(candles, 0.05)).toEqual([]);
  });
});

describe('detectSinyalPembalikan', () => {
  function turunLaluHammer(): OhlcCandle[] {
    const candles: OhlcCandle[] = [];
    let p = 120;
    for (let i = 0; i < 12; i++) {
      candles.push(candle(i, p, p + 0.3, p - 2.2, p - 2));
      p -= 2;
    }
    // Hammer di dasar: body kecil, ekor bawah panjang.
    candles.push(candle(12, p, p + 0.5, p - 4, p + 0.4));
    return candles;
  }

  test('signals BELI on a hammer at the swing low with low RSI', () => {
    const candles = turunLaluHammer();
    const r = rsi(candles.map((c) => c.close), 5);
    expect(detectSinyalPembalikan(candles, r)).toEqual([{ index: 12, arah: 'BELI', pola: 'Hammer' }]);
  });

  test('ignores candles that are not closed yet', () => {
    const candles = turunLaluHammer();
    const r = rsi(candles.map((c) => c.close), 5);
    expect(detectSinyalPembalikan(candles, r, candles.length - 1)).toEqual([]);
  });

  test('signals JUAL on a bearish engulfing at the swing high with high RSI', () => {
    const candles: OhlcCandle[] = [];
    let p = 100;
    for (let i = 0; i < 12; i++) {
      candles.push(candle(i, p, p + 2.2, p - 0.3, p + 2));
      p += 2;
    }
    candles.push(candle(12, p - 2, p + 1, p - 2.1, p + 0.5)); // hijau, puncak
    candles.push(candle(13, p + 0.8, p + 0.9, p - 3, p - 2.5)); // merah menelan
    const r = rsi(candles.map((c) => c.close), 5);
    expect(detectSinyalPembalikan(candles, r)).toEqual([{ index: 13, arah: 'JUAL', pola: 'Bearish Engulfing' }]);
  });
});
