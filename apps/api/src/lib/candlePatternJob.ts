import type { FastifyInstance } from 'fastify';
import type { CandleAnalysis, DetectedPattern } from './candlePatterns.js';
import { analyzeCandles, formatLevel, isNearLevel } from './candlePatterns.js';
import type { Timeframe, WatchedSymbol } from './marketCandles.js';
import {
  TIMEFRAMES,
  TIMEFRAME_MINUTES,
  WATCHLIST,
  fetchClosedCandles,
  isMarketOpen,
} from './marketCandles.js';
import { prisma } from './prisma.js';
import type { TelegramConfig } from './telegramNotifier.js';
import { readTelegramConfig, sendTelegramMessage } from './telegramNotifier.js';

/** Jeda setelah candle tutup sebelum data ditarik — memberi waktu penyedia
 * data menyelesaikan candle terakhirnya. */
const CLOSE_BUFFER_MS = 20_000;
/** Jejak dedup lebih tua dari ini dibersihkan supaya tabelnya tidak menumpuk. */
const ALERT_RETENTION_DAYS = 14;

const TIMEFRAME_LABEL: Readonly<Record<Timeframe, string>> = {
  '15m': '15 Menit',
  '30m': '30 Menit',
  '1h': '1 Jam',
  '4h': '4 Jam',
};

const TREND_EMOJI = { NAIK: '📈', TURUN: '📉', SIDEWAYS: '➡️' } as const;

function formatWaktuWib(epochMs: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(epochMs));
}

export function buildAlertMessage(
  symbol: WatchedSymbol,
  timeframe: Timeframe,
  analysis: CandleAnalysis,
  patterns: readonly DetectedPattern[],
  candleOpenMs: number,
  sumber: string,
): string {
  const { context } = analysis;
  const baris: string[] = [
    `🕯️ ${symbol.label} · ${TIMEFRAME_LABEL[timeframe]}`,
    '',
    `${TREND_EMOJI[context.trend]} Trend: ${context.trend}`,
    `💵 Harga tutup: ${formatLevel(context.hargaTerakhir)}`,
    '',
    'Pola terdeteksi:',
  ];

  for (const pola of patterns) {
    baris.push(`${pola.emoji} ${pola.nama} — ${pola.keterangan}`);
  }

  const levels: string[] = [];
  if (context.support !== null) {
    const dekat = isNearLevel(context.hargaTerakhir, context.support) ? ' (harga menyentuh!)' : '';
    levels.push(`Support ${formatLevel(context.support)}${dekat}`);
  }
  if (context.resistance !== null) {
    const dekat = isNearLevel(context.hargaTerakhir, context.resistance) ? ' (harga menyentuh!)' : '';
    levels.push(`Resistance ${formatLevel(context.resistance)}${dekat}`);
  }
  if (levels.length > 0) {
    baris.push('', `📏 ${levels.join(' · ')}`);
  }

  baris.push(
    '',
    `🕐 Candle dibuka: ${formatWaktuWib(candleOpenMs)} WIB`,
    `📡 Sumber: ${sumber}`,
    '',
    '⚠️ Analisa teknikal otomatis, bukan rekomendasi finansial.',
  );

  return baris.join('\n');
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002';
}

/** Simpan pola yang belum pernah dikirim untuk candle ini. Mengembalikan
 * hanya pola yang baru — mengandalkan unique constraint di CandleAlert
 * supaya tetap benar walau dua proses berjalan bersamaan. */
