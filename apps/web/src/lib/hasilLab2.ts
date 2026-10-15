import { PAKET_PEMERIKSAAN_LAB, type LabTableRow } from './labKesan.ts';

/** Satu pemeriksaan di dalam paket Hasil Lab2, merujuk grup + nama di PAKET_PEMERIKSAAN_LAB. */
export interface HasilLab2Item {
  readonly groupId: string;
  readonly pemeriksaan: string;
}

export interface HasilLab2Paket {
  readonly id: string;
  readonly nama: string;
  readonly items: readonly HasilLab2Item[];
}

export const HASIL_LAB2_STORAGE_KEY = 'primahusada.hasilLab2.paket';

function allOfGroup(groupId: string): HasilLab2Item[] {
  const group = PAKET_PEMERIKSAAN_LAB.find((g) => g.id === groupId);
  return (group?.items ?? []).map((it) => ({ groupId, pemeriksaan: it.pemeriksaan }));
}

export const DEFAULT_HASIL_LAB2_PAKET: readonly HasilLab2Paket[] = [
  {
    id: 'paket-1',
    nama: 'Paket 1',
    items: [...allOfGroup('hematologi'), ...allOfGroup('diffcount'), ...allOfGroup('laju_endap_darah')],
  },
  {
    id: 'paket-2',
    nama: 'Paket 2',
    items: [
      { groupId: 'hematologi', pemeriksaan: 'Hemoglobine' },
      { groupId: 'hematologi', pemeriksaan: 'Leukosit' },
      ...allOfGroup('diffcount'),
      ...allOfGroup('laju_endap_darah'),
    ],
  },
  {
    id: 'paket-3',
    nama: 'Paket 3',
    items: [...allOfGroup('hematologi'), ...allOfGroup('laju_endap_darah'), ...allOfGroup('widal')],
  },
];

function isPaket(value: unknown): value is HasilLab2Paket {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.nama === 'string' &&
    Array.isArray(v.items) &&
    v.items.every((it) => {
      if (typeof it !== 'object' || it === null) return false;
      const item = it as Record<string, unknown>;
      return typeof item.groupId === 'string' && typeof item.pemeriksaan === 'string';
    })
  );
}

/** Paket tersimpan; jika belum ada atau rusak, jatuh ke Paket 1-3 bawaan. */
export function loadHasilLab2Paket(): HasilLab2Paket[] {
  try {
    const raw = window.localStorage.getItem(HASIL_LAB2_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(isPaket)) return parsed;
    }
  } catch {
    // Storage tidak tersedia / JSON rusak: pakai bawaan.
  }
  return Array.from(DEFAULT_HASIL_LAB2_PAKET);
}

export function saveHasilLab2Paket(paket: readonly HasilLab2Paket[]): void {
  try {
    window.localStorage.setItem(HASIL_LAB2_STORAGE_KEY, JSON.stringify(paket));
  } catch {
    // Storage penuh / diblokir: paket hanya berlaku selama halaman terbuka.
  }
}

/**
 * Baris tabel hasil untuk satu paket. Baris dikelompokkan per klasifikasi
 * mengikuti urutan grup di PAKET_PEMERIKSAAN_LAB (groupLabRowsForPdf butuh
 * baris se-klasifikasi berurutan); item yang tidak ditemukan dilewati.
 */
export function buildRowsFromHasilLab2(paket: HasilLab2Paket, makeId: (index: number) => string): LabTableRow[] {
  const rows: LabTableRow[] = [];
  for (const group of PAKET_PEMERIKSAAN_LAB) {
    for (const ref of paket.items) {
      if (ref.groupId !== group.id) continue;
      const item = group.items.find((it) => it.pemeriksaan === ref.pemeriksaan);
      if (!item) continue;
      rows.push({
        id: makeId(rows.length),
        klasifikasi: item.grup ?? group.label,
        pemeriksaan: item.pemeriksaan,
        hasil: '',
        nilaiRujukan: item.nilaiRujukan,
      });
    }
  }
  return rows;
}
