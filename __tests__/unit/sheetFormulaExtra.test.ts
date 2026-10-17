import { describe, expect, test } from 'vitest';
import { evaluateSheet, evaluateWorkbook } from '../../apps/web/src/lib/sheetFormula.ts';

function hitung(cells: Record<string, string>, key: string) {
  return evaluateSheet(cells).get(key);
}

describe('operators and comparisons', () => {
  test('compares values and returns booleans', () => {
    expect(hitung({ A1: '=3>2' }, 'A1')).toBe(true);
    expect(hitung({ A1: '=3<>3' }, 'A1')).toBe(false);
    expect(hitung({ A1: '="abc"="ABC"' }, 'A1')).toBe(true);
    expect(hitung({ A1: '=2>=2' }, 'A1')).toBe(true);
  });

  test('concatenates with & and CONCATENATE', () => {
    expect(hitung({ A1: '="Rp "&1500' }, 'A1')).toBe('Rp 1500');
    expect(hitung({ A1: 'a', B1: '=CONCATENATE(A1,"-",2)' }, 'B1')).toBe('a-2');
  });

  test('supports the percent operator', () => {
    expect(hitung({ A1: '=50%*200' }, 'A1')).toBe(100);
  });

  test('accepts absolute references and semicolon separators', () => {
    expect(hitung({ A1: '4', B1: '=$A$1*2' }, 'B1')).toBe(8);
    expect(hitung({ A1: '=SUM(1;2;3)' }, 'A1')).toBe(6);
  });
});

describe('logical functions', () => {
  test('IF only evaluates the chosen branch', () => {
    expect(hitung({ A1: '10', B1: '=IF(A1>5,"besar","kecil")' }, 'B1')).toBe('besar');
    expect(hitung({ A1: '=IF(1>2,1/0,7)' }, 'A1')).toBe(7);
    expect(hitung({ A1: '=IF(1>2,5)' }, 'A1')).toBe(false);
  });

  test('IFERROR replaces errors', () => {
    expect(hitung({ A1: '=IFERROR(1/0,-1)' }, 'A1')).toBe(-1);
    expect(hitung({ A1: '=IFERROR(4,-1)' }, 'A1')).toBe(4);
  });

  test('AND, OR and NOT', () => {
    expect(hitung({ A1: '=AND(1<2,2<3)' }, 'A1')).toBe(true);
    expect(hitung({ A1: '=OR(1>2,2>3)' }, 'A1')).toBe(false);
    expect(hitung({ A1: '=NOT(1>2)' }, 'A1')).toBe(true);
  });
});

describe('lookup and conditional aggregation', () => {
  test('SUMIF and COUNTIF with operators and wildcards', () => {
    const cells = {
      A1: 'apel', A2: 'jeruk', A3: 'apel pie', B1: '10', B2: '20', B3: '5',
      C1: '=SUMIF(A1:A3,"apel*",B1:B3)', C2: '=COUNTIF(B1:B3,">5")',
      C3: '=SUMIF(B1:B3,"<=10")', C4: '=COUNTIF(A1:A3,"jeruk")',
    };
    expect(hitung(cells, 'C1')).toBe(15);
    expect(hitung(cells, 'C2')).toBe(2);
    expect(hitung(cells, 'C3')).toBe(15);
    expect(hitung(cells, 'C4')).toBe(1);
  });

  test('VLOOKUP exact and approximate', () => {
    const cells = {
      A1: '1', B1: 'satu', A2: '5', B2: 'lima', A3: '9', B3: 'sembilan',
      D1: '=VLOOKUP(5,A1:B3,2,FALSE)', D2: '=VLOOKUP(7,A1:B3,2,TRUE)', D3: '=VLOOKUP(6,A1:B3,2,FALSE)',
    };
    expect(hitung(cells, 'D1')).toBe('lima');
    expect(hitung(cells, 'D2')).toBe('lima');
    expect(hitung(cells, 'D3')).toBe('#N/A');
  });
});

describe('text functions', () => {
  test('TEXT formats numbers using the Indonesian locale', () => {
    expect(hitung({ A1: '=TEXT(0.256,"0.0%")' }, 'A1')).toBe('25,6%');
    expect(hitung({ A1: '=TEXT(1234.5,"#,##0.00")' }, 'A1')).toBe('1.234,50');
  });

  test('LEN, UPPER and LOWER', () => {
    expect(hitung({ A1: '=LEN("halo")' }, 'A1')).toBe(4);
    expect(hitung({ A1: '=UPPER("ab")&LOWER("CD")' }, 'A1')).toBe('ABcd');
  });
});

describe('references to other sheets', () => {
  test('reads cells and ranges, quoted names and reports unknown sheets', () => {
    const hasil = evaluateWorkbook([
      { name: 'Data', cells: { A1: '5', A2: '7' } },
      { name: 'Rekap Bulan', cells: { A1: '=Data!A1+Data!A2', A2: '=SUM(Data!A1:A2)', A3: '=Data!Z9', A4: '=Hilang!A1' } },
      { name: 'Lain', cells: { A1: "='Rekap Bulan'!A1*2" } },
    ]);
    expect(hasil[1]!.get('A1')).toBe(12);
    expect(hasil[1]!.get('A2')).toBe(12);
    expect(hasil[1]!.get('A3')).toBe(0);
    expect(hasil[1]!.get('A4')).toBe('#REF!');
    expect(hasil[2]!.get('A1')).toBe(24);
  });
});

describe('Indonesian arithmetic functions', () => {
  test('TAMBAH, KURANG, KALI and BAGI work on values and ranges', () => {
    const cells = {
      A1: '10', A2: '4', A3: '2',
      B1: '=TAMBAH(A1:A3)', B2: '=KURANG(A1:A3)', B3: '=KALI(A1:A3)', B4: '=BAGI(A1:A3)', B5: '=PRODUCT(A1,A2)',
    };
    expect(hitung(cells, 'B1')).toBe(16);
    expect(hitung(cells, 'B2')).toBe(4);
    expect(hitung(cells, 'B3')).toBe(80);
    expect(hitung(cells, 'B4')).toBe(1.25);
    expect(hitung(cells, 'B5')).toBe(40);
  });

  test('BAGI reports division by zero', () => {
    expect(hitung({ A1: '=BAGI(5,0)' }, 'A1')).toBe('#DIV/0!');
  });
});
