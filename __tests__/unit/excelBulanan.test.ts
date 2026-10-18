import { describe, expect, test } from 'vitest';
import {
  bangunLembarDariBulanan,
  type BulanUntukLembar,
  type LabelGaji,
} from '../../apps/web/src/lib/excelBulanan.ts';
import { evaluateSheet } from '../../apps/web/src/lib/sheetFormula.ts';

const label: LabelGaji = {
  labelFernanda: 'Fernanda', labelChalimatusadiah: 'Chalimatusadiah', labelRiki: 'Riki',
  labelAgung: 'Agung', labelKaryawan1: 'Karyawan 1', labelKaryawan2: 'Karyawan 2',
};

function bulan(no: number, patch: Partial<BulanUntukLembar> = {}): BulanUntukLembar {
  return {
    no, bulan: `Bulan ${no}`, jumlahPasien: 0, harga: 0, biayaSewaTempat: 0, biayaListrikAir: 0,
    gajiFernanda: 0, gajiChalimatusadiah: 0, gajiRiki: 0, gajiAgung: 0, gajiKaryawan1: 0, gajiKaryawan2: 0,
    bahanRoentgen: 0, peralatanRoentgen: 0, penyusutanManual: 0, perbaikanAlat: 0,
    kasAkhir: 0, piutangUsaha: 0, perlengkapan: 0, peralatanNet: 0, utangUsaha: 0,
    hargaPeralatan: 0, tarifPenyusutanTahunanPersen: 10, labaBersih: 0,
    ...patch,
  };
}

function cari(cells: Readonly<Record<string, string>>, uraian: string): number {
  const entry = Object.entries(cells).find(([k, v]) => k.startsWith('A') && v === uraian);
  if (!entry) throw new Error(`Baris ${uraian} tidak ada`);
  return Number(entry[0].slice(1));
}

describe('bangunLembarDariBulanan', () => {
  test('builds one sheet with number formats and a styled header', () => {
    const wb = bangunLembarDariBulanan([bulan(1)], label, 'Judul');
    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0]!.name).toBe('Hasil Perbulan');
    expect(wb.sheets[0]!.styles.B2).toMatchObject({ b: true, fill: '#217346' });
    expect(wb.sheets[0]!.styles.B3).toMatchObject({ fmt: 'angka' });
    expect(wb.sheets[0]!.styles.B5).toMatchObject({ fmt: 'rupiah' });
  });

  const data = [
    bulan(1, { jumlahPasien: 76, harga: 110000, biayaSewaTempat: 1300000, gajiFernanda: 2200000, kasAkhir: 5000000, peralatanNet: 80000000, utangUsaha: 1000000 }),
    bulan(2, { jumlahPasien: 10, harga: 100000, bahanRoentgen: 50000 }),
  ];
  const workbook = bangunLembarDariBulanan(data, label, 'Hasil Perbulan Radiologi 2026');
  const cells = workbook.sheets[0]!.cells;

  test('writes title, header and month names', () => {
    expect(cells.A1).toBe('Hasil Perbulan Radiologi 2026');
    expect(cells.A2).toBe('Uraian');
    expect(cells.B2).toBe('Bulan 1');
    expect(cells.C2).toBe('Bulan 2');
    expect(cells.N2).toBe('Total');
  });

  test('uses the gaji labels in the row names', () => {
    expect(Object.values(cells)).toContain('Gaji Fernanda');
    expect(Object.values(cells)).toContain('Gaji Karyawan 2');
  });

  test('puts base data as values and derived rows as formulas', () => {
    const pasien = cari(cells, 'Jumlah Pasien');
    const pendapatan = cari(cells, 'Pendapatan');
    expect(cells[`B${pasien}`]).toBe('76');
    expect(cells[`B${pendapatan}`]).toBe(`=B${pasien}*B${pasien + 1}`);
  });

  test('computes pendapatan, totals and laba like the monthly report', () => {
    const hasil = evaluateSheet(cells);
    const pendapatan = cari(cells, 'Pendapatan');
    const beban = cari(cells, 'Total Beban Usaha');
    const laba = cari(cells, 'Laba Bersih');
    expect(hasil.get(`B${pendapatan}`)).toBe(8360000);
    expect(hasil.get(`N${pendapatan}`)).toBe(8360000 + 1000000);
    expect(hasil.get(`B${beban}`)).toBe(3500000);
    expect(hasil.get(`C${beban}`)).toBe(50000);
    expect(hasil.get(`B${laba}`)).toBe(8360000 - 3500000);
    expect(hasil.get(`N${laba}`)).toBe(8360000 + 1000000 - 3550000);
  });

  test('derives Jumlah Aktiva and Modal PH with formulas', () => {
    const hasil = evaluateSheet(cells);
    expect(hasil.get(`B${cari(cells, 'Jumlah Aktiva')}`)).toBe(85000000);
    expect(hasil.get(`B${cari(cells, 'Modal PH')}`)).toBe(84000000);
  });

  test('has no Total for neraca rows or the harga row', () => {
    expect(cells[`N${cari(cells, 'Kas')}`]).toBeUndefined();
    expect(cells[`N${cari(cells, 'Harga per Pasien')}`]).toBeUndefined();
  });

  test('adds the equipment depreciation and modal block below the neraca', () => {
    const wb = bangunLembarDariBulanan(
      [bulan(1, { hargaPeralatan: 76500000, jumlahPasien: 10, harga: 100000 })],
      label,
      'Judul',
    );
    const sel = wb.sheets[0]!.cells;
    const harga = cari(sel, 'Harga Peralatan');
    const susut = cari(sel, 'Penyusutan peralatan');
    const modal = cari(sel, 'Modal');
    const hasil = evaluateSheet(sel);
    expect(sel[`D${harga}`]).toBe('76500000');
    expect(hasil.get(`B${susut}`)).toBeCloseTo(0.1);
    expect(hasil.get(`C${susut}`)).toBeCloseTo(0.008333333, 8);
    // Penyusutan = Harga Peralatan x (10% / 12) = 637.500.
    const penyusutan = 637500;
    expect(hasil.get(`D${susut}`)).toBeCloseTo(penyusutan, 4);
    expect(hasil.get(`D${susut + 1}`)).toBeCloseTo(76500000 - penyusutan, 4);
    // Laba bersih diambil dari baris Laba Bersih Januari: pendapatan 1.000.000 tanpa beban.
    expect(hasil.get(`D${cari(sel, 'Laba bersih')}`)).toBe(1000000);
    // Modal Januari = Penyusutan - Laba bersih.
    expect(hasil.get(`D${cari(sel, 'Modal Januari')}`)).toBeCloseTo(penyusutan - 1000000, 4);
    expect(hasil.get(`D${modal}`)).toBeCloseTo(76500000 - penyusutan + 1000000, 4);
  });
});
