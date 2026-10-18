import { cellKey } from './sheetFormula.ts';
import { bikinSheet, bikinWorkbook, type CellStyle, type NumFmt, type Workbook } from './sheetModel.ts';

/** Bagian dari baris bulanan (/api/laporan/pajak-bulanan) yang masuk ke lembar Excel. */
export interface BulanUntukLembar {
  readonly no: number;
  readonly bulan: string;
  readonly jumlahPasien: number;
  readonly harga: number;
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
  readonly kasAkhir: number;
  readonly piutangUsaha: number;
  readonly perlengkapan: number;
  readonly peralatanNet: number;
  readonly utangUsaha: number;
  readonly hargaPeralatan: number;
  readonly tarifPenyusutanTahunanPersen: number;
  readonly labaBersih: number;
}

export interface LabelGaji {
  readonly labelFernanda: string;
  readonly labelChalimatusadiah: string;
  readonly labelRiki: string;
  readonly labelAgung: string;
  readonly labelKaryawan1: string;
  readonly labelKaryawan2: string;
}

/** Kolom A = uraian, B..M = Januari..Desember, N = Total. */
export const KOLOM_BULAN_PERTAMA = 1;
export const JUMLAH_BULAN = 12;
export const KOLOM_TOTAL = KOLOM_BULAN_PERTAMA + JUMLAH_BULAN;
/** Ukuran grid yang ditampilkan: sisa baris/kolom kosong dipakai untuk catatan atau hitungan sendiri. */
export const JUMLAH_KOLOM_GRID = KOLOM_TOTAL + 3;
export const JUMLAH_BARIS_GRID = 40;

type Isi = 'data' | 'rumus' | 'judul';

interface BarisLembar {
  readonly id: string;
  readonly label: string;
  readonly isi: Isi;
  readonly fmt?: NumFmt;
  readonly tebal?: boolean;
  /** Kolom Total: jumlah 12 bulan, atau kosong. */
  readonly total: boolean;
  readonly nilai?: (b: BulanUntukLembar) => number;
  /** Rumus per kolom bulan, mis. (col, rowOf) => "=B2*B3". */
  readonly rumus?: (col: string, rowOf: (id: string) => number) => string;
}

function baris(
  id: string,
  label: string,
  nilai: (b: BulanUntukLembar) => number,
  total = true,
  fmt: NumFmt = 'rupiah',
): BarisLembar {
  return { id, label, isi: 'data', total, nilai, fmt };
}

function barisRumus(
  id: string,
  label: string,
  rumus: (col: string, rowOf: (id: string) => number) => string,
  total = true,
  tebal = false,
): BarisLembar {
  return { id, label, isi: 'rumus', total, rumus, fmt: 'rupiah', tebal };
}

function susunBaris(label: LabelGaji): readonly BarisLembar[] {
  return [
    baris('pasien', 'Jumlah Pasien', (b) => b.jumlahPasien, true, 'angka'),
    baris('harga', 'Harga per Pasien', (b) => b.harga, false),
    barisRumus('pendapatan', 'Pendapatan', (c, r) => `=${c}${r('pasien')}*${c}${r('harga')}`, true, true),
    baris('sewa', 'Beban Sewa Tempat', (b) => b.biayaSewaTempat),
    baris('listrik', 'Beban Listrik dan Air', (b) => b.biayaListrikAir),
    baris('gaji1', `Gaji ${label.labelFernanda}`, (b) => b.gajiFernanda),
    baris('gaji2', `Gaji ${label.labelChalimatusadiah}`, (b) => b.gajiChalimatusadiah),
    baris('gaji3', `Gaji ${label.labelRiki}`, (b) => b.gajiRiki),
    baris('gaji4', `Gaji ${label.labelAgung}`, (b) => b.gajiAgung),
    baris('gaji5', `Gaji ${label.labelKaryawan1}`, (b) => b.gajiKaryawan1),
    baris('gaji6', `Gaji ${label.labelKaryawan2}`, (b) => b.gajiKaryawan2),
    baris('bahan', 'Bahan Roentgen', (b) => b.bahanRoentgen),
    baris('alat', 'Peralatan Roentgen', (b) => b.peralatanRoentgen),
    baris('susut', 'Penyusutan', (b) => b.penyusutanManual),
    baris('perbaikan', 'Perbaikan Alat', (b) => b.perbaikanAlat),
    barisRumus('beban', 'Total Beban Usaha', (c, r) => `=SUM(${c}${r('sewa')}:${c}${r('perbaikan')})`, true, true),
    barisRumus('laba', 'Laba Bersih', (c, r) => `=${c}${r('pendapatan')}-${c}${r('beban')}`, true, true),
    { id: 'judulNeraca', label: 'NERACA (akhir bulan)', isi: 'judul', total: false, tebal: true },
    baris('kas', 'Kas', (b) => b.kasAkhir, false),
    baris('piutang', 'Piutang Usaha', (b) => b.piutangUsaha, false),
    baris('perlengkapan', 'Perlengkapan', (b) => b.perlengkapan, false),
    baris('peralatan', 'Peralatan (Nilai Bersih)', (b) => b.peralatanNet, false),
    barisRumus('aktiva', 'Jumlah Aktiva', (c, r) => `=SUM(${c}${r('kas')}:${c}${r('peralatan')})`, false, true),
    baris('utang', 'Utang Usaha', (b) => b.utangUsaha, false),
    barisRumus('modal', 'Modal PH', (c, r) => `=${c}${r('aktiva')}-${c}${r('utang')}`, false, true),
  ];
}

