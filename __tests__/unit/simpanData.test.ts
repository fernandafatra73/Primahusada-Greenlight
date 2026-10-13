import { describe, expect, test } from 'vitest';
import {
  buatNamaBerkasTersimpan,
  isSimpanDataKategori,
  kategoriDariNamaBerkas,
} from '../../apps/api/src/lib/simpanData.js';

describe('simpan data helpers', () => {
  test('menebak kategori dari ekstensi tanpa peduli huruf besar', () => {
    expect(kategoriDariNamaBerkas('Laporan.XLSX')).toBe('excel');
    expect(kategoriDariNamaBerkas('surat.docx')).toBe('word');
    expect(kategoriDariNamaBerkas('foto.JPG')).toBe('foto');
    expect(kategoriDariNamaBerkas('rekaman.mp4')).toBe('video');
    expect(kategoriDariNamaBerkas('setup.exe')).toBe('aplikasi');
    expect(kategoriDariNamaBerkas('skrip.py')).toBe('program');
  });

  test('ekstensi tak dikenal atau tanpa ekstensi menjadi lainnya', () => {
    expect(kategoriDariNamaBerkas('catatan.xyz')).toBe('lainnya');
    expect(kategoriDariNamaBerkas('README')).toBe('lainnya');
  });

  test('validasi kategori menolak nilai di luar daftar', () => {
    expect(isSimpanDataKategori('video')).toBe(true);
    expect(isSimpanDataKategori('musik')).toBe(false);
    expect(isSimpanDataKategori(undefined)).toBe(false);
  });

  test('nama berkas tersimpan acak, hanya mempertahankan ekstensi bersih', () => {
    const a = buatNamaBerkasTersimpan('../../etc/passwd.TXT');
    const b = buatNamaBerkasTersimpan('../../etc/passwd.TXT');
    expect(a).toMatch(/^[0-9a-f-]{36}\.txt$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain('/');
    expect(buatNamaBerkasTersimpan('tanpa-ekstensi')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
