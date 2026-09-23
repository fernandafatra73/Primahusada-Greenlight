import { CLINICAL_MAX_WORDS, countClampedWords, limitToMaxWords } from '../lib/clinicalText.ts';

const CELL_MAX_CHARS = 48;
const PDF_LINE_CHUNK = 90;

export function truncatePdfCell(text: string, maxChars = CELL_MAX_CHARS): string {
  const normalized = text.trim() || '—';
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars - 1)}…`;
}

/** Pecah string panjang supaya react-pdf wrap; klinis/kesan dibatasi ~100 kata. */
export function formatPdfClinicalText(text: string): string {
  const limited = limitToMaxWords(text, CLINICAL_MAX_WORDS) || '—';
  return formatPdfMultiline(limited, PDF_LINE_CHUNK);
}

export interface ClinicalFontMetrics {
  readonly fontSize: number;
  readonly lineHeight: number;
}

/**
 * Ukuran font blok Klinis/Temuan/Kesan menyusut mengikuti total kata gabungan
 * dari semua field yang tampil, supaya kerangka tabel & posisi "Salam Sejawat"/
 * tanda tangan/nama dokter tetap muat di 1 halaman dan tidak pernah bergeser ke
 * halaman 2 — daripada memotong teks atau membiarkan layout meluber.
 */
export function getClinicalFontMetrics(totalWords: number): ClinicalFontMetrics {
  if (totalWords <= 55) return { fontSize: 10, lineHeight: 1.4 };
  if (totalWords <= 90) return { fontSize: 9, lineHeight: 1.32 };
  if (totalWords <= 130) return { fontSize: 8, lineHeight: 1.24 };
  if (totalWords <= 180) return { fontSize: 7.25, lineHeight: 1.18 };
  return { fontSize: 6.5, lineHeight: 1.12 };
}

/** Total kata gabungan Klinis + Temuan (jika tampil) + Kesan + templat bacaan. */
export function totalClinicalWords(
  fields: readonly (string | undefined)[],
): number {
  return fields.reduce((sum, field) => sum + countClampedWords(field), 0);
}

function formatPdfMultiline(text: string, chunkSize: number): string {
  return text
    .split('\n')
    .map((line) => {
      if (line.length <= chunkSize) {
        return line;
      }
      const parts: string[] = [];
      for (let i = 0; i < line.length; i += chunkSize) {
        parts.push(line.slice(i, i + chunkSize));
      }
      return parts.join('\n');
    })
    .join('\n');
}
