import { describe, expect, test } from 'vitest';
import type { BulanUntukLembar, LabelGaji } from '../../apps/web/src/lib/excelBulanan.ts';
import { bangunWorkbookLaporan, type InfoLaporan } from '../../apps/web/src/lib/laporanSheets.ts';
import { evaluateWorkbook } from '../../apps/web/src/lib/sheetFormula.ts';

const NAMA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const gaji: LabelGaji = {
  labelFernanda: 'Fernanda', labelChalimatusadiah: 'Chalimatusadiah', labelRiki: 'Riki',
  labelAgung: 'Agung', labelKaryawan1: 'Karyawan1', labelKaryawan2: 'Karyawan 2',
};

const info: InfoLaporan = {
  year: 2026, namaPerusahaan: 'CV. Prima', tempatTandaTangan: 'Sukabumi', tanggalTandaTangan: '2027-03-01',
  namaPenandatangan: 'Fernanda', bank: 3000000, tanah: 0, gedung: 15600000, kendaraan: 0,
  utangPajak: 0, utangLainnya: 0, utangJangkaPanjang: 0, biayaTelpon: 1000000, biayaTransport: 2400000, biayaPajakSewa: 0,
};

function bulan(no: number): BulanUntukLembar {
  return {
    no, bulan: NAMA[no - 1]!, jumlahPasien: 74, harga: 110000, biayaSewaTempat: 1300000, biayaListrikAir: 400000,
    gajiFernanda: 2200000, gajiChalimatusadiah: 1200000, gajiRiki: 900000, gajiAgung: 900000, gajiKaryawan1: 0, gajiKaryawan2: 0,
    bahanRoentgen: 888000, peralatanRoentgen: 0, penyusutanManual: 0, perbaikanAlat: 0,
    kasAkhir: 4088000, piutangUsaha: 0, perlengkapan: 888000, peralatanNet: 76500000, utangUsaha: 0,
    akumulasiPenyusutanAkhir: 637500 * no, hargaPeralatan: 76500000, tarifPenyusutanTahunanPersen: 10, labaBersih: 352000,
  };
}

const wb = bangunWorkbookLaporan(Array.from({ length: 12 }, (_, i) => bulan(i + 1)), gaji, info, 'Rekap');
const nilai = evaluateWorkbook(wb.sheets.map((s) => ({ name: s.name, cells: s.cells })));
const sheetIdx = (nama: string) => wb.sheets.findIndex((s) => s.name === nama);
const v = (nama: string, alamat: string) => nilai[sheetIdx(nama)]!.get(alamat);

describe('bangunWorkbookLaporan', () => {
  test('creates the recap, twelve monthly sheets and the annual sheet', () => {
    expect(wb.sheets.map((s) => s.name)).toEqual(['Rekap 12 Bulan', ...NAMA, 'Neraca & Rugi Laba']);
  });

  test('has no formula errors anywhere', () => {
    const salah: string[] = [];
    nilai.forEach((peta, i) => peta.forEach((x, k) => { if (typeof x === 'string' && x.startsWith('#')) salah.push(`${wb.sheets[i]!.name}!${k}=${x}`); }));
    expect(salah).toEqual([]);
  });

  test('monthly sheet follows the reference layout and totals', () => {
    expect(v('Januari', 'E2')).toBe('JANUARI');
    expect(v('Januari', 'E4')).toBe(8140000);
    expect(v('Januari', 'B21')).toBe(1300000 + 400000 + 2200000 + 1200000 + 900000 + 900000 + 888000);
    expect(v('Januari', 'E22')).toBe(8140000 - 7788000);
  });

  test('monthly depreciation block matches the clinic workbook', () => {
    expect(v('Januari', 'E24')).toBe(76500000);
    expect(v('Januari', 'E26')).toBeCloseTo(637500, 4);
    expect(v('Januari', 'E27')).toBeCloseTo(75862500, 4);
    expect(v('Januari', 'E28')).toBe(352000);
    expect(v('Januari', 'E29')).toBeCloseTo(76214500, 4);
    // Modal Januari = Penyusutan - Laba bersih.
    expect(v('Januari', 'E25')).toBeCloseTo(637500 - 352000, 4);
  });

  test('monthly neraca balances by construction', () => {
    expect(v('Januari', 'B38')).toBeCloseTo(4088000 + 888000 + 76500000 - 637500, 4);
    expect(v('Januari', 'E38')).toBe(v('Januari', 'B38'));
  });

  test('annual sheet sums the twelve monthly sheets', () => {
    expect(v('Neraca & Rugi Laba', 'J5')).toBe(8140000 * 12);
    expect(v('Neraca & Rugi Laba', 'I8')).toBe((2200000 + 1200000 + 900000 + 900000) * 12);
    expect(v('Neraca & Rugi Laba', 'I9')).toBe(888000 * 12);
    expect(v('Neraca & Rugi Laba', 'I10')).toBe(400000 * 12);
    expect(v('Neraca & Rugi Laba', 'I11')).toBe(1000000);
    expect(v('Neraca & Rugi Laba', 'I12')).toBe(2400000);
    expect(v('Neraca & Rugi Laba', 'I13')).toBe(1300000 * 12);
  });

  test('annual laba = pendapatan - total biaya and feeds laba berjalan', () => {
    const pendapatan = 8140000 * 12;
    const biaya = (2200000 + 1200000 + 900000 + 900000 + 888000 + 400000 + 1300000) * 12 + 1000000 + 2400000;
    expect(v('Neraca & Rugi Laba', 'J17')).toBe(biaya);
    expect(v('Neraca & Rugi Laba', 'J19')).toBe(pendapatan - biaya);
    expect(v('Neraca & Rugi Laba', 'E18')).toBe(pendapatan - biaya);
  });

  test('annual neraca takes December positions and manual inputs', () => {
    expect(v('Neraca & Rugi Laba', 'B6')).toBe(4088000);
    expect(v('Neraca & Rugi Laba', 'B7')).toBe(3000000);
    expect(v('Neraca & Rugi Laba', 'B15')).toBeCloseTo(76500000 - 637500 * 12, 4);
    expect(v('Neraca & Rugi Laba', 'B21')).toBe(
      (v('Neraca & Rugi Laba', 'B10') as number) + (v('Neraca & Rugi Laba', 'B17') as number),
    );
    // Modal Usaha + Laba Berjalan = Modal PH Desember.
    expect(v('Neraca & Rugi Laba', 'E19')).toBe(v('Desember', 'E34'));
  });

  test('prints the company name and signature line', () => {
    expect(v('Neraca & Rugi Laba', 'A2')).toBe('CV. PRIMA');
    expect(v('Neraca & Rugi Laba', 'A3')).toBe('PER 31 DESEMBER 2026');
    expect(String(v('Neraca & Rugi Laba', 'G22'))).toMatch(/^Sukabumi, 1 Maret 2027$/i);
  });
});
