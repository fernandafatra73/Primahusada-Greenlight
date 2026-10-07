import { describe, expect, test } from 'vitest';
import {
  HASIL_LAB_ITEM_MAX,
  parseHasilLabBody,
  parseSuratSehatBody,
} from '../../apps/api/src/lib/lisensiKaryawan.ts';
import {
  barisHasilLabBaru,
  barisUntukJenis,
  JENIS_LAB_BAWAAN,
  kelompokPerJenis,
  isiNormal,
  pilihanTahun,
} from '../../apps/web/src/lib/lisensiKaryawan.ts';

// Tanggal dikirim web pada tengah hari waktu lokal, jadi tahunnya tidak bergeser oleh zona waktu.
const TANGGAL = new Date(2026, 9, 7, 12).toISOString();

describe('parseSuratSehatBody', () => {
  const valid = {
    nama: ' Ani ',
    namaDokter: 'dr. Budi',
    tanggalPeriksa: TANGGAL,
    kesimpulan: 'SEHAT',
  };

  test('accepts a minimal letter, trims text and derives the year from the exam date', () => {
    const result = parseSuratSehatBody({
      ...valid,
      jabatan: '  ',
      tinggiBadan: '160',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      tahun: 2026,
      nama: 'Ani',
      namaDokter: 'dr. Budi',
      jabatan: null,
      tinggiBadan: '160',
      kesimpulan: 'SEHAT',
    });
  });

  test('requires employee name, doctor name and a valid date', () => {
    expect(parseSuratSehatBody({ ...valid, nama: '' })).toEqual({
      ok: false,
      error: 'Nama karyawan wajib diisi',
    });
    expect(parseSuratSehatBody({ ...valid, namaDokter: undefined })).toEqual({
      ok: false,
      error: 'Nama dokter wajib diisi',
    });
    expect(
      parseSuratSehatBody({ ...valid, tanggalPeriksa: 'kemarin' }),
    ).toEqual({
      ok: false,
      error: 'Tanggal periksa tidak valid',
    });
    expect(
      parseSuratSehatBody({ ...valid, tanggalPeriksa: null }),
    ).toMatchObject({ ok: false });
  });

  test('rejects an unknown conclusion and overlong or non-text fields', () => {
    expect(parseSuratSehatBody({ ...valid, kesimpulan: 'MUNGKIN' })).toEqual({
      ok: false,
      error: 'Kesimpulan tidak dikenal',
    });
    expect(
      parseSuratSehatBody({ ...valid, alamat: 'x'.repeat(201) }),
    ).toMatchObject({ ok: false });
    expect(parseSuratSehatBody({ ...valid, nadi: 80 })).toMatchObject({
      ok: false,
    });
  });
});

describe('parseHasilLabBody', () => {
  const valid = { nama: 'Ani', tanggalPeriksa: TANGGAL };

  test('keeps filled results in order and drops rows without a result', () => {
    const result = parseHasilLabBody({
      ...valid,
      items: [
        {
          jenis: 'Hematologi',
          parameter: 'Hemoglobin',
          hasil: ' 14 ',
          satuan: 'g/dL',
          nilaiNormal: '13–17',
        },
        {
          jenis: 'Hematologi',
          parameter: 'Leukosit',
          hasil: '',
          satuan: '/µL',
          nilaiNormal: '',
        },
        {
          jenis: 'LED',
          parameter: 'LED 1 Jam',
          hasil: '10',
          satuan: '',
          nilaiNormal: null,
        },
      ],
    });
    expect(result).toEqual({
      ok: true,
      data: {
        tahun: 2026,
        tanggalPeriksa: new Date(TANGGAL),
        nama: 'Ani',
        jabatan: null,
        catatan: null,
        namaAnalis: null,
        items: [
          {
            urutan: 0,
            jenis: 'Hematologi',
            parameter: 'Hemoglobin',
            hasil: '14',
            satuan: 'g/dL',
            nilaiNormal: '13–17',
          },
          {
            urutan: 1,
            jenis: 'LED',
            parameter: 'LED 1 Jam',
            hasil: '10',
            satuan: null,
            nilaiNormal: null,
          },
        ],
      },
    });
  });

  test('trims the analyst name and treats a blank one as absent', () => {
    expect(
      parseHasilLabBody({ ...valid, namaAnalis: '  Budi  ' }),
    ).toMatchObject({ ok: true, data: { namaAnalis: 'Budi' } });
    expect(parseHasilLabBody({ ...valid, namaAnalis: '  ' })).toMatchObject({
      ok: true,
      data: { namaAnalis: null },
    });
    expect(parseHasilLabBody({ ...valid, namaAnalis: 5 })).toEqual({
      ok: false,
      error: 'Nama analis tidak valid',
    });
  });

  test('a filled result needs its jenis and parameter name', () => {
    expect(
      parseHasilLabBody({
        ...valid,
        items: [{ jenis: 'Serologi', parameter: '', hasil: 'Negatif' }],
      }),
    ).toEqual({
      ok: false,
      error: 'Jenis dan nama parameter wajib diisi untuk setiap hasil',
    });
  });

  test('rejects malformed lists and too many rows', () => {
    expect(parseHasilLabBody({ ...valid, items: 'x' })).toMatchObject({
      ok: false,
    });
    expect(parseHasilLabBody({ ...valid, items: [null] })).toMatchObject({
      ok: false,
    });
    const banyak = Array.from({ length: HASIL_LAB_ITEM_MAX + 1 }, () => ({
      jenis: 'A',
      parameter: 'B',
      hasil: '1',
    }));
    expect(parseHasilLabBody({ ...valid, items: banyak })).toMatchObject({
      ok: false,
    });
    expect(parseHasilLabBody({ nama: 'Ani' })).toMatchObject({ ok: false });
  });
});

