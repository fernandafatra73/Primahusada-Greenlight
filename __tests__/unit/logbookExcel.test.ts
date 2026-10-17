import { describe, expect, test } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildLogbookRows,
  buildLogbookWorkbook,
  type LogbookKondisiSource,
  type LogbookPasienSource,
} from '../../apps/api/src/lib/logbookExcel.js';

const REF = new Date(2026, 9, 14);

function pasien(overrides: Partial<LogbookPasienSource> = {}): LogbookPasienSource {
  return {
    nama: 'Siti Aminah',
    tanggalLahir: new Date(1990, 9, 15),
    alamat: 'Parung Kuda',
    pemeriksaanNama: 'Thorax PA',
    pengirimNama: 'dr. Budi',
    registeredAt: new Date(2026, 9, 3, 9, 30),
    ...overrides,
  };
}

describe('buildLogbookRows', () => {
  test('mengisi kolom seperti Export Excel halaman Logbook Pasien', () => {
    const kondisi: LogbookKondisiSource[] = [
      { namaPasien: 'siti aminah ', kv: '51', sekon: '0.05', mAs: '2.5', beratBadan: '55' },
    ];
    expect(buildLogbookRows([pasien()], kondisi, REF)).toEqual([
      {
        No: 1,
        Nama: 'Siti Aminah',
        Usia: '35 Thn 11 bln 29 hr',
        Alamat: 'Parung Kuda',
        Pemeriksaan: 'Thorax PA',
        Pengirim: 'dr. Budi',
        Tanggal: '03-10-2026',
        KV: '51',
        Sekond: '0.05',
        mAs: '2.5',
        'Berat Badan': '55 kg',
      },
    ]);
  });

  test('tanpa kondisi alat dan alamat kosong memakai tanda strip', () => {
    const [row] = buildLogbookRows([pasien({ alamat: null, pemeriksaanNama: '' })], [], REF);
    expect(row).toMatchObject({
      Alamat: '—',
      Pemeriksaan: '—',
      KV: '—',
      Sekond: '—',
      mAs: '—',
      'Berat Badan': '—',
    });
  });

  test('kondisi alat pertama (terbaru) yang dipakai untuk nama yang sama', () => {
    const kondisi: LogbookKondisiSource[] = [
      { namaPasien: 'Siti Aminah', kv: '60', sekon: '0.1', mAs: '5', beratBadan: null },
      { namaPasien: 'Siti Aminah', kv: '45', sekon: '0.04', mAs: '3.2', beratBadan: '6' },
    ];
    const [row] = buildLogbookRows([pasien()], kondisi, REF);
    expect(row).toMatchObject({ KV: '60', 'Berat Badan': '—' });
  });

  test('nomor urut mengikuti urutan input', () => {
    const rows = buildLogbookRows([pasien({ nama: 'A' }), pasien({ nama: 'B' })], [], REF);
    expect(rows.map((r) => [r.No, r.Nama])).toEqual([
      [1, 'A'],
      [2, 'B'],
    ]);
  });
});

describe('buildLogbookWorkbook', () => {
  test('menghasilkan xlsx dengan sheet Logbook Pasien yang bisa dibaca ulang', () => {
    const rows = buildLogbookRows([pasien()], [], REF);
    const wb = XLSX.read(buildLogbookWorkbook(rows), { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Logbook Pasien']);
    const sheet = wb.Sheets['Logbook Pasien'];
    if (!sheet) throw new Error('sheet tidak ada');
    expect(XLSX.utils.sheet_to_json(sheet)).toEqual(rows);
  });

  test('tabel kosong tetap menghasilkan file valid', () => {
    const wb = XLSX.read(buildLogbookWorkbook([]), { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Logbook Pasien']);
  });
});
