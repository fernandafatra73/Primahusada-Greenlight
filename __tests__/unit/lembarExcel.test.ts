import { describe, expect, test } from 'vitest';
import { bacaLembarTersimpan, parseLembarCells } from '../../apps/api/src/lib/lembarExcel.ts';

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

describe('bacaLembarTersimpan', () => {
  test('returns stored cells', () => {
    expect(bacaLembarTersimpan('{"A1":"1"}')).toEqual({ A1: '1' });
  });

  test('treats corrupt JSON as never saved', () => {
    expect(bacaLembarTersimpan('{oops')).toBeNull();
    expect(bacaLembarTersimpan('[]')).toBeNull();
  });
});