const WARNA_HEADER = '#217346';
const WARNA_SUBTOTAL = '#e2efda';

/**
 * Workbook awal dari data 12 bulan. Angka dasar (pasien, harga, beban, saldo) berupa
 * nilai; pendapatan, total, laba, aktiva dan modal berupa rumus supaya ikut berubah
 * saat sel diedit seperti di Excel.
 */
export function bangunLembarDariBulanan(
  bulan: readonly BulanUntukLembar[],
  label: LabelGaji,
  judul: string,
): Workbook {
  const daftar = susunBaris(label);
  // Baris 1 = judul, baris 2 = header bulan, data mulai baris 3.
  const barisAwal = 2;
  const nomorBaris = new Map(daftar.map((b, i) => [b.id, barisAwal + i + 1]));
  const rowOf = (id: string): number => nomorBaris.get(id) ?? 1;
  const cells: Record<string, string> = {};
  const styles: Record<string, CellStyle> = {};

  cells[cellKey(0, 0)] = judul;
  styles[cellKey(0, 0)] = { b: true };
  cells[cellKey(0, 1)] = 'Uraian';
  const urut = [...bulan].sort((a, b) => a.no - b.no);
  urut.forEach((b, i) => {
    cells[cellKey(KOLOM_BULAN_PERTAMA + i, 1)] = b.bulan;
  });
  cells[cellKey(KOLOM_TOTAL, 1)] = 'Total';
  for (let c = 0; c <= KOLOM_TOTAL; c++) {
    styles[cellKey(c, 1)] = { b: true, fill: WARNA_HEADER, color: '#ffffff', al: c === 0 ? 'left' : 'center', border: true };
  }

  daftar.forEach((item, i) => {
    const row = barisAwal + i;
    cells[cellKey(0, row)] = item.label;
    const gayaBaris: CellStyle = {
      ...(item.fmt ? { fmt: item.fmt } : null),
      ...(item.tebal ? { b: true, fill: WARNA_SUBTOTAL } : null),
      border: true,
    };
    styles[cellKey(0, row)] = { ...(item.tebal ? { b: true, fill: WARNA_SUBTOTAL } : null), border: true };
    if (item.isi === 'judul') return;
    urut.forEach((b, m) => {
      const col = KOLOM_BULAN_PERTAMA + m;
      const huruf = cellKey(col, 0).replace(/\d+$/, '');
      cells[cellKey(col, row)] =
        item.isi === 'data' ? String(item.nilai?.(b) ?? 0) : (item.rumus?.(huruf, rowOf) ?? '');
      styles[cellKey(col, row)] = gayaBaris;
    });
    if (item.total && urut.length > 0) {
      const awal = cellKey(KOLOM_BULAN_PERTAMA, row);
      const akhir = cellKey(KOLOM_BULAN_PERTAMA + urut.length - 1, row);
      cells[cellKey(KOLOM_TOTAL, row)] = `=SUM(${awal}:${akhir})`;
      styles[cellKey(KOLOM_TOTAL, row)] = { ...gayaBaris, b: true };
    }
  });

  // Blok perhitungan modal setelah penyusutan (mengikuti catatan Excel klinik), memakai data Januari.
  // Penyusutan = Harga Peralatan x tarif per bulan (kolom C = tarif tahunan / 12);
  // Modal Januari = Penyusutan - Laba bersih (angka per bulan).
  const januari = urut[0];
  if (januari) {
    const awal = barisAwal + daftar.length + 1;
    const r = (n: number): number => awal + n + 1;
    const tepi: CellStyle = { border: true };
    const uang: CellStyle = { border: true, fmt: 'rupiah' };
    const tebal: CellStyle = { border: true, fmt: 'rupiah', b: true, fill: WARNA_SUBTOTAL };
    const baris: readonly (readonly [string, string | null, string | null, string, CellStyle])[] = [
      ['Harga Peralatan', null, null, String(januari.hargaPeralatan), uang],
      ['Modal Januari', null, null, `=D${r(2)}-D${r(4)}`, uang],
      ['Penyusutan peralatan', String(januari.tarifPenyusutanTahunanPersen / 100), `=B${r(2)}/12`, `=D${r(0)}*C${r(2)}`, uang],
      ['', null, null, `=D${r(0)}-D${r(2)}`, uang],
      ['Laba bersih', null, null, `=B${rowOf('laba')}`, uang],
      ['Modal', null, null, `=D${r(3)}+D${r(4)}`, tebal],
    ];
    baris.forEach(([uraian, persen, bagi, nilai, gaya], i) => {
      const row = awal + i;
      cells[cellKey(0, row)] = uraian;
      styles[cellKey(0, row)] = i === baris.length - 1 ? { ...tepi, b: true, fill: WARNA_SUBTOTAL } : tepi;
      if (persen !== null) {
        cells[cellKey(1, row)] = persen;
        styles[cellKey(1, row)] = { border: true, fmt: 'persen' };
      }
      if (bagi !== null) {
        cells[cellKey(2, row)] = bagi;
        styles[cellKey(2, row)] = tepi;
      }
      cells[cellKey(3, row)] = nilai;
      styles[cellKey(3, row)] = gaya;
    });
  }

  const sheet = bikinSheet('Hasil Perbulan', JUMLAH_BARIS_GRID, JUMLAH_KOLOM_GRID);
  return bikinWorkbook({
    ...sheet,
    cells,
    styles,
    colWidths: { '0': 230, ...Object.fromEntries(Array.from({ length: 13 }, (_, i) => [String(i + 1), 120])) },
  });
}
