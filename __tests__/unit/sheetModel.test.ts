import { describe, expect, test } from 'vitest';
import {
  gantiNamaSheetDiRumus,
  rapikanRumus,
  sesuaikanRumusStruktur,
  shiftFormula,
} from '../../apps/web/src/lib/sheetRefs.ts';
import {
  bacaWorkbook,
  bikinSheet,
  bikinWorkbook,
  gantiNamaSheet,
  hapusSheet,
  isiBlok,
  tambahSheet,
  tampilkanNilai,
  tempelBlok,
  ambilBlok,
  tulisSel,
  ubahGaya,
  ubahStruktur,
  ubahUkuran,
  type Workbook,
} from '../../apps/web/src/lib/sheetModel.ts';

function buku(cells: Record<string, string>, nama = 'Data'): Workbook {
  return bikinWorkbook({ ...bikinSheet(nama, 10, 6), cells });
}

describe('shiftFormula', () => {
  test('moves relative references and keeps absolute ones', () => {
    expect(shiftFormula('=A1+$B$2+C$3+$D4', 1, 2)).toBe('=B3+$B$2+D$3+$D6');
  });

  test('shifts ranges and sheet-qualified references', () => {
    expect(shiftFormula('=SUM(B2:B5)+Data!A1', 1, 0)).toBe('=SUM(C2:C5)+Data!B1');
  });

  test('does not touch text literals or function names', () => {
    expect(shiftFormula('="A1"&LOG10(A1)', 0, 1)).toBe('="A1"&LOG10(A2)');
  });

  test('turns references that fall off the grid into #REF!', () => {
    expect(shiftFormula('=A1', -1, 0)).toBe('=#REF!');
  });

  test('leaves plain values alone', () => {
    expect(shiftFormula('A1', 3, 3)).toBe('A1');
  });
});

describe('rapikanRumus', () => {
  test('uppercases formulas but not text literals', () => {
    expect(rapikanRumus('=sum(a1:b2)&"abc"')).toBe('=SUM(A1:B2)&"abc"');
    expect(rapikanRumus('abc')).toBe('abc');
  });
});

describe('sesuaikanRumusStruktur', () => {
  test('inserting a row shifts references at or below it', () => {
    expect(sesuaikanRumusStruktur('=A1+A3+SUM(A2:A4)', 'Data', 'Data', 'baris', 1, 1)).toBe('=A1+A4+SUM(A3:A5)');
  });

  test('inserting inside a range expands it', () => {
    expect(sesuaikanRumusStruktur('=SUM(A1:A3)', 'Data', 'Data', 'baris', 2, 1)).toBe('=SUM(A1:A4)');
  });

  test('deleting a row invalidates direct references and shrinks ranges', () => {
    expect(sesuaikanRumusStruktur('=A2+A4', 'Data', 'Data', 'baris', 1, -1)).toBe('=#REF!+A3');
    expect(sesuaikanRumusStruktur('=SUM(A1:A4)', 'Data', 'Data', 'baris', 1, -2)).toBe('=SUM(A1:A2)');
    expect(sesuaikanRumusStruktur('=SUM(A2:A3)', 'Data', 'Data', 'baris', 1, -2)).toBe('=SUM(#REF!)');
  });

  test('columns work the same way', () => {
    expect(sesuaikanRumusStruktur('=B1+C1', 'Data', 'Data', 'kolom', 1, 1)).toBe('=C1+D1');
  });

  test('only touches references to the changed sheet', () => {
    expect(sesuaikanRumusStruktur('=A5+Lain!A5', 'Data', 'Lain', 'baris', 0, 1)).toBe('=A5+Lain!A6');
    expect(sesuaikanRumusStruktur('=A5', 'Data', 'Data', 'baris', 0, 1)).toBe('=A6');
  });
});

describe('gantiNamaSheetDiRumus', () => {
  test('renames and quotes sheet names, or invalidates on delete', () => {
    expect(gantiNamaSheetDiRumus('=Data!A1+B1', 'Data', 'Data Baru')).toBe("='Data Baru'!A1+B1");
    expect(gantiNamaSheetDiRumus('=Data!A1', 'data', null)).toBe('=#REF!');
  });
});

