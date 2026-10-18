import { bangunLembarDariBulanan, type BulanUntukLembar, type LabelGaji } from './excelBulanan.ts';
import { bikinSheet, type CellStyle, type Sheet, type Workbook } from './sheetModel.ts';

/** Isian tahunan yang tidak ada di data 12 bulan (diinput manual di Laporan Neraca). */
export interface InfoLaporan {
  readonly year: number;
  readonly namaPerusahaan: string;
  readonly tempatTandaTangan: string;
  /** Tanggal ISO (yyyy-mm-dd) atau kosong. */
  readonly tanggalTandaTangan: string;
  readonly namaPenandatangan: string;
  readonly bank: number;
  readonly tanah: number;
  readonly gedung: number;
  readonly kendaraan: number;
  readonly utangPajak: number;
  readonly utangLainnya: number;
  readonly utangJangkaPanjang: number;
  readonly biayaTelpon: number;
  readonly biayaTransport: number;
  readonly biayaPajakSewa: number;
}

const HIJAU = '#217346';
const HIJAU_MUDA = '#e2efda';
const KUNING = '#fff2cc';

interface Penulis {
  readonly cells: Record<string, string>;
  readonly styles: Record<string, CellStyle>;
  /** Menulis satu sel (kolom huruf, baris 1-berbasis) beserta gayanya. */
  readonly tulis: (alamat: string, isi: string | number, gaya?: CellStyle) => void;
}

function bikinPenulis(): Penulis {
  const cells: Record<string, string> = {};
  const styles: Record<string, CellStyle> = {};
  return {
    cells,
    styles,
    tulis(alamat, isi, gaya) {
      const teks = String(isi);
      if (teks !== '') cells[alamat] = teks;
      if (gaya) styles[alamat] = gaya;
    },
  };
}

const uang: CellStyle = { fmt: 'angka', border: true };
const uangTebal: CellStyle = { fmt: 'angka', border: true, b: true, fill: HIJAU_MUDA };
const label: CellStyle = { border: true };
const labelTebal: CellStyle = { border: true, b: true, fill: HIJAU_MUDA };
const judul: CellStyle = { b: true };
const header: CellStyle = { b: true, fill: HIJAU, color: '#ffffff', al: 'center', border: true };
const masukan: CellStyle = { fmt: 'angka', border: true, fill: KUNING };

