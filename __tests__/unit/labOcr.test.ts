import { describe, expect, test } from 'vitest';
import { extractValueForParameter } from '../../apps/web/src/lib/labOcr.ts';

describe('extractValueForParameter', () => {
  test('finds a decimal value on the line after the full parameter name', () => {
    const ocrText = 'Hemoglobin (Hb)   10.2   g/dL   12-16\nLeukosit (WBC)   12500  /uL   4000-10000';
    expect(extractValueForParameter(ocrText, 'Hemoglobin (Hb)')).toBe('10.2');
    expect(extractValueForParameter(ocrText, 'Leukosit (WBC)')).toBe('12500');
  });

  test('matches using the abbreviation in parentheses when the full name is not on the line', () => {
    const ocrText = 'Hb   8.5   g/dL';
    expect(extractValueForParameter(ocrText, 'Hemoglobin (Hb)')).toBe('8.5');
  });

  test('finds a titer ratio for Widal parameters', () => {
    const ocrText = 'Salmonella Typhi O   1/320   Titer   (-) Negatif';
    expect(extractValueForParameter(ocrText, 'Salmonella Typhi O')).toBe('1/320');
  });

  test('finds a negative/positive qualitative result', () => {
    expect(extractValueForParameter('Salmonella Paratyphi AO   Negatif', 'Salmonella Paratyphi AO')).toBe(
      'Negatif',
    );
  });

  test('is case-insensitive when matching the parameter name', () => {
    expect(extractValueForParameter('hemoglobin (hb)   9.1', 'Hemoglobin (Hb)')).toBe('9.1');
  });

  test('returns an empty string when the parameter is not found in the text', () => {
    expect(extractValueForParameter('Leukosit (WBC)   9000', 'Hemoglobin (Hb)')).toBe('');
  });

  test('returns an empty string when the name is found but no value follows it', () => {
    expect(extractValueForParameter('Hemoglobin (Hb)', 'Hemoglobin (Hb)')).toBe('');
  });

  test('matches via alias abbreviation when the catalog name has no parenthetical short form', () => {
    // Katalog klinik ini pakai nama polos ("Hemoglobine", "Leukosit", "SGOT")
    // tanpa singkatan, sementara foto analyzer biasanya cuma cetak singkatannya.
    expect(extractValueForParameter('Hb   10.5   g/dl', 'Hemoglobine')).toBe('10.5');
    expect(extractValueForParameter('WBC 8500 /ul', 'Leukosit')).toBe('8500');
    expect(extractValueForParameter('AST: 28 U/L', 'SGOT')).toBe('28');
    expect(extractValueForParameter('Widal - S. Typhi O   1/320', 'Widal - S. Typhi O')).toBe('1/320');
  });

  test('alias matching requires a word boundary to avoid false positives inside other words', () => {
    // "pa" adalah alias Paratyphi A — tidak boleh nyangkut di kata "pasien".
    expect(extractValueForParameter('Nama pasien: Budi 42', 'Widal - S. Paratyphi A')).toBe('');
  });

  test('matches abbreviations reported directly by clinic staff (Hb/WBC/PLT/RBC/Ht)', () => {
    expect(extractValueForParameter('RGB   13.2   g/dl', 'Hemoglobin')).toBe('13.2');
    expect(extractValueForParameter('WBC   7200   /ul', 'Jumlah Sel Leukosit')).toBe('7200');
    expect(extractValueForParameter('PLT   250000  /ul', 'Jumlah Sel Trombosit')).toBe('250000');
    expect(extractValueForParameter('RBC   4.8   juta/ul', 'Erytrosit (RBC)')).toBe('4.8');
    expect(extractValueForParameter('Ht    42     %', 'Hematokrit(Ht)')).toBe('42 %');
  });
});
