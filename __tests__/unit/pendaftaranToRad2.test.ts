import { describe, expect, test } from 'vitest';
import { pendaftaranToRad2Fill, type PendaftaranForRad2 } from '../../apps/web/src/lib/pendaftaranToRad2.ts';

const base: PendaftaranForRad2 = {
  nama: 'Budi Santoso',
  umur: 35,
  alamat: 'Parung Kuda',
  klinis: 'Batuk 2 minggu',
  kesan: 'Cor dan pulmo normal',
  createdAt: new Date(2026, 8, 15, 10, 30).toISOString(),
  totalHarga: '150000.00',
  pengirim: { nama: 'dr. Andi' },
  radiolog: { nama: 'dr. Sari, Sp.Rad' },
  pemeriksaan: [{ nama: 'Thorax PA' }],
};

describe('pendaftaranToRad2Fill', () => {
  test('maps a registration to the Rad2 form fields as strings', () => {
    expect(pendaftaranToRad2Fill(base, '2026-01-01')).toEqual({
      nama: 'Budi Santoso',
      umur: '35',
      alamat: 'Parung Kuda',
      tanggal: '2026-09-15',
      pemeriksaan: 'Thorax PA',
      pengirim: 'dr. Andi',
      klinis: 'Batuk 2 minggu',
      kesan: 'Cor dan pulmo normal',
      radiologi: 'dr. Sari, Sp.Rad',
      harga: '150000',
    });
  });

  test('joins several examinations and skips blank names', () => {
    const result = pendaftaranToRad2Fill(
      { ...base, pemeriksaan: [{ nama: 'Thorax PA' }, { nama: '  ' }, { nama: 'Abdomen 3 posisi' }] },
      '2026-01-01',
    );
    expect(result.pemeriksaan).toBe('Thorax PA, Abdomen 3 posisi');
  });

  test('turns missing optional values into empty strings', () => {
    const result = pendaftaranToRad2Fill({ ...base, alamat: null, klinis: null, kesan: null, radiolog: null }, '2026-01-01');
    expect(result).toMatchObject({ alamat: '', klinis: '', kesan: '', radiologi: '' });
  });

  test('rounds the price and falls back to 0 when it is not a number', () => {
    expect(pendaftaranToRad2Fill({ ...base, totalHarga: '99999.6' }, '2026-01-01').harga).toBe('100000');
    expect(pendaftaranToRad2Fill({ ...base, totalHarga: 'abc' }, '2026-01-01').harga).toBe('0');
  });

  test('uses the fallback date when the registration date is invalid', () => {
    expect(pendaftaranToRad2Fill({ ...base, createdAt: 'bukan tanggal' }, '2026-09-30').tanggal).toBe('2026-09-30');
  });
});
