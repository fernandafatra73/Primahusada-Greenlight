import { describe, expect, test } from 'vitest';
import { parseRad2Input, RAD2_NOMINAL_MAX, RAD2_UMUR_MAX } from '../../apps/api/src/lib/rad2.ts';

const validBody = {
  nama: '  Budi  ',
  umur: '35',
  alamat: ' Parung Kuda ',
  tanggal: '2026-09-15',
  pemeriksaan: 'Thorax PA',
  pengirim: 'dr. Andi',
  klinis: '',
  kesan: 'Cor dan pulmo normal',
  radiologi: '   ',
  harga: 150000,
  sharing: '18000',
};

describe('parseRad2Input', () => {
  test('trims text, converts numbers and turns empty optional fields into null', () => {
    const result = parseRad2Input(validBody);
    expect(result).toEqual({
      ok: true,
      data: {
        nama: 'Budi',
        umur: 35,
        alamat: 'Parung Kuda',
        tanggal: new Date('2026-09-15T00:00:00.000Z'),
        pemeriksaan: 'Thorax PA',
        pengirim: 'dr. Andi',
        klinis: null,
        kesan: 'Cor dan pulmo normal',
        radiologi: null,
        harga: 150000,
        sharing: 18000,
      },
    });
  });

  test('rejects non-object bodies', () => {
    expect(parseRad2Input(null)).toEqual({ ok: false, error: 'Data tidak valid' });
    expect(parseRad2Input([validBody])).toEqual({ ok: false, error: 'Data tidak valid' });
  });

  test('requires nama, pemeriksaan and pengirim', () => {
    expect(parseRad2Input({ ...validBody, nama: '  ' })).toMatchObject({ ok: false, error: 'Nama wajib diisi' });
    expect(parseRad2Input({ ...validBody, pemeriksaan: undefined })).toMatchObject({
      ok: false,
      error: 'Pemeriksaan wajib diisi',
    });
    expect(parseRad2Input({ ...validBody, pengirim: 42 })).toMatchObject({ ok: false, error: 'Pengirim wajib diisi' });
  });

  test('rejects invalid umur', () => {
    for (const umur of [-1, 2.5, RAD2_UMUR_MAX + 1, 'tiga', '', null]) {
      expect(parseRad2Input({ ...validBody, umur })).toMatchObject({ ok: false });
    }
    expect(parseRad2Input({ ...validBody, umur: RAD2_UMUR_MAX })).toMatchObject({ ok: true });
  });

  test('rejects malformed or impossible tanggal', () => {
    for (const tanggal of ['15-09-2026', '2026-02-30', '', undefined]) {
      expect(parseRad2Input({ ...validBody, tanggal })).toMatchObject({
        ok: false,
        error: 'Tanggal tidak valid (format YYYY-MM-DD)',
      });
    }
  });

  test('rejects negative, fractional or too large harga and sharing', () => {
    expect(parseRad2Input({ ...validBody, harga: -5 })).toMatchObject({ ok: false });
    expect(parseRad2Input({ ...validBody, harga: RAD2_NOMINAL_MAX + 1 })).toMatchObject({ ok: false });
    expect(parseRad2Input({ ...validBody, sharing: 1000.5 })).toMatchObject({ ok: false });
    expect(parseRad2Input({ ...validBody, sharing: '18rb' })).toMatchObject({ ok: false });
  });
});
