import { describe, expect, test } from 'vitest';
import { bacaLembarTersimpan, parseLembarCells, parseLembarWorkbook } from '../../apps/api/src/lib/lembarExcel.ts';

describe('parseLembarCells', () => {
  test('accepts values and formulas and drops empty cells', () => {
    const hasil = parseLembarCells({ A1: 'Uraian', B2: '=SUM(B3:B5)', C3: '', D4: '12' });
    expect(hasil).toEqual({ ok: true, data: { A1: 'Uraian', B2: '=SUM(B3:B5)', D4: '12' } });
  });

  test('rejects non-object input', () => {
    expect(parseLembarCells(null).ok).toBe(false);
    expect(parseLembarCells([]).ok).toBe(false);
    expect(parseLembarCells('A1').ok).toBe(false);
  });

  test('rejects invalid addresses and non-text values', () => {
    expect(parseLembarCells({ '1A': 'x' }).ok).toBe(false);
    expect(parseLembarCells({ A0: 'x' }).ok).toBe(false);
    expect(parseLembarCells({ a1: 'x' }).ok).toBe(false);
    expect(parseLembarCells({ A1: 5 }).ok).toBe(false);
  });

  test('rejects oversized cell content', () => {
    expect(parseLembarCells({ A1: 'x'.repeat(1001) }).ok).toBe(false);
  });
});

describe('parseLembarWorkbook', () => {
  const sheet = {
    name: 'Hasil', cells: { A1: '1' }, styles: { A1: { b: true, fill: '#112233', x: 1 } },
    colWidths: { '0': 200 }, rowHeights: {}, rows: 40, cols: 17,
  };

  test('accepts sheets and keeps only known style properties', () => {
    const hasil = parseLembarWorkbook({ version: 2, sheets: [sheet] });
    expect(hasil.ok && hasil.data.sheets[0]!.styles.A1).toEqual({ b: true, fill: '#112233' });
  });

  test('rejects missing, duplicate or unnamed sheets', () => {
    expect(parseLembarWorkbook({}).ok).toBe(false);
    expect(parseLembarWorkbook({ sheets: [] }).ok).toBe(false);
    expect(parseLembarWorkbook({ sheets: [sheet, { ...sheet, name: 'hasil' }] }).ok).toBe(false);
    expect(parseLembarWorkbook({ sheets: [{ ...sheet, name: '' }] }).ok).toBe(false);
  });

  test('drops invalid colors and rejects invalid sizes', () => {
    const warna = parseLembarWorkbook({ sheets: [{ ...sheet, styles: { A1: { fill: 'red' } } }] });
    expect(warna.ok && warna.data.sheets[0]!.styles.A1).toBeUndefined();
    expect(parseLembarWorkbook({ sheets: [{ ...sheet, colWidths: { '0': -5 } }] }).ok).toBe(false);
    expect(parseLembarWorkbook({ sheets: [{ ...sheet, colWidths: { x: 5 } }] }).ok).toBe(false);
  });

  test('clamps the grid size', () => {
    const hasil = parseLembarWorkbook({ sheets: [{ ...sheet, rows: 99999, cols: 0 }] });
    expect(hasil.ok && [hasil.data.sheets[0]!.rows, hasil.data.sheets[0]!.cols]).toEqual([500, 1]);
  });
});

describe('bacaLembarTersimpan', () => {
  test('wraps the legacy cell map into a single sheet', () => {
    const wb = bacaLembarTersimpan('{"A1":"1"}');
    expect(wb?.sheets).toHaveLength(1);
    expect(wb?.sheets[0]!.cells).toEqual({ A1: '1' });
  });

  test('returns a stored workbook as is', () => {
    const json = JSON.stringify({
      version: 2,
      sheets: [{ name: 'S', cells: { B2: '=1' }, styles: {}, colWidths: {}, rowHeights: {}, rows: 5, cols: 5 }],
    });
    expect(bacaLembarTersimpan(json)?.sheets[0]!.name).toBe('S');
  });

  test('treats corrupt JSON as never saved', () => {
    expect(bacaLembarTersimpan('{oops')).toBeNull();
    expect(bacaLembarTersimpan('[]')).toBeNull();
  });
});
