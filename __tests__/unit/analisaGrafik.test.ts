import { describe, expect, test } from 'vitest';
import { formatAnalisaGrafik, type AnalisaGrafikResult } from '../../apps/web/src/lib/analisaGrafik.ts';

const empty: AnalisaGrafikResult = {
  instrumen: '',
  tren: '',
  polaCandle: '',
  supportResistance: '',
  indikator: '',
  bias: '',
  entry: '',
  stopLoss: '',
  takeProfit: '',
  confidence: 0,
  catatan: '',
};

describe('formatAnalisaGrafik', () => {
  test('lists every filled field, confidence and catatan', () => {
    expect(
      formatAnalisaGrafik({
        instrumen: 'XAUUSD 1H',
        tren: 'Naik',
        polaCandle: 'Bullish engulfing',
        supportResistance: 'S 2400, R 2450',
        indikator: 'RSI 60',
        bias: 'BUY',
        entry: '2410',
        stopLoss: '2395',
        takeProfit: '2450',
        confidence: 64.6,
        catatan: 'Pakai stop loss.',
      }),
    ).toBe(
      'Instrumen: XAUUSD 1H\nTren: Naik\nPola Candle: Bullish engulfing\nSupport/Resistance: S 2400, R 2450\n' +
        'Indikator: RSI 60\nBias: BUY\nEntry: 2410\nStop Loss: 2395\nTake Profit: 2450\nConfidence: 65%\n\n' +
        'Catatan: Pakai stop loss.',
    );
  });

  test('skips empty or whitespace-only fields and zero confidence', () => {
    expect(formatAnalisaGrafik({ ...empty, tren: ' Sideways ', entry: '   ' })).toBe('Tren: Sideways');
    expect(formatAnalisaGrafik(empty)).toBe('');
  });
});