describe('hasil lab form helpers', () => {
  test('a new form holds the five default jenis with empty results', () => {
    const baris = barisHasilLabBaru();
    expect(kelompokPerJenis(baris).map((k) => k.jenis)).toEqual([
      'Hematologi',
      'Diff Count',
      'LED',
      'Kimia Darah',
      'Urinalisa',
    ]);
    expect(baris.every((b) => b.hasil === '')).toBe(true);
    expect(baris).toHaveLength(
      JENIS_LAB_BAWAAN.reduce((n, j) => n + j.parameter.length, 0),
    );
  });

  test('adding a known jenis (any case) brings its parameters; an unknown one gets one blank row', () => {
    expect(barisUntukJenis('led')).toEqual([
      {
        jenis: 'LED',
        parameter: 'LED 1 Jam',
        hasil: '',
        satuan: 'mm/jam',
        nilaiNormal: 'L < 15 / P < 20',
      },
    ]);
    expect(barisUntukJenis(' Serologi ')).toEqual([
      {
        jenis: 'Serologi',
        parameter: '',
        hasil: '',
        satuan: '',
        nilaiNormal: '',
      },
    ]);
  });

  test('kelompokPerJenis groups rows by first appearance', () => {
    const rows = [{ jenis: 'B' }, { jenis: 'A' }, { jenis: 'B' }];
    expect(kelompokPerJenis(rows)).toEqual([
      { jenis: 'B', baris: [{ jenis: 'B' }, { jenis: 'B' }] },
      { jenis: 'A', baris: [{ jenis: 'A' }] },
    ]);
  });

  test('pilihanTahun always offers this year, newest first, without duplicates', () => {
    expect(pilihanTahun([2024, 2026, 2025], 2026)).toEqual([2026, 2025, 2024]);
    expect(pilihanTahun([], 2026)).toEqual([2026]);
  });

  test('pilihanTahun lists every year from tahunAwal, keeping earlier years that have data', () => {
    expect(pilihanTahun([], 2026, 2021)).toEqual([
      2026, 2025, 2024, 2023, 2022, 2021,
    ]);
    expect(pilihanTahun([2019], 2023, 2021)).toEqual([
      2023, 2022, 2021, 2019,
    ]);
  });
  test('isiNormal picks a value inside the normal range', () => {
    expect(isiNormal('4.000–10.000')).toBe('7.000');
    expect(isiNormal('4,5–8,0')).toBe('6,3');
    expect(isiNormal('0–5')).toBe('3');
  });

  test('isiNormal copies non-numeric normal values as-is', () => {
    expect(isiNormal('Negatif')).toBe('Negatif');
    expect(isiNormal('Kuning')).toBe('Kuning');
    expect(isiNormal('')).toBe('');
  });

  test('isiNormal handles upper limits and per-gender ranges', () => {
    expect(isiNormal('< 200')).toBe('160');
    expect(isiNormal('L 13–17 / P 12–15')).toBe('14');
    expect(isiNormal('L 40–50 / P 35–45')).toBe('43');
    // Tidak beririsan: pakai rentang L.
    expect(isiNormal('L 10–12 / P 20–22')).toBe('11');
  });
});