describe('ubahStruktur', () => {
  test('inserting a row moves cells, styles, heights and formulas', () => {
    let wb = buku({ A1: '1', A2: '2', B2: '=A2*2' });
    wb = ubahGaya(wb, 0, ['A2'], { b: true });
    wb = ubahUkuran(wb, 0, 'baris', 1, 50);
    const hasil = ubahStruktur(wb, 0, 'baris', 1, 1);
    const sheet = hasil.sheets[0]!;
    expect(sheet.cells).toEqual({ A1: '1', A3: '2', B3: '=A3*2' });
    expect(sheet.styles).toEqual({ A3: { b: true } });
    expect(sheet.rowHeights).toEqual({ '2': 50 });
    expect(sheet.rows).toBe(11);
  });

  test('deleting a row drops its cells and invalidates references to them', () => {
    const wb = buku({ A1: '1', A2: '2', A3: '3', B3: '=A2+A3' });
    const sheet = ubahStruktur(wb, 0, 'baris', 1, -1).sheets[0]!;
    expect(sheet.cells).toEqual({ A1: '1', A2: '3', B2: '=#REF!+A2' });
    expect(sheet.rows).toBe(9);
  });

  test('deleting a column shifts the rest left', () => {
    const wb = buku({ A1: '1', B1: '2', C1: '=A1+C1' });
    const sheet = ubahStruktur(wb, 0, 'kolom', 1, -1).sheets[0]!;
    expect(sheet.cells).toEqual({ A1: '1', B1: '=A1+B1' });
    expect(sheet.cols).toBe(5);
  });

  test('updates formulas on other sheets that reference the changed one', () => {
    const dasar = buku({ A1: '1' });
    const wb: Workbook = { ...dasar, sheets: [...dasar.sheets, { ...bikinSheet('Lain', 10, 6), cells: { A1: '=Data!A1' } }] };
    expect(ubahStruktur(wb, 0, 'baris', 0, 1).sheets[1]!.cells.A1).toBe('=Data!A2');
  });

  test('refuses to exceed limits or delete everything', () => {
    const wb = buku({});
    expect(ubahStruktur(wb, 0, 'baris', 0, 1000)).toBe(wb);
    expect(ubahStruktur(wb, 0, 'baris', 0, -10)).toBe(wb);
  });
});

describe('sheets', () => {
  test('adds, renames (rewriting references) and deletes', () => {
    let wb = buku({ A1: '5' });
    wb = tambahSheet(wb);
    expect(wb.sheets.map((s) => s.name)).toEqual(['Data', 'Sheet2']);
    wb = tulisSel(wb, 1, { A1: '=Data!A1' });
    wb = gantiNamaSheet(wb, 0, 'Pasien Baru');
    expect(wb.sheets[1]!.cells.A1).toBe("='Pasien Baru'!A1");
    wb = hapusSheet(wb, 0);
    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0]!.cells.A1).toBe('=#REF!');
    expect(hapusSheet(wb, 0)).toBe(wb);
  });

  test('keeps sheet names unique and strips illegal characters', () => {
    let wb = tambahSheet(buku({}));
    wb = gantiNamaSheet(wb, 1, 'data');
    expect(wb.sheets[1]!.name).toBe('data (2)');
    wb = gantiNamaSheet(wb, 1, 'a/b?c');
    expect(wb.sheets[1]!.name).toBe('abc');
  });
});

