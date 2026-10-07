/** Menu Lisensi > Surat Sehat dan Lisensi > Hasil Lab: pemeriksaan kesehatan
 * tahunan karyawan. Berisi parameter lab bawaan dan helper arsip per tahun. */

export interface HasilLabBaris {
  readonly jenis: string;
  readonly parameter: string;
  readonly hasil: string;
  readonly satuan: string;
  readonly nilaiNormal: string;
}

export interface ParameterBawaan {
  readonly parameter: string;
  readonly satuan: string;
  readonly nilaiNormal: string;
}

/** Jenis pemeriksaan bawaan beserta parameternya. Nilai normal adalah rujukan umum
 * dewasa dan bisa diubah di form bila laboratorium memakai rujukan lain. */
export const JENIS_LAB_BAWAAN: ReadonlyArray<{
  readonly jenis: string;
  readonly parameter: ReadonlyArray<ParameterBawaan>;
}> = [
  {
    jenis: 'Hematologi',
    parameter: [
      {
        parameter: 'Hemoglobin',
        satuan: 'g/dL',
        nilaiNormal: 'L 13–17 / P 12–15',
      },
      { parameter: 'Leukosit', satuan: '/µL', nilaiNormal: '4.000–10.000' },
      {
        parameter: 'Eritrosit',
        satuan: 'juta/µL',
        nilaiNormal: 'L 4,5–5,5 / P 4,0–5,0',
      },
      {
        parameter: 'Hematokrit',
        satuan: '%',
        nilaiNormal: 'L 40–50 / P 35–45',
      },
      { parameter: 'Trombosit', satuan: '/µL', nilaiNormal: '150.000–400.000' },
    ],
  },
  {
    jenis: 'Diff Count',
    parameter: [
      { parameter: 'Basofil', satuan: '%', nilaiNormal: '0–1' },
      { parameter: 'Eosinofil', satuan: '%', nilaiNormal: '1–3' },
      { parameter: 'Neutrofil Batang', satuan: '%', nilaiNormal: '2–6' },
      { parameter: 'Neutrofil Segmen', satuan: '%', nilaiNormal: '50–70' },
      { parameter: 'Limfosit', satuan: '%', nilaiNormal: '20–40' },
      { parameter: 'Monosit', satuan: '%', nilaiNormal: '2–8' },
    ],
  },
  {
    jenis: 'LED',
    parameter: [
      {
        parameter: 'LED 1 Jam',
        satuan: 'mm/jam',
        nilaiNormal: 'L < 15 / P < 20',
      },
    ],
  },
  {
    jenis: 'Kimia Darah',
    parameter: [
      {
        parameter: 'Gula Darah Sewaktu',
        satuan: 'mg/dL',
        nilaiNormal: '< 200',
      },
      { parameter: 'Kolesterol Total', satuan: 'mg/dL', nilaiNormal: '< 200' },
      { parameter: 'Trigliserida', satuan: 'mg/dL', nilaiNormal: '< 150' },
      {
        parameter: 'Asam Urat',
        satuan: 'mg/dL',
        nilaiNormal: 'L 3,4–7,0 / P 2,4–5,7',
      },
      { parameter: 'SGOT', satuan: 'U/L', nilaiNormal: 'L ≤ 37 / P ≤ 31' },
      { parameter: 'SGPT', satuan: 'U/L', nilaiNormal: 'L ≤ 42 / P ≤ 32' },
      { parameter: 'Ureum', satuan: 'mg/dL', nilaiNormal: '10–50' },
      {
        parameter: 'Kreatinin',
        satuan: 'mg/dL',
        nilaiNormal: 'L 0,7–1,3 / P 0,6–1,1',
      },
    ],
  },
  {
    jenis: 'Urinalisa',
    parameter: [
      { parameter: 'Warna', satuan: '', nilaiNormal: 'Kuning' },
      { parameter: 'Kejernihan', satuan: '', nilaiNormal: 'Jernih' },
      { parameter: 'pH', satuan: '', nilaiNormal: '4,5–8,0' },
      { parameter: 'Berat Jenis', satuan: '', nilaiNormal: '1,005–1,030' },
      { parameter: 'Protein', satuan: '', nilaiNormal: 'Negatif' },
      { parameter: 'Glukosa', satuan: '', nilaiNormal: 'Negatif' },
      { parameter: 'Bilirubin', satuan: '', nilaiNormal: 'Negatif' },
      { parameter: 'Keton', satuan: '', nilaiNormal: 'Negatif' },
      { parameter: 'Nitrit', satuan: '', nilaiNormal: 'Negatif' },
      { parameter: 'Leukosit (sedimen)', satuan: '/LPB', nilaiNormal: '0–5' },
      { parameter: 'Eritrosit (sedimen)', satuan: '/LPB', nilaiNormal: '0–2' },
    ],
  },
];

/** Baris kosong (hasil belum diisi) untuk satu jenis; jenis tak dikenal → satu baris kosong. */
export function barisUntukJenis(jenis: string): HasilLabBaris[] {
  const bawaan = JENIS_LAB_BAWAAN.find(
    (j) => j.jenis.toLowerCase() === jenis.trim().toLowerCase(),
  );
  if (!bawaan)
    return [
      {
        jenis: jenis.trim(),
        parameter: '',
        hasil: '',
        satuan: '',
        nilaiNormal: '',
      },
    ];
  return bawaan.parameter.map((p) => ({
    jenis: bawaan.jenis,
    hasil: '',
    ...p,
  }));
}

/** Form hasil lab baru: semua jenis bawaan dengan parameternya, hasil masih kosong. */
export function barisHasilLabBaru(): HasilLabBaris[] {
  return JENIS_LAB_BAWAAN.flatMap((j) => barisUntukJenis(j.jenis));
}

/** Kelompokkan baris per jenis, urut kemunculan pertama jenisnya. */
export function kelompokPerJenis<T extends { readonly jenis: string }>(
  baris: ReadonlyArray<T>,
): Array<{ readonly jenis: string; readonly baris: T[] }> {
  const kelompok = new Map<string, T[]>();
  for (const b of baris) {
    const list = kelompok.get(b.jenis);
    if (list) list.push(b);
    else kelompok.set(b.jenis, [b]);
  }
  return [...kelompok].map(([jenis, list]) => ({ jenis, baris: list }));
}

/** Pilihan tahun di dropdown arsip: tahun yang punya data plus tahun ini, terbaru dulu. */
export function pilihanTahun(
  tahunTersedia: ReadonlyArray<number>,
  tahunIni: number,
): number[] {
  return [...new Set([tahunIni, ...tahunTersedia])].sort((a, b) => b - a);
}

export const KESIMPULAN_LABEL: Readonly<Record<string, string>> = {
  SEHAT: 'Sehat',
  TIDAK_SEHAT: 'Tidak Sehat',
};
