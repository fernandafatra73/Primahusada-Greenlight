import { describe, expect, test } from 'vitest';
import { parseKesanTemplateTsv } from '../../apps/api/src/lib/kesanTemplateImport.ts';

describe('parseKesanTemplateTsv', () => {
  test('uses pemeriksaan as judul and joins filled bacaan columns line by line', () => {
    const tsv = [
      'PEMERIKSAAN\tBACAAN1\tBACAAN2\tBACAAN3',
      'Kepala\tLesi fronto temporo parietal dextra\tSusp SOL\tSaran: CT-Scan Kepala',
      'Cruris R\tTampak fraktur os cruris dextra\t\t',
    ].join('\n');
    expect(parseKesanTemplateTsv(tsv)).toEqual([
      { judul: 'Kepala', isi: 'Lesi fronto temporo parietal dextra\nSusp SOL\nSaran: CT-Scan Kepala' },
      { judul: 'Cruris R', isi: 'Tampak fraktur os cruris dextra' },
    ]);
  });

  test('trims cells, ignores whitespace-only bacaan and handles CRLF', () => {
    expect(parseKesanTemplateTsv('Thorak \t Post Kp \t \t\r\nUSG Cysta\tCysta ovarium dextra\t ')).toEqual([
      { judul: 'Thorak', isi: 'Post Kp' },
      { judul: 'USG Cysta', isi: 'Cysta ovarium dextra' },
    ]);
  });

  test('drops exact duplicates but keeps same judul with different isi', () => {
    const tsv = 'Thorak\tA\tB\nThorak\tA\tB\nThorak \tA\tB \nThorak\tA';
    expect(parseKesanTemplateTsv(tsv)).toEqual([
      { judul: 'Thorak', isi: 'A\nB' },
      { judul: 'Thorak', isi: 'A' },
    ]);
  });

  test('skips blank lines, rows without judul and rows without any bacaan', () => {
    expect(parseKesanTemplateTsv('\n\tOrphan bacaan\nFemur R\n  \t  ')).toEqual([]);
  });
});
