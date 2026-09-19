import { describe, expect, test } from 'vitest';
import {
  formatParametersForPrompt,
  MAX_PARAMETERS,
  sanitizeParameterNames,
  sanitizeParameters,
} from '../../apps/api/src/routes/analisaLabAi.ts';

describe('sanitizeParameters', () => {
  test('returns an empty array for non-array input', () => {
    expect(sanitizeParameters(null)).toEqual([]);
    expect(sanitizeParameters(undefined)).toEqual([]);
    expect(sanitizeParameters('not an array')).toEqual([]);
  });

  test('keeps only well-formed rows and trims text fields', () => {
    const result = sanitizeParameters([
      { pemeriksaan: '  Hemoglobin (Hb)  ', hasil: ' 10.2 ', nilaiRujukan: ' 12 - 16 g/dL ', satuan: ' g/dL ' },
      { pemeriksaan: '   ', hasil: '5' },
      { pemeriksaan: 'Leukosit', hasil: 42 },
      null,
      'garbage',
    ]);
    expect(result).toEqual([
      { pemeriksaan: 'Hemoglobin (Hb)', hasil: '10.2', nilaiRujukan: '12 - 16 g/dL', satuan: 'g/dL' },
    ]);
  });

  test('allows a row with an empty hasil (result not filled yet)', () => {
    expect(sanitizeParameters([{ pemeriksaan: 'MCV', hasil: '' }])).toEqual([
      { pemeriksaan: 'MCV', hasil: '', nilaiRujukan: undefined, satuan: undefined },
    ]);
  });

  test('caps the number of parameters to MAX_PARAMETERS', () => {
    const input = Array.from({ length: MAX_PARAMETERS + 10 }, (_, i) => ({
      pemeriksaan: `Param ${i}`,
      hasil: String(i),
    }));
    const result = sanitizeParameters(input);
    expect(result).toHaveLength(MAX_PARAMETERS);
    expect(result[0]!.pemeriksaan).toBe('Param 0');
  });
});

describe('formatParametersForPrompt', () => {
  test('numbers each parameter with satuan and nilaiRujukan inline', () => {
    const text = formatParametersForPrompt('Widal', [
      { pemeriksaan: 'Salmonella Typhi O', hasil: '1/320', satuan: 'Titer', nilaiRujukan: '(-) Negatif' },
      { pemeriksaan: 'Salmonella Typhi H', hasil: '1/160', satuan: 'Titer', nilaiRujukan: '(-) Negatif' },
    ]);
    expect(text).toBe(
      [
        'Kategori pemeriksaan: Widal',
        'Data hasil pemeriksaan:',
        '1. Salmonella Typhi O: 1/320 Titer, nilai rujukan: (-) Negatif',
        '2. Salmonella Typhi H: 1/160 Titer, nilai rujukan: (-) Negatif',
      ].join('\n'),
    );
  });

  test('omits satuan/nilaiRujukan segments when missing', () => {
    const text = formatParametersForPrompt('Hematologi', [{ pemeriksaan: 'Hb', hasil: '10' }]);
    expect(text).toBe(['Kategori pemeriksaan: Hematologi', 'Data hasil pemeriksaan:', '1. Hb: 10'].join('\n'));
  });
});

describe('sanitizeParameterNames', () => {
  test('returns an empty array for non-array input', () => {
    expect(sanitizeParameterNames(null)).toEqual([]);
    expect(sanitizeParameterNames('Hb')).toEqual([]);
  });

  test('keeps only non-empty strings and trims them', () => {
    expect(sanitizeParameterNames(['  Hemoglobin (Hb)  ', '   ', 42, null, 'MCV'])).toEqual([
      'Hemoglobin (Hb)',
      'MCV',
    ]);
  });

  test('caps the number of names to MAX_PARAMETERS', () => {
    const input = Array.from({ length: MAX_PARAMETERS + 5 }, (_, i) => `Param ${i}`);
    expect(sanitizeParameterNames(input)).toHaveLength(MAX_PARAMETERS);
  });
});
