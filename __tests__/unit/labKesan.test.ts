import { describe, expect, test } from 'vitest';
import {
  DEFAULT_LAB_TABLE_ROWS,
  PAKET_PEMERIKSAAN_LAB,
  applyLabPackage,
  groupLabRowsForPdf,
  isDefaultUntouchedRows,
  lookupLabReference,
  parseLabKesan,
  serializeLabKesan,
  isLabResultAbnormal,
  formatAbnormalResult,
} from '../../apps/web/src/lib/labKesan.ts';
import { chunkLabRowsForPdf } from '../../apps/web/src/pdf/LabReportDocument.tsx';

describe('labKesan serialization and parsing', () => {
  test('serializes and parses lab rows with analisNama and analisId', () => {
    const rows = [
      { id: '1', pemeriksaan: 'Hemoglobin', hasil: '14.5', nilaiRujukan: '13-18' },
    ];
    const serialized = serializeLabKesan(rows, 'Kesan normal', 'Budi Analis', 'analis-1');

    const parsed = parseLabKesan(serialized);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.hasil).toBe('14.5');
    expect(parsed.catatan).toBe('Kesan normal');
    expect(parsed.analisNama).toBe('Budi Analis');
    expect(parsed.analisId).toBe('analis-1');
  });

  test('handles null or empty input safely', () => {
    const parsed = parseLabKesan(null);
    expect(parsed.catatan).toBe('');
    expect(parsed.analisNama).toBe('');
    expect(parsed.analisId).toBe('');
    expect(parsed.rows.length).toBeGreaterThan(0);
  });

  test('serializes empty catatan when catatan dan kesan laboratorium is omitted', () => {
    const rows = [
      { id: '1', pemeriksaan: 'Hemoglobin', hasil: '14.5', nilaiRujukan: '13-18' },
    ];
    const serialized = serializeLabKesan(rows, '', 'Budi Analis', 'analis-1');
    const parsed = parseLabKesan(serialized);
    expect(parsed.catatan).toBe('');
    expect(parsed.analisNama).toBe('Budi Analis');
    expect(parsed.analisId).toBe('analis-1');
  });
});

describe('PAKET_PEMERIKSAAN_LAB and applyLabPackage', () => {
  test('defines the nine required lab packages', () => {
    const ids = PAKET_PEMERIKSAAN_LAB.map((p) => p.id);
    expect(ids).toEqual([
      'hematologi',
      'kimia_darah',
      'diabetes',
      'urinalisa',
      'urine_rutin',
      'imunologi',
      'diffcount',
      'laju_endap_darah',
      'widal',
    ]);
  });

  test('isDefaultUntouchedRows detects default empty rows correctly', () => {
    expect(isDefaultUntouchedRows(DEFAULT_LAB_TABLE_ROWS)).toBe(true);

    const modified = [
      ...DEFAULT_LAB_TABLE_ROWS.slice(0, 1).map((r) => ({ ...r, hasil: '14.0' })),
      ...DEFAULT_LAB_TABLE_ROWS.slice(1),
    ];
    expect(isDefaultUntouchedRows(modified)).toBe(false);
  });

  test('applyLabPackage replaces default untouched rows with package rows', () => {
    const res = applyLabPackage(DEFAULT_LAB_TABLE_ROWS, 'kimia_darah');
    expect(res.length).toBe(17);
    expect(res[0]?.pemeriksaan).toBe('SGOT');
    expect(res[0]?.nilaiRujukan).toBe('< 35 U/L');
    expect(res[1]?.pemeriksaan).toBe('SGPT');
  });

  test('applyLabPackage formats hematologi headers and items correctly', () => {
    const res = applyLabPackage(DEFAULT_LAB_TABLE_ROWS, 'hematologi');
    expect(res.length).toBe(5);
    expect(res[0]?.pemeriksaan).toBe('Hemoglobine');
    expect(res[0]?.nilaiRujukan).toBe('L: 13-18 P: 12-16 g/dl');
    expect(res[1]?.pemeriksaan).toBe('Leukosit');

    const diff = applyLabPackage(DEFAULT_LAB_TABLE_ROWS, 'diffcount');
    expect(diff.length).toBe(6);
    expect(diff[0]?.pemeriksaan).toBe('Eosinofil');
  });

  test('applyLabPackage appends unique package rows when current rows are modified', () => {
    const current = [
      { id: '101', pemeriksaan: 'SGOT', hasil: '30', nilaiRujukan: '< 35 U/L' },
    ];
    const res = applyLabPackage(current, 'kimia_darah');
    expect(res.length).toBe(17);
    expect(res[0]?.hasil).toBe('30');
    expect(res.map((r) => r.pemeriksaan)).not.toContainEqual('SGOT-duplicate');
  });

  test('serializes and parses extra registration fields (klasifikasi, discount, dokterLab)', () => {
    const rows = [
      { id: '1', pemeriksaan: 'Hemoglobine', hasil: '15', nilaiRujukan: 'L: 13-18 P: 12-16 g/dl' },
    ];
    const serialized = serializeLabKesan(rows, 'Normal', 'Analis 1', 'id-1', {
      klasifikasi: 'hematologi',
      dokterLabNama: 'Dr. Lab',
      discount: 25000,
      sharing: 50000,
      hasilBayar: 'LUNAS',
    });
    const parsed = parseLabKesan(serialized);
    expect(parsed.klasifikasi).toBe('hematologi');
    expect(parsed.dokterLabNama).toBe('Dr. Lab');
    expect(parsed.discount).toBe(25000);
    expect(parsed.sharing).toBe(50000);
    expect(parsed.hasilBayar).toBe('LUNAS');
  });
});

