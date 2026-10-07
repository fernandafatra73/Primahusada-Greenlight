/** Konfigurasi dan perhitungan menu "Lisensi" (berkas perizinan klinik).
 * Pasangan kategori/jenis harus sejalan dengan `LISENSI_JENIS_BY_KATEGORI`
 * di `apps/api/src/lib/lisensi.ts`. */

export type LisensiKategori =
  | 'rtrw'
  | 'desa'
  | 'camat'
  | 'puskesmas'
  | 'dinas'
  | 'filmbadge'
  | 'bapeten'
  | 'terpadu';

/** Apa yang dilampirkan pada satu entri: tidak ada, tanda tangan yang digambar, atau file unggahan. */
export type LisensiBerkasMode = 'none' | 'ttd' | 'file';

export interface LisensiSectionSpec {
  readonly jenis: string;
  readonly judul: string;
  readonly keterangan?: string;
  readonly namaLabel: string;
  readonly berkas: LisensiBerkasMode;
  readonly berkasLabel?: string;
  /** Label kolom tanggal; tidak ada = bagian ini tanpa tanggal. */
  readonly tanggalLabel?: string;
  readonly tanggalWajib?: boolean;
  readonly keteranganLabel?: string;
  /** Label kotak centang status (mis. "Lunas", "Selesai"); tidak ada = tanpa status. */
  readonly selesaiLabel?: string;
  /** Hanya satu entri — tanda tangan pejabat di bawah daftar. */
  readonly tunggal?: boolean;
  /** Jabatan yang dicetak di bawah tanda tangan (bagian `tunggal`). */
  readonly jabatan?: string;
  /** Bagian pengiriman TLD: tampilkan jadwal kirim berikutnya. */
  readonly jadwalTld?: boolean;
  /** Langkah bawaan; yang belum tercatat bisa diisi sekaligus. */
  readonly langkahBawaan?: ReadonlyArray<string>;
}

export interface LisensiTabSpec {
  readonly kategori: LisensiKategori;
  readonly label: string;
  readonly judul: string;
  readonly sections: ReadonlyArray<LisensiSectionSpec>;
}

function daftarWarga(): LisensiSectionSpec {
  return {
    jenis: 'warga',
    judul: 'Tanda Tangan Warga',
    namaLabel: 'Nama Warga',
    berkas: 'ttd',
    berkasLabel: 'Tanda Tangan',
  };
}

function ttdPejabat(jabatan: string): LisensiSectionSpec {
  return {
    jenis: 'pejabat',
    judul: `Tanda Tangan ${jabatan}`,
    namaLabel: `Nama ${jabatan}`,
    berkas: 'ttd',
    berkasLabel: 'Tanda Tangan',
    tunggal: true,
    jabatan,
  };
}

/** Tahapan perizinan terpadu (OSS) dari pendaftaran NIB sampai surat izin terbit. */
export const TERPADU_LANGKAH_BAWAAN: ReadonlyArray<string> = [
  'NIB (Nomor Induk Berusaha)',
  'Identitas Perusahaan (Akta, NPWP, KTP Penanggung Jawab)',
  'SPPL (Surat Pernyataan Pengelolaan Lingkungan)',
  'PKKPR / Kesesuaian Tata Ruang',
  'PBG / SLF Bangunan',
  'Pengajuan Izin Operasional',
  'Verifikasi & Visitasi',
  'Surat Izin Terbit',
];

