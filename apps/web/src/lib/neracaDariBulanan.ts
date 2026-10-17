/** Bagian dari baris bulanan (Laporan Pajak Bulanan / skema 12 bulan) yang dipakai Neraca tahunan. */
export interface BulanUntukNeraca {
  readonly no: number;
  readonly pendapatan: number;
  readonly biayaSewaTempat: number;
  readonly biayaListrikAir: number;
  readonly gajiFernanda: number;
  readonly gajiChalimatusadiah: number;
  readonly gajiRiki: number;
  readonly gajiAgung: number;
  readonly gajiKaryawan1: number;
  readonly gajiKaryawan2: number;
  readonly bahanRoentgen: number;
  readonly peralatanRoentgen: number;
  readonly penyusutanManual: number;
  readonly perbaikanAlat: number;
  readonly labaBersih: number;
  readonly kasAkhir: number;
  readonly piutangUsaha: number;
  readonly perlengkapan: number;
  readonly utangUsaha: number;
  readonly peralatanNet: number;
  readonly modalPH: number;
}

/** Akun Neraca & Rugi Laba yang bisa diturunkan dari 12 bulan. */
export interface NeracaOtomatis {
  readonly pendapatan: number;
  readonly biayaGaji: number;
  readonly biayaAtkBahan: number;
  readonly biayaListrik: number;
  readonly biayaSewa: number;
  readonly biayaLainLain: number;
  readonly kas: number;
  readonly piutang: number;
  readonly persediaan: number;
  readonly peralatan: number;
  readonly utangUsaha: number;
  readonly modalUsaha: number;
}

function jumlah(bulan: readonly BulanUntukNeraca[], ambil: (b: BulanUntukNeraca) => number): number {
  return bulan.reduce((total, b) => total + ambil(b), 0);
}

/**
 * Rugi Laba = total 12 bulan. Neraca = posisi akhir Desember (bulan terakhir).
 * Modal Usaha dibuat sebagai selisih Modal PH Desember dan laba setahun, supaya
 * Modal Usaha + Laba Berjalan sama dengan Modal PH yang dipakai mini Neraca bulanan.
 */
export function hitungNeracaDariBulanan(bulan: readonly BulanUntukNeraca[]): NeracaOtomatis {
  const urut = [...bulan].sort((a, b) => a.no - b.no);
  const desember = urut[urut.length - 1];
  const labaSetahun = jumlah(urut, (b) => b.labaBersih);

  return {
    pendapatan: jumlah(urut, (b) => b.pendapatan),
    biayaGaji: jumlah(
      urut,
      (b) => b.gajiFernanda + b.gajiChalimatusadiah + b.gajiRiki + b.gajiAgung + b.gajiKaryawan1 + b.gajiKaryawan2,
    ),
    biayaAtkBahan: jumlah(urut, (b) => b.bahanRoentgen),
    biayaListrik: jumlah(urut, (b) => b.biayaListrikAir),
    biayaSewa: jumlah(urut, (b) => b.biayaSewaTempat),
    biayaLainLain: jumlah(urut, (b) => b.peralatanRoentgen + b.penyusutanManual + b.perbaikanAlat),
    kas: desember?.kasAkhir ?? 0,
    piutang: desember?.piutangUsaha ?? 0,
    persediaan: desember?.perlengkapan ?? 0,
    peralatan: desember?.peralatanNet ?? 0,
    utangUsaha: desember?.utangUsaha ?? 0,
    modalUsaha: (desember?.modalPH ?? 0) - labaSetahun,
  };
}
