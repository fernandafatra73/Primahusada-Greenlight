import {
  cellKey,
  parseCellKey,
  type SheetCells,
  type SheetValue,
  formatSheetValue,
  isSheetError,
} from './sheetFormula.ts';
import { gantiNamaSheetDiRumus, sesuaikanRumusStruktur, shiftFormula, type Sumbu } from './sheetRefs.ts';

export type NumFmt = 'umum' | 'angka' | 'desimal' | 'rupiah' | 'persen';
export type Rata = 'left' | 'center' | 'right';

export interface CellStyle {
  readonly b?: boolean;
  readonly i?: boolean;
  readonly al?: Rata;
  /** Warna isi sel, #rrggbb. */
  readonly fill?: string;
  /** Warna teks, #rrggbb. */
  readonly color?: string;
  readonly border?: boolean;
  readonly fmt?: NumFmt;
}

/** Perubahan gaya; null menghapus properti. */
export type CellStylePatch = { readonly [K in keyof CellStyle]?: CellStyle[K] | null };

export interface Sheet {
  readonly name: string;
  readonly cells: SheetCells;
  readonly styles: Readonly<Record<string, CellStyle>>;
  /** Lebar kolom (px) menurut indeks kolom berbasis 0. */
  readonly colWidths: Readonly<Record<string, number>>;
  /** Tinggi baris (px) menurut indeks baris berbasis 0. */
  readonly rowHeights: Readonly<Record<string, number>>;
  readonly rows: number;
  readonly cols: number;
}

export interface Workbook {
  readonly version: 2;
  readonly sheets: readonly Sheet[];
}

export const LEBAR_KOLOM_DEFAULT = 110;
export const TINGGI_BARIS_DEFAULT = 24;
export const LEBAR_KOLOM_MIN = 30;
export const LEBAR_KOLOM_MAKS = 600;
export const TINGGI_BARIS_MIN = 16;
export const TINGGI_BARIS_MAKS = 240;
export const BARIS_MAKS = 500;
export const KOLOM_MAKS = 52;
export const SHEET_MAKS = 20;

export const FORMAT_ANGKA: Readonly<Record<NumFmt, string>> = {
  umum: 'Umum',
  angka: 'Angka (1.234)',
  desimal: 'Desimal (1.234,00)',
  rupiah: 'Rupiah (Rp 1.234)',
  persen: 'Persen (12,50%)',
};

/** Kode format .xlsx untuk tiap format angka. */
export const KODE_XLSX: Readonly<Record<NumFmt, string>> = {
  umum: 'General',
  angka: '#,##0',
  desimal: '#,##0.00',
  rupiah: '"Rp" #,##0',
  persen: '0.00%',
};

export function bikinSheet(name: string, rows = 40, cols = 17): Sheet {
  return { name, cells: {}, styles: {}, colWidths: {}, rowHeights: {}, rows, cols };
}

export function bikinWorkbook(sheet: Sheet): Workbook {
  return { version: 2, sheets: [sheet] };
}

export function lebarKolom(sheet: Sheet, col: number): number {
  return sheet.colWidths[String(col)] ?? LEBAR_KOLOM_DEFAULT;
}

export function tinggiBaris(sheet: Sheet, row: number): number {
  return sheet.rowHeights[String(row)] ?? TINGGI_BARIS_DEFAULT;
}

// ------------------------------------------------------------ tampilan angka

