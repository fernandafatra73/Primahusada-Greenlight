import type { LabTableRow } from './labKesan.ts';

/// Delapan antigen Widal, sama dengan paket "Widal" bawaan di server.
export const DEFAULT_WIDAL_PARAMETERS: readonly string[] = [
  'Salmonella Typhi O',
  'Salmonella Paratyphi AO',
  'Salmonella Paratyphi BO',
  'Salmonella Paratyphi CO',
  'Salmonella Typhi H',
  'Salmonella Paratyphi AH',
  'Salmonella Paratyphi BH',
  'Salmonella Paratyphi CH',
];

export interface WidalReadResult {
  readonly pemeriksaan: string;
  readonly hasil: string;
}

export function isWidalRow(row: LabTableRow): boolean {
  if ((row.klasifikasi ?? '').trim().toLowerCase() === 'widal') return true;
  return /salmonella|typhi|widal/i.test(row.pemeriksaan);
}

/// Nama pemeriksaan yang dikirim ke AI: baris Widal yang sudah ada di tabel,
/// atau kedelapan antigen bawaan kalau tabel belum berisi Widal.
export function widalParameterNames(rows: readonly LabTableRow[]): string[] {
  const names = rows.filter((r) => isWidalRow(r) && r.pemeriksaan.trim()).map((r) => r.pemeriksaan.trim());
  return names.length > 0 ? names : [...DEFAULT_WIDAL_PARAMETERS];
}

/// Mengisi kolom Hasil baris Widal dari bacaan AI. Kalau tabel belum punya
/// baris Widal, kedelapan antigen ditambahkan di akhir supaya hasilnya
/// tetap tersimpan. Hasil kosong (tidak terbaca) tidak menimpa isian lama.
export function applyWidalResults(
  rows: readonly LabTableRow[],
  results: readonly WidalReadResult[],
  makeId: (index: number) => string,
): LabTableRow[] {
  const hasilFor = (pemeriksaan: string): string =>
    results.find((r) => r.pemeriksaan.trim().toLowerCase() === pemeriksaan.trim().toLowerCase())?.hasil ?? '';

  if (!rows.some(isWidalRow)) {
    const added = DEFAULT_WIDAL_PARAMETERS.map((pemeriksaan, index) => ({
      id: makeId(index),
      klasifikasi: 'Widal',
      pemeriksaan,
      hasil: hasilFor(pemeriksaan),
      nilaiRujukan: '(-) Negatif',
    }));
    return [...rows, ...added];
  }

  return rows.map((row) => {
    if (!isWidalRow(row)) return row;
    const hasil = hasilFor(row.pemeriksaan);
    return hasil ? { ...row, hasil } : row;
  });
}
