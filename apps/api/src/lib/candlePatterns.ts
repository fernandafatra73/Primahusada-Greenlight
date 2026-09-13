/** Satu candle OHLC yang sudah tertutup (closed). `openTime` adalah waktu
 * pembukaan candle dalam epoch milidetik UTC. */
export interface Candle {
  readonly openTime: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

export type PatternDirection = 'BULLISH' | 'BEARISH' | 'NETRAL';

export interface DetectedPattern {
  readonly nama: string;
  readonly emoji: string;
  readonly arah: PatternDirection;
  readonly keterangan: string;
}

export type TrendDirection = 'NAIK' | 'TURUN' | 'SIDEWAYS';

export interface MarketContext {
  readonly trend: TrendDirection;
  readonly support: number | null;
  readonly resistance: number | null;
  readonly hargaTerakhir: number;
}

export interface CandleAnalysis {
  readonly patterns: readonly DetectedPattern[];
  readonly context: MarketContext;
}

/** Ambang batas deteksi. Dikumpulkan di satu tempat supaya gampang disetel
 * ulang tanpa mengubah logika di bawahnya. */
const DOJI_BODY_RATIO = 0.1;
const WICK_BODY_MULTIPLIER = 2;
const STAR_SMALL_BODY_RATIO = 0.5;
const BREAKOUT_LOOKBACK = 20;
const SWING_LOOKBACK = 30;
const SWING_NEIGHBOURS = 2;
const TREND_SHORT_PERIOD = 10;
const TREND_LONG_PERIOD = 30;
const TREND_FLAT_THRESHOLD = 0.001;
const NEAR_LEVEL_RATIO = 0.005;

function body(c: Candle): number {
  return Math.abs(c.close - c.open);
}

function range(c: Candle): number {
  return c.high - c.low;
}

function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low;
}

/** Harga desimal bikin perbandingan body vs ekor meleset tipis (mis. ekor
 * 0.10000000000002 vs body 0.09999999999999 yang seharusnya sama). Toleransi
 * ini dibuat relatif terhadap rentang candle supaya berlaku sama untuk emas
 * (ribuan) maupun XRP (satuan). */
const FLOAT_TOLERANCE_RATIO = 1e-9;

function tolerance(c: Candle): number {
  return Math.max(range(c), Math.abs(c.close)) * FLOAT_TOLERANCE_RATIO;
}

function isBullish(c: Candle): boolean {
  return c.close > c.open;
}

