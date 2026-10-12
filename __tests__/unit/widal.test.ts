import { describe, expect, test } from 'vitest';
import {
  DEFAULT_WIDAL_PARAMETERS as API_DEFAULT_WIDAL_PARAMETERS,
  parseWidalBoardReadings,
  widalBoardLabel,
  widalResultsFromReadings,
  widalTiterFromPersen,
} from '../../apps/api/src/routes/analisaLabAi.ts';
import {
  DEFAULT_WIDAL_PARAMETERS,
  applyWidalResults,
  formatWidalRingkasan,
  isWidalRow,
  widalParameterNames,
} from '../../apps/web/src/lib/widal.ts';
import type { LabTableRow } from '../../apps/web/src/lib/labKesan.ts';

describe('widalTiterFromPersen', () => {
  test('no agglutination (0%) is (-) Negatif', () => {
    expect(widalTiterFromPersen(0)).toBe('(-) Negatif');
    expect(widalTiterFromPersen(Number.NaN)).toBe('(-) Negatif');
  });

  test('any agglutination below 15% is 1/80', () => {
    expect(widalTiterFromPersen(3)).toBe('1/80');
    expect(widalTiterFromPersen(10)).toBe('1/80');
    expect(widalTiterFromPersen(14.9)).toBe('1/80');
  });

  test('15% up to below 25% is 1/160', () => {
    expect(widalTiterFromPersen(15)).toBe('1/160');
    expect(widalTiterFromPersen(24.9)).toBe('1/160');
  });

  test('25% to 60% is 1/320', () => {
    expect(widalTiterFromPersen(25)).toBe('1/320');
    expect(widalTiterFromPersen(40)).toBe('1/320');
    expect(widalTiterFromPersen(50)).toBe('1/320');
    expect(widalTiterFromPersen(60)).toBe('1/320');
  });

  test('above 60% is 1/640', () => {
    expect(widalTiterFromPersen(60.1)).toBe('1/640');
    expect(widalTiterFromPersen(100)).toBe('1/640');
  });
});

describe('widalBoardLabel', () => {
  test('maps every default antigen to its board label', () => {
    expect(API_DEFAULT_WIDAL_PARAMETERS.map(widalBoardLabel)).toEqual(['O', 'AO', 'BO', 'CO', 'H', 'AH', 'BH', 'CH']);
  });

  test('handles other spellings and rejects ambiguous names', () => {
    expect(widalBoardLabel('Widal - S. Typhi H')).toBe('H');
    expect(widalBoardLabel('S. Paratyphi B-O')).toBe('BO');
    expect(widalBoardLabel('Widal - S. Paratyphi A')).toBeNull();
    expect(widalBoardLabel('Hemoglobin')).toBeNull();
  });
});

describe('parseWidalBoardReadings / widalResultsFromReadings', () => {
  test('drops malformed entries and clamps percentages', () => {
    expect(
      parseWidalBoardReadings([
        { label: ' ao ', terbaca: true, aglutinasiPersen: 120 },
        { label: 'X', terbaca: true, aglutinasiPersen: 10 },
        { label: 'H', terbaca: false, aglutinasiPersen: 30 },
        null,
        'nope',
      ]),
    ).toEqual([
      { label: 'AO', terbaca: true, aglutinasiPersen: 100 },
      { label: 'H', terbaca: false, aglutinasiPersen: 0 },
    ]);
    expect(parseWidalBoardReadings({})).toEqual([]);
  });

  test('turns board readings into titers for the requested names', () => {
    const readings = parseWidalBoardReadings([
      { label: 'O', terbaca: true, aglutinasiPersen: 20.4 },
      { label: 'H', terbaca: true, aglutinasiPersen: 0 },
      { label: 'AO', terbaca: false, aglutinasiPersen: 0 },
    ]);
    expect(
      widalResultsFromReadings(
        ['Salmonella Typhi O', 'Salmonella Typhi H', 'Salmonella Paratyphi AO', 'Salmonella Paratyphi CH', 'Widal - S. Paratyphi A'],
        readings,
      ),
    ).toEqual([
      { pemeriksaan: 'Salmonella Typhi O', hasil: '1/160', aglutinasiPersen: 20 },
      { pemeriksaan: 'Salmonella Typhi H', hasil: '(-) Negatif', aglutinasiPersen: 0 },
      { pemeriksaan: 'Salmonella Paratyphi AO', hasil: '', aglutinasiPersen: null },
      { pemeriksaan: 'Salmonella Paratyphi CH', hasil: '', aglutinasiPersen: null },
      { pemeriksaan: 'Widal - S. Paratyphi A', hasil: '', aglutinasiPersen: null },
    ]);
  });
});

describe('formatWidalRingkasan', () => {
  test('shows titer with percentage, or tidak terbaca', () => {
    expect(formatWidalRingkasan({ pemeriksaan: 'Salmonella Typhi O', hasil: '1/160', aglutinasiPersen: 20 })).toBe(
      'Salmonella Typhi O: 1/160 (20%)',
    );
    expect(formatWidalRingkasan({ pemeriksaan: 'Salmonella Typhi H', hasil: '', aglutinasiPersen: null })).toBe(
      'Salmonella Typhi H: tidak terbaca',
    );
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
