import { describe, expect, test } from 'vitest';
import {
  buatKodeAktivasi,
  formatTanggal,
  normalisasiKode,
  parseAktivasiBody,
  parseTanggal,
  tambahBulan,
  tanggalKode,
} from '../../apps/api/src/lib/aktivasiAplikasi.ts';
import {
  isAplikasiTerkunci,
  labelLamaAktivasi,
  PENGUNCIAN_AKTIVASI_AKTIF,
  statusAktivasi,
  tanggalHariIni,
} from '../../apps/web/src/lib/aktivasiAplikasi.ts';

const KODE = '20261017-001-abcd efgh';

describe('parseAktivasiBody', () => {
  test('accepts a valid date and duration, normalizing the typed code', () => {
    const parsed = parseAktivasiBody({ tanggalAktivasi: '2026-10-17', lamaBulan: 12, kode: KODE });

    expect(parsed).toEqual({
      ok: true,
      data: { tanggalAktivasi: new Date(Date.UTC(2026, 9, 17)), lamaBulan: 12, kode: '20261017-001-ABCDEFGH' },
    });
  });

  test('requires a code', () => {
    const wajib = { ok: false, error: 'Kode aktivasi wajib diisi' };
    expect(parseAktivasiBody({ tanggalAktivasi: '2026-10-17', lamaBulan: 12 })).toEqual(wajib);
    expect(parseAktivasiBody({ tanggalAktivasi: '2026-10-17', lamaBulan: 12, kode: '   ' })).toEqual(wajib);
    expect(parseAktivasiBody({ tanggalAktivasi: '2026-10-17', lamaBulan: 12, kode: 42 })).toEqual(wajib);
  });

  test('rejects durations outside the fixed list', () => {
    expect(parseAktivasiBody({ tanggalAktivasi: '2026-10-17', lamaBulan: 2, kode: KODE })).toEqual({
      ok: false,
      error: 'Lama aktivasi tidak valid',
    });
    expect(parseAktivasiBody({ tanggalAktivasi: '2026-10-17', lamaBulan: '12', kode: KODE }).ok).toBe(false);
  });

  test('rejects invalid dates', () => {
    expect(parseAktivasiBody({ tanggalAktivasi: '2026-02-30', lamaBulan: 1, kode: KODE })).toEqual({
      ok: false,
      error: 'Tanggal aktivasi tidak valid',
    });
  });
});

describe('buatKodeAktivasi', () => {
  test('joins date, zero-padded sequence and the random part', () => {
    // Indeks 0..7 dari alfabet tanpa 0/O/1/I = "ABCDEFGH".
    let i = 0;
    const urut = (): number => i++;

    expect(buatKodeAktivasi('20261017', 7, urut)).toBe('20261017-007-ABCD-EFGH');
  });

  test('only uses unambiguous characters in the random part', () => {
    const acak = buatKodeAktivasi('20261017', 1).split('-').slice(2).join('');

    expect(acak).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  test('produces different codes for the same date and sequence', () => {
    const kode = new Set(Array.from({ length: 50 }, () => buatKodeAktivasi('20261017', 1)));

    expect(kode.size).toBe(50);
  });
});

describe('normalisasiKode', () => {
  test('removes whitespace and uppercases', () => {
    expect(normalisasiKode(' 20261017-001-k7qf 9xmb ')).toBe('20261017-001-K7QF9XMB');
  });
});

describe('tanggalKode', () => {
  test('formats the local date as YYYYMMDD', () => {
    expect(tanggalKode(new Date(2026, 9, 7, 23, 30))).toBe('20261007');
  });
});

describe('tambahBulan', () => {
  function plus(tanggal: string, bulan: number): string {
    const date = parseTanggal(tanggal);
    if (!date) throw new Error(`tanggal tidak valid: ${tanggal}`);
    return formatTanggal(tambahBulan(date, bulan));
  }

  test('adds months and years', () => {
    expect(plus('2026-10-17', 1)).toBe('2026-11-17');
    expect(plus('2026-10-17', 3)).toBe('2027-01-17');
    expect(plus('2026-10-17', 60)).toBe('2031-10-17');
  });

  test('clamps to the end of a shorter month', () => {
    expect(plus('2026-01-31', 1)).toBe('2026-02-28');
    expect(plus('2027-12-31', 2)).toBe('2028-02-29');
  });
});

describe('statusAktivasi', () => {
  const aktivasi = { tanggalAktivasi: '2026-10-17', lamaBulan: 1, berakhir: '2026-11-17' };

  test('is locked when never activated', () => {
    const status = statusAktivasi(null, '2026-10-17');
    expect(status).toEqual({ jenis: 'belum' });
    expect(isAplikasiTerkunci(status)).toBe(true);
  });

  test('is active with days remaining before the end date', () => {
    const status = statusAktivasi(aktivasi, '2026-11-16');
    expect(status).toEqual({ jenis: 'aktif', sisaHari: 1 });
    expect(isAplikasiTerkunci(status)).toBe(false);
  });

  test('locks from the end date onward', () => {
    expect(statusAktivasi(aktivasi, '2026-11-17')).toEqual({ jenis: 'berakhir' });
    expect(statusAktivasi(aktivasi, '2027-01-01')).toEqual({ jenis: 'berakhir' });
  });
});

describe('helpers', () => {
  test('labels durations', () => {
    expect(labelLamaAktivasi(12)).toBe('1 tahun');
    expect(labelLamaAktivasi(60)).toBe('5 tahun');
    expect(labelLamaAktivasi(6)).toBe('6 bulan');
  });

  test('formats the local date', () => {
    expect(tanggalHariIni(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('PENGUNCIAN_AKTIVASI_AKTIF', () => {
  // Penguncian sementara dihentikan: semua menu tetap tampil walau belum diaktifkan/berakhir.
  test('activation lock is paused', () => {
    expect(PENGUNCIAN_AKTIVASI_AKTIF).toBe(false);
  });
});
