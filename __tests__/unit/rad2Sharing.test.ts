import { describe, expect, test } from 'vitest';
import { computeRad2Sharing, isThoraxPemeriksaan } from '../../apps/web/src/lib/rad2Sharing.ts';

const nominal = (pengirim: string, pemeriksaan: string, umur: number, harga = 150_000): number =>
  computeRad2Sharing({ pengirim, pemeriksaan, umur, harga }).nominal;

describe('isThoraxPemeriksaan', () => {
  test('recognises thorax spelling variants', () => {
    for (const name of ['Rontgen Thorax', 'thorak PA', 'Foto Toraks AP/Lat', 'THORAX']) {
      expect(isThoraxPemeriksaan(name)).toBe(true);
    }
  });

  test('does not match other examinations', () => {
    for (const name of ['Pedis AP', 'BNO', 'Thoracolumbal', '']) {
      expect(isThoraxPemeriksaan(name)).toBe(false);
    }
  });
});

describe('computeRad2Sharing', () => {
  test('dr. Anna Diah: thorax 18.000 under 10 years, 20.000 from 10 years', () => {
    expect(nominal('dr. Anna Diah', 'Rontgen Thorax', 9)).toBe(18_000);
    expect(nominal('ANNA DIAH, Sp.A', 'Thorak', 10)).toBe(20_000);
    expect(nominal('dr anna diah', 'Thorax', 45)).toBe(20_000);
  });

  test('dr. Anna Diah: 10% of harga for non-thorax examinations', () => {
    expect(nominal('dr. Anna Diah', 'Pedis AP', 30, 175_000)).toBe(17_500);
  });

  test('dr. Iman Purnawan and dr. Eva Christiani: thorax 33.000 under 10 years, 35.000 from 10 years', () => {
    expect(nominal('dr. Iman Purnawan', 'Rontgen Thorax', 5)).toBe(33_000);
    expect(nominal('dr. Iman Purnawan', 'Rontgen Thorax', 10)).toBe(35_000);
    expect(nominal('Dr. Eva Christiani', 'Thorax PA', 3)).toBe(33_000);
    expect(nominal('eva kristiani', 'Thorax PA', 60)).toBe(35_000);
  });

  test('dr. Iman Purnawan and dr. Eva Christiani: 30% of harga for non-thorax examinations', () => {
    expect(nominal('dr. Iman Purnawan', 'BNO', 40, 200_000)).toBe(60_000);
    expect(nominal('dr. Eva Christiani', 'Pedis', 8, 125_000)).toBe(37_500);
  });

  test('percentage rules round to whole rupiah and treat missing harga as 0', () => {
    expect(nominal('dr. Anna Diah', 'BNO', 20, 12_345)).toBe(1_235);
    expect(nominal('dr. Iman Purnawan', 'BNO', 20, Number.NaN)).toBe(0);
    expect(nominal('dr. Iman Purnawan', 'BNO', 20, -5)).toBe(0);
  });

  test('other doctors get 10.000 regardless of examination, age or harga', () => {
    expect(nominal('dr. Andi Wijaya', 'Rontgen Thorax', 5)).toBe(10_000);
    expect(nominal('dr. Andi Wijaya', 'BNO', 50, 500_000)).toBe(10_000);
    expect(nominal('', 'Thorax', 30)).toBe(10_000);
  });

  test('explains which rule was applied', () => {
    expect(
      computeRad2Sharing({ pengirim: 'dr. Anna Diah', pemeriksaan: 'Thorax', umur: 9, harga: 0 }).keterangan,
    ).toBe('dr. Anna Diah, thorax umur < 10 tahun');
  });
});