function bangunSheetBulan(b: BulanUntukLembar, gaji: LabelGaji, namaPerusahaan: string): Sheet {
  const p = bikinPenulis();
  const bulan = b.bulan;

  p.tulis('A1', `LAPORAN KEUANGAN ${namaPerusahaan.toUpperCase()}`, judul);
  p.tulis('D2', 'BULAN', header);
  p.tulis('E2', bulan.toUpperCase(), header);
  p.tulis('A3', 'Pendapatan Jasa Pelayanan', labelTebal);
  p.tulis('B3', '', labelTebal);
  p.tulis('C3', 'Harga', header);
  p.tulis('D3', 'Jumlah Pasien', header);
  p.tulis('E3', 'Total', header);
  p.tulis('A4', '', label);
  p.tulis('B4', '', label);
  p.tulis('C4', b.harga, uang);
  p.tulis('D4', b.jumlahPasien, { ...uang, fmt: 'angka' });
  p.tulis('E4', '=C4*D4', uangTebal);

  p.tulis('A5', 'Beban Usaha', labelTebal);
  const beban: readonly (readonly [string, number | null])[] = [
    ['   Beban Sewa Tempat', b.biayaSewaTempat],
    ['   Beban Listrik dan Air', b.biayaListrikAir],
    ['   Beban Gaji', null],
    [`      ${gaji.labelFernanda}`, b.gajiFernanda],
    [`      ${gaji.labelChalimatusadiah}`, b.gajiChalimatusadiah],
    [`      ${gaji.labelRiki}`, b.gajiRiki],
    [`      ${gaji.labelAgung}`, b.gajiAgung],
    [`      ${gaji.labelKaryawan1}`, b.gajiKaryawan1],
    [`      ${gaji.labelKaryawan2}`, b.gajiKaryawan2],
    ['   Beban Telpon', 0],
    ['   Beban Transport', 0],
    ['   Bahan Roentgen', b.bahanRoentgen],
    ['   Peralatan Roentgen', b.peralatanRoentgen],
    ['   Penyusutan', b.penyusutanManual],
    ['   Perbaikan Alat', b.perbaikanAlat],
  ];
  beban.forEach(([nama, nilai], i) => {
    const r = 6 + i;
    p.tulis(`A${r}`, nama, label);
    if (nilai !== null) p.tulis(`B${r}`, nilai, uang);
    else p.tulis(`B${r}`, '', uang);
  });
  const akhirBeban = 6 + beban.length - 1; // 20
  p.tulis(`A${akhirBeban + 1}`, 'Total Beban Usaha', labelTebal);
  p.tulis(`B${akhirBeban + 1}`, `=SUM(B6:B${akhirBeban})`, uangTebal);
  const rTotalBeban = akhirBeban + 1; // 21
  p.tulis(`A${rTotalBeban + 1}`, 'Laba Bersih', labelTebal);
  p.tulis(`E${rTotalBeban + 1}`, `=E4-B${rTotalBeban}`, uangTebal);
  const rLaba = rTotalBeban + 1; // 22

  // Perhitungan modal setelah penyusutan peralatan.
  const r0 = rLaba + 2; // 24
  p.tulis(`A${r0}`, 'Harga Peralatan', label);
  p.tulis(`E${r0}`, b.hargaPeralatan, masukan);
  p.tulis(`A${r0 + 1}`, `Modal ${bulan.toLowerCase()}`, label);
  p.tulis(`E${r0 + 1}`, `=E${r0 + 2}-E${r0 + 4}`, uang);
  p.tulis(`A${r0 + 2}`, 'Penyusutan peralatan', label);
  p.tulis(`B${r0 + 2}`, b.tarifPenyusutanTahunanPersen / 100, { fmt: 'persen', border: true, fill: KUNING });
  p.tulis(`C${r0 + 2}`, `=B${r0 + 2}/12`, { border: true });
  p.tulis(`E${r0 + 2}`, `=E${r0}*C${r0 + 2}`, uang);
  p.tulis(`A${r0 + 3}`, 'Harga Peralatan setelah penyusutan', label);
  p.tulis(`E${r0 + 3}`, `=E${r0}-E${r0 + 2}`, uang);
  p.tulis(`A${r0 + 4}`, 'Laba bersih', label);
  p.tulis(`E${r0 + 4}`, `=E${rLaba}`, uang);
  p.tulis(`A${r0 + 5}`, 'Modal', labelTebal);
  p.tulis(`E${r0 + 5}`, `=E${r0 + 1}*E${r0 + 2}`, uangTebal);

  // Neraca bulan ini.
  const rn = r0 + 7; // 31
  p.tulis(`A${rn}`, 'NERACA', judul);
  p.tulis(`A${rn + 1}`, 'AKTIVA', header);
  p.tulis(`B${rn + 1}`, '', header);
  p.tulis(`D${rn + 1}`, 'PASIVA', header);
  p.tulis(`E${rn + 1}`, '', header);
  const aktiva: readonly (readonly [string, string | number, CellStyle])[] = [
    ['Kas', b.kasAkhir, masukan],
    ['Piutang Usaha', b.piutangUsaha, masukan],
    ['Perlengkapan', b.perlengkapan, masukan],
    ['Peralatan', `=E${r0}`, uang],
    ['Akumulasi penyusutan Alat', b.akumulasiPenyusutanAkhir, masukan],
  ];
  aktiva.forEach(([nama, nilai, gaya], i) => {
    p.tulis(`A${rn + 2 + i}`, nama, label);
    p.tulis(`B${rn + 2 + i}`, nilai, gaya);
  });
  const rAktiva = rn + 2 + aktiva.length; // 38
  p.tulis(`A${rAktiva}`, 'Jumlah Aktiva', labelTebal);
  p.tulis(`B${rAktiva}`, `=B${rn + 2}+B${rn + 3}+B${rn + 4}+B${rn + 5}-B${rn + 6}`, uangTebal);
  p.tulis(`D${rn + 2}`, 'Utang Usaha', label);
  p.tulis(`E${rn + 2}`, b.utangUsaha, masukan);
  p.tulis(`D${rn + 3}`, 'Modal PH', label);
  p.tulis(`E${rn + 3}`, `=B${rAktiva}-E${rn + 2}`, uang);
  p.tulis(`D${rAktiva}`, 'Jumlah Pasiva', labelTebal);
  p.tulis(`E${rAktiva}`, `=E${rn + 2}+E${rn + 3}`, uangTebal);
  p.tulis(`A${rAktiva + 2}`, 'Sel berwarna kuning = isian yang bisa diubah.', { i: true });

  return {
    ...bikinSheet(bulan, 42, 6),
    cells: p.cells,
    styles: p.styles,
    colWidths: { '0': 270, '1': 110, '2': 110, '3': 150, '4': 130 },
  };
}

/** Alamat sel pada sheet bulanan yang dirujuk sheet tahunan (harus sama dengan bangunSheetBulan). */
const REF = {
  pendapatan: 'E4',
  sewa: 'B6',
  listrik: 'B7',
  gajiAwal: 9,
  gajiAkhir: 14,
  telpon: 'B15',
  transport: 'B16',
  bahan: 'B17',
  peralatanRoentgen: 'B18',
  penyusutan: 'B19',
  perbaikan: 'B20',
  kas: 'B33',
  piutang: 'B34',
  perlengkapan: 'B35',
  peralatan: 'B36',
  akumulasi: 'B37',
  utangUsaha: 'E33',
  modalPH: 'E34',
} as const;

