import type { Candle } from './candlePatterns.js';

export type Timeframe = '15m' | '30m' | '1h' | '4h';

export const TIMEFRAMES: readonly Timeframe[] = ['15m', '30m', '1h', '4h'];

export const TIMEFRAME_MINUTES: Readonly<Record<Timeframe, number>> = {
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
};

export interface WatchedSymbol {
  /** Kode pendek untuk pesan Telegram dan kunci dedup. */
  readonly kode: string;
  readonly label: string;
  readonly yahoo: string;
  readonly twelveData: string;
  /** False untuk emas: pasarnya tutup akhir pekan. */
  readonly pasar24Jam: boolean;
}

/** Binance/OKX/Bybit diblokir dari jaringan Indonesia, jadi emas diambil dari
 * Yahoo lewat GC=F (futures emas COMEX) yang pergerakannya mengikuti XAU/USD
 * spot. Kalau Twelve Data dikonfigurasi, cadangannya memakai XAU/USD spot
 * yang sebenarnya. */
export const WATCHLIST: readonly WatchedSymbol[] = [
  {
    kode: 'XAUUSD',
    label: 'XAU/USD (Emas)',
    yahoo: 'GC=F',
    twelveData: 'XAU/USD',
    pasar24Jam: false,
  },
  {
    kode: 'XRP',
    label: 'XRP/USD',
    yahoo: 'XRP-USD',
    twelveData: 'XRP/USD',
    pasar24Jam: true,
  },
];

const YAHOO_RANGE: Readonly<Record<Timeframe, string>> = {
  '15m': '5d',
  '30m': '1mo',
  '1h': '1mo',
  '4h': '3mo',
};

const TWELVE_DATA_INTERVAL: Readonly<Record<Timeframe, string>> = {
  '15m': '15min',
  '30m': '30min',
  '1h': '1h',
  '4h': '4h',
};

const FETCH_TIMEOUT_MS = 15_000;
const TWELVE_DATA_OUTPUT_SIZE = 120;

interface YahooChartResponse {
  readonly chart?: {
    readonly result?: readonly {
      readonly timestamp?: readonly number[];
      readonly indicators?: {
        readonly quote?: readonly {
          readonly open?: readonly (number | null)[];
          readonly high?: readonly (number | null)[];
          readonly low?: readonly (number | null)[];
          readonly close?: readonly (number | null)[];
        }[];
      };
    }[];
    readonly error?: { readonly description?: string } | null;
  };
}

interface TwelveDataResponse {
  readonly status?: string;
  readonly message?: string;
  readonly values?: readonly {
    readonly datetime?: string;
    readonly open?: string;
    readonly high?: string;
    readonly low?: string;
    readonly close?: string;
  }[];
}

/** Buang candle yang belum tertutup. Pola candle baru final setelah candle
 * ditutup — menganalisa candle berjalan bikin sinyal berubah-ubah (repaint). */
function onlyClosed(candles: readonly Candle[], timeframe: Timeframe, now: number): Candle[] {
  const durasiMs = TIMEFRAME_MINUTES[timeframe] * 60_000;
  return candles.filter((c) => c.openTime + durasiMs <= now);
}

async function fetchFromYahoo(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  return fetchYahooCandles(symbol, timeframe, YAHOO_RANGE[timeframe]);
}

/** Candle mentah dari Yahoo (termasuk candle yang masih berjalan). `interval`
 * dan `range` memakai format Yahoo, mis. "5m" dan "5d". */
