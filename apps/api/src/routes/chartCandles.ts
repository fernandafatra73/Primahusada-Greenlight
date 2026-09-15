import type { FastifyInstance } from 'fastify';
import type { Candle } from '../lib/candlePatterns.js';
import { fetchBinanceCandles, fetchYahooCandles } from '../lib/marketCandles.js';

/** Interval grafik yang didukung (format sama untuk Binance & Yahoo), dengan
 * rentang Yahoo cadangan yang cukup untuk MA 50 + RSI 14 dan ~150 candle tampil. */
const CHART_INTERVALS = {
  '1m': { yahooRange: '1d', minutes: 1 },
  '5m': { yahooRange: '5d', minutes: 5 },
  '15m': { yahooRange: '5d', minutes: 15 },
  '30m': { yahooRange: '1mo', minutes: 30 },
  '1h': { yahooRange: '1mo', minutes: 60 },
} as const;

type ChartInterval = keyof typeof CHART_INTERVALS;

function isChartInterval(value: string): value is ChartInterval {
  return Object.hasOwn(CHART_INTERVALS, value);
}

/** Harga emas disamakan dengan Binance (PAXG/USDT, token emas 1 troy ounce).
 * Yahoo GC=F (futures COMEX, bisa selisih puluhan dolar) hanya dipakai bila Binance gagal. */
const BINANCE_SYMBOL = 'PAXGUSDT';
const YAHOO_FALLBACK_SYMBOL = 'GC=F';
const MAX_CANDLES = 220;
/** Grafik di-refresh tiap menit oleh banyak tab; cache singkat mencegah sumber data dipanggil berulang. */
const CACHE_MS = 20_000;

interface ChartData {
  readonly at: number;
  readonly candles: readonly Candle[];
  readonly symbol: string;
  readonly sumber: 'binance' | 'yahoo';
}

const cache = new Map<ChartInterval, ChartData>();

export async function registerChartCandlesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { interval?: string } }>('/api/chart-candles/xauusd', async (req, reply) => {
    const interval = req.query.interval ?? '5m';
    if (!isChartInterval(interval)) {
      return reply.status(400).send({ error: `interval wajib salah satu dari: ${Object.keys(CHART_INTERVALS).join(', ')}` });
    }

    let chart = cache.get(interval);
    if (!chart || Date.now() - chart.at >= CACHE_MS) {
      try {
        const candles = await fetchBinanceCandles(BINANCE_SYMBOL, interval, MAX_CANDLES);
        if (candles.length === 0) throw new Error('Binance tidak mengembalikan candle');
        chart = { at: Date.now(), candles, symbol: BINANCE_SYMBOL, sumber: 'binance' };
      } catch (binanceErr) {
        req.log.warn(binanceErr, 'Candle Binance gagal; memakai cadangan Yahoo GC=F');
        try {
          const candles = (
            await fetchYahooCandles(YAHOO_FALLBACK_SYMBOL, interval, CHART_INTERVALS[interval].yahooRange)
          ).slice(-MAX_CANDLES);
          chart = { at: Date.now(), candles, symbol: YAHOO_FALLBACK_SYMBOL, sumber: 'yahoo' };
        } catch (err) {
          req.log.error(err, 'Gagal mengambil candle grafik XAU/USD');
          return reply.status(502).send({
            error: err instanceof Error ? `Gagal mengambil data grafik: ${err.message}` : 'Gagal mengambil data grafik',
          });
        }
      }
      cache.set(interval, chart);
    }

    return {
      symbol: chart.symbol,
      sumber: chart.sumber,
      interval,
      intervalMinutes: CHART_INTERVALS[interval].minutes,
      candles: chart.candles,
    };
  });
}