/** Teks tampilan sebuah nilai sel menurut format angkanya. */
export function tampilkanNilai(v: SheetValue | undefined, fmt: NumFmt = 'umum'): string {
  if (v === undefined) return '';
  if (typeof v === 'number') {
    switch (fmt) {
      case 'angka':
        return v.toLocaleString('id-ID', { maximumFractionDigits: 0 });
      case 'desimal':
        return v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'rupiah':
        return `Rp ${v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
      case 'persen':
        return `${(v * 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
      case 'umum':
        return Number.isInteger(v) ? v.toLocaleString('id-ID') : v.toLocaleString('id-ID', { maximumFractionDigits: 4 });
    }
  }
  return formatSheetValue(v);
}

export function rataBawaan(v: SheetValue | undefined): Rata {
  if (typeof v === 'number') return 'right';
  if (typeof v === 'boolean' || (v !== undefined && isSheetError(v))) return 'center';
  return 'left';
}

// -------------------------------------------------------------- perubahan sel

function ubahSheet(wb: Workbook, index: number, ganti: (s: Sheet) => Sheet): Workbook {
  return { ...wb, sheets: wb.sheets.map((s, i) => (i === index ? ganti(s) : s)) };
}

/** Menulis isi sel; isi kosong menghapus sel. */
export function tulisSel(wb: Workbook, sheetIndex: number, ubah: Readonly<Record<string, string>>): Workbook {
  return ubahSheet(wb, sheetIndex, (s) => {
    const cells: Record<string, string> = { ...s.cells };
    for (const [key, raw] of Object.entries(ubah)) {
      if (raw === '') delete cells[key];
      else cells[key] = raw;
    }
    return { ...s, cells };
  });
}

function terapkanGaya(lama: CellStyle | undefined, patch: CellStylePatch): CellStyle {
  const baru: Record<string, unknown> = { ...lama };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === false) delete baru[k];
    else baru[k] = v;
  }
  return baru as CellStyle;
}

export function ubahGaya(
  wb: Workbook,
  sheetIndex: number,
  keys: readonly string[],
  patch: CellStylePatch,
): Workbook {
  return ubahSheet(wb, sheetIndex, (s) => {
    const styles: Record<string, CellStyle> = { ...s.styles };
    for (const key of keys) {
      const gaya = terapkanGaya(styles[key], patch);
      if (Object.keys(gaya).length === 0) delete styles[key];
      else styles[key] = gaya;
    }
    return { ...s, styles };
  });
}

export function ubahUkuran(
  wb: Workbook,
  sheetIndex: number,
  sumbu: Sumbu,
  indeks: number,
  ukuran: number,
): Workbook {
  return ubahSheet(wb, sheetIndex, (s) => {
    if (sumbu === 'kolom') {
      const w = Math.min(LEBAR_KOLOM_MAKS, Math.max(LEBAR_KOLOM_MIN, Math.round(ukuran)));
      return { ...s, colWidths: { ...s.colWidths, [String(indeks)]: w } };
    }
    const h = Math.min(TINGGI_BARIS_MAKS, Math.max(TINGGI_BARIS_MIN, Math.round(ukuran)));
    return { ...s, rowHeights: { ...s.rowHeights, [String(indeks)]: h } };
  });
}

// ------------------------------------------------------------ baris & kolom

function geserKunci<T>(peta: Readonly<Record<string, T>>, sumbu: Sumbu, indeks: number, jumlah: number): Record<string, T> {
  const hasil: Record<string, T> = {};
  const batas = indeks - jumlah;
  for (const [key, nilai] of Object.entries(peta)) {
    const pos = parseCellKey(key);
    if (!pos) continue;
    const x = sumbu === 'baris' ? pos.row : pos.col;
    let baru = x;
    if (jumlah > 0) {
      if (x >= indeks) baru = x + jumlah;
    } else if (x >= indeks && x < batas) {
      continue;
    } else if (x >= batas) {
      baru = x + jumlah;
    }
    hasil[sumbu === 'baris' ? cellKey(pos.col, baru) : cellKey(baru, pos.row)] = nilai;
  }
  return hasil;
}

function geserUkuran(peta: Readonly<Record<string, number>>, indeks: number, jumlah: number): Record<string, number> {
  const hasil: Record<string, number> = {};
  const batas = indeks - jumlah;
  for (const [key, nilai] of Object.entries(peta)) {
    const x = Number(key);
    if (jumlah > 0) hasil[String(x >= indeks ? x + jumlah : x)] = nilai;
    else if (x < indeks) hasil[key] = nilai;
    else if (x >= batas) hasil[String(x + jumlah)] = nilai;
  }
  return hasil;
}

