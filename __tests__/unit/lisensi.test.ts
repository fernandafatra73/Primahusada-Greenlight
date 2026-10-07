import { describe, expect, test } from 'vitest';
import {
  dataUrlMediaType,
  isLisensiJenis,
  isSingleEntryJenis,
  LISENSI_JENIS_BY_KATEGORI,
  parseLisensiTanggal,
  validateLisensiBerkas,
} from '../../apps/api/src/lib/lisensi.ts';
import {
  isBerkasPdf,
  jadwalTldBerikutnya,
  langkahBelumAda,
  LISENSI_FILE_MAX_BYTES,
  LISENSI_TABS,
  sisaHari,
  susunCetakLisensi,
  tambahBulan,
  validateLisensiFile,
  type LisensiEntriCetak,
  type LisensiTabSpec,
} from '../../apps/web/src/lib/lisensi.ts';

describe('isLisensiJenis', () => {
  test('accepts known kategori/jenis pairs', () => {
    expect(isLisensiJenis('rtrw', 'warga')).toBe(true);
    expect(isLisensiJenis('filmbadge', 'tld')).toBe(true);
    expect(isLisensiJenis('terpadu', 'langkah')).toBe(true);
  });

  test('rejects unknown kategori and jenis from another kategori', () => {
    expect(isLisensiJenis('unknown', 'warga')).toBe(false);
    expect(isLisensiJenis('camat', 'warga')).toBe(false);
    expect(isLisensiJenis('rtrw', '')).toBe(false);
  });

  test('only pejabat is limited to a single entry', () => {
    expect(isSingleEntryJenis('pejabat')).toBe(true);
    expect(isSingleEntryJenis('warga')).toBe(false);
  });
});

describe('web tab config matches API kategori/jenis', () => {
  test('every tab section is accepted by the API and every API pair has a section', () => {
    for (const tab of LISENSI_TABS) {
      expect(tab.sections.map((s) => s.jenis)).toEqual(
        LISENSI_JENIS_BY_KATEGORI[tab.kategori],
      );
    }
    expect(LISENSI_TABS.map((t) => t.kategori).sort()).toEqual(
      Object.keys(LISENSI_JENIS_BY_KATEGORI).sort(),
    );
  });

  test('single-entry sections are exactly the pejabat sections', () => {
    for (const tab of LISENSI_TABS) {
      for (const section of tab.sections) {
        expect(section.tunggal === true).toBe(
          isSingleEntryJenis(section.jenis),
        );
      }
    }
  });
});

describe('validateLisensiBerkas', () => {
  test('accepts images and PDF data URLs', () => {
    expect(validateLisensiBerkas('data:image/png;base64,AAAA')).toBeNull();
    expect(
      validateLisensiBerkas('data:application/pdf;base64,JVBERi0='),
    ).toBeNull();
  });

  test('rejects other media types and non data URLs', () => {
    expect(validateLisensiBerkas('data:text/html;base64,PGgxPg==')).toMatch(
      /gambar/,
    );
    expect(validateLisensiBerkas('/uploads/lisensi/lain.png')).toBe(
      'Berkas tidak valid',
    );
    expect(validateLisensiBerkas('https://example.com/a.pdf')).toBe(
      'Berkas tidak valid',
    );
  });

  test('dataUrlMediaType reads the media type', () => {
    expect(dataUrlMediaType('data:application/pdf;base64,xx')).toBe(
      'application/pdf',
    );
    expect(dataUrlMediaType('nope')).toBeNull();
  });
});

describe('parseLisensiTanggal', () => {
  test('empty means no date, invalid is undefined', () => {
    expect(parseLisensiTanggal(undefined)).toBeNull();
    expect(parseLisensiTanggal(null)).toBeNull();
    expect(parseLisensiTanggal('  ')).toBeNull();
    expect(parseLisensiTanggal('bukan tanggal')).toBeUndefined();
    expect(parseLisensiTanggal('2026-10-07T05:00:00.000Z')?.toISOString()).toBe(
      '2026-10-07T05:00:00.000Z',
    );
  });
});

describe('validateLisensiFile', () => {
  test('accepts PDF and images within the size limit', () => {
    expect(
      validateLisensiFile({ type: 'application/pdf', size: 1000 }),
    ).toBeNull();
    expect(
      validateLisensiFile({ type: 'image/jpeg', size: LISENSI_FILE_MAX_BYTES }),
    ).toBeNull();
  });

  test('rejects other types, empty and oversized files', () => {
    expect(validateLisensiFile({ type: 'application/zip', size: 10 })).toMatch(
      /Format/,
    );
    expect(validateLisensiFile({ type: 'application/pdf', size: 0 })).toBe(
      'File kosong.',
    );
    expect(
      validateLisensiFile({
        type: 'application/pdf',
        size: LISENSI_FILE_MAX_BYTES + 1,
      }),
    ).toMatch(/10 MB/);
  });
});

describe('tambahBulan', () => {
  test('adds months keeping the day', () => {
    const d = tambahBulan(new Date(2026, 0, 15, 12), 3);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 3, 15]);
  });

  test('clamps to the last day of a shorter month instead of overflowing', () => {
    const d = tambahBulan(new Date(2026, 10, 30, 12), 3);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 1, 28]);
  });
});