function isBearish(c: Candle): boolean {
  return c.close < c.open;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function formatLevel(value: number): string {
  // Emas bergerak di ribuan, XRP di satuan — presisi disesuaikan supaya
  // angkanya tetap terbaca di kedua skala.
  return value >= 100 ? value.toFixed(2) : value.toFixed(4);
}

function detectEngulfing(prev: Candle, curr: Candle): DetectedPattern | null {
  if (body(prev) === 0 || body(curr) === 0) return null;

  if (isBearish(prev) && isBullish(curr) && curr.open <= prev.close && curr.close >= prev.open) {
    return {
      nama: 'Bullish Engulfing',
      emoji: '🕯️',
      arah: 'BULLISH',
      keterangan: 'Candle naik menelan penuh body candle turun sebelumnya — tekanan beli menguat.',
    };
  }

  if (isBullish(prev) && isBearish(curr) && curr.open >= prev.close && curr.close <= prev.open) {
    return {
      nama: 'Bearish Engulfing',
      emoji: '🕯️',
      arah: 'BEARISH',
      keterangan: 'Candle turun menelan penuh body candle naik sebelumnya — tekanan jual menguat.',
    };
  }

  return null;
}

function detectHammer(curr: Candle): DetectedPattern | null {
  const b = body(curr);
  if (b === 0 || range(curr) === 0) return null;
  const t = tolerance(curr);
  if (lowerWick(curr) >= WICK_BODY_MULTIPLIER * b - t && upperWick(curr) <= b + t) {
    return {
      nama: 'Hammer',
      emoji: '🔨',
      arah: 'BULLISH',
      keterangan: 'Ekor bawah panjang — harga sempat ditekan turun lalu dibeli balik.',
    };
  }
  return null;
}

function detectShootingStar(curr: Candle): DetectedPattern | null {
  const b = body(curr);
  if (b === 0 || range(curr) === 0) return null;
  const t = tolerance(curr);
  if (upperWick(curr) >= WICK_BODY_MULTIPLIER * b - t && lowerWick(curr) <= b + t) {
    return {
      nama: 'Shooting Star',
      emoji: '🌠',
      arah: 'BEARISH',
      keterangan: 'Ekor atas panjang — harga sempat naik lalu dijual balik.',
    };
  }
  return null;
}

function detectStar(first: Candle, middle: Candle, last: Candle): DetectedPattern | null {
  const firstBody = body(first);
  const middleBody = body(middle);
  if (firstBody === 0) return null;
  if (middleBody > firstBody * STAR_SMALL_BODY_RATIO) return null;

  const firstMidpoint = (first.open + first.close) / 2;

  if (isBearish(first) && isBullish(last) && last.close > firstMidpoint) {
    return {
      nama: 'Morning Star',
      emoji: '🌅',
      arah: 'BULLISH',
      keterangan: 'Tiga candle: turun besar, ragu-ragu, lalu naik kuat — potensi pembalikan ke atas.',
    };
  }

  if (isBullish(first) && isBearish(last) && last.close < firstMidpoint) {
    return {
      nama: 'Evening Star',
      emoji: '🌆',
      arah: 'BEARISH',
      keterangan: 'Tiga candle: naik besar, ragu-ragu, lalu turun kuat — potensi pembalikan ke bawah.',
    };
  }

  return null;
}

function detectDoji(curr: Candle): DetectedPattern | null {
  const r = range(curr);
  if (r === 0) return null;
  if (body(curr) / r <= DOJI_BODY_RATIO) {
    return {
      nama: 'Doji',
      emoji: '➕',
      arah: 'NETRAL',
      keterangan: 'Harga buka dan tutup hampir sama — pasar ragu-ragu, arah belum jelas.',
    };
  }
  return null;
}

function detectInsideBar(prev: Candle, curr: Candle): DetectedPattern | null {
  if (curr.high <= prev.high && curr.low >= prev.low) {
    return {
      nama: 'Inside Bar',
      emoji: '📦',
      arah: 'NETRAL',
      keterangan: 'Seluruh pergerakan berada di dalam rentang candle sebelumnya — pasar sedang menahan diri.',
    };
  }
  return null;
}

function detectBreakout(history: readonly Candle[], curr: Candle): DetectedPattern | null {
  if (history.length < BREAKOUT_LOOKBACK) return null;
  const window = history.slice(-BREAKOUT_LOOKBACK);
  const tertinggi = Math.max(...window.map((c) => c.high));
  const terendah = Math.min(...window.map((c) => c.low));

  if (curr.close > tertinggi) {
    return {
      nama: 'Breakout',
      emoji: '🚀',
      arah: 'BULLISH',
      keterangan: `Tutup di atas puncak ${BREAKOUT_LOOKBACK} candle terakhir (${formatLevel(tertinggi)}).`,
    };
  }

  if (curr.close < terendah) {
    return {
      nama: 'Breakout',
      emoji: '🚀',
      arah: 'BEARISH',
      keterangan: `Tutup di bawah dasar ${BREAKOUT_LOOKBACK} candle terakhir (${formatLevel(terendah)}).`,
    };
  }

  return null;
}

/** Support/Resistance dicari dari swing point: titik yang lebih tinggi
 * (atau lebih rendah) dari beberapa candle di kiri dan kanannya. */
export function findSupportResistance(candles: readonly Candle[]): {
  support: number | null;
  resistance: number | null;
} {
  const window = candles.slice(-SWING_LOOKBACK);
  if (window.length < SWING_NEIGHBOURS * 2 + 1) {
    return { support: null, resistance: null };
  }

  const hargaAcuan = window[window.length - 1].close;
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = SWING_NEIGHBOURS; i < window.length - SWING_NEIGHBOURS; i++) {
    const titik = window[i];
    let tertinggi = true;
    let terendah = true;
    for (let j = i - SWING_NEIGHBOURS; j <= i + SWING_NEIGHBOURS; j++) {
      if (j === i) continue;
      if (window[j].high >= titik.high) tertinggi = false;
      if (window[j].low <= titik.low) terendah = false;
    }
    if (tertinggi) swingHighs.push(titik.high);
    if (terendah) swingLows.push(titik.low);
  }

  // Resistance = swing high terdekat di atas harga, support = swing low
  // terdekat di bawah harga.
  const resistanceKandidat = swingHighs.filter((h) => h > hargaAcuan).sort((a, b) => a - b);
  const supportKandidat = swingLows.filter((l) => l < hargaAcuan).sort((a, b) => b - a);

  return {
    resistance: resistanceKandidat[0] ?? null,
    support: supportKandidat[0] ?? null,
  };
}

