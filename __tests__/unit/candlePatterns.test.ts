import { describe, expect, test } from 'vitest';
import {
  analyzeCandles,
  detectTrend,
  findSupportResistance,
  isNearLevel,
} from '../../apps/api/src/lib/candlePatterns.ts';
import type { Candle } from '../../apps/api/src/lib/candlePatterns.ts';
import { isGoldMarketOpen } from '../../apps/api/src/lib/marketCandles.ts';
import { msUntilNextClose } from '../../apps/api/src/lib/candlePatternJob.ts';

const MENIT = 60_000;

function candle(open: number, high: number, low: number, close: number, index = 0): Candle {
  return { openTime: index * 15 * MENIT, open, high, low, close };
}

/** Deretan candle netral sebagai latar: body cukup besar (bukan Doji), tinggi
 * dan rendahnya berselang-seling (bukan Inside Bar), dan mendatar (tanpa
 * trend maupun breakout). Dipakai supaya pola yang diuji benar-benar datang
 * dari candle di ujung, bukan dari latarnya. */
function latar(jumlah: number, harga = 100): Candle[] {
  return Array.from({ length: jumlah }, (_, i) => {
    const naik = i % 2 === 0;
    const jitter = (i % 3) * 0.1;
    const open = harga;
    const close = naik ? harga + 0.4 : harga - 0.4;
    const high = Math.max(open, close) + 0.2 + jitter;
    const low = Math.min(open, close) - 0.2 - jitter;
    return candle(open, high, low, close, i);
  });
}

function namaPola(candles: Candle[]): string[] {
  return analyzeCandles(candles).patterns.map((p) => p.nama);
}

describe('deteksi pola candle', () => {
  test('Bullish Engulfing: candle naik menelan body candle turun sebelumnya', () => {
    const candles = [...latar(5), candle(100, 100.5, 97, 97.5, 5), candle(97, 101.5, 96.5, 101, 6)];
    expect(namaPola(candles)).toContain('Bullish Engulfing');
  });

  test('Bearish Engulfing: candle turun menelan body candle naik sebelumnya', () => {
    const candles = [...latar(5), candle(97.5, 100.5, 97, 100, 5), candle(100.5, 101, 96, 96.5, 6)];
    expect(namaPola(candles)).toContain('Bearish Engulfing');
  });

  test('Engulfing tidak terdeteksi saat body candle kedua lebih pendek', () => {
    const candles = [...latar(5), candle(100, 100.5, 97, 97.5, 5), candle(98, 99, 97.8, 98.8, 6)];
    expect(namaPola(candles)).not.toContain('Bullish Engulfing');
  });

  test('Hammer: ekor bawah panjang, ekor atas pendek', () => {
    const candles = [...latar(5), candle(100, 100.2, 96, 100.1, 5)];
    expect(namaPola(candles)).toContain('Hammer');
  });

  test('Shooting Star: ekor atas panjang, ekor bawah pendek', () => {
    const candles = [...latar(5), candle(100, 104, 99.9, 100.1, 5)];
    expect(namaPola(candles)).toContain('Shooting Star');
  });

  test('Morning Star: turun besar, ragu-ragu, lalu naik melewati titik tengah', () => {
    const candles = [
      ...latar(5),
      candle(110, 110.5, 99.5, 100, 5),
      candle(99.5, 100.2, 99, 99.8, 6),
      candle(100, 107, 99.8, 106.5, 7),
    ];
    expect(namaPola(candles)).toContain('Morning Star');
  });

  test('Evening Star: naik besar, ragu-ragu, lalu turun melewati titik tengah', () => {
    const candles = [
      ...latar(5),
      candle(100, 110.5, 99.5, 110, 5),
      candle(110.2, 111, 110, 110.4, 6),
      candle(110, 110.2, 103, 103.5, 7),
    ];
    expect(namaPola(candles)).toContain('Evening Star');
  });

  test('Doji: body sangat kecil dibanding rentangnya', () => {
    const candles = [...latar(5), candle(100, 102, 98, 100.05, 5)];
    expect(namaPola(candles)).toContain('Doji');
  });

  test('Inside Bar: seluruh rentang berada di dalam candle sebelumnya', () => {
    const candles = [...latar(5), candle(100, 105, 95, 104, 5), candle(101, 103, 97, 99, 6)];
    expect(namaPola(candles)).toContain('Inside Bar');
  });

  test('Breakout ke atas saat tutup melewati puncak 20 candle terakhir', () => {
    const candles = [...latar(25), candle(100, 120, 99, 119, 25)];
    expect(namaPola(candles)).toContain('Breakout');
  });

  test('tidak ada breakout selama harga masih di dalam rentang', () => {
    const candles = [...latar(25), candle(100, 100.4, 99.7, 100.2, 25)];
    expect(namaPola(candles)).not.toContain('Breakout');
  });

  test('candle datar tanpa pola menghasilkan daftar kosong', () => {
    expect(analyzeCandles(latar(25)).patterns).toEqual([]);
  });

  test('analyzeCandles menolak input kosong', () => {
    expect(() => analyzeCandles([])).toThrow(/minimal satu candle/);
  });

  test('pola satu-candle tetap terdeteksi walau hanya ada satu candle', () => {
    expect(namaPola([candle(100, 100.2, 96, 100.1)])).toContain('Hammer');
  });
});

