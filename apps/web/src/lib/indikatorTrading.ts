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


export type ArahPola = 'BUY' | 'SELL';

export type JenisPola =
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'HAMMER'
  | 'SHOOTING_STAR'
  | 'MARUBOZU_BULLISH'
  | 'MARUBOZU_BEARISH'
  | 'MORNING_STAR'
  | 'EVENING_STAR'
  | 'THREE_WHITE_SOLDIERS'
  | 'THREE_BLACK_CROWS';

export interface InfoPola {
  readonly nama: string;
  readonly emoji: string;
  readonly arah: ArahPola;
  /** Label peluang seperti di panduan, mis. "peluang BUY" atau "SELL kuat". */
  readonly peluang: string;
  /** Pola rejection dipakai untuk sinyal BUY/SELL (butuh S/R + konfirmasi); pola momentum hanya penanda. */
  readonly rejection: boolean;
  readonly keterangan: string;
}

export const INFO_POLA: Readonly<Record<JenisPola, InfoPola>> = {
  BULLISH_ENGULFING: {
    nama: 'Bullish Engulfing',
    emoji: '🟢',
    arah: 'BUY',
    peluang: 'peluang BUY',
    rejection: true,
    keterangan: 'Candle hijau besar menutupi body candle merah sebelumnya — seller mulai kalah, buyer mengambil alih. Lebih bagus di support.',
  },
  BEARISH_ENGULFING: {
    nama: 'Bearish Engulfing',
    emoji: '🔴',
    arah: 'SELL',
    peluang: 'peluang SELL',
    rejection: true,
    keterangan: 'Candle merah besar menutupi body candle hijau sebelumnya — buyer mulai kalah, seller mengambil alih. Lebih bagus di resistance.',
  },
  HAMMER: {
    nama: 'Hammer',
    emoji: '🔨',
    arah: 'BUY',
    peluang: 'peluang BUY',
    rejection: true,
    keterangan: 'Body kecil dengan sumbu bawah panjang — harga sempat turun lalu dibeli kembali. Paling bagus setelah penurunan dan dekat support.',
  },
  SHOOTING_STAR: {
    nama: 'Shooting Star',
    emoji: '🌠',
    arah: 'SELL',
    peluang: 'peluang SELL',
    rejection: true,
    keterangan: 'Body kecil dengan sumbu atas panjang — harga sempat naik tetapi ditolak. Paling bagus setelah kenaikan dan dekat resistance.',
  },
  MARUBOZU_BULLISH: {
    nama: 'Marubozu Bullish',
    emoji: '🟩',
    arah: 'BUY',
    peluang: 'BUY kuat',
    rejection: false,
    keterangan: 'Candle hijau panjang dengan sumbu sangat kecil — tekanan buyer kuat. Jangan kejar harga; tunggu retracement bila candle sudah terlalu panjang.',
  },
  MARUBOZU_BEARISH: {
    nama: 'Marubozu Bearish',
    emoji: '🟥',
    arah: 'SELL',
    peluang: 'SELL kuat',
    rejection: false,
    keterangan: 'Candle merah panjang dengan sumbu sangat kecil — tekanan seller kuat.',
  },
  MORNING_STAR: {
    nama: 'Morning Star',
    emoji: '🌅',
    arah: 'BUY',
    peluang: 'potensi BUY',
    rejection: true,
    keterangan: 'Pola 3 candle pembalikan turun → naik: 🔴 → kecil → 🟢.',
  },
  EVENING_STAR: {
    nama: 'Evening Star',
    emoji: '🌆',
    arah: 'SELL',
    peluang: 'potensi SELL',
    rejection: true,
    keterangan: 'Pola 3 candle pembalikan naik → turun: 🟢 → kecil → 🔴.',
  },
  THREE_WHITE_SOLDIERS: {
    nama: 'Three White Soldiers',
    emoji: '💂',
    arah: 'BUY',
    peluang: 'BUY',
    rejection: false,
    keterangan: 'Tiga candle bullish berturut-turut dengan kenaikan cukup kuat — buyer sedang dominan.',
  },
  THREE_BLACK_CROWS: {
    nama: 'Three Black Crows',
    emoji: '🐦‍⬛',
    arah: 'SELL',
    peluang: 'SELL',
    rejection: false,
    keterangan: 'Tiga candle bearish berturut-turut — seller sedang dominan.',
  },
};