export const LISENSI_TABS: ReadonlyArray<LisensiTabSpec> = [
  {
    kategori: 'rtrw',
    label: 'RT/RW',
    judul: 'Persetujuan RT/RW',
    sections: [daftarWarga(), ttdPejabat('Ketua RW')],
  },
  {
    kategori: 'desa',
    label: 'Desa',
    judul: 'Persetujuan Desa',
    sections: [daftarWarga(), ttdPejabat('Kepala Desa')],
  },
  {
    kategori: 'camat',
    label: 'Camat',
    judul: 'Surat dari Camat',
    sections: [
      {
        jenis: 'dokumen',
        judul: 'Surat dari Camat',
        keterangan: 'Unggah scan/foto surat dari kecamatan (gambar atau PDF).',
        namaLabel: 'Nomor / Perihal Surat',
        berkas: 'file',
        berkasLabel: 'Surat',
        tanggalLabel: 'Tanggal Surat',
        keteranganLabel: 'Keterangan',
      },
    ],
  },
  {
    kategori: 'puskesmas',
    label: 'Puskesmas',
    judul: 'Persetujuan Puskesmas',
    sections: [ttdPejabat('Kepala Puskesmas')],
  },
  {
    kategori: 'dinas',
    label: 'Dinas',
    judul: 'Dinas Kesehatan',
    sections: [
      {
        jenis: 'dokumen',
        judul: 'Surat / Rekomendasi Dinas',
        keterangan:
          'Unggah surat atau rekomendasi dari Dinas (gambar atau PDF).',
        namaLabel: 'Nomor / Perihal Surat',
        berkas: 'file',
        berkasLabel: 'Surat',
        tanggalLabel: 'Tanggal Surat',
        keteranganLabel: 'Keterangan',
      },
    ],
  },
  {
    kategori: 'filmbadge',
    label: 'Film Badge',
    judul: 'Film Badge (TLD)',
    sections: [
      {
        jenis: 'perjanjian',
        judul: 'Surat Perjanjian',
        namaLabel: 'Nomor / Perihal Perjanjian',
        berkas: 'file',
        berkasLabel: 'Surat',
        tanggalLabel: 'Tanggal Perjanjian',
        keteranganLabel: 'Keterangan',
      },
      {
        jenis: 'pembayaran',
        judul: 'Jatuh Tempo Pembayaran',
        namaLabel: 'Keterangan Tagihan',
        berkas: 'file',
        berkasLabel: 'Bukti Bayar',
        tanggalLabel: 'Tanggal Jatuh Tempo',
        tanggalWajib: true,
        selesaiLabel: 'Lunas',
      },
      {
        jenis: 'tld',
        judul: 'Pengiriman TLD (setiap 3 bulan)',
        namaLabel: 'Periode / Dikirim ke',
        berkas: 'file',
        berkasLabel: 'Resi',
        tanggalLabel: 'Tanggal Kirim',
        tanggalWajib: true,
        keteranganLabel: 'Keterangan',
        jadwalTld: true,
      },
    ],
  },
  {
    kategori: 'bapeten',
    label: 'Bapeten',
    judul: 'Bapeten',
    sections: [
      {
        jenis: 'sertifikat',
        judul: 'Sertifikat',
        keterangan:
          'Simpan sertifikat yang diunduh dari Bapeten agar bisa diunduh lagi kapan saja.',
        namaLabel: 'Nama Sertifikat',
        berkas: 'file',
        berkasLabel: 'Sertifikat',
        tanggalLabel: 'Berlaku Sampai',
        keteranganLabel: 'Keterangan',
      },
      {
        jenis: 'uji-fungsi',
        judul: 'Uji Fungsi Pesawat Rontgen',
        namaLabel: 'Perusahaan Penguji',
        berkas: 'file',
        berkasLabel: 'Laporan',
        tanggalLabel: 'Tanggal Uji',
        keteranganLabel: 'Hasil',
        selesaiLabel: 'Lulus',
      },
      {
        jenis: 'pengisian',
        judul: 'Pengisian di Bapeten',
        namaLabel: 'Tahap Pengisian',
        berkas: 'file',
        berkasLabel: 'Bukti',
        tanggalLabel: 'Tanggal',
        keteranganLabel: 'Keterangan',
        selesaiLabel: 'Selesai',
      },
    ],
  },
  {
    kategori: 'terpadu',
    label: 'Terpadu',
    judul: 'Perizinan Terpadu',
    sections: [
      {
        jenis: 'langkah',
        judul: 'Tahapan Perizinan (sampai Surat Izin Terbit)',
        namaLabel: 'Tahapan',
        berkas: 'file',
        berkasLabel: 'Dokumen',
        tanggalLabel: 'Tanggal',
        keteranganLabel: 'Keterangan',
        selesaiLabel: 'Selesai',
        langkahBawaan: TERPADU_LANGKAH_BAWAAN,
      },
    ],
  },
];

