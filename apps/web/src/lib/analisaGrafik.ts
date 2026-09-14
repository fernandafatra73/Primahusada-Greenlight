export interface AnalisaGrafikResult {
  readonly instrumen: string;
  readonly tren: string;
  readonly polaCandle: string;
  readonly supportResistance: string;
  readonly indikator: string;
  readonly bias: string;
  readonly entry: string;
  readonly stopLoss: string;
  readonly takeProfit: string;
  readonly confidence: number;
  readonly catatan: string;
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
  const catatan = result.catatan.trim();
  if (catatan) {
    lines.push('', `Catatan: ${catatan}`);
  }
  return lines.join('\n');
}
