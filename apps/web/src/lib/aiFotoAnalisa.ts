export interface AiFotoAnalisaResult {
  readonly namaPenyakit: string;
  readonly kesan: string;
}

/** Menggabungkan hasil /api/analisa-foto-ai/analyze menjadi satu teks, dengan format yang sama seperti tombol AI Foto. */
export function formatAiFotoAnalisa(result: AiFotoAnalisaResult): string {
  const namaPenyakit = result.namaPenyakit.trim();
  const kesan = result.kesan.trim();
  if (!namaPenyakit) return kesan;
  if (!kesan) return `Kemungkinan: ${namaPenyakit}`;
  return `Kemungkinan: ${namaPenyakit}\n\n${kesan}`;
}

export interface TbScreeningIndikator {
  readonly label: string;
  readonly persen: number;
  readonly keterangan: string;
}

export interface TbScreeningAnalisaResult {
  readonly diagnosis: string;
  readonly confidenceScore: number;
  readonly ringkasan: string;
  readonly indikator: ReadonlyArray<TbScreeningIndikator>;
}

/** Menjadikan hasil /api/analisa-foto-ai/tb-screening (AI Banding 2) satu teks. Baris pertamanya sama dengan yang disimpan tombol Kesan AI Banding 2. */
export function formatTbScreeningAnalisa(result: TbScreeningAnalisaResult): string {
  const parts = [`Kemungkinan: ${result.diagnosis.trim()} (Skor keyakinan: ${result.confidenceScore}%)`];
  const ringkasan = result.ringkasan.trim();
  if (ringkasan) parts.push(ringkasan);
  if (result.indikator.length > 0) {
    const lines = result.indikator.map((ind) => {
      const keterangan = ind.keterangan.trim();
      return `- ${ind.label}: ${ind.persen}%${keterangan ? ` — ${keterangan}` : ''}`;
    });
    parts.push(['Indikator:', ...lines].join('\n'));
  }
  return parts.join('\n\n');
}
