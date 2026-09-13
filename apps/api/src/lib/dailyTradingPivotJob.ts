import type { FastifyInstance } from 'fastify';
import { prisma } from './prisma.js';
import { fetchLatestXauDailyPoint } from './xausGoldPrice.js';

/** Sesuai permintaan: jalan otomatis tiap hari, berhenti sendiri setelah
 * 31 Desember 2026. */
const CUTOFF = new Date('2026-12-31T23:59:59+07:00');
const AUTO_TAG = '[Analisa Otomatis Harian]';
const RUN_HOUR = 7;
const RUN_MINUTE = 0;

export function computePivotLevels(high: number, low: number, close: number) {
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);

  let signal: 'BELI' | 'JUAL' | 'NETRAL' = 'NETRAL';
  let alasan = 'Harga penutupan berada di sekitar pivot, belum ada bias arah yang jelas.';
  if (close >= r1) {
    signal = 'JUAL';
    alasan = 'Harga penutupan sudah menyentuh/melewati resistance R1 — rawan koreksi turun.';
  } else if (close <= s1) {
    signal = 'BELI';
    alasan = 'Harga penutupan sudah menyentuh/melewati support S1 — berpotensi pantul naik.';
  } else if (close > pivot) {
    signal = 'BELI';
    alasan = 'Harga penutupan di atas pivot — bias jangka pendek cenderung bullish (naik).';
  } else if (close < pivot) {
    signal = 'JUAL';
    alasan = 'Harga penutupan di bawah pivot — bias jangka pendek cenderung bearish (turun).';
  }

  return { pivot, r1, r2, r3, s1, s2, s3, signal, alasan };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

async function alreadyRanToday(): Promise<boolean> {
  const existing = await prisma.tradingAnalisa.findFirst({
    where: {
      analisa: { startsWith: AUTO_TAG },
      tanggal: { gte: startOfToday(), lt: startOfTomorrow() },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function runDailyPivotJob(app: FastifyInstance): Promise<void> {
  if (await alreadyRanToday()) return;

  const point = await fetchLatestXauDailyPoint();
  if (!point) {
    app.log.warn('Job pivot harian XAU/USD: XAUS API tidak mengembalikan data');
    return;
  }

  const { pivot, r1, r2, r3, s1, s2, s3, signal, alasan } = computePivotLevels(
    point.high,
    point.low,
    point.close,
  );
  const analisa =
    `${AUTO_TAG} Sinyal: ${signal} — ${alasan} ` +
    `(H=${point.high}, L=${point.low}, C=${point.close} dari data tanggal ${point.date}, Pivot=${pivot.toFixed(2)}) ` +
    `Rencana: BELI di area Support (S1 ${s1.toFixed(2)}, S2 ${s2.toFixed(2)}, S3 ${s3.toFixed(2)}); ` +
    `JUAL di area Resistance (R1 ${r1.toFixed(2)}, R2 ${r2.toFixed(2)}, R3 ${r3.toFixed(2)}).`;

  await prisma.tradingAnalisa.create({
    data: {
      analisa,
      support: `S1 ${s1.toFixed(2)} · S2 ${s2.toFixed(2)} · S3 ${s3.toFixed(2)}`,
      resistance: `R1 ${r1.toFixed(2)} · R2 ${r2.toFixed(2)} · R3 ${r3.toFixed(2)}`,
    },
  });
  app.log.info({ signal, pivot: pivot.toFixed(2), sumberTanggal: point.date }, 'Job pivot harian XAU/USD tersimpan');
}

function msUntilNextRun(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), RUN_HOUR, RUN_MINUTE, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** Jadwalkan penghitungan ulang Pivot Point XAU/USD otomatis setiap hari jam
 * 07:00 WIB, memakai High/Low/Close hari terakhir yang tersedia dari
 * XAUS.com (gratis, tanpa API key). Hasilnya masuk ke jurnal "Analisa &
 * Level Sebelum Beli XAU" yang sama dengan yang diisi manual — ditandai
 * "[Analisa Otomatis Harian]" supaya bisa dibedakan. Berhenti sendiri
 * setelah 31 Desember 2026. */
export function startDailyTradingPivotJob(app: FastifyInstance): void {
  async function tick(): Promise<void> {
    if (new Date() > CUTOFF) {
      app.log.info('Job pivot harian XAU/USD berhenti — sudah melewati 31 Desember 2026');
      return;
    }
    try {
      await runDailyPivotJob(app);
    } catch (err) {
      app.log.warn({ err }, 'Job pivot harian XAU/USD gagal, dicoba lagi besok');
    }
    setTimeout(() => void tick(), msUntilNextRun());
  }

  // Jalankan sekali saat server baru nyala (catch-up untuk hari ini), lalu
  // jadwalkan tiap hari jam 07:00 berikutnya.
  void tick();
}