/** Tahapan bawaan yang belum tercatat, urut seperti `bawaan` — supaya pengisian yang
 * terputus di tengah bisa dilanjutkan tanpa menggandakan tahapan yang sudah ada. */
export function langkahBelumAda(
  bawaan: ReadonlyArray<string>,
  namaTercatat: ReadonlyArray<string>,
): string[] {
  const ada = new Set(namaTercatat.map((nama) => nama.trim()));
  return bawaan.filter((nama) => !ada.has(nama));
}

/** Sama dengan batas foto: data URL (~1,33x ukuran file) tetap di bawah bodyLimit API 16 MB. */
export const LISENSI_FILE_MAX_BYTES = 10 * 1024 * 1024;

export const LISENSI_FILE_TYPES: ReadonlyArray<string> = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

/** Pesan error untuk ditampilkan, atau `null` bila surat boleh diunggah. */
export function validateLisensiFile(file: {
  readonly type: string;
  readonly size: number;
}): string | null {
  if (!LISENSI_FILE_TYPES.includes(file.type))
    return 'Format tidak didukung. Gunakan PDF, JPEG, PNG, GIF, atau WEBP.';
  if (file.size <= 0) return 'File kosong.';
  if (file.size > LISENSI_FILE_MAX_BYTES) return 'Ukuran file maksimal 10 MB.';
  return null;
}

/** Selang pengiriman TLD Film Badge. */
export const TLD_INTERVAL_BULAN = 3;

/** Tambah `bulan` bulan; tanggal yang tidak ada di bulan tujuan (mis. 31 Mei + 3 → 31 Agt aman,
 * 30 Nov + 3 → 28/29 Feb) dipotong ke hari terakhir bulan itu, bukan meluap ke bulan berikutnya. */
export function tambahBulan(date: Date, bulan: number): Date {
  const result = new Date(
    date.getFullYear(),
    date.getMonth() + bulan,
    1,
    date.getHours(),
    date.getMinutes(),
  );
  const hariTerakhir = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(date.getDate(), hariTerakhir));
  return result;
}

/** Jadwal kirim TLD berikutnya: pengiriman terakhir + 3 bulan; `null` bila belum pernah kirim. */
export function jadwalTldBerikutnya(
  tanggalKirim: ReadonlyArray<string | null>,
): Date | null {
  let terakhir: Date | null = null;
  for (const iso of tanggalKirim) {
    if (!iso) continue;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    if (!terakhir || date > terakhir) terakhir = date;
  }
  return terakhir ? tambahBulan(terakhir, TLD_INTERVAL_BULAN) : null;
}

/** Sisa hari kalender dari `hariIni` ke `target` (negatif = sudah lewat). */
export function sisaHari(target: Date, hariIni: Date): number {
  const a = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const b = Date.UTC(
    hariIni.getFullYear(),
    hariIni.getMonth(),
    hariIni.getDate(),
  );
  return Math.round((a - b) / 86_400_000);
}

/** Bagian dari entri lisensi yang dibutuhkan untuk dicetak. */
export interface LisensiEntriCetak {
  readonly jenis: string;
  readonly nama: string;
  readonly keterangan: string | null;
  readonly tanggal: string | null;
  readonly berkas: string | null;
  readonly berkasNama: string | null;
  readonly selesai: boolean;
}

