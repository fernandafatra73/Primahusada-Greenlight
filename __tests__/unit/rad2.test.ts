import { describe, expect, test } from 'vitest';
import { buildRad2Filter, parseRad2Input, RAD2_NOMINAL_MAX, RAD2_UMUR_MAX } from '../../apps/api/src/lib/rad2.ts';

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

describe('buildRad2Filter', () => {
  test('returns an empty filter when nothing is given', () => {
    expect(buildRad2Filter({})).toEqual({ ok: true, where: {} });
    expect(buildRad2Filter({ q: '  ', pengirim: ' ', dari: '', sampai: '' })).toEqual({ ok: true, where: {} });
  });

  test('searches nama, pemeriksaan, pengirim and radiologi', () => {
    const result = buildRad2Filter({ q: ' thorax ' });
    expect(result).toEqual({
      ok: true,
      where: {
        OR: [
          { nama: { contains: 'thorax' } },
          { pemeriksaan: { contains: 'thorax' } },
          { pengirim: { contains: 'thorax' } },
          { radiologi: { contains: 'thorax' } },
        ],
      },
    });
  });

  test('matches dokter pengirim exactly', () => {
    expect(buildRad2Filter({ pengirim: ' dr. Andi ' })).toEqual({ ok: true, where: { pengirim: 'dr. Andi' } });
  });

  test('makes the end date inclusive by using the next day as an exclusive bound', () => {
    const result = buildRad2Filter({ dari: '2026-09-01', sampai: '2026-09-30' });
    expect(result).toEqual({
      ok: true,
      where: { tanggal: { gte: new Date('2026-09-01T00:00:00.000Z'), lt: new Date('2026-10-01T00:00:00.000Z') } },
    });
  });

  test('accepts a single-day range', () => {
    const result = buildRad2Filter({ dari: '2026-09-15', sampai: '2026-09-15' });
    expect(result).toEqual({
      ok: true,
      where: { tanggal: { gte: new Date('2026-09-15T00:00:00.000Z'), lt: new Date('2026-09-16T00:00:00.000Z') } },
    });
  });

  test('supports open-ended ranges', () => {
    expect(buildRad2Filter({ dari: '2026-09-01' })).toEqual({
      ok: true,
      where: { tanggal: { gte: new Date('2026-09-01T00:00:00.000Z') } },
    });
    expect(buildRad2Filter({ sampai: '2026-09-01' })).toEqual({
      ok: true,
      where: { tanggal: { lt: new Date('2026-09-02T00:00:00.000Z') } },
    });
  });

  test('rejects invalid or reversed dates', () => {
    expect(buildRad2Filter({ dari: '01-09-2026' }).ok).toBe(false);
    expect(buildRad2Filter({ sampai: '2026-02-30' }).ok).toBe(false);
    expect(buildRad2Filter({ dari: '2026-09-10', sampai: '2026-09-01' }).ok).toBe(false);
  });
});
