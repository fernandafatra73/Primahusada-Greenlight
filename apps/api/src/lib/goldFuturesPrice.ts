export interface GoldFuturesPrice {
  readonly price: number;
  readonly updatedAt: string;
  /** Nama sumber untuk ditampilkan di UI, supaya labelnya ikut berubah kalau
   * sumber datanya diganti lagi dan tidak perlu diperbarui manual. */
  readonly sumber: string;
}

interface YahooQuoteResponse {
  readonly chart?: {
    readonly result?: readonly {
      readonly meta?: {
        readonly regularMarketPrice?: number;
        readonly regularMarketTime?: number;
      };
    }[];
    readonly error?: { readonly description?: string } | null;
  };
}

const SUMBER = 'Emas Berjangka COMEX (GC=F)';

/** Harga emas berjangka COMEX untuk kartu harga live di halaman Trading
 * XAU/USD. Sebelumnya memakai PAXGUSDT dari Binance, tapi Binance diblokir
 * dari jaringan Indonesia sehingga kartunya tidak pernah muncul. Yahoo
 * Finance dipakai karena tembus, gratis, dan tanpa API key — sama seperti
 * sumber candle di marketCandles.ts. */
export async function fetchGoldFuturesPrice(): Promise<GoldFuturesPrice> {
  const res = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=15m&range=1d',
    {
      signal: AbortSignal.timeout(10_000),
      // Yahoo menolak permintaan tanpa User-Agent browser.
      headers: { 'User-Agent': 'Mozilla/5.0' },
    },
  );
  if (!res.ok) {
    throw new Error(`Yahoo Finance merespons status ${res.status}`);
  }

  const data = (await res.json()) as YahooQuoteResponse;
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error(
      data.chart?.error?.description ?? 'Yahoo Finance tidak mengembalikan harga emas berjangka',
    );
  }

  // regularMarketTime adalah waktu kutipan harga yang sebenarnya (epoch
  // detik); lebih jujur daripada memakai jam server saat request.
  const updatedAt = meta?.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();

  return { price, updatedAt, sumber: SUMBER };
}