/**
 * Menyisipkan (jumlah > 0) atau menghapus (jumlah < 0) baris/kolom pada satu sheet.
 * Rumus di semua sheet ikut disesuaikan. Mengembalikan workbook yang sama bila melewati batas.
 */
export function ubahStruktur(
  wb: Workbook,
  sheetIndex: number,
  sumbu: Sumbu,
  indeks: number,
  jumlah: number,
): Workbook {
  const target = wb.sheets[sheetIndex];
  if (!target || jumlah === 0 || indeks < 0) return wb;
  const total = sumbu === 'baris' ? target.rows : target.cols;
  const maks = sumbu === 'baris' ? BARIS_MAKS : KOLOM_MAKS;
  if (jumlah > 0 && total + jumlah > maks) return wb;
  if (jumlah < 0 && (indeks >= total || total + jumlah < 1)) return wb;

  const sheets = wb.sheets.map((s, i) => {
    const cells: Record<string, string> = {};
    const sumber = i === sheetIndex ? geserKunci(s.cells, sumbu, indeks, jumlah) : { ...s.cells };
    for (const [key, raw] of Object.entries(sumber)) {
      cells[key] = raw.startsWith('=') ? sesuaikanRumusStruktur(raw, s.name, target.name, sumbu, indeks, jumlah) : raw;
    }
    if (i !== sheetIndex) return { ...s, cells };
    return {
      ...s,
      cells,
      styles: geserKunci(s.styles, sumbu, indeks, jumlah),
      colWidths: sumbu === 'kolom' ? geserUkuran(s.colWidths, indeks, jumlah) : s.colWidths,
      rowHeights: sumbu === 'baris' ? geserUkuran(s.rowHeights, indeks, jumlah) : s.rowHeights,
      rows: sumbu === 'baris' ? s.rows + jumlah : s.rows,
      cols: sumbu === 'kolom' ? s.cols + jumlah : s.cols,
    };
  });
  return { ...wb, sheets };
}

// ------------------------------------------------------------------- sheet

function namaUnik(wb: Workbook, dasar: string, kecuali = -1): string {
  const dipakai = new Set(wb.sheets.filter((_, i) => i !== kecuali).map((s) => s.name.toLowerCase()));
  if (!dipakai.has(dasar.toLowerCase())) return dasar;
  for (let n = 2; ; n++) {
    const kandidat = `${dasar} (${n})`;
    if (!dipakai.has(kandidat.toLowerCase())) return kandidat;
  }
}

export function tambahSheet(wb: Workbook): Workbook {
  if (wb.sheets.length >= SHEET_MAKS) return wb;
  let n = wb.sheets.length + 1;
  while (wb.sheets.some((s) => s.name.toLowerCase() === `sheet${n}`)) n++;
  return { ...wb, sheets: [...wb.sheets, bikinSheet(`Sheet${n}`)] };
}

export function gantiNamaSheet(wb: Workbook, sheetIndex: number, namaBaru: string): Workbook {
  const lama = wb.sheets[sheetIndex]?.name;
  const bersih = namaBaru.replace(/[\\/?*[\]:]/g, '').trim().slice(0, 31);
  if (lama === undefined || bersih === '' || bersih === lama) return wb;
  const nama = namaUnik(wb, bersih, sheetIndex);
  return {
    ...wb,
    sheets: wb.sheets.map((s, i) => {
      const cells: Record<string, string> = {};
      for (const [key, raw] of Object.entries(s.cells)) {
        cells[key] = raw.startsWith('=') ? gantiNamaSheetDiRumus(raw, lama, nama) : raw;
      }
      return { ...s, cells, name: i === sheetIndex ? nama : s.name };
    }),
  };
}

export function hapusSheet(wb: Workbook, sheetIndex: number): Workbook {
  const hapus = wb.sheets[sheetIndex];
  if (!hapus || wb.sheets.length <= 1) return wb;
  return {
    ...wb,
    sheets: wb.sheets
      .filter((_, i) => i !== sheetIndex)
      .map((s) => {
        const cells: Record<string, string> = {};
        for (const [key, raw] of Object.entries(s.cells)) {
          cells[key] = raw.startsWith('=') ? gantiNamaSheetDiRumus(raw, hapus.name, null) : raw;
        }
        return { ...s, cells };
      }),
  };
}

