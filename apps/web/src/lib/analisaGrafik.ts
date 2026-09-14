export interface AnalisaGrafikResult {
  readonly instrumen: string;
  readonly tren: string;
  readonly polaCandle: string;
  readonly supportResistance: string;
  readonly indikator: string;
  readonly bias: string;
  readonly prediksiArah5Menit: string;
  readonly prediksi5Menit: string;
  readonly entry: string;
  readonly stopLoss: string;
  readonly takeProfit: string;
  readonly confidence: number;
  readonly catatan: string;
}

const ARAH_ICON: Readonly<Record<string, string>> = {
  NAIK: '📈',
  TURUN: '📉',
  SIDEWAYS: '➡️',
};

/** Baris prediksi 5 menit ke depan, ditaruh paling atas supaya langsung terbaca. */
function formatPrediksi5Menit(arah: string, prediksi: string): string | null {
  const arahUpper = arah.trim().toUpperCase();
  const text = prediksi.trim();
  if (!arahUpper && !text) return null;
  const icon = ARAH_ICON[arahUpper];
  const label = arahUpper ? `Prediksi 5 menit ke depan (${arahUpper})` : 'Prediksi 5 menit ke depan';
  return `${icon ? `${icon} ` : ''}${label}${text ? `: ${text}` : ''}`;
}

/** Menjadikan hasil /api/analisa-grafik/analyze satu teks untuk kolom Analisa; field kosong dilewati. */
export function formatAnalisaGrafik(result: AnalisaGrafikResult): string {
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['Instrumen', result.instrumen],
    ['Tren', result.tren],
    ['Pola Candle', result.polaCandle],
    ['Support/Resistance', result.supportResistance],
    ['Indikator', result.indikator],
    ['Bias', result.bias],
    ['Entry', result.entry],
    ['Stop Loss', result.stopLoss],
    ['Take Profit', result.takeProfit],
  ];
  const lines = rows
    .map(([label, value]) => [label, value.trim()] as const)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value}`);
  if (result.confidence > 0) {
    lines.push(`Confidence: ${Math.round(result.confidence)}%`);
  }
  const prediksi = formatPrediksi5Menit(result.prediksiArah5Menit, result.prediksi5Menit);
  const catatan = result.catatan.trim();
  if (catatan) {
    lines.push('', `Catatan: ${catatan}`);
  }
  if (prediksi) {
    lines.unshift(...(lines.length > 0 ? [prediksi, ''] : [prediksi]));
  }
  return lines.join('\n');
}