export interface PolaCandle {
  /** Index candle terakhir yang membentuk pola (untuk pola 3 candle: candle ke-3). */
  readonly index: number;
  readonly jenis: JenisPola;
}

const AVG_RANGE_PERIOD = 14;
const MARUBOZU_BODY_RATIO = 0.9;
const MARUBOZU_RANGE_MULTIPLIER = 1.5;
const STAR_SMALL_BODY_RATIO = 0.3;
const BIG_BODY_AVG_RATIO = 0.6;
const SOLDIER_BODY_AVG_RATIO = 0.5;

function body(c: OhlcCandle): number {
  return Math.abs(c.close - c.open);
}

function range(c: OhlcCandle): number {
  return c.high - c.low;
}

function upperWick(c: OhlcCandle): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerWick(c: OhlcCandle): number {
  return Math.min(c.open, c.close) - c.low;
}

function isBull(c: OhlcCandle): boolean {
  return c.close > c.open;
}

function isBear(c: OhlcCandle): boolean {
  return c.close < c.open;
}

/** Rata-rata rentang candle sebelum index i — patokan "besar/kecil" yang ikut volatilitas. */
function avgRange(candles: ReadonlyArray<OhlcCandle>, i: number): number {
  const from = Math.max(0, i - AVG_RANGE_PERIOD);
  const slice = candles.slice(from, i);
  if (slice.length === 0) return range(candles[i]!);
  return slice.reduce((sum, c) => sum + range(c), 0) / slice.length;
}

function polaDiIndex(candles: ReadonlyArray<OhlcCandle>, i: number): JenisPola[] {
  const c = candles[i]!;
  const p = candles[i - 1];
  const pp = candles[i - 2];
  const avg = avgRange(candles, i);
  const b = body(c);
  const hasil: JenisPola[] = [];

  if (p) {
    if (isBear(p) && isBull(c) && b > body(p) && c.close >= p.open && c.open <= p.close) hasil.push('BULLISH_ENGULFING');
    if (isBull(p) && isBear(c) && b > body(p) && c.close <= p.open && c.open >= p.close) hasil.push('BEARISH_ENGULFING');
  }

  if (b > 0 && range(c) > 0 && b <= range(c) * 0.35) {
    // Konteks tren: hammer setelah penurunan, shooting star setelah kenaikan.
    const ref = candles[i - 3];
    const setelahTurun = ref !== undefined && p !== undefined && p.close < ref.close;
    const setelahNaik = ref !== undefined && p !== undefined && p.close > ref.close;
    if (lowerWick(c) >= 2 * b && upperWick(c) <= b && setelahTurun) hasil.push('HAMMER');
    if (upperWick(c) >= 2 * b && lowerWick(c) <= b && setelahNaik) hasil.push('SHOOTING_STAR');
  }

  if (range(c) >= MARUBOZU_RANGE_MULTIPLIER * avg && b >= MARUBOZU_BODY_RATIO * range(c)) {
    hasil.push(isBull(c) ? 'MARUBOZU_BULLISH' : 'MARUBOZU_BEARISH');
  }

  if (p && pp) {
    const kecil = body(p) <= STAR_SMALL_BODY_RATIO * body(pp);
    const besar = body(pp) >= BIG_BODY_AVG_RATIO * avg;
    if (besar && kecil && isBear(pp) && isBull(c) && c.close >= (pp.open + pp.close) / 2) hasil.push('MORNING_STAR');
    if (besar && kecil && isBull(pp) && isBear(c) && c.close <= (pp.open + pp.close) / 2) hasil.push('EVENING_STAR');

    const tiga = [pp, p, c];
    const kuat = tiga.every((k) => body(k) >= SOLDIER_BODY_AVG_RATIO * avg);
    if (
      kuat &&
      tiga.every(isBull) &&
      p.close > pp.close &&
      c.close > p.close &&
      p.open >= pp.open &&
      p.open <= pp.close &&
      c.open >= p.open &&
      c.open <= p.close
    ) {
      hasil.push('THREE_WHITE_SOLDIERS');
    }
    if (
      kuat &&
      tiga.every(isBear) &&
      p.close < pp.close &&
      c.close < p.close &&
      p.open <= pp.open &&
      p.open >= pp.close &&
      c.open <= p.open &&
      c.open >= p.close
    ) {
      hasil.push('THREE_BLACK_CROWS');
    }
  }
  return hasil;
}