export async function fetchYahooCandles(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    // Yahoo menolak permintaan tanpa User-Agent browser.
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance merespons status ${res.status}`);
  }

  const data = (await res.json()) as YahooChartResponse;
  const hasil = data.chart?.result?.[0];
  if (!hasil) {
    throw new Error(data.chart?.error?.description ?? `Yahoo Finance tidak punya data untuk ${symbol}`);
  }

  const waktu = hasil.timestamp ?? [];
  const quote = hasil.indicators?.quote?.[0];
  if (!quote) {
    throw new Error(`Yahoo Finance tidak mengembalikan OHLC untuk ${symbol}`);
  }

  const candles: Candle[] = [];
  for (let i = 0; i < waktu.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    // Yahoo menyisipkan null pada jam pasar yang kosong.
    if (
      typeof open !== 'number' ||
      typeof high !== 'number' ||
      typeof low !== 'number' ||
      typeof close !== 'number'
    ) {
      continue;
    }
    candles.push({ openTime: waktu[i] * 1000, open, high, low, close });
  }
  return candles;
}

async function fetchFromTwelveData(
  symbol: string,
  timeframe: Timeframe,
  apiKey: string,
): Promise<Candle[]> {
  const url =
    'https://api.twelvedata.com/time_series' +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${TWELVE_DATA_INTERVAL[timeframe]}` +
    `&outputsize=${TWELVE_DATA_OUTPUT_SIZE}` +
    '&timezone=UTC' +
    `&apikey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const data = (await res.json()) as TwelveDataResponse;
  if (data.status === 'error' || !data.values) {
    throw new Error(data.message ?? `Twelve Data tidak punya data untuk ${symbol}`);
  }

  const candles: Candle[] = [];
  // Twelve Data mengirim dari yang terbaru; dibalik supaya urut kronologis.
  for (const nilai of [...data.values].reverse()) {
    const openTime = Date.parse(`${nilai.datetime?.replace(' ', 'T')}Z`);
    const open = Number(nilai.open);
    const high = Number(nilai.high);
    const low = Number(nilai.low);
    const close = Number(nilai.close);
    if (
      !Number.isFinite(openTime) ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }
    candles.push({ openTime, open, high, low, close });
  }
  return candles;
}

export interface FetchCandlesResult {
  readonly candles: readonly Candle[];
  readonly sumber: 'yahoo' | 'twelvedata';
}

/** Ambil candle yang sudah tertutup. Yahoo dipakai lebih dulu karena gratis
 * tanpa API key; kalau gagal dan TWELVE_DATA_API_KEY tersedia, dicoba ulang
 * lewat Twelve Data. Melempar error kalau dua-duanya gagal. */
export async function fetchClosedCandles(
  symbol: WatchedSymbol,
  timeframe: Timeframe,
  now: number = Date.now(),
): Promise<FetchCandlesResult> {
  let yahooError: unknown;
  try {
    const candles = onlyClosed(await fetchFromYahoo(symbol.yahoo, timeframe), timeframe, now);
    if (candles.length > 0) {
      return { candles, sumber: 'yahoo' };
    }
    yahooError = new Error('Yahoo Finance tidak mengembalikan candle yang sudah tertutup');
  } catch (err) {
    yahooError = err;
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      `Gagal mengambil candle ${symbol.kode} ${timeframe} dari Yahoo dan TWELVE_DATA_API_KEY belum diset`,
      { cause: yahooError },
    );
  }

  try {
    const candles = onlyClosed(
      await fetchFromTwelveData(symbol.twelveData, timeframe, apiKey),
      timeframe,
      now,
    );
    if (candles.length === 0) {
      throw new Error('Twelve Data tidak mengembalikan candle yang sudah tertutup');
    }
    return { candles, sumber: 'twelvedata' };
  } catch (err) {
    throw new Error(
      `Gagal mengambil candle ${symbol.kode} ${timeframe} dari Yahoo maupun Twelve Data`,
      { cause: err },
    );
  }
}

/** Pasar emas (XAU/USD) tutup akhir pekan: buka Minggu ~22:00 UTC dan tutup
 * Jumat ~22:00 UTC. Di luar jam itu candle-nya kosong atau menyisakan gap,
 * jadi analisanya dilewati. */
export function isGoldMarketOpen(now: Date = new Date()): boolean {
  const hari = now.getUTCDay();
  const jam = now.getUTCHours();
  if (hari === 6) return false;
  if (hari === 0) return jam >= 22;
  if (hari === 5) return jam < 22;
  return true;
}

export function isMarketOpen(symbol: WatchedSymbol, now: Date = new Date()): boolean {
  return symbol.pasar24Jam ? true : isGoldMarketOpen(now);
}
