import { describe, expect, test } from 'vitest';
import {
  durasiDetik,
  parseFotoLogin,
  parseLoginLogCreate,
  parseLoginLogEdit,
} from '../../apps/api/src/lib/loginLog.ts';
import { formatDurasi, keInputDatetimeLocal, pecahWaktuLogin } from '../../apps/web/src/lib/loginLog.ts';

describe('parseLoginLogCreate', () => {
  test('trims fields and keeps an empty staff id as null', () => {
    expect(parseLoginLogCreate({ staffId: '', nama: ' Radiologi ', email: ' r@x.local ' })).toEqual({
      ok: true,
      data: { staffId: null, nama: 'Radiologi', email: 'r@x.local' },
    });
  });

  test('requires a name', () => {
    expect(parseLoginLogCreate({ nama: '  ' })).toEqual({ ok: false, error: 'Nama login wajib diisi' });
    expect(parseLoginLogCreate({ nama: 'x'.repeat(121) })).toEqual({ ok: false, error: 'Nama login terlalu panjang' });
  });
});

describe('parseLoginLogEdit', () => {
  test('accepts a partial edit', () => {
    expect(parseLoginLogEdit({ nama: 'Lab' })).toEqual({ ok: true, data: { nama: 'Lab' } });
    expect(parseLoginLogEdit({ loginAt: '2026-10-17T01:00:00.000Z' })).toEqual({
      ok: true,
      data: { loginAt: new Date('2026-10-17T01:00:00.000Z') },
    });
  });

  test('rejects an empty name or an invalid time', () => {
    expect(parseLoginLogEdit({ nama: '' })).toEqual({ ok: false, error: 'Nama login wajib diisi' });
    expect(parseLoginLogEdit({ loginAt: 'besok' })).toEqual({ ok: false, error: 'Waktu login tidak valid' });
    expect(parseLoginLogEdit({ loginAt: 123 })).toEqual({ ok: false, error: 'Waktu login tidak valid' });
  });
});

describe('parseFotoLogin', () => {
  test('accepts an image data URL', () => {
    expect(parseFotoLogin('data:image/jpeg;base64,/9j/4AAQ==')).toEqual({ ok: true, data: 'data:image/jpeg;base64,/9j/4AAQ==' });
  });

  test('rejects anything that is not an image data URL', () => {
    const tidakValid = { ok: false, error: 'Foto tidak valid' };
    expect(parseFotoLogin('https://example.com/a.jpg')).toEqual(tidakValid);
    expect(parseFotoLogin('data:text/html;base64,PGI+')).toEqual(tidakValid);
    expect(parseFotoLogin(null)).toEqual(tidakValid);
    expect(parseFotoLogin(`data:image/jpeg;base64,${'A'.repeat(2_000_000)}`)).toEqual(tidakValid);
  });
});

describe('durasiDetik', () => {
  const login = new Date('2026-10-17T08:00:00Z');

  test('counts until logout when there is one', () => {
    expect(durasiDetik(login, new Date('2026-10-17T08:30:00Z'), new Date('2026-10-17T09:15:00Z'))).toBe(4500);
  });

  test('falls back to the last activity signal without logout', () => {
    expect(durasiDetik(login, new Date('2026-10-17T08:30:00Z'), null)).toBe(1800);
  });

  test('never goes negative after an edited login time', () => {
    expect(durasiDetik(new Date('2026-10-17T10:00:00Z'), login, null)).toBe(0);
  });
});

describe('formatDurasi', () => {
  test('formats seconds, minutes, hours and days', () => {
    expect(formatDurasi(42)).toBe('42 detik');
    expect(formatDurasi(60)).toBe('1 menit');
    expect(formatDurasi(3720)).toBe('1 jam 2 menit');
    expect(formatDurasi(7200)).toBe('2 jam');
    expect(formatDurasi(90_061)).toBe('1 hari 1 jam 1 menit');
    expect(formatDurasi(-5)).toBe('0 detik');
  });
});

describe('pecahWaktuLogin', () => {
  test('splits a local time into table columns', () => {
    expect(pecahWaktuLogin(new Date(2026, 9, 17, 7, 5).toISOString())).toEqual({
      jam: '07:05',
      tanggal: 17,
      bulan: 'Oktober',
      tahun: 2026,
    });
  });
});

describe('keInputDatetimeLocal', () => {
  test('formats for a datetime-local input in local time', () => {
    expect(keInputDatetimeLocal(new Date(2026, 0, 2, 3, 4).toISOString())).toBe('2026-01-02T03:04');
  });
});