/** Semua pola dari panduan candle pada candle yang sudah tertutup (index < closedCount). */
export function detectPolaCandle(
  candles: ReadonlyArray<OhlcCandle>,
  closedCount: number = candles.length,
): PolaCandle[] {
  const hasil: PolaCandle[] = [];
  const last = Math.min(closedCount, candles.length);
  const sebelumnya = new Set<JenisPola>();
  for (let i = 0; i < last; i++) {
    const pola = polaDiIndex(candles, i);
    for (const jenis of pola) {
      // Three soldiers/crows yang berlanjut (4, 5 candle...) cukup ditandai sekali.
      if ((jenis === 'THREE_WHITE_SOLDIERS' || jenis === 'THREE_BLACK_CROWS') && sebelumnya.has(jenis)) continue;
      hasil.push({ index: i, jenis });
    }
    sebelumnya.clear();
    pola.forEach((j) => sebelumnya.add(j));
  }
  return hasil;
}

export interface LevelSR {
  readonly harga: number;
  readonly jenis: 'SUPPORT' | 'RESISTANCE';
  /** Index candle swing yang membentuk level. */
  readonly index: number;
}

const SWING_NEIGHBOURS = 2;
const SR_LOOKBACK = 80;

/**
 * Level support (swing low) & resistance (swing high) yang sudah terkonfirmasi
 * sebelum index `beforeIndex`: candle swing harus punya 2 candle di kiri & kanan.
 */
export function swingLevels(candles: ReadonlyArray<OhlcCandle>, beforeIndex: number = candles.length): LevelSR[] {
  const levels: LevelSR[] = [];
  const from = Math.max(SWING_NEIGHBOURS, beforeIndex - SR_LOOKBACK);
  for (let j = from; j + SWING_NEIGHBOURS < beforeIndex; j++) {
    const c = candles[j]!;
    let isLow = true;
    let isHigh = true;
    for (let k = j - SWING_NEIGHBOURS; k <= j + SWING_NEIGHBOURS; k++) {
      if (k === j) continue;
      const n = candles[k]!;
      if (n.low <= c.low) isLow = false;
      if (n.high >= c.high) isHigh = false;
    }
    if (isLow) levels.push({ harga: c.low, jenis: 'SUPPORT', index: j });
    if (isHigh) levels.push({ harga: c.high, jenis: 'RESISTANCE', index: j });
  }
  return levels;
}

/** Support terdekat di bawah & resistance terdekat di atas harga, untuk digambar di grafik. */
export function levelTerdekat(
  levels: ReadonlyArray<LevelSR>,
  harga: number,
  jumlah = 2,
): { readonly supports: LevelSR[]; readonly resistances: LevelSR[] } {
  const supports = levels
    .filter((l) => l.jenis === 'SUPPORT' && l.harga <= harga)
    .sort((a, b) => b.harga - a.harga)
    .slice(0, jumlah);
  const resistances = levels
    .filter((l) => l.jenis === 'RESISTANCE' && l.harga >= harga)
    .sort((a, b) => a.harga - b.harga)
    .slice(0, jumlah);
  return { supports, resistances };
}

export type ArahSinyal = 'BELI' | 'JUAL';

export interface SinyalPembalikan {
  /** Index candle konfirmasi — sinyal berlaku setelah candle ini tertutup. */
  readonly index: number;
  /** Index candle rejection (pola pembalikan) di support/resistance. */
  readonly rejectionIndex: number;
  readonly arah: ArahSinyal;
  readonly jenisPola: JenisPola;
  readonly pola: string;
  readonly emoji: string;
  /** Level support (BELI) atau resistance (JUAL) yang disentuh. */
  readonly level: number;
}

