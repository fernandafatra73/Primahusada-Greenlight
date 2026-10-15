import { describe, expect, test } from 'vitest';
import {
  DEFAULT_HASIL_LAB2_PAKET,
  buildRowsFromHasilLab2,
  type HasilLab2Paket,
} from '../../apps/web/src/lib/hasilLab2.ts';

function rowsOf(id: string) {
  const paket = DEFAULT_HASIL_LAB2_PAKET.find((p) => p.id === id);
  if (!paket) throw new Error(`paket ${id} tidak ada`);
  return buildRowsFromHasilLab2(paket, (i) => `r${i}`);
}

describe('hasilLab2 paket bawaan', () => {
  test('Paket 1: Hematologi, Diffcount, LED', () => {
    const klasifikasi = new Set(rowsOf('paket-1').map((r) => r.klasifikasi));
    expect([...klasifikasi]).toEqual(['Hematologi', 'Diffcount', 'Laju Endap Darah']);
  });

  test('Paket 2: hematologi hanya Hemoglobine dan Leukosit', () => {
    const hema = rowsOf('paket-2').filter((r) => r.klasifikasi === 'Hematologi');
    expect(hema.map((r) => r.pemeriksaan)).toEqual(['Hemoglobine', 'Leukosit']);
    expect(rowsOf('paket-2').some((r) => r.klasifikasi === 'Diffcount')).toBe(true);
    expect(rowsOf('paket-2').some((r) => r.pemeriksaan === 'LED')).toBe(true);
  });

  test('Paket 3: Hematologi, LED, Widal', () => {
    const klasifikasi = new Set(rowsOf('paket-3').map((r) => r.klasifikasi));
    expect([...klasifikasi]).toEqual(['Hematologi', 'Laju Endap Darah', 'Widal']);
  });
});

describe('buildRowsFromHasilLab2', () => {
  test('mengelompokkan baris per grup walau item paket tercampur, dan melewati item tak dikenal', () => {
    const paket: HasilLab2Paket = {
      id: 'x',
      nama: 'Kustom',
      items: [
        { groupId: 'laju_endap_darah', pemeriksaan: 'LED' },
        { groupId: 'hematologi', pemeriksaan: 'Leukosit' },
        { groupId: 'hematologi', pemeriksaan: 'tidak ada' },
        { groupId: 'tidak-ada', pemeriksaan: 'LED' },
      ],
    };
    const rows = buildRowsFromHasilLab2(paket, (i) => `r${i}`);
    expect(rows.map((r) => r.pemeriksaan)).toEqual(['Leukosit', 'LED']);
    expect(rows.every((r) => r.hasil === '')).toBe(true);
  });
});
