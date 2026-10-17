import { cellKey, type SheetCells } from './sheetFormula.ts';

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
): BarisLembar {
  return { id, label, isi: 'data', total, nilai };
}

function barisRumus(
  id: string,
  label: string,
  rumus: (col: string, rowOf: (id: string) => number) => string,
  total = true,
): BarisLembar {
  return { id, label, isi: 'rumus', total, rumus };
}

function susunBaris(label: LabelGaji): readonly BarisLembar[] {
  return [
    baris('pasien', 'Jumlah Pasien', (b) => b.jumlahPasien),
    baris('harga', 'Harga per Pasien', (b) => b.harga, false),
    barisRumus('pendapatan', 'Pendapatan', (c, r) => `=${c}${r('pasien')}*${c}${r('harga')}`),
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
    barisRumus('beban', 'Total Beban Usaha', (c, r) => `=SUM(${c}${r('sewa')}:${c}${r('perbaikan')})`),
    barisRumus('laba', 'Laba Bersih', (c, r) => `=${c}${r('pendapatan')}-${c}${r('beban')}`),
    { id: 'judulNeraca', label: 'NERACA (akhir bulan)', isi: 'judul', total: false },
    baris('kas', 'Kas', (b) => b.kasAkhir, false),
    baris('piutang', 'Piutang Usaha', (b) => b.piutangUsaha, false),
    baris('perlengkapan', 'Perlengkapan', (b) => b.perlengkapan, false),
    baris('peralatan', 'Peralatan (Nilai Bersih)', (b) => b.peralatanNet, false),
    barisRumus('aktiva', 'Jumlah Aktiva', (c, r) => `=SUM(${c}${r('kas')}:${c}${r('peralatan')})`, false),
    baris('utang', 'Utang Usaha', (b) => b.utangUsaha, false),
    barisRumus('modal', 'Modal PH', (c, r) => `=${c}${r('aktiva')}-${c}${r('utang')}`, false),
  ];
}

/**
 * Lembar awal dari data 12 bulan. Angka dasar (pasien, harga, beban, saldo) berupa
 * nilai; pendapatan, total, laba, aktiva dan modal berupa rumus supaya ikut berubah
 * saat sel diedit seperti di Excel.
 */
export function bangunLembarDariBulanan(
  bulan: readonly BulanUntukLembar[],
  label: LabelGaji,
  judul: string,
): SheetCells {
  const daftar = susunBaris(label);
  // Baris 1 = judul, baris 2 = header bulan, data mulai baris 3.
  const barisAwal = 2;
  const nomorBaris = new Map(daftar.map((b, i) => [b.id, barisAwal + i + 1]));
  const rowOf = (id: string): number => nomorBaris.get(id) ?? 1;
  const cells: Record<string, string> = {};

  cells[cellKey(0, 0)] = judul;
  cells[cellKey(0, 1)] = 'Uraian';
  const urut = [...bulan].sort((a, b) => a.no - b.no);
  urut.forEach((b, i) => {
    cells[cellKey(KOLOM_BULAN_PERTAMA + i, 1)] = b.bulan;
  });
  cells[cellKey(KOLOM_TOTAL, 1)] = 'Total';

  daftar.forEach((item, i) => {
    const row = barisAwal + i;
    cells[cellKey(0, row)] = item.label;
    if (item.isi === 'judul') return;
    urut.forEach((b, m) => {
      const col = KOLOM_BULAN_PERTAMA + m;
      const huruf = cellKey(col, 0).replace(/\d+$/, '');
      cells[cellKey(col, row)] =
        item.isi === 'data' ? String(item.nilai?.(b) ?? 0) : (item.rumus?.(huruf, rowOf) ?? '');
    });
    if (item.total && urut.length > 0) {
      const awal = cellKey(KOLOM_BULAN_PERTAMA, row);
      const akhir = cellKey(KOLOM_BULAN_PERTAMA + urut.length - 1, row);
      cells[cellKey(KOLOM_TOTAL, row)] = `=SUM(${awal}:${akhir})`;
    }
  });
  return cells;
}