describe('jadwalTldBerikutnya', () => {
  test('is three months after the latest shipment, whatever the order', () => {
    const next = jadwalTldBerikutnya([
      new Date(2026, 6, 1, 12).toISOString(),
      null,
      new Date(2026, 8, 10, 12).toISOString(),
      new Date(2026, 3, 1, 12).toISOString(),
    ]);
    expect(
      next && [next.getFullYear(), next.getMonth(), next.getDate()],
    ).toEqual([2026, 11, 10]);
  });

  test('is null without any valid shipment date', () => {
    expect(jadwalTldBerikutnya([])).toBeNull();
    expect(jadwalTldBerikutnya([null, 'invalid'])).toBeNull();
  });
});

describe('sisaHari', () => {
  test('counts calendar days ignoring the time of day', () => {
    const today = new Date(2026, 9, 7, 23, 0);
    expect(sisaHari(new Date(2026, 9, 10, 1, 0), today)).toBe(3);
    expect(sisaHari(new Date(2026, 9, 7, 0, 0), today)).toBe(0);
    expect(sisaHari(new Date(2026, 9, 1, 12), today)).toBe(-6);
  });
});

describe('langkahBelumAda', () => {
  test('returns only the missing default steps, in default order', () => {
    expect(langkahBelumAda(['A', 'B', 'C', 'D'], ['B', ' D ', 'Lain'])).toEqual(
      ['A', 'C'],
    );
  });

  test('returns nothing once every default step exists', () => {
    expect(langkahBelumAda(['A', 'B'], ['A', 'B'])).toEqual([]);
  });
});

describe('susunCetakLisensi', () => {
  const tab = (kategori: string): LisensiTabSpec => {
    const found = LISENSI_TABS.find((t) => t.kategori === kategori);
    if (!found) throw new Error(`tab ${kategori} tidak ada`);
    return found;
  };
  const entri = (over: Partial<LisensiEntriCetak>): LisensiEntriCetak => ({
    jenis: 'warga',
    nama: 'Budi',
    keterangan: null,
    tanggal: null,
    berkas: null,
    berkasNama: null,
    selesai: false,
    ...over,
  });
  const fmt = (iso: string): string => `F(${iso})`;

  test('RT/RW: residents table with signature column, RW head signature last', () => {
    const { bagian, lampiran } = susunCetakLisensi(
      tab('rtrw').sections,
      [
        entri({
          nama: 'Ketua',
          jenis: 'pejabat',
          berkas: '/uploads/lisensi/rw.png',
        }),
        entri({ nama: 'Ani', berkas: '/uploads/lisensi/a.png' }),
        entri({ nama: 'Budi', berkas: '/uploads/lisensi/b.png' }),
      ],
      fmt,
    );
    expect(lampiran).toEqual([]);
    expect(bagian).toEqual([
      {
        tipe: 'tabel',
        judul: 'Tanda Tangan Warga',
        kolom: ['No', 'Nama Warga'],
        kolomTtd: 'Tanda Tangan',
        baris: [
          { sel: ['1', 'Ani'], ttd: '/uploads/lisensi/a.png' },
          { sel: ['2', 'Budi'], ttd: '/uploads/lisensi/b.png' },
        ],
      },
      {
        tipe: 'pejabat',
        jabatan: 'Ketua RW',
        nama: 'Ketua',
        ttd: '/uploads/lisensi/rw.png',
      },
    ]);
  });

  test('an empty official signature is still printed blank, empty tables are skipped', () => {
    const { bagian } = susunCetakLisensi(tab('desa').sections, [], fmt);
    expect(bagian).toEqual([
      { tipe: 'pejabat', jabatan: 'Kepala Desa', nama: '', ttd: null },
    ]);
  });

  test('file sections list dates, status and attachments; images become lampiran, PDFs do not', () => {
    const { bagian, lampiran } = susunCetakLisensi(
      tab('filmbadge').sections,
      [
        entri({
          jenis: 'pembayaran',
          nama: 'Q1',
          tanggal: '2026-01-01',
          selesai: true,
          berkas: '/uploads/lisensi/q1.jpg',
        }),
        entri({
          jenis: 'pembayaran',
          nama: 'Q2',
          tanggal: '2026-04-01',
          berkas: '/uploads/lisensi/q2.PDF',
          berkasNama: 'q2.pdf',
        }),
      ],
      fmt,
    );
    expect(bagian).toEqual([
      {
        tipe: 'tabel',
        judul: 'Jatuh Tempo Pembayaran',
        kolom: [
          'No',
          'Keterangan Tagihan',
          'Tanggal Jatuh Tempo',
          'Lunas',
          'Bukti Bayar',
        ],
        kolomTtd: null,
        baris: [
          { sel: ['1', 'Q1', 'F(2026-01-01)', 'Ya', 'Terlampir'], ttd: null },
          { sel: ['2', 'Q2', 'F(2026-04-01)', 'Belum', 'q2.pdf'], ttd: null },
        ],
      },
    ]);
    expect(lampiran).toEqual([
      { judul: 'Bukti Bayar — Q1', src: '/uploads/lisensi/q1.jpg' },
    ]);
  });

  test('isBerkasPdf checks the extension case-insensitively', () => {
    expect(isBerkasPdf('/uploads/lisensi/a.PDF')).toBe(true);
    expect(isBerkasPdf('/uploads/lisensi/a.png')).toBe(false);
    expect(isBerkasPdf(null)).toBe(false);
  });
});