function bangunSheetTahunan(namaBulan: readonly string[], info: InfoLaporan): Sheet {
  const p = bikinPenulis();
  const jumlahBulan = (alamat: string): string => `=${namaBulan.map((n) => `${n}!${alamat}`).join('+')}`;
  const jumlahGaji = (): string => {
    const suku: string[] = [];
    for (const n of namaBulan) for (let r = REF.gajiAkhir; r >= REF.gajiAwal; r--) suku.push(`${n}!B${r}`);
    return `=${suku.join('+')}`;
  };
  const desember = namaBulan[namaBulan.length - 1] ?? 'Desember';
  const rupiah: CellStyle = { fmt: 'rupiah', border: true };
  const rupiahTebal: CellStyle = { fmt: 'rupiah', border: true, b: true, fill: HIJAU_MUDA };
  const masukanRp: CellStyle = { fmt: 'rupiah', border: true, fill: KUNING };
  const tanggal = info.tanggalTandaTangan
    ? new Date(info.tanggalTandaTangan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const ttd = [info.tempatTandaTangan, tanggal].filter(Boolean).join(', ');

  // ---- NERACA (kiri)
  p.tulis('A1', 'NERACA', { ...judul, al: 'left' });
  p.tulis('A2', info.namaPerusahaan.toUpperCase(), judul);
  p.tulis('A3', `PER 31 DESEMBER ${info.year}`, judul);
  p.tulis('A4', 'AKTIVA', header);
  p.tulis('B4', '', header);
  p.tulis('D4', 'PASIVA', header);
  p.tulis('E4', '', header);

  p.tulis('A5', 'I. AKTIVA LANCAR', labelTebal);
  p.tulis('B5', '', labelTebal);
  const lancar: readonly (readonly [string, string | number, CellStyle])[] = [
    ['KAS', `=${desember}!${REF.kas}`, rupiah],
    ['BANK', info.bank, masukanRp],
    ['PIUTANG', `=${desember}!${REF.piutang}`, rupiah],
    ['PERSEDIAAN', `=${desember}!${REF.perlengkapan}`, rupiah],
  ];
  lancar.forEach(([nama, nilai, gaya], i) => {
    p.tulis(`A${6 + i}`, nama, label);
    p.tulis(`B${6 + i}`, nilai, gaya);
  });
  p.tulis('A10', 'TOTAL', labelTebal);
  p.tulis('B10', '=SUM(B6:B9)', rupiahTebal);

  p.tulis('A12', 'II. AKTIVA TETAP', labelTebal);
  p.tulis('B12', '', labelTebal);
  const tetap: readonly (readonly [string, string | number, CellStyle])[] = [
    ['TANAH', info.tanah, masukanRp],
    ['GEDUNG', info.gedung, masukanRp],
    ['PERALATAN', `=${desember}!${REF.peralatan}-${desember}!${REF.akumulasi}`, rupiah],
    ['KENDARAAN', info.kendaraan, masukanRp],
  ];
  tetap.forEach(([nama, nilai, gaya], i) => {
    p.tulis(`A${13 + i}`, nama, label);
    p.tulis(`B${13 + i}`, nilai, gaya);
  });
  p.tulis('A17', 'TOTAL', labelTebal);
  p.tulis('B17', '=SUM(B13:B16)', rupiahTebal);
  p.tulis('A21', 'TOTAL AKTIVA', labelTebal);
  p.tulis('B21', '=B10+B17', rupiahTebal);

  // ---- PASIVA (tengah)
  p.tulis('D5', 'IV. UTANG JANGKA PENDEK', labelTebal);
  p.tulis('E5', '', labelTebal);
  p.tulis('D6', 'UTANG USAHA', label);
  p.tulis('E6', `=${desember}!${REF.utangUsaha}`, rupiah);
  p.tulis('D7', 'UTANG PAJAK', label);
  p.tulis('E7', info.utangPajak, masukanRp);
  p.tulis('D8', 'UTANG LAINNYA', label);
  p.tulis('E8', info.utangLainnya, masukanRp);
  p.tulis('D10', 'TOTAL', labelTebal);
  p.tulis('E10', '=SUM(E6:E8)', rupiahTebal);
  p.tulis('D12', 'V. UTANG JANGKA PANJANG', labelTebal);
  p.tulis('E12', '', labelTebal);
  p.tulis('D13', 'UTANG JANGKA PANJANG', label);
  p.tulis('E13', info.utangJangkaPanjang, masukanRp);
  p.tulis('D14', 'TOTAL', labelTebal);
  p.tulis('E14', '=E13', rupiahTebal);
  p.tulis('D16', 'VI. MODAL DAN LABA', labelTebal);
  p.tulis('E16', '', labelTebal);
  p.tulis('D17', 'MODAL USAHA', label);
  // Modal PH Desember dikurangi laba setahun, supaya Modal Usaha + Laba Berjalan = Modal PH Desember.
  p.tulis('E17', `=${desember}!${REF.modalPH}-J19`, rupiah);
  p.tulis('D18', 'LABA BERJALAN', label);
  p.tulis('E18', '=J19', rupiah);
  p.tulis('D19', 'TOTAL MODAL', labelTebal);
  p.tulis('E19', '=E17+E18', rupiahTebal);
  p.tulis('D21', 'TOTAL PASIVA', labelTebal);
  p.tulis('E21', '=E10+E14+E19', rupiahTebal);

  // ---- LAPORAN RUGI LABA (kanan)
  p.tulis('G1', 'LAPORAN RUGI LABA', judul);
  p.tulis('G2', info.namaPerusahaan.toUpperCase(), judul);
  p.tulis('G3', `PER 31 DESEMBER ${info.year}`, judul);
  p.tulis('G5', 'i. Pendapatan', labelTebal);
  p.tulis('H5', '', labelTebal);
  p.tulis('I5', '', labelTebal);
  p.tulis('J5', jumlahBulan(REF.pendapatan), rupiahTebal);
  p.tulis('G6', 'ii. Biaya-biaya', labelTebal);
  p.tulis('H6', '', labelTebal);
  p.tulis('I6', '', labelTebal);
  p.tulis('J6', '=J17', rupiahTebal);
  const biaya: readonly (readonly [string, string | number])[] = [
    ['Biaya gaji', jumlahGaji()],
    ['Biaya ATK (Bahan)', jumlahBulan(REF.bahan)],
    ['Biaya listrik', jumlahBulan(REF.listrik)],
    ['Biaya telpon', `${jumlahBulan(REF.telpon)}+${info.biayaTelpon}`],
    ['Biaya transport', `${jumlahBulan(REF.transport)}+${info.biayaTransport}`],
    ['Biaya sewa', jumlahBulan(REF.sewa)],
    ['Pajak sewa', info.biayaPajakSewa],
    [
      'Biaya dan lain-lain',
      `=${namaBulan.map((n) => `${n}!${REF.peralatanRoentgen}+${n}!${REF.penyusutan}+${n}!${REF.perbaikan}`).join('+')}`,
    ],
  ];
  biaya.forEach(([nama, nilai], i) => {
    p.tulis(`G${8 + i}`, nama, label);
    p.tulis(`I${8 + i}`, nilai, rupiah);
  });
  p.tulis('G17', 'Total Biaya', labelTebal);
  p.tulis('H17', '', labelTebal);
  p.tulis('I17', '', labelTebal);
  p.tulis('J17', '=SUM(I8:I15)', rupiahTebal);
  p.tulis('G19', 'III. Laba (rugi)', labelTebal);
  p.tulis('H19', '', labelTebal);
  p.tulis('I19', '', labelTebal);
  p.tulis('J19', '=J5-J17', rupiahTebal);
  p.tulis('A23', 'Sel berwarna kuning = isian manual; sel lain dihitung dari sheet bulanan.', { i: true });
  if (ttd) p.tulis('G22', ttd);
  if (info.namaPenandatangan) p.tulis('G26', info.namaPenandatangan, { b: true });

  return {
    ...bikinSheet('Neraca & Rugi Laba', 30, 10),
    cells: p.cells,
    styles: p.styles,
    colWidths: { '0': 190, '1': 130, '2': 24, '3': 230, '4': 130, '5': 24, '6': 190, '7': 20, '8': 130, '9': 140 },
  };
}

/**
 * Workbook laporan: rekap 12 bulan, satu sheet laporan per bulan (pendapatan, beban,
 * perhitungan modal dan neraca) dan sheet Neraca & Rugi Laba tahunan yang menjumlahkan sheet bulanan.
 */
export function bangunWorkbookLaporan(
  bulan: readonly BulanUntukLembar[],
  gaji: LabelGaji,
  info: InfoLaporan,
  judulRekap: string,
): Workbook {
  const urut = [...bulan].sort((a, b) => a.no - b.no);
  const rekap = bangunLembarDariBulanan(urut, gaji, judulRekap).sheets[0]!;
  const sheetBulan = urut.map((b) => bangunSheetBulan(b, gaji, info.namaPerusahaan));
  const tahunan = bangunSheetTahunan(urut.map((b) => b.bulan), info);
  return {
    version: 2,
    sheets: [{ ...rekap, name: 'Rekap 12 Bulan' }, ...sheetBulan, tahunan],
  };
}