async function claimNewPatterns(
  symbol: WatchedSymbol,
  timeframe: Timeframe,
  candleOpen: Date,
  patterns: readonly DetectedPattern[],
): Promise<DetectedPattern[]> {
  const baru: DetectedPattern[] = [];
  for (const pola of patterns) {
    try {
      await prisma.candleAlert.create({
        data: { symbol: symbol.kode, timeframe, candleOpen, pola: pola.nama },
      });
      baru.push(pola);
    } catch (err) {
      // P2002 = melanggar unique constraint, artinya pola ini memang sudah
      // pernah dikirim untuk candle tsb. Error lain (mis. database mati)
      // harus naik ke atas, bukan diperlakukan sebagai duplikat — kalau
      // ditelan, alert bisa berhenti diam-diam tanpa ada yang tahu.
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
  return baru;
}

async function runForSymbol(
  app: FastifyInstance,
  config: TelegramConfig,
  symbol: WatchedSymbol,
  timeframe: Timeframe,
): Promise<void> {
  if (!isMarketOpen(symbol)) {
    app.log.debug({ symbol: symbol.kode, timeframe }, 'Pasar tutup, analisa candle dilewati');
    return;
  }

  const { candles, sumber } = await fetchClosedCandles(symbol, timeframe);
  const analysis = analyzeCandles(candles);
  if (analysis.patterns.length === 0) return;

  const terakhir = candles[candles.length - 1];
  const polaBaru = await claimNewPatterns(
    symbol,
    timeframe,
    new Date(terakhir.openTime),
    analysis.patterns,
  );
  if (polaBaru.length === 0) return;

  await sendTelegramMessage(
    config,
    buildAlertMessage(symbol, timeframe, analysis, polaBaru, terakhir.openTime, sumber),
  );
  app.log.info(
    { symbol: symbol.kode, timeframe, pola: polaBaru.map((p) => p.nama), sumber },
    'Alert pola candle terkirim',
  );
}

async function runTimeframe(
  app: FastifyInstance,
  config: TelegramConfig,
  timeframe: Timeframe,
): Promise<void> {
  for (const symbol of WATCHLIST) {
    try {
      await runForSymbol(app, config, symbol, timeframe);
    } catch (err) {
      // Satu simbol gagal (data provider down, rate limit) tidak boleh
      // menghentikan simbol lain atau menghentikan penjadwalan.
      app.log.warn({ err, symbol: symbol.kode, timeframe }, 'Analisa pola candle gagal');
    }
  }
}

async function cleanupOldAlerts(): Promise<void> {
  const batas = new Date(Date.now() - ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.candleAlert.deleteMany({ where: { createdAt: { lt: batas } } });
}

/** Jarak ke penutupan candle berikutnya. Batas candle dihitung dari epoch UTC
 * (sama seperti penyedia data), jadi candle 4 jam jatuh di 00:00, 04:00, dst. */
export function msUntilNextClose(
  timeframe: Timeframe,
  now: number = Date.now(),
  bufferMs: number = CLOSE_BUFFER_MS,
): number {
  const durasiMs = TIMEFRAME_MINUTES[timeframe] * 60_000;
  const closeBerikutnya = Math.floor(now / durasiMs) * durasiMs + durasiMs;
  return closeBerikutnya - now + bufferMs;
}

/** Pantau pola candle XAU/USD dan XRP di timeframe 15m/30m/1h/4h, lalu kirim
 * alert Telegram tiap kali ada pola baru pada candle yang baru tertutup.
 * Tidak berjalan kalau TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diset. */
export function startCandlePatternJob(app: FastifyInstance): void {
  const config = readTelegramConfig();
  if (!config) {
    app.log.info(
      'Job pola candle tidak aktif — set TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID untuk mengaktifkan',
    );
    return;
  }

  function jadwalkan(telegram: TelegramConfig, timeframe: Timeframe): void {
    setTimeout((): void => {
      void (async (): Promise<void> => {
        try {
          await runTimeframe(app, telegram, timeframe);
        } catch (err) {
          app.log.warn({ err, timeframe }, 'Job pola candle gagal, dicoba lagi candle berikutnya');
        }
        jadwalkan(telegram, timeframe);
      })();
    }, msUntilNextClose(timeframe));
  }

  for (const timeframe of TIMEFRAMES) {
    jadwalkan(config, timeframe);
  }

  void cleanupOldAlerts().catch((err: unknown) => {
    app.log.warn({ err }, 'Gagal membersihkan riwayat alert pola candle');
  });

  app.log.info(
    { symbol: WATCHLIST.map((s) => s.kode), timeframe: TIMEFRAMES },
    'Job pola candle aktif',
  );
}
