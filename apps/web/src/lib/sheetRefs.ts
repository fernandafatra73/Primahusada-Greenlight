import { columnIndex, columnLabel } from './sheetFormula.ts';

/** Satu referensi sel/rentang di dalam teks rumus, dengan penanda absolut ($). */
export interface RefParts {
  /** Nama sheet seperti diketik (tanpa kutip); null bila tanpa awalan sheet. */
  readonly sheet: string | null;
  readonly c1: number;
  readonly r1: number;
  readonly a1c: boolean;
  readonly a1r: boolean;
  /** Ujung rentang; null bila referensi satu sel. */
  readonly c2: number | null;
  readonly r2: number | null;
  readonly a2c: boolean;
  readonly a2r: boolean;
}

const LITERAL_TEKS = /"(?:[^"]|"")*"/g;
const REFERENSI =
  /(?<![A-Za-z0-9_.!'$])((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?(?![A-Za-z0-9_(])/g;

function bukaKutip(nama: string): string {
  return nama.startsWith("'") ? nama.slice(1, -1).replace(/''/g, "'") : nama;
}

export function namaSheetUntukRumus(nama: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(nama) ? nama : `'${nama.replace(/'/g, "''")}'`;
}

export function formatReference(ref: RefParts): string {
  const awalan = ref.sheet === null ? '' : `${namaSheetUntukRumus(ref.sheet)}!`;
  const a = `${ref.a1c ? '$' : ''}${columnLabel(ref.c1)}${ref.a1r ? '$' : ''}${ref.r1 + 1}`;
  if (ref.c2 === null || ref.r2 === null) return `${awalan}${a}`;
  return `${awalan}${a}:${ref.a2c ? '$' : ''}${columnLabel(ref.c2)}${ref.a2r ? '$' : ''}${ref.r2 + 1}`;
}

/**
 * Mengganti setiap referensi dalam rumus (di luar literal teks) lewat `visit`.
 * `visit` mengembalikan referensi baru, atau '#REF!' bila referensi tidak lagi valid.
 */
export function mapReferences(raw: string, visit: (ref: RefParts) => RefParts | '#REF!'): string {
  if (!raw.startsWith('=')) return raw;
  const potongan: string[] = [];
  let akhir = 0;
  for (const m of raw.matchAll(LITERAL_TEKS)) {
    potongan.push(ubah(raw.slice(akhir, m.index), visit), m[0]);
    akhir = m.index + m[0].length;
  }
  potongan.push(ubah(raw.slice(akhir), visit));
  return potongan.join('');
}

function ubah(segmen: string, visit: (ref: RefParts) => RefParts | '#REF!'): string {
  return segmen.replace(
    REFERENSI,
    (_semua, awalan: string | undefined, d1: string, k1: string, d1r: string, b1: string, d2, k2, d2r, b2) => {
      const ref: RefParts = {
        sheet: awalan === undefined ? null : bukaKutip(awalan.slice(0, -1)),
        c1: columnIndex(k1),
        r1: Number(b1) - 1,
        a1c: d1 === '$',
        a1r: d1r === '$',
        c2: k2 === undefined ? null : columnIndex(k2 as string),
        r2: b2 === undefined ? null : Number(b2) - 1,
        a2c: d2 === '$',
        a2r: d2r === '$',
      };
      const hasil = visit(ref);
      return hasil === '#REF!' ? '#REF!' : formatReference(hasil);
    },
  );
}

/** Menggeser referensi relatif (tanpa $), seperti saat menyalin atau mengisi rumus. */
export function shiftFormula(raw: string, dCol: number, dRow: number): string {
  if (dCol === 0 && dRow === 0) return raw;
  return mapReferences(raw, (ref) => {
    const c1 = ref.a1c ? ref.c1 : ref.c1 + dCol;
    const r1 = ref.a1r ? ref.r1 : ref.r1 + dRow;
    const c2 = ref.c2 === null ? null : ref.a2c ? ref.c2 : ref.c2 + dCol;
    const r2 = ref.r2 === null ? null : ref.a2r ? ref.r2 : ref.r2 + dRow;
    if (c1 < 0 || r1 < 0 || (c2 !== null && c2 < 0) || (r2 !== null && r2 < 0)) return '#REF!';
    return { ...ref, c1, r1, c2, r2 };
  });
}

/** Mengubah ke huruf besar di luar literal teks, seperti Excel merapikan rumus yang diketik. */
export function rapikanRumus(raw: string): string {
  if (!raw.startsWith('=')) return raw;
  const potongan: string[] = [];
  let akhir = 0;
  for (const m of raw.matchAll(LITERAL_TEKS)) {
    potongan.push(raw.slice(akhir, m.index).toUpperCase(), m[0]);
    akhir = m.index + m[0].length;
  }
  potongan.push(raw.slice(akhir).toUpperCase());
  return potongan.join('');
}

export type Sumbu = 'baris' | 'kolom';

function sama(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Menyesuaikan rumus setelah baris/kolom disisipkan (jumlah > 0) atau dihapus
 * (jumlah < 0) pada `sheetTarget`. `sheetRumus` = sheet tempat rumus berada.
 */
export function sesuaikanRumusStruktur(
  raw: string,
  sheetRumus: string,
  sheetTarget: string,
  sumbu: Sumbu,
  indeks: number,
  jumlah: number,
): string {
  return mapReferences(raw, (ref) => {
    if (!sama(ref.sheet ?? sheetRumus, sheetTarget)) return ref;
    const ambil = (c: number, r: number) => (sumbu === 'baris' ? r : c);
    const pasang = (nilai: number, titik: 1 | 2): RefParts => {
      if (sumbu === 'baris') {
        return titik === 1 ? { ...ref, r1: nilai } : { ...ref, r2: nilai };
      }
      return titik === 1 ? { ...ref, c1: nilai } : { ...ref, c2: nilai };
    };
    const awal = ambil(ref.c1, ref.r1);
    const akhirNilai = ref.c2 === null || ref.r2 === null ? null : ambil(ref.c2, ref.r2);

    if (jumlah > 0) {
      const geser = (x: number) => (x >= indeks ? x + jumlah : x);
      let hasil = pasang(geser(awal), 1);
      if (akhirNilai !== null) {
        const sumbuAkhir = sumbu === 'baris' ? { ...hasil, r2: geser(akhirNilai) } : { ...hasil, c2: geser(akhirNilai) };
        hasil = sumbuAkhir;
      }
      return hasil;
    }

    const hapus = -jumlah;
    const batas = indeks + hapus;
    if (akhirNilai === null) {
      if (awal >= indeks && awal < batas) return '#REF!';
      return pasang(awal >= batas ? awal - hapus : awal, 1);
    }
    if (awal >= indeks && akhirNilai < batas) return '#REF!';
    const barisAwal = awal < indeks ? awal : awal < batas ? indeks : awal - hapus;
    const barisAkhir = akhirNilai < indeks ? akhirNilai : akhirNilai < batas ? indeks - 1 : akhirNilai - hapus;
    if (barisAkhir < barisAwal) return '#REF!';
    return sumbu === 'baris'
      ? { ...ref, r1: barisAwal, r2: barisAkhir }
      : { ...ref, c1: barisAwal, c2: barisAkhir };
  });
}

/** Mengganti nama sheet pada referensi (`baru` = null berarti sheet dihapus -> #REF!). */
export function gantiNamaSheetDiRumus(raw: string, lama: string, baru: string | null): string {
  return mapReferences(raw, (ref) => {
    if (ref.sheet === null || !sama(ref.sheet, lama)) return ref;
    return baru === null ? '#REF!' : { ...ref, sheet: baru };
  });
}