// -------------------------------------------------------------- salin / isi

export interface Blok {
  readonly c1: number;
  readonly r1: number;
  readonly c2: number;
  readonly r2: number;
}

/** Isi sel + gaya untuk tempel internal, berurutan per baris. */
export interface SalinanBlok {
  readonly lebar: number;
  readonly tinggi: number;
  readonly sel: readonly (readonly { readonly raw: string; readonly gaya: CellStyle | undefined }[])[];
  /** Asal blok; dipakai menggeser rumus relatif saat ditempel. */
  readonly asalCol: number;
  readonly asalRow: number;
  /** Potong (pindah): rumus tidak digeser. */
  readonly potong: boolean;
}

export function ambilBlok(sheet: Sheet, blok: Blok, potong = false): SalinanBlok {
  const sel: { raw: string; gaya: CellStyle | undefined }[][] = [];
  for (let r = blok.r1; r <= blok.r2; r++) {
    const baris: { raw: string; gaya: CellStyle | undefined }[] = [];
    for (let c = blok.c1; c <= blok.c2; c++) {
      const key = cellKey(c, r);
      baris.push({ raw: sheet.cells[key] ?? '', gaya: sheet.styles[key] });
    }
    sel.push(baris);
  }
  return {
    lebar: blok.c2 - blok.c1 + 1,
    tinggi: blok.r2 - blok.r1 + 1,
    sel,
    asalCol: blok.c1,
    asalRow: blok.r1,
    potong,
  };
}

/** Menempel salinan mulai (col, row); rumus relatif digeser kecuali hasil potong. */
export function tempelBlok(wb: Workbook, sheetIndex: number, salinan: SalinanBlok, col: number, row: number): Workbook {
  const sheet = wb.sheets[sheetIndex];
  if (!sheet) return wb;
  const cells: Record<string, string> = { ...sheet.cells };
  const styles: Record<string, CellStyle> = { ...sheet.styles };
  const dCol = col - salinan.asalCol;
  const dRow = row - salinan.asalRow;
  salinan.sel.forEach((baris, dr) =>
    baris.forEach((item, dc) => {
      const c = col + dc;
      const r = row + dr;
      if (c >= sheet.cols || r >= sheet.rows) return;
      const key = cellKey(c, r);
      const raw = salinan.potong ? item.raw : shiftFormula(item.raw, dCol, dRow);
      if (raw === '') delete cells[key];
      else cells[key] = raw;
      if (item.gaya) styles[key] = item.gaya;
      else delete styles[key];
    }),
  );
  let hasil = ubahSheet(wb, sheetIndex, (s) => ({ ...s, cells, styles }));
  if (salinan.potong) {
    // Sel asal dikosongkan kecuali yang tertimpa tempelan.
    const kosong: Record<string, string> = {};
    const gayaHapus: string[] = [];
    for (let dr = 0; dr < salinan.tinggi; dr++) {
      for (let dc = 0; dc < salinan.lebar; dc++) {
        const key = cellKey(salinan.asalCol + dc, salinan.asalRow + dr);
        const tertimpa =
          salinan.asalCol + dc >= col && salinan.asalCol + dc < col + salinan.lebar &&
          salinan.asalRow + dr >= row && salinan.asalRow + dr < row + salinan.tinggi;
        if (!tertimpa) {
          kosong[key] = '';
          gayaHapus.push(key);
        }
      }
    }
    hasil = tulisSel(hasil, sheetIndex, kosong);
    hasil = ubahSheet(hasil, sheetIndex, (s) => {
      const gaya: Record<string, CellStyle> = { ...s.styles };
      for (const key of gayaHapus) delete gaya[key];
      return { ...s, styles: gaya };
    });
  }
  return hasil;
}

/**
 * Mengisi `tujuan` dengan pola `sumber` (seret fill handle): isi diulang, rumus relatif
 * digeser sesuai jarak dari sel sumbernya, gaya ikut disalin.
 */
