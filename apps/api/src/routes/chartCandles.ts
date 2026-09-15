import type { FastifyInstance } from 'fastify';
import type { Candle } from '../lib/candlePatterns.js';
import { fetchYahooCandles } from '../lib/marketCandles.js';

/** Interval grafik yang didukung, dipetakan ke rentang data Yahoo yang cukup
 * untuk MA 50 + RSI 14 dengan ruang tampil ~150 candle. */
const CHART_INTERVALS = {
  '1m': { range: '1d', minutes: 1 },
  '5m': { range: '5d', minutes: 5 },
  '15m': { range: '5d', minutes: 15 },
  '30m': { range: '1mo', minutes: 30 },
  '1h': { range: '1mo', minutes: 60 },
} as const;

type ChartInterval = keyof typeof CHART_INTERVALS;

function isChartInterval(value: string): value is ChartInterval {
  return Object.hasOwn(CHART_INTERVALS, value);
}

/** Emas diambil dari futures COMEX (GC=F) — mengikuti XAU/USD spot, selisih beberapa dolar. */
const GOLD_YAHOO_SYMBOL = 'GC=F';
const MAX_CANDLES = 220;
/** Grafik di-refresh tiap menit oleh banyak tab; cache singkat mencegah Yahoo dipanggil berulang. */
const CACHE_MS = 20_000;

const cache = new Map<ChartInterval, { readonly at: number; readonly candles: readonly Candle[] }>();

export async function registerChartCandlesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { interval?: string } }>('/api/chart-candles/xauusd', async (req, reply) => {
    const interval = req.query.interval ?? '5m';
    if (!isChartInterval(interval)) {
      return reply.status(400).send({ error: `interval wajib salah satu dari: ${Object.keys(CHART_INTERVALS).join(', ')}` });
    }

    const cached = cache.get(interval);
    let candles: readonly Candle[];
    if (cached && Date.now() - cached.at < CACHE_MS) {
      candles = cached.candles;
    } else {
      try {
        candles = (await fetchYahooCandles(GOLD_YAHOO_SYMBOL, interval, CHART_INTERVALS[interval].range)).slice(
          -MAX_CANDLES,
        );
      } catch (err) {
        req.log.error(err, 'Gagal mengambil candle grafik XAU/USD');
        return reply.status(502).send({
          error: err instanceof Error ? `Gagal mengambil data grafik: ${err.message}` : 'Gagal mengambil data grafik',
        });
      }
      cache.set(interval, { at: Date.now(), candles });
    }

    return {
      symbol: GOLD_YAHOO_SYMBOL,
      interval,
      intervalMinutes: CHART_INTERVALS[interval].minutes,
      candles,
    };
  });
}
