import { describe, expect, test } from 'vitest';
import {
  formatAnalisaGrafik,
  sinyalPembalikan,
  urutkanPembalikanTerbaru,
  type AnalisaGrafikResult,
} from '../../apps/web/src/lib/analisaGrafik.ts';

describe('urutkanPembalikanTerbaru', () => {
  test('sorts rightmost (newest) first without mutating the input', () => {
    const input = [
      { arahSetelah: 'NAIK', posisiX: 100, posisiY: 0, alasan: '' },
      { arahSetelah: 'TURUN', posisiX: 900, posisiY: 0, alasan: '' },
    ] as const;
    expect(urutkanPembalikanTerbaru(input).map((p) => p.posisiX)).toEqual([900, 100]);
    expect(input[0].posisiX).toBe(100);
  });
});

describe('sinyalPembalikan', () => {
  test('reversal up means buy, reversal down means sell', () => {
    expect(sinyalPembalikan('NAIK')).toBe('SAATNYA BELI (BUY)');
    expect(sinyalPembalikan('TURUN')).toBe('SAATNYA JUAL (SELL)');
  });
});

const empty: AnalisaGrafikResult = {
  instrumen: '',
  tren: '',
  polaCandle: '',
  supportResistance: '',
  indikator: '',
  bias: '',
  prediksiArah5Menit: '',
  prediksi5Menit: '',
  pembalikanArah: [],
  entry: '',
  stopLoss: '',
  takeProfit: '',
  confidence: 0,
  catatan: '',
};

describe('formatAnalisaGrafik', () => {
  test('puts the 5-minute prediction first, then every filled field, confidence and catatan', () => {
    expect(
      formatAnalisaGrafik({
        instrumen: 'XAUUSD 1H',
        tren: 'Naik',
        polaCandle: 'Bullish engulfing',
        supportResistance: 'S 2400, R 2450',
        indikator: 'RSI 60',
        bias: 'BUY',
        prediksiArah5Menit: 'NAIK',
        prediksi5Menit: '5 menit ke depan XAU diperkirakan naik ~$0.3/menit menuju 2411.5',
        pembalikanArah: [],
        entry: '2410',
        stopLoss: '2395',
        takeProfit: '2450',
        confidence: 64.6,
        catatan: 'Pakai stop loss.',
      }),
    ).toBe(
      '📈 Prediksi 5 menit ke depan (NAIK): 5 menit ke depan XAU diperkirakan naik ~$0.3/menit menuju 2411.5\n\n' +
        'Instrumen: XAUUSD 1H\nTren: Naik\nPola Candle: Bullish engulfing\nSupport/Resistance: S 2400, R 2450\n' +
        'Indikator: RSI 60\nBias: BUY\nEntry: 2410\nStop Loss: 2395\nTake Profit: 2450\nConfidence: 65%\n\n' +
        'Catatan: Pakai stop loss.',
    );
  });

  test('uses the matching icon per direction and tolerates lowercase or unknown directions', () => {
    expect(formatAnalisaGrafik({ ...empty, prediksiArah5Menit: 'turun', prediksi5Menit: 'Turun $1' })).toBe(
      '📉 Prediksi 5 menit ke depan (TURUN): Turun $1',
    );
    expect(formatAnalisaGrafik({ ...empty, prediksiArah5Menit: 'SIDEWAYS', tren: 'Datar' })).toBe(
      '➡️ Prediksi 5 menit ke depan (SIDEWAYS)\n\nTren: Datar',
    );
    expect(formatAnalisaGrafik({ ...empty, prediksi5Menit: 'Tidak dapat diprediksi' })).toBe(
      'Prediksi 5 menit ke depan: Tidak dapat diprediksi',
    );
  });

  test('adds a single reversal line under the prediction', () => {
    expect(
      formatAnalisaGrafik({
        ...empty,
        prediksiArah5Menit: 'NAIK',
        prediksi5Menit: 'Naik $1',
        pembalikanArah: [{ arahSetelah: 'NAIK', posisiX: 800, posisiY: 700, alasan: ' Hammer di support ' }],
        tren: 'Turun',
      }),
    ).toBe(
      '📈 Prediksi 5 menit ke depan (NAIK): Naik $1\n' +
        '🟢 SAATNYA BELI (BUY) — pembalikan arah NAIK (ditandai panah di grafik): Hammer di support\n\nTren: Turun',
    );
    expect(
      formatAnalisaGrafik({
        ...empty,
        pembalikanArah: [{ arahSetelah: 'TURUN', posisiX: 0, posisiY: 0, alasan: '' }],
      }),
    ).toBe('🔴 SAATNYA JUAL (SELL) — pembalikan arah TURUN (ditandai panah di grafik)');
  });

  test('lists both buy and sell reversals, newest (rightmost) first and marked TERBARU', () => {
    expect(
      formatAnalisaGrafik({
        ...empty,
        pembalikanArah: [
          { arahSetelah: 'NAIK', posisiX: 300, posisiY: 850, alasan: 'Hammer' },
          { arahSetelah: 'TURUN', posisiX: 750, posisiY: 120, alasan: 'Shooting star' },
        ],
      }),
    ).toBe(
      '🔴 SAATNYA JUAL (SELL) [TERBARU] — pembalikan arah TURUN (ditandai panah di grafik): Shooting star\n' +
        '🟢 SAATNYA BELI (BUY) — pembalikan arah NAIK (ditandai panah di grafik): Hammer',
    );
  });

  test('skips empty or whitespace-only fields and zero confidence', () => {
    expect(formatAnalisaGrafik({ ...empty, tren: ' Sideways ', entry: '   ' })).toBe('Tren: Sideways');
    expect(formatAnalisaGrafik(empty)).toBe('');
  });
});