export interface LisensiCetakTabel {
  readonly tipe: 'tabel';
  readonly judul: string;
  readonly kolom: ReadonlyArray<string>;
  /** Kolom tanda tangan (gambar) selalu terakhir bila ada. */
  readonly kolomTtd: string | null;
  readonly baris: ReadonlyArray<{
    readonly sel: ReadonlyArray<string>;
    readonly ttd: string | null;
  }>;
}

export interface LisensiCetakPejabat {
  readonly tipe: 'pejabat';
  readonly jabatan: string;
  readonly nama: string;
  readonly ttd: string | null;
}

export type LisensiCetakBagian = LisensiCetakTabel | LisensiCetakPejabat;

/** File unggahan yang ikut dicetak sebagai lampiran (hanya gambar; PDF dicetak apa adanya). */
export interface LisensiCetakLampiran {
  readonly judul: string;
  readonly src: string;
}

export function isBerkasPdf(berkas: string | null): boolean {
  return berkas !== null && berkas.toLowerCase().endsWith('.pdf');
}

/** Ubah entri menjadi bagian-bagian dokumen cetak, urut seperti di layar. Bagian
 * tanpa entri dilewati, kecuali tanda tangan pejabat yang tetap dicetak kosong
 * supaya bisa ditandatangani di kertas. */
export function susunCetakLisensi(
  sections: ReadonlyArray<LisensiSectionSpec>,
  items: ReadonlyArray<LisensiEntriCetak>,
  formatTanggal: (iso: string) => string,
): {
  readonly bagian: ReadonlyArray<LisensiCetakBagian>;
  readonly lampiran: ReadonlyArray<LisensiCetakLampiran>;
} {
  const bagian: LisensiCetakBagian[] = [];
  const lampiran: LisensiCetakLampiran[] = [];
  for (const spec of sections) {
    const entri = items.filter((item) => item.jenis === spec.jenis);
    if (spec.tunggal) {
      const pejabat = entri[0];
      bagian.push({
        tipe: 'pejabat',
        jabatan: spec.jabatan ?? spec.judul,
        nama: pejabat?.nama ?? '',
        ttd: pejabat?.berkas ?? null,
      });
      continue;
    }
    if (entri.length === 0) continue;

    const kolom = ['No', spec.namaLabel];
    if (spec.tanggalLabel) kolom.push(spec.tanggalLabel);
    if (spec.keteranganLabel) kolom.push(spec.keteranganLabel);
    if (spec.selesaiLabel) kolom.push(spec.selesaiLabel);
    if (spec.berkas === 'file') kolom.push(spec.berkasLabel ?? 'Berkas');

    bagian.push({
      tipe: 'tabel',
      judul: spec.judul,
      kolom,
      kolomTtd:
        spec.berkas === 'ttd' ? (spec.berkasLabel ?? 'Tanda Tangan') : null,
      baris: entri.map((item, idx) => {
        const sel = [String(idx + 1), item.nama];
        if (spec.tanggalLabel)
          sel.push(item.tanggal ? formatTanggal(item.tanggal) : '—');
        if (spec.keteranganLabel) sel.push(item.keterangan || '—');
        if (spec.selesaiLabel) sel.push(item.selesai ? 'Ya' : 'Belum');
        if (spec.berkas === 'file') {
          sel.push(
            !item.berkas
              ? '—'
              : isBerkasPdf(item.berkas)
                ? (item.berkasNama ?? 'PDF terlampir')
                : 'Terlampir',
          );
        }
        return { sel, ttd: spec.berkas === 'ttd' ? item.berkas : null };
      }),
    });

    if (spec.berkas === 'file') {
      for (const item of entri) {
        if (item.berkas && !isBerkasPdf(item.berkas)) {
          lampiran.push({
            judul: `${spec.berkasLabel ?? 'Berkas'} — ${item.nama}`,
            src: item.berkas,
          });
        }
      }
    }
  }
  return { bagian, lampiran };
}
