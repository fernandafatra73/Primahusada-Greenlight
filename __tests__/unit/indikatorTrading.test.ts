import { describe, expect, test } from 'vitest';
import {
  detectFvg,
  detectPolaCandle,
  detectSinyalPembalikan,
  levelTerdekat,
  rsi,
  sma,
  swingLevels,
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

/** Cermin harga (naik ↔ turun) supaya skenario BUY bisa dipakai ulang sebagai skenario SELL. */
function cermin(candles: ReadonlyArray<OhlcCandle>, pusat = 100): OhlcCandle[] {
  return candles.map((c) => ({
    openTime: c.openTime,
    open: 2 * pusat - c.open,
    close: 2 * pusat - c.close,
    high: 2 * pusat - c.low,
    low: 2 * pusat - c.high,
  }));
}

describe('detectPolaCandle', () => {
  test('detects bullish engulfing and its mirror bearish engulfing', () => {
    const naik = [candle(0, 100, 100.2, 97.8, 98), candle(1, 97.5, 101.2, 97.4, 101)];
    expect(detectPolaCandle(naik)).toContainEqual({ index: 1, jenis: 'BULLISH_ENGULFING' });
    expect(detectPolaCandle(cermin(naik))).toContainEqual({ index: 1, jenis: 'BEARISH_ENGULFING' });
  });

  test('detects a marubozu only when the candle is long versus recent candles and nearly wickless', () => {
    const tenang = [candle(0, 100, 100.5, 99.5, 100.2), candle(1, 100.2, 100.7, 99.7, 100), candle(2, 100, 100.5, 99.5, 100.1)];
    const bull = [...tenang, candle(3, 100, 103.1, 99.95, 103)];
    expect(detectPolaCandle(bull)).toContainEqual({ index: 3, jenis: 'MARUBOZU_BULLISH' });
    expect(detectPolaCandle(cermin(bull))).toContainEqual({ index: 3, jenis: 'MARUBOZU_BEARISH' });
    const berekor = [...tenang, candle(3, 100, 104.5, 99, 103)];
    expect(detectPolaCandle(berekor).map((p) => p.jenis)).not.toContain('MARUBOZU_BULLISH');
  });

  test('detects morning star and its mirror evening star', () => {
    const pola = [
      candle(0, 110, 110.5, 103.8, 104),
      candle(1, 104, 104.3, 103.2, 103.8),
      candle(2, 104, 108.8, 103.9, 108.5),
    ];
    expect(detectPolaCandle(pola)).toContainEqual({ index: 2, jenis: 'MORNING_STAR' });
    expect(detectPolaCandle(cermin(pola))).toContainEqual({ index: 2, jenis: 'EVENING_STAR' });
  });

  test('detects three white soldiers once, and the mirror three black crows', () => {
    const pola = [
      candle(0, 100, 102.2, 99.9, 102),
      candle(1, 101.5, 103.7, 101.4, 103.5),
      candle(2, 103, 105.2, 102.9, 105),
      candle(3, 104.5, 106.7, 104.4, 106.5),
    ];
    const soldiers = detectPolaCandle(pola).filter((p) => p.jenis === 'THREE_WHITE_SOLDIERS');
    expect(soldiers).toEqual([{ index: 2, jenis: 'THREE_WHITE_SOLDIERS' }]);
    expect(detectPolaCandle(cermin(pola))).toContainEqual({ index: 2, jenis: 'THREE_BLACK_CROWS' });
  });

  test('skips candles that are not closed yet', () => {
    const naik = [candle(0, 100, 100.2, 97.8, 98), candle(1, 97.5, 101.2, 97.4, 101)];
    expect(detectPolaCandle(naik, 1)).toEqual([]);
  });
});

describe('swingLevels & levelTerdekat', () => {
  test('finds swing lows as support and swing highs as resistance, nearest first', () => {
    const candles = [
      candle(0, 100, 101, 99, 100),
      candle(1, 100, 102, 98, 101),
      candle(2, 101, 105, 95, 104), // swing low 95 & swing high 105
      candle(3, 104, 104, 97, 98),
      candle(4, 98, 103, 96, 102),
      candle(5, 102, 103.5, 99, 100),
    ];
    const levels = swingLevels(candles);
    expect(levels).toEqual([
      { harga: 95, jenis: 'SUPPORT', index: 2 },
      { harga: 105, jenis: 'RESISTANCE', index: 2 },
    ]);
    expect(levelTerdekat(levels, 100)).toEqual({ supports: [levels[0]], resistances: [levels[1]] });
  });
});

describe('detectSinyalPembalikan', () => {
  /** Swing low 90 (support) → rally → turun lagi → Hammer di support → candle konfirmasi bullish. */
  function hammerDiSupport(): OhlcCandle[] {
    return [
      candle(0, 100, 101, 99, 100),
      candle(1, 100, 100.5, 97, 97.5),
      candle(2, 97.5, 98, 94, 94.5),
      candle(3, 94.5, 95, 90, 91),
      candle(4, 91, 95, 90.8, 94.5),
      candle(5, 94.5, 98, 94, 97.5),
      candle(6, 97.5, 99, 96, 98.5),
      candle(7, 98.5, 99, 95, 95.5),
      candle(8, 95.5, 96, 92.5, 93),
      candle(9, 93, 93.5, 91, 91.5),
      candle(10, 91.4, 92, 90.1, 91.8), // Hammer menyentuh support 90
      candle(11, 91.8, 94, 91.6, 93.8), // konfirmasi bullish
    ];
  }

  test('BUY = support + hammer rejection + bullish confirmation candle', () => {
    expect(detectSinyalPembalikan(hammerDiSupport())).toEqual([
      { index: 11, rejectionIndex: 10, arah: 'BELI', jenisPola: 'HAMMER', pola: 'Hammer', emoji: '🔨', level: 90 },
    ]);
  });

  test('SELL = resistance + shooting star rejection + bearish confirmation candle', () => {
    expect(detectSinyalPembalikan(cermin(hammerDiSupport()))).toEqual([
      {
        index: 11,
        rejectionIndex: 10,
        arah: 'JUAL',
        jenisPola: 'SHOOTING_STAR',
        pola: 'Shooting Star',
        emoji: '🌠',
        level: 110,
      },
    ]);
  });

  test('waits for the confirmation candle to close before signalling', () => {
    const candles = hammerDiSupport();
    expect(detectSinyalPembalikan(candles, candles.length - 1)).toEqual([]);
  });

  test('ignores a hammer that is far from any support', () => {
    const candles = hammerDiSupport();
    candles[10] = candle(10, 86.9, 87.5, 85.6, 87.3);
    candles[11] = candle(11, 87.3, 89.2, 87.2, 89);
    expect(detectSinyalPembalikan(candles)).toEqual([]);
  });
});