const JARAK_SINYAL_MIN = 3;
const SR_TOLERANCE_AVG_RATIO = 0.6;
const SR_TOLERANCE_PRICE_RATIO = 0.0005;

/** Level yang disentuh candle rejection: harga menyentuh level (dalam toleransi) atau menembusnya lalu ditutup kembali. */
function levelDisentuh(
  candles: ReadonlyArray<OhlcCandle>,
  r: number,
  arah: ArahPola,
): number | null {
  const c = candles[r]!;
  const tol = Math.max(SR_TOLERANCE_AVG_RATIO * avgRange(candles, r), c.close * SR_TOLERANCE_PRICE_RATIO);
  // Level harus terbentuk sebelum pola rejection dimulai (pola bisa sampai 3 candle).
  const levels = swingLevels(candles, r - 2);
  const awal = Math.max(0, r - 2);
  const bagianPola = candles.slice(awal, r + 1);
  if (arah === 'BUY') {
    const low = Math.min(...bagianPola.map((k) => k.low));
    const cocok = levels
      .filter((l) => l.jenis === 'SUPPORT')
      .filter((l) => Math.abs(low - l.harga) <= tol || (low < l.harga && c.close > l.harga))
      .sort((a, b) => Math.abs(low - a.harga) - Math.abs(low - b.harga));
    return cocok[0]?.harga ?? null;
  }
  const high = Math.max(...bagianPola.map((k) => k.high));
  const cocok = levels
    .filter((l) => l.jenis === 'RESISTANCE')
    .filter((l) => Math.abs(high - l.harga) <= tol || (high > l.harga && c.close < l.harga))
    .sort((a, b) => Math.abs(high - a.harga) - Math.abs(high - b.harga));
  return cocok[0]?.harga ?? null;
}

/**
 * Sinyal BUY/SELL mengikuti rumus:
 *   BUY  = Support + rejection bawah (Bullish Engulfing / Hammer / Morning Star) + candle konfirmasi bullish
 *   SELL = Resistance + rejection atas (Bearish Engulfing / Shooting Star / Evening Star) + candle konfirmasi bearish
 * Candle konfirmasi = candle sesudah rejection yang searah dan ditutup melewati close candle rejection.
 * Hanya candle tertutup (index < closedCount) yang dipakai; sinyal searah yang berdekatan (<3 candle) digabung.
 */
export function detectSinyalPembalikan(
  candles: ReadonlyArray<OhlcCandle>,
  closedCount: number = candles.length,
): SinyalPembalikan[] {
  const last = Math.min(closedCount, candles.length);
  const pola = detectPolaCandle(candles, last).filter((p) => INFO_POLA[p.jenis].rejection);
  const sinyal: SinyalPembalikan[] = [];
  for (const p of pola) {
    const k = p.index + 1;
    if (k >= last) continue;
    const info = INFO_POLA[p.jenis];
    const rejection = candles[p.index]!;
    const konfirmasi = candles[k]!;
    const konfirm =
      info.arah === 'BUY'
        ? isBull(konfirmasi) && konfirmasi.close > rejection.close
        : isBear(konfirmasi) && konfirmasi.close < rejection.close;
    if (!konfirm) continue;
    const level = levelDisentuh(candles, p.index, info.arah);
    if (level === null) continue;

    const arah: ArahSinyal = info.arah === 'BUY' ? 'BELI' : 'JUAL';
    const sebelumnya = sinyal[sinyal.length - 1];
    if (sebelumnya && sebelumnya.arah === arah && k - sebelumnya.index < JARAK_SINYAL_MIN) continue;
    if (sebelumnya && sebelumnya.index === k) continue;
    sinyal.push({
      index: k,
      rejectionIndex: p.index,
      arah,
      jenisPola: p.jenis,
      pola: info.nama,
      emoji: info.emoji,
      level,
    });
  }
  return sinyal;
}
