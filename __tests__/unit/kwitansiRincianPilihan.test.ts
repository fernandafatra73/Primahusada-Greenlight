import { describe, expect, test } from 'vitest';
import { isDokterUmum, isKategoriPilihan } from '../../apps/api/src/lib/kwitansiRincian.js';

describe('kwitansi rincian pilihan', () => {
  test('kategori hanya menerima lima layanan yang terdaftar', () => {
    for (const k of ['radiologi', 'laboratorium', 'farmasi', 'dokter-umum', 'dokter-spesialis']) {
      expect(isKategoriPilihan(k)).toBe(true);
    }
    expect(isKategoriPilihan('gigi')).toBe(false);
    expect(isKategoriPilihan(undefined)).toBe(false);
  });

  test('dokter tanpa spesialisasi atau bertuliskan umum dihitung dokter umum', () => {
    expect(isDokterUmum(null)).toBe(true);
    expect(isDokterUmum('  ')).toBe(true);
    expect(isDokterUmum('Dokter Umum')).toBe(true);
    expect(isDokterUmum('Sp.PD')).toBe(false);
  });
});