describe('trend dan level support/resistance', () => {
  test('trend NAIK saat rata-rata jangka pendek di atas jangka panjang', () => {
    const naik = Array.from({ length: 40 }, (_, i) => candle(100 + i, 100 + i, 100 + i, 100 + i, i));
    expect(detectTrend(naik)).toBe('NAIK');
  });

  test('trend TURUN saat rata-rata jangka pendek di bawah jangka panjang', () => {
    const turun = Array.from({ length: 40 }, (_, i) => candle(200 - i, 200 - i, 200 - i, 200 - i, i));
    expect(detectTrend(turun)).toBe('TURUN');
  });

  test('trend SIDEWAYS saat harga datar', () => {
    expect(detectTrend(latar(40))).toBe('SIDEWAYS');
  });

  test('trend SIDEWAYS saat data belum cukup panjang', () => {
    expect(detectTrend(latar(5))).toBe('SIDEWAYS');
  });

  test('support dan resistance diambil dari swing terdekat mengapit harga', () => {
    // Semua candle biasa punya high/low identik, jadi hanya puncak 108 dan
    // dasar 92 yang lolos sebagai swing point.
    const biasa = (i: number): Candle => candle(100, 101, 99, 100, i);
    const candles = [
      biasa(0),
      biasa(1),
      candle(100, 108, 99.9, 100, 2),
      biasa(3),
      biasa(4),
      candle(100, 100.1, 92, 100, 5),
      biasa(6),
      biasa(7),
    ];
    const { support, resistance } = findSupportResistance(candles);
    expect(resistance).toBe(108);
    expect(support).toBe(92);
  });

  test('isNearLevel hanya true saat harga benar-benar dekat level', () => {
    expect(isNearLevel(100, 100.2)).toBe(true);
    expect(isNearLevel(100, 130)).toBe(false);
    expect(isNearLevel(100, null)).toBe(false);
  });
});

describe('jam pasar emas', () => {
  test('tutup sepanjang Sabtu', () => {
    expect(isGoldMarketOpen(new Date('2026-09-12T10:00:00Z'))).toBe(false);
  });

  test('Minggu masih tutup sebelum jam 22:00 UTC dan buka setelahnya', () => {
    expect(isGoldMarketOpen(new Date('2026-09-13T21:59:00Z'))).toBe(false);
    expect(isGoldMarketOpen(new Date('2026-09-13T22:00:00Z'))).toBe(true);
  });

  test('Jumat buka sampai jam 22:00 UTC lalu tutup', () => {
    expect(isGoldMarketOpen(new Date('2026-09-11T21:59:00Z'))).toBe(true);
    expect(isGoldMarketOpen(new Date('2026-09-11T22:00:00Z'))).toBe(false);
  });

  test('hari kerja biasa selalu buka', () => {
    expect(isGoldMarketOpen(new Date('2026-09-09T03:00:00Z'))).toBe(true);
  });
});

describe('penjadwalan candle', () => {
  test('menunggu sampai candle 15m berikutnya tertutup, plus buffer', () => {
    const now = Date.parse('2026-09-10T10:07:00Z');
    expect(msUntilNextClose('15m', now, 0)).toBe(8 * MENIT);
  });

  test('candle 4 jam jatuh di kelipatan 4 jam UTC', () => {
    const now = Date.parse('2026-09-10T10:00:00Z');
    expect(msUntilNextClose('4h', now, 0)).toBe(2 * 60 * MENIT);
  });

  test('buffer ditambahkan supaya data provider sempat menutup candle', () => {
    const now = Date.parse('2026-09-10T10:07:00Z');
    expect(msUntilNextClose('15m', now, 20_000) - msUntilNextClose('15m', now, 0)).toBe(20_000);
  });
});
