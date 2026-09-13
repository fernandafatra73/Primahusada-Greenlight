import { describe, expect, test } from 'vitest';
import { formatAiFotoAnalisa, formatTbScreeningAnalisa } from '../../apps/web/src/lib/aiFotoAnalisa.ts';

describe('formatTbScreeningAnalisa', () => {
  test('includes diagnosis with confidence, summary and indicator lines', () => {
    expect(
      formatTbScreeningAnalisa({
        diagnosis: 'TBC Paru',
        confidenceScore: 72,
        ringkasan: 'Tampak infiltrat di apeks paru kanan.',
        indikator: [
          { label: 'Infiltrate', persen: 70, keterangan: 'Apeks kanan' },
          { label: 'Cavity', persen: 10, keterangan: '' },
        ],
      }),
    ).toBe(
      'Kemungkinan: TBC Paru (Skor keyakinan: 72%)\n\n' +
        'Tampak infiltrat di apeks paru kanan.\n\n' +
        'Indikator:\n- Infiltrate: 70% — Apeks kanan\n- Cavity: 10%',
    );
  });

  test('omits empty summary and indicator section', () => {
    expect(
      formatTbScreeningAnalisa({ diagnosis: ' Normal ', confidenceScore: 0, ringkasan: '  ', indikator: [] }),
    ).toBe('Kemungkinan: Normal (Skor keyakinan: 0%)');
  });
});

describe('formatAiFotoAnalisa', () => {
  test('combines disease name and kesan', () => {
    expect(formatAiFotoAnalisa({ namaPenyakit: 'Pneumonia', kesan: 'Tampak infiltrat di paru kanan.' })).toBe(
      'Kemungkinan: Pneumonia\n\nTampak infiltrat di paru kanan.',
    );
  });

  test('returns only kesan when disease name is empty', () => {
    expect(formatAiFotoAnalisa({ namaPenyakit: '', kesan: 'Foto tidak cukup jelas untuk dianalisa.' })).toBe(
      'Foto tidak cukup jelas untuk dianalisa.',
    );
  });

  test('returns only the disease line when kesan is empty', () => {
    expect(formatAiFotoAnalisa({ namaPenyakit: 'Fraktur', kesan: '' })).toBe('Kemungkinan: Fraktur');
  });

  test('trims surrounding whitespace and treats whitespace-only fields as empty', () => {
    expect(formatAiFotoAnalisa({ namaPenyakit: '  Bronchitis \n', kesan: '\n Corakan bronkovaskular meningkat. ' })).toBe(
      'Kemungkinan: Bronchitis\n\nCorakan bronkovaskular meningkat.',
    );
    expect(formatAiFotoAnalisa({ namaPenyakit: '   ', kesan: '   ' })).toBe('');
  });
});