describe('lookupLabReference and groupLabRowsForPdf', () => {
  test('lookupLabReference finds builtin examination reference and klasifikasi', () => {
    const match = lookupLabReference('SGOT');
    expect(match).toEqual({
      klasifikasi: 'Kimia Darah',
      nilaiRujukan: '< 35 U/L',
    });

    const hem = lookupLabReference('Hemoglobine');
    expect(hem).toEqual({
      klasifikasi: 'Hematologi',
      nilaiRujukan: 'L: 13-18 P: 12-16 g/dl',
    });

    const eos = lookupLabReference('Eosinofil');
    expect(eos).toEqual({
      klasifikasi: 'Diffcount',
      nilaiRujukan: '1 - 3 %',
    });

    const led = lookupLabReference('LED');
    expect(led).toEqual({
      klasifikasi: 'Laju Endap Darah',
      nilaiRujukan: '< 20 mm/jam',
    });
  });

  test('lookupLabReference prioritizes DB package examination reference and klasifikasi', () => {
    const dbPackages = [
      {
        nama: 'Paket Khusus DB',
        items: [{ pemeriksaan: 'Test Khusus', nilaiRujukan: '100-200 mg/dl' }],
      },
    ];
    const res = lookupLabReference('Test Khusus', dbPackages);
    expect(res).toEqual({
      klasifikasi: 'Paket Khusus DB',
      nilaiRujukan: '100-200 mg/dl',
    });
  });

  test('groupLabRowsForPdf inserts category header rows when klasifikasi changes', () => {
    const rows = [
      { id: '1', klasifikasi: 'Hematologi', pemeriksaan: 'Hemoglobin', hasil: '14', nilaiRujukan: '13-18' },
      { id: '2', klasifikasi: 'Hematologi', pemeriksaan: 'Leukosit', hasil: '7000', nilaiRujukan: '5000-10000' },
      { id: '3', klasifikasi: 'Kimia Darah', pemeriksaan: 'SGOT', hasil: '25', nilaiRujukan: '< 35' },
    ];
    const grouped = groupLabRowsForPdf(rows);
    expect(grouped).toEqual([
      { name: 'HEMATOLOGI', result: '', reference: '', isHeader: true },
      { name: 'Hemoglobin', result: '14', reference: '13-18' },
      { name: 'Leukosit', result: '7000', reference: '5000-10000' },
      { name: 'KIMIA DARAH', result: '', reference: '', isHeader: true },
      { name: 'SGOT', result: '25', reference: '< 35' },
    ]);
  });

  test('groupLabRowsForPdf splits "Induk - Anak" klasifikasi into stacked header rows top-to-bottom', () => {
    const rows = [
      { id: '1', klasifikasi: 'Urinalisa - Urine Rutin - Makroskopis', pemeriksaan: 'LEU', hasil: 'Negatif', nilaiRujukan: 'Negatif' },
      { id: '2', klasifikasi: 'Urinalisa - Urine Rutin - Makroskopis', pemeriksaan: 'pH', hasil: '6', nilaiRujukan: '4,5 - 8,0' },
      { id: '3', klasifikasi: 'Urinalisa - Mikroskopis', pemeriksaan: 'Eritrosit (RBC)', hasil: '1', nilaiRujukan: '0 - 2 /LPB' },
    ];
    const grouped = groupLabRowsForPdf(rows);
    expect(grouped).toEqual([
      { name: 'URINALISA', result: '', reference: '', isHeader: true },
      { name: 'URINE RUTIN', result: '', reference: '', isHeader: true },
      { name: 'MAKROSKOPIS', result: '', reference: '', isHeader: true },
      { name: 'LEU', result: 'Negatif', reference: 'Negatif' },
      { name: 'pH', result: '6', reference: '4,5 - 8,0' },
      { name: 'MIKROSKOPIS', result: '', reference: '', isHeader: true },
      { name: 'Eritrosit (RBC)', result: '1', reference: '0 - 2 /LPB' },
    ]);
  });
});

