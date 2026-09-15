export interface OhlcCandle {
  readonly openTime: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

/** Simple Moving Average; null sampai data cukup untuk satu periode penuh. */
export function sma(values: ReadonlyArray<number>, period: number): Array<number | null> {
  const out: Array<number | null> = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

/** RSI dengan smoothing Wilder (sama seperti RSI bawaan TradingView). */
export function rsi(closes: ReadonlyArray<number>, period = 14): Array<number | null> {
  const out: Array<number | null> = closes.map(() => null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i]! - closes[i - 1]!;
    if (change >= 0) gain += change;
    else loss -= change;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const toRsi = (): number => (avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss));
  out[period] = toRsi();
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    out[i] = toRsi();
  }
  return out;
}

export type ArahFvg = 'BULLISH' | 'BEARISH';

export interface FairValueGap {
  readonly arah: ArahFvg;
  /** Index candle pertama dari pola 3 candle (zona digambar mulai dari sini). */
  readonly startIndex: number;
  readonly top: number;
  readonly bottom: number;
  /** Index candle yang menutup penuh gap, atau null bila gap masih terbuka. */
  readonly filledIndex: number | null;
}

/**
 * Fair Value Gap 3 candle: bullish bila low candle ke-3 di atas high candle ke-1,
 * bearish bila high candle ke-3 di bawah low candle ke-1. Gap lebih kecil dari
 * `minGapRatio` × harga diabaikan supaya grafik tidak penuh gap receh.
 */
export function detectFvg(candles: ReadonlyArray<OhlcCandle>, minGapRatio = 0.0002): FairValueGap[] {
  const gaps: FairValueGap[] = [];
  for (let i = 2; i < candles.length; i++) {
    const first = candles[i - 2]!;
    const third = candles[i]!;
    const minGap = third.close * minGapRatio;
    let gap: { arah: ArahFvg; top: number; bottom: number } | null = null;
    if (third.low - first.high > minGap) {
      gap = { arah: 'BULLISH', top: third.low, bottom: first.high };
    } else if (first.low - third.high > minGap) {
      gap = { arah: 'BEARISH', top: first.low, bottom: third.high };
    }
    if (!gap) continue;

    let filledIndex: number | null = null;
    for (let j = i + 1; j < candles.length; j++) {
      const c = candles[j]!;
      if ((gap.arah === 'BULLISH' && c.low <= gap.bottom) || (gap.arah === 'BEARISH' && c.high >= gap.top)) {
        filledIndex = j;
        break;
      }
    }
    gaps.push({ ...gap, startIndex: i - 2, filledIndex });
  }
  return gaps;
}

export type ArahSinyal = 'BELI' | 'JUAL';

export interface SinyalPembalikan {
  readonly index: number;
  readonly arah: ArahSinyal;
  readonly pola: string;
}

const SWING_LOOKBACK = 10;
const RSI_BELI_MAKS = 45;
const RSI_JUAL_MIN = 55;
const JARAK_SINYAL_MIN = 3;

function body(c: OhlcCandle): number {
  return Math.abs(c.close - c.open);
}

function polaBullish(prev: OhlcCandle, curr: OhlcCandle): string | null {
  const b = body(curr);
  if (prev.close < prev.open && curr.close > curr.open && curr.close >= prev.open && curr.open <= prev.close) {
    return 'Bullish Engulfing';
  }
  const lowerWick = Math.min(curr.open, curr.close) - curr.low;
  const upperWick = curr.high - Math.max(curr.open, curr.close);
  if (b > 0 && lowerWick >= 2 * b && upperWick <= b) return 'Hammer';
  return null;
}

function polaBearish(prev: OhlcCandle, curr: OhlcCandle): string | null {
  const b = body(curr);
  if (prev.close > prev.open && curr.close < curr.open && curr.close <= prev.open && curr.open >= prev.close) {
    return 'Bearish Engulfing';
  }
  const lowerWick = Math.min(curr.open, curr.close) - curr.low;
  const upperWick = curr.high - Math.max(curr.open, curr.close);
  if (b > 0 && upperWick >= 2 * b && lowerWick <= b) return 'Shooting Star';
  return null;
}

/**
 * Sinyal pembalikan arah: pola candle pembalikan (engulfing / hammer / shooting
 * star) yang muncul tepat di swing low/high 10 candle terakhir dan dikonfirmasi
 * RSI (≤45 untuk beli, ≥55 untuk jual). Sinyal searah yang berdekatan (<3 candle)
 * digabung. `closedCount` membatasi analisa ke candle yang sudah tertutup.
 */
export function detectSinyalPembalikan(
  candles: ReadonlyArray<OhlcCandle>,
  rsiValues: ReadonlyArray<number | null>,
  closedCount: number = candles.length,
): SinyalPembalikan[] {
  const sinyal: SinyalPembalikan[] = [];
  const last = Math.min(closedCount, candles.length);
  for (let i = SWING_LOOKBACK; i < last; i++) {
    const prev = candles[i - 1]!;
    const curr = candles[i]!;
    const window = candles.slice(i - SWING_LOOKBACK, i + 1);
    const r = Math.min(rsiValues[i] ?? Infinity, rsiValues[i - 1] ?? Infinity);
    const rMax = Math.max(rsiValues[i] ?? -Infinity, rsiValues[i - 1] ?? -Infinity);

    const lowest = Math.min(...window.map((c) => c.low));
    const highest = Math.max(...window.map((c) => c.high));
    const polaBeli = polaBullish(prev, curr);
    const polaJual = polaBearish(prev, curr);

    let kandidat: SinyalPembalikan | null = null;
    if (polaBeli && Math.min(prev.low, curr.low) <= lowest && r <= RSI_BELI_MAKS) {
      kandidat = { index: i, arah: 'BELI', pola: polaBeli };
    } else if (polaJual && Math.max(prev.high, curr.high) >= highest && rMax >= RSI_JUAL_MIN) {
      kandidat = { index: i, arah: 'JUAL', pola: polaJual };
    }
    if (!kandidat) continue;

    const sebelumnya = sinyal[sinyal.length - 1];
    if (sebelumnya && sebelumnya.arah === kandidat.arah && i - sebelumnya.index < JARAK_SINYAL_MIN) continue;
    sinyal.push(kandidat);
  }
  return sinyal;
}
