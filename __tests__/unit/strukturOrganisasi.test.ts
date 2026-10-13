import { describe, expect, test } from 'vitest';
import {
  isStrukturJabatan,
  isValidStrukturFoto,
} from '../../apps/api/src/lib/strukturOrganisasi.js';

describe('struktur organisasi helpers', () => {
  test('hanya menerima posisi yang terdaftar', () => {
    expect(isStrukturJabatan('pimpinan')).toBe(true);
    expect(isStrukturJabatan('kebersihan')).toBe(true);
    expect(isStrukturJabatan('satpam')).toBe(false);
    expect(isStrukturJabatan(undefined)).toBe(false);
  });

  test('foto boleh kosong, path upload, atau data URL gambar', () => {
    expect(isValidStrukturFoto('')).toBe(true);
    expect(isValidStrukturFoto('/uploads/struktur-organisasi/a.png')).toBe(true);
    expect(isValidStrukturFoto('data:image/png;base64,AAAA')).toBe(true);
  });

  test('foto menolak data URL non-gambar dan URL luar', () => {
    expect(isValidStrukturFoto('data:text/html;base64,AAAA')).toBe(false);
    expect(isValidStrukturFoto('https://contoh.com/a.png')).toBe(false);
  });
});