describe('abnormal lab result asterisk formatting', () => {
  test('isLabResultAbnormal detects numbers outside reference range', () => {
    expect(isLabResultAbnormal('250', '< 200 mg/dl')).toBe(true);
    expect(isLabResultAbnormal('150', '< 200 mg/dl')).toBe(false);
    expect(isLabResultAbnormal('4.500', '5.000 - 10.000 /µl')).toBe(true);
    expect(isLabResultAbnormal('7.000', '5.000 - 10.000 /µl')).toBe(false);
  });

  test('isLabResultAbnormal respects sex-specific reference ranges', () => {
    expect(isLabResultAbnormal('11.0', 'L: 13-18 P: 12-16 g/dl', 'P')).toBe(true);
    expect(isLabResultAbnormal('13.0', 'L: 13-18 P: 12-16 g/dl', 'P')).toBe(false);
    expect(isLabResultAbnormal('12.5', 'L: 13-18 P: 12-16 g/dl', 'L')).toBe(true);
    expect(isLabResultAbnormal('15.0', 'L: 13-18 P: 12-16 g/dl', 'L')).toBe(false);
  });

  test('isLabResultAbnormal detects qualitative abnormal results', () => {
    expect(isLabResultAbnormal('Positif', 'Negatif')).toBe(true);
    expect(isLabResultAbnormal('Negatif', 'Negatif')).toBe(false);
  });

  test('formatAbnormalResult appends * to abnormal results and strips * from normal results', () => {
    expect(formatAbnormalResult('250', '< 200 mg/dl')).toBe('250*');
    expect(formatAbnormalResult('250*', '< 200 mg/dl')).toBe('250*');
    expect(formatAbnormalResult('150*', '< 200 mg/dl')).toBe('150');
    expect(formatAbnormalResult('Positif', 'Negatif')).toBe('Positif*');
  });
});

describe('chunkLabRowsForPdf pagination', () => {
  test('splits overflow across pages and keeps the last page within lastPageSize', () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({
      name: `Test ${i + 1}`,
      result: '10',
      reference: '5-15',
    }));
    const chunks = chunkLabRowsForPdf(rows, 32);
    expect(chunks.length).toBe(2);
    // The last page also carries the notes box and signature block, so it
    // gets a smaller budget (default 20) instead of being packed as full
    // as an interior page — otherwise that content overflows the sheet.
    expect(chunks[0].length + chunks[1].length).toBe(45);
    expect(chunks[1].length).toBeLessThanOrEqual(20);
  });

  test('returns a single page when rows <= lastPageSize', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      name: `Test ${i + 1}`,
      result: '10',
      reference: '5-15',
    }));
    const chunks = chunkLabRowsForPdf(rows, 32);
    expect(chunks.length).toBe(1);
    expect(chunks[0].length).toBe(20);
  });

  test('never lets the last page exceed lastPageSize, across a range of row counts', () => {
    for (const n of [21, 32, 33, 45, 52, 53, 64, 100]) {
      const rows = Array.from({ length: n }, (_, i) => ({
        name: `Test ${i + 1}`,
        result: '10',
        reference: '5-15',
      }));
      const chunks = chunkLabRowsForPdf(rows, 32, 20);
      const total = chunks.reduce((sum, c) => sum + c.length, 0);
      expect(total).toBe(n);
      expect(chunks[chunks.length - 1].length).toBeLessThanOrEqual(20);
      for (const c of chunks.slice(0, -1)) {
        expect(c.length).toBeLessThanOrEqual(32);
      }
    }
  });
});