export function isiBlok(wb: Workbook, sheetIndex: number, sumber: Blok, tujuan: Blok): Workbook {
  const sheet = wb.sheets[sheetIndex];
  if (!sheet) return wb;
  const tinggi = sumber.r2 - sumber.r1 + 1;
  const lebar = sumber.c2 - sumber.c1 + 1;
  const cells: Record<string, string> = { ...sheet.cells };
  const styles: Record<string, CellStyle> = { ...sheet.styles };
  const mod = (n: number, m: number) => ((n % m) + m) % m;
  for (let r = tujuan.r1; r <= tujuan.r2; r++) {
    for (let c = tujuan.c1; c <= tujuan.c2; c++) {
      const sc = sumber.c1 + mod(c - sumber.c1, lebar);
      const sr = sumber.r1 + mod(r - sumber.r1, tinggi);
      if (sc === c && sr === r) continue;
      const asal = cellKey(sc, sr);
      const key = cellKey(c, r);
      const raw = shiftFormula(sheet.cells[asal] ?? '', c - sc, r - sr);
      if (raw === '') delete cells[key];
      else cells[key] = raw;
      const gaya = sheet.styles[asal];
      if (gaya) styles[key] = gaya;
      else delete styles[key];
    }
  }
  return ubahSheet(wb, sheetIndex, (s) => ({ ...s, cells, styles }));
}

// ------------------------------------------------------------ simpan / baca

function adalahObjek(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function peta<T>(v: unknown, benar: (x: unknown) => x is T): Record<string, T> {
  const out: Record<string, T> = {};
  if (!adalahObjek(v)) return out;
  for (const [k, x] of Object.entries(v)) if (benar(x)) out[k] = x;
  return out;
}

const adalahString = (x: unknown): x is string => typeof x === 'string';
const adalahAngka = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function bacaGaya(v: unknown): CellStyle {
  if (!adalahObjek(v)) return {};
  const g: { -readonly [K in keyof CellStyle]: CellStyle[K] } = {};
  if (v.b === true) g.b = true;
  if (v.i === true) g.i = true;
  if (v.al === 'left' || v.al === 'center' || v.al === 'right') g.al = v.al;
  if (typeof v.fill === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.fill)) g.fill = v.fill;
  if (typeof v.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.color)) g.color = v.color;
  if (v.border === true) g.border = true;
  if (v.fmt === 'angka' || v.fmt === 'desimal' || v.fmt === 'rupiah' || v.fmt === 'persen') g.fmt = v.fmt;
  return g;
}

/** Membaca JSON tersimpan (format sheet lama berupa peta sel, atau workbook v2) menjadi Workbook. */
export function bacaWorkbook(v: unknown, namaSheetLama = 'Hasil Perbulan'): Workbook | null {
  if (!adalahObjek(v)) return null;
  if (!Array.isArray(v.sheets)) {
    // Format lama: hanya peta sel.
    const cells = peta(v, adalahString);
    return bikinWorkbook({ ...bikinSheet(namaSheetLama), cells });
  }
  const sheets: Sheet[] = [];
  for (const mentah of v.sheets.slice(0, SHEET_MAKS)) {
    if (!adalahObjek(mentah) || typeof mentah.name !== 'string') continue;
    const styles: Record<string, CellStyle> = {};
    for (const [k, g] of Object.entries(peta(mentah.styles, adalahObjek))) styles[k] = bacaGaya(g);
    sheets.push({
      name: mentah.name,
      cells: peta(mentah.cells, adalahString),
      styles,
      colWidths: peta(mentah.colWidths, adalahAngka),
      rowHeights: peta(mentah.rowHeights, adalahAngka),
      rows: Math.min(BARIS_MAKS, Math.max(1, adalahAngka(mentah.rows) ? Math.trunc(mentah.rows) : 40)),
      cols: Math.min(KOLOM_MAKS, Math.max(1, adalahAngka(mentah.cols) ? Math.trunc(mentah.cols) : 17)),
    });
  }
  return sheets.length === 0 ? null : { version: 2, sheets };
}