describe('copy, paste and fill', () => {
  test('paste shifts relative formulas and copies styles', () => {
    let wb = buku({ A1: '2', B1: '=A1*2' });
    wb = ubahGaya(wb, 0, ['B1'], { b: true, fmt: 'rupiah' });
    const salinan = ambilBlok(wb.sheets[0]!, { c1: 1, r1: 0, c2: 1, r2: 0 });
    const hasil = tempelBlok(wb, 0, salinan, 1, 2).sheets[0]!;
    expect(hasil.cells.B3).toBe('=A3*2');
    expect(hasil.styles.B3).toEqual({ b: true, fmt: 'rupiah' });
  });

  test('cut-paste moves cells without shifting formulas', () => {
    const wb = buku({ A1: '2', B1: '=A1*2' });
    const salinan = ambilBlok(wb.sheets[0]!, { c1: 1, r1: 0, c2: 1, r2: 0 }, true);
    const hasil = tempelBlok(wb, 0, salinan, 3, 3).sheets[0]!;
    expect(hasil.cells.D4).toBe('=A1*2');
    expect(hasil.cells.B1).toBeUndefined();
  });

  test('fill repeats the source pattern and shifts formulas', () => {
    const wb = buku({ A1: '1', A2: '=A1+1' });
    const hasil = isiBlok(wb, 0, { c1: 0, r1: 1, c2: 0, r2: 1 }, { c1: 0, r1: 1, c2: 0, r2: 4 }).sheets[0]!;
    expect(hasil.cells.A3).toBe('=A2+1');
    expect(hasil.cells.A5).toBe('=A4+1');
  });

  test('fill repeats multi-cell patterns', () => {
    const wb = buku({ A1: 'x', A2: 'y' });
    const hasil = isiBlok(wb, 0, { c1: 0, r1: 0, c2: 0, r2: 1 }, { c1: 0, r1: 0, c2: 0, r2: 4 }).sheets[0]!;
    expect([hasil.cells.A3, hasil.cells.A4, hasil.cells.A5]).toEqual(['x', 'y', 'x']);
  });
});

describe('styles and sizes', () => {
  test('null removes a style property and empty styles disappear', () => {
    let wb = ubahGaya(buku({}), 0, ['A1'], { b: true, fill: '#ffffff' });
    wb = ubahGaya(wb, 0, ['A1'], { fill: null });
    expect(wb.sheets[0]!.styles.A1).toEqual({ b: true });
    wb = ubahGaya(wb, 0, ['A1'], { b: null });
    expect(wb.sheets[0]!.styles.A1).toBeUndefined();
  });

  test('clamps column widths and row heights', () => {
    let wb = ubahUkuran(buku({}), 0, 'kolom', 0, 5);
    expect(wb.sheets[0]!.colWidths['0']).toBe(30);
    wb = ubahUkuran(wb, 0, 'baris', 0, 9999);
    expect(wb.sheets[0]!.rowHeights['0']).toBe(240);
  });
});

describe('tampilkanNilai', () => {
  test('applies number formats using the Indonesian locale', () => {
    expect(tampilkanNilai(1234567, 'angka')).toBe('1.234.567');
    expect(tampilkanNilai(1234.5, 'desimal')).toBe('1.234,50');
    expect(tampilkanNilai(1500000, 'rupiah')).toBe('Rp 1.500.000');
    expect(tampilkanNilai(0.125, 'persen')).toBe('12,50%');
  });

  test('leaves text, booleans and errors unformatted', () => {
    expect(tampilkanNilai('halo', 'rupiah')).toBe('halo');
    expect(tampilkanNilai(true)).toBe('TRUE');
    expect(tampilkanNilai('#DIV/0!', 'angka')).toBe('#DIV/0!');
    expect(tampilkanNilai(undefined)).toBe('');
  });
});

describe('bacaWorkbook', () => {
  test('wraps the legacy cell map into one sheet', () => {
    const wb = bacaWorkbook({ A1: '1', B2: '=A1' });
    expect(wb?.sheets).toHaveLength(1);
    expect(wb?.sheets[0]!.cells).toEqual({ A1: '1', B2: '=A1' });
  });

  test('reads workbooks, dropping invalid style values and clamping sizes', () => {
    const wb = bacaWorkbook({
      version: 2,
      sheets: [{ name: 'S', cells: { A1: '1' }, styles: { A1: { b: true, fill: 'merah', fmt: 'rupiah', al: 'x' } }, colWidths: { '0': 99 }, rowHeights: {}, rows: 9999, cols: 0 }],
    });
    const sheet = wb!.sheets[0]!;
    expect(sheet.styles.A1).toEqual({ b: true, fmt: 'rupiah' });
    expect(sheet.rows).toBe(500);
    expect(sheet.cols).toBe(1);
  });

  test('rejects non-objects and empty workbooks', () => {
    expect(bacaWorkbook(null)).toBeNull();
    expect(bacaWorkbook({ sheets: [] })).toBeNull();
  });
});
