import { describe, expect, test } from 'vitest';
import { formatAnalisaGrafik, type AnalisaGrafikResult } from '../../apps/web/src/lib/analisaGrafik.ts';

const empty: AnalisaGrafikResult = {
  instrumen: '',
  tren: '',
  polaCandle: '',
  supportResistance: '',
  indikator: '',
  bias: '',
  prediksiArah5Menit: '',
  prediksi5Menit: '',
  pembalikanArah: null,
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
        pembalikanArah: null,
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

  test('adds the reversal line under the prediction', () => {
    expect(
      formatAnalisaGrafik({
        ...empty,
        prediksiArah5Menit: 'NAIK',
        prediksi5Menit: 'Naik $1',
        pembalikanArah: { arahSetelah: 'NAIK', posisiX: 800, posisiY: 700, alasan: ' Hammer di support ' },
        tren: 'Turun',
      }),
    ).toBe(
      '📈 Prediksi 5 menit ke depan (NAIK): Naik $1\n' +
        '⬆️ Pembalikan arah NAIK (ditandai panah di grafik): Hammer di support\n\nTren: Turun',
    );
    expect(
      formatAnalisaGrafik({
        ...empty,
        pembalikanArah: { arahSetelah: 'TURUN', posisiX: 0, posisiY: 0, alasan: '' },
      }),
    ).toBe('⬇️ Pembalikan arah TURUN (ditandai panah di grafik)');
  });

  test('skips empty or whitespace-only fields and zero confidence', () => {
    expect(formatAnalisaGrafik({ ...empty, tren: ' Sideways ', entry: '   ' })).toBe('Tren: Sideways');
    expect(formatAnalisaGrafik(empty)).toBe('');
  });
});
