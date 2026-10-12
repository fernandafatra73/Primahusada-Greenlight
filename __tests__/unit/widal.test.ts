import { describe, expect, test } from 'vitest';
import {
  DEFAULT_WIDAL_PARAMETERS as API_DEFAULT_WIDAL_PARAMETERS,
  normalizeWidalTiter,
} from '../../apps/api/src/routes/analisaLabAi.ts';
import {
  DEFAULT_WIDAL_PARAMETERS,
  applyWidalResults,
  isWidalRow,
  widalParameterNames,
} from '../../apps/web/src/lib/widal.ts';
import type { LabTableRow } from '../../apps/web/src/lib/labKesan.ts';

describe('normalizeWidalTiter', () => {
  test('keeps the five allowed titers', () => {
    expect(normalizeWidalTiter('Negatif')).toBe('Negatif');
    expect(normalizeWidalTiter('1/80')).toBe('1/80');
    expect(normalizeWidalTiter('1/160')).toBe('1/160');
    expect(normalizeWidalTiter('1/320')).toBe('1/320');
    expect(normalizeWidalTiter('1/640')).toBe('1/640');
  });

  test('accepts common spellings of the same value', () => {
    expect(normalizeWidalTiter(' 1 : 160 ')).toBe('1/160');
    expect(normalizeWidalTiter('320')).toBe('1/320');
    expect(normalizeWidalTiter('Titer 1/80')).toBe('1/80');
    expect(normalizeWidalTiter('(-)')).toBe('Negatif');
    expect(normalizeWidalTiter('-')).toBe('Negatif');
    expect(normalizeWidalTiter('neg')).toBe('Negatif');
  });

  test('treats titers below 1/80 as Negatif', () => {
    expect(normalizeWidalTiter('1/20')).toBe('Negatif');
    expect(normalizeWidalTiter('1/40')).toBe('Negatif');
  });

  test('returns empty for unreadable or non-standard titers instead of rounding', () => {
    expect(normalizeWidalTiter('')).toBe('');
    expect(normalizeWidalTiter('1/1280')).toBe('');
    expect(normalizeWidalTiter('1/100')).toBe('');
    expect(normalizeWidalTiter('positif')).toBe('');
  });
});

describe('Widal parameter list', () => {
  test('web and API agree on the eight antigens', () => {
    expect(DEFAULT_WIDAL_PARAMETERS).toHaveLength(8);
    expect(DEFAULT_WIDAL_PARAMETERS).toEqual(API_DEFAULT_WIDAL_PARAMETERS);
  });
});

const row = (pemeriksaan: string, klasifikasi = '', hasil = ''): LabTableRow => ({
  id: pemeriksaan,
  klasifikasi,
  pemeriksaan,
  hasil,
  nilaiRujukan: '',
});

describe('isWidalRow / widalParameterNames', () => {
  test('detects Widal rows by klasifikasi or antigen name', () => {
    expect(isWidalRow(row('Titer O', 'Widal'))).toBe(true);
    expect(isWidalRow(row('Widal - S. Typhi O'))).toBe(true);
    expect(isWidalRow(row('Hemoglobin', 'Hematologi'))).toBe(false);
  });

  test('uses existing Widal rows, or the eight defaults when there are none', () => {
    expect(widalParameterNames([row('Hemoglobin'), row('Salmonella Typhi O', 'Widal')])).toEqual([
      'Salmonella Typhi O',
    ]);
    expect(widalParameterNames([row('Hemoglobin')])).toEqual([...DEFAULT_WIDAL_PARAMETERS]);
  });
});

describe('applyWidalResults', () => {
  test('fills existing Widal rows and leaves unreadable ones untouched', () => {
    const rows = [
      row('Hemoglobin', 'Hematologi', '13'),
      row('Salmonella Typhi O', 'Widal'),
      row('Salmonella Typhi H', 'Widal', 'Negatif'),
    ];
    const result = applyWidalResults(
      rows,
      [
        { pemeriksaan: 'salmonella typhi o', hasil: '1/320' },
        { pemeriksaan: 'Salmonella Typhi H', hasil: '' },
      ],
      (i) => `new-${i}`,
    );
    expect(result.map((r) => r.hasil)).toEqual(['13', '1/320', 'Negatif']);
  });

  test('appends the eight antigens when the table has no Widal rows', () => {
    const result = applyWidalResults(
      [row('Hemoglobin', 'Hematologi', '13')],
      [{ pemeriksaan: 'Salmonella Paratyphi BH', hasil: '1/160' }],
      (i) => `new-${i}`,
    );
    expect(result).toHaveLength(9);
    expect(result[1]).toEqual({
      id: 'new-0',
      klasifikasi: 'Widal',
      pemeriksaan: 'Salmonella Typhi O',
      hasil: '',
      nilaiRujukan: '(-) Negatif',
    });
    expect(result.find((r) => r.pemeriksaan === 'Salmonella Paratyphi BH')?.hasil).toBe('1/160');
  });
});