/** Trend ditentukan dari selisih rata-rata harga jangka pendek vs jangka
 * panjang, dinormalkan terhadap harga supaya ambangnya berlaku sama untuk
 * emas (ribuan) maupun XRP (satuan). */
export function detectTrend(candles: readonly Candle[]): TrendDirection {
  if (candles.length < TREND_LONG_PERIOD) return 'SIDEWAYS';
  const closes = candles.map((c) => c.close);
  const shortAvg = average(closes.slice(-TREND_SHORT_PERIOD));
  const longAvg = average(closes.slice(-TREND_LONG_PERIOD));
  if (longAvg === 0) return 'SIDEWAYS';

  const selisih = (shortAvg - longAvg) / longAvg;
  if (selisih > TREND_FLAT_THRESHOLD) return 'NAIK';
  if (selisih < -TREND_FLAT_THRESHOLD) return 'TURUN';
  return 'SIDEWAYS';
}

/** Analisa candle terakhir yang sudah tertutup. `candles` harus urut dari
 * paling lama ke paling baru dan hanya berisi candle yang sudah closed. */
export function analyzeCandles(candles: readonly Candle[]): CandleAnalysis {
  if (candles.length === 0) {
    throw new Error('analyzeCandles membutuhkan minimal satu candle');
  }

  const curr = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const beforePrev = candles[candles.length - 3];
  const patterns: DetectedPattern[] = [];

  if (prev) {
    const engulfing = detectEngulfing(prev, curr);
    if (engulfing) patterns.push(engulfing);

    const insideBar = detectInsideBar(prev, curr);
    if (insideBar) patterns.push(insideBar);
  }

  const hammer = detectHammer(curr);
  if (hammer) patterns.push(hammer);

  const shootingStar = detectShootingStar(curr);
  if (shootingStar) patterns.push(shootingStar);

  if (prev && beforePrev) {
    const star = detectStar(beforePrev, prev, curr);
    if (star) patterns.push(star);
  }

  const doji = detectDoji(curr);
  if (doji) patterns.push(doji);

  const breakout = detectBreakout(candles.slice(0, -1), curr);
  if (breakout) patterns.push(breakout);

  const { support, resistance } = findSupportResistance(candles);

  return {
    patterns,
    context: {
      trend: detectTrend(candles),
      support,
      resistance,
      hargaTerakhir: curr.close,
    },
  };
}

/** True kalau harga sudah sangat dekat (atau menembus) level yang dipantau —
 * dipakai untuk menandai alert "harga menyentuh Support/Resistance". */
export function isNearLevel(harga: number, level: number | null): boolean {
  if (level === null || level === 0) return false;
  return Math.abs(harga - level) / level <= NEAR_LEVEL_RATIO;
}

export { formatLevel };
