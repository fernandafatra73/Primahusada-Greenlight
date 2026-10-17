import { describe, expect, test } from 'vitest';
import { columnIndex, columnLabel, evaluateSheet } from '../../apps/web/src/lib/sheetFormula.ts';

function hitung(cells: Record<string, string>, key: string) {
  return evaluateSheet(cells).get(key);
}

describe('column labels', () => {
  test('converts between index and label', () => {
    expect(columnLabel(0)).toBe('A');
    expect(columnLabel(25)).toBe('Z');
    expect(columnLabel(26)).toBe('AA');
    expect(columnIndex('AA')).toBe(26);
  });
});

describe('evaluateSheet', () => {
  test('treats plain numbers as numbers and other input as text', () => {
    expect(hitung({ A1: '12.5', A2: 'Kas' }, 'A1')).toBe(12.5);
    expect(hitung({ A1: '12.5', A2: 'Kas' }, 'A2')).toBe('Kas');
  });

  test('evaluates arithmetic with precedence, parentheses and unary minus', () => {
    expect(hitung({ A1: '=2+3*4' }, 'A1')).toBe(14);
    expect(hitung({ A1: '=(2+3)*4' }, 'A1')).toBe(20);
    // Seperti Excel, minus unary mengikat lebih kuat dari ^.
    expect(hitung({ A1: '=-2^2+10/4' }, 'A1')).toBe(6.5);
  });

  test('follows cell references and ranges', () => {
    const cells = { A1: '10', B1: '20', C1: '=A1+B1', D1: '=SUM(A1:C1)', E1: '=AVERAGE(A1:B1)' };
    expect(hitung(cells, 'C1')).toBe(30);
    expect(hitung(cells, 'D1')).toBe(60);
    expect(hitung(cells, 'E1')).toBe(15);
  });

  test('ignores text and empty cells inside ranges', () => {
    expect(hitung({ A1: '5', A2: 'x', A4: '7', B1: '=SUM(A1:A4)' }, 'B1')).toBe(12);
  });

  test('supports MIN, MAX, COUNT, ABS and ROUND', () => {
    const cells = {
      A1: '3', A2: '-8', A3: '2.567',
      B1: '=MIN(A1:A3)', B2: '=MAX(A1:A3)', B3: '=COUNT(A1:A3)', B4: '=ABS(A2)', B5: '=ROUND(A3,1)',
    };
    expect(hitung(cells, 'B1')).toBe(-8);
    expect(hitung(cells, 'B2')).toBe(3);
    expect(hitung(cells, 'B3')).toBe(3);
    expect(hitung(cells, 'B4')).toBe(8);
    expect(hitung(cells, 'B5')).toBe(2.6);
  });

  test('reports errors instead of throwing', () => {
    expect(hitung({ A1: '=1/0' }, 'A1')).toBe('#DIV/0!');
    expect(hitung({ A1: 'abc', B1: '=A1+1' }, 'B1')).toBe('#VALUE!');
    expect(hitung({ A1: '=FOO(1)' }, 'A1')).toBe('#NAME?');
    expect(hitung({ A1: '=1+' }, 'A1')).toBe('#ERR!');
    expect(hitung({ A1: '=1 $ 2' }, 'A1')).toBe('#ERR!');
  });

  test('detects circular references', () => {
    expect(evaluateSheet({ A1: '=B1', B1: '=A1' }).get('A1')).toBe('#CIRC!');
  });

  test('propagates an error through dependent cells', () => {
    expect(hitung({ A1: '=1/0', B1: '=A1+1', C1: '=SUM(A1:B1)' }, 'C1')).toBe('#DIV/0!');
  });
});
