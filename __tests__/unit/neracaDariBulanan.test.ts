import { describe, expect, test } from 'vitest';
import {
  hitungNeracaDariBulanan,
  type BulanUntukNeraca,
} from '../../apps/web/src/lib/neracaDariBulanan.ts';

function bulan(no: number, patch: Partial<BulanUntukNeraca> = {}): BulanUntukNeraca {
  return {
    no, pendapatan: 0, biayaSewaTempat: 0, biayaListrikAir: 0,
    gajiFernanda: 0, gajiChalimatusadiah: 0, gajiRiki: 0, gajiAgung: 0, gajiKaryawan1: 0, gajiKaryawan2: 0,
    bahanRoentgen: 0, peralatanRoentgen: 0, penyusutanManual: 0, perbaikanAlat: 0,
    labaBersih: 0, kasAkhir: 0, piutangUsaha: 0, perlengkapan: 0, utangUsaha: 0, peralatanNet: 0, modalPH: 0,
    ...patch,
  };
}

describe('hitungNeracaDariBulanan', () => {
  test('sums rugi laba accounts over the 12 months', () => {
    const hasil = hitungNeracaDariBulanan([
      bulan(1, { pendapatan: 100, gajiFernanda: 10, gajiRiki: 5, biayaSewaTempat: 7, biayaListrikAir: 3, bahanRoentgen: 2, perbaikanAlat: 1 }),
      bulan(2, { pendapatan: 50, gajiAgung: 4, peralatanRoentgen: 6, penyusutanManual: 8 }),
    ]);
    expect(hasil.pendapatan).toBe(150);
    expect(hasil.biayaGaji).toBe(19);
    expect(hasil.biayaSewa).toBe(7);
    expect(hasil.biayaListrik).toBe(3);
    expect(hasil.biayaAtkBahan).toBe(2);
    expect(hasil.biayaLainLain).toBe(15);
  });

  test('takes neraca positions from the last month regardless of input order', () => {
    const hasil = hitungNeracaDariBulanan([
      bulan(12, { kasAkhir: 900, piutangUsaha: 5, perlengkapan: 6, utangUsaha: 7, peralatanNet: 800, modalPH: 1000, labaBersih: 40 }),
      bulan(1, { kasAkhir: 100, labaBersih: 60 }),
    ]);
    expect(hasil.kas).toBe(900);
    expect(hasil.piutang).toBe(5);
    expect(hasil.persediaan).toBe(6);
    expect(hasil.utangUsaha).toBe(7);
    expect(hasil.peralatan).toBe(800);
  });

  test('modal usaha plus laba berjalan equals modal PH of December', () => {
    const hasil = hitungNeracaDariBulanan([
      bulan(1, { labaBersih: 60 }),
      bulan(12, { labaBersih: 40, modalPH: 1000 }),
    ]);
    expect(hasil.modalUsaha + 100).toBe(1000);
  });

  test('returns zeros when there is no data', () => {
    const hasil = hitungNeracaDariBulanan([]);
    expect(hasil.pendapatan).toBe(0);
    expect(hasil.kas).toBe(0);
    expect(hasil.modalUsaha).toBe(0);
  });
});
