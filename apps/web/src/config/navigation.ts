export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly shortLabel?: string;
  readonly isPlaceholder?: boolean;
}

export interface NavCategory {
  readonly id: string;
  readonly label: string;
  readonly iconName: string;
  readonly items: readonly NavItem[];
}

export const MAIN_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'templet',
    label: 'Templet',
    iconName: 'document',
    items: [
      { id: 'templet', label: 'Templet', shortLabel: 'Templet' },
    ],
  },
  {
    id: 'pendaftaran',
    label: 'Pendaftaran',
    iconName: 'clipboard',
    items: [
      { id: 'pendaftaran', label: 'Pendaftaran', shortLabel: 'Pendaftaran' },
      { id: 'pendaftaran-umum', label: 'Pendaftaran Umum', shortLabel: 'Pendaftaran Umum' },
      { id: 'admin-klinik', label: 'Admin Klinik', shortLabel: 'Admin Klinik' },
    ],
  },
  {
    id: 'radiologi',
    label: 'Radiologi',
    iconName: 'stethoscope',
    items: [
      { id: 'radiologi', label: 'Radiologi', shortLabel: 'Radiologi' },
      { id: 'pasien', label: 'Data & Registrasi Radiologi', shortLabel: 'Registrasi Radiologi' },
      { id: 'radiolog-duplikat', label: 'Duplikat Radiologi', shortLabel: 'Duplikat Radiologi' },
      { id: 'kwitansi-radiologi', label: 'Kwitansi', shortLabel: 'Kwitansi' },
      { id: 'sharing-radiologi', label: 'Sharing Radiologi', shortLabel: 'Sharing Radiologi' },
      { id: 'sharing-radiolog', label: 'Sharing Radiolog', shortLabel: 'Sharing Radiolog' },
      { id: 'cetak-al', label: 'Cetak A+L (Amplop & Label)', shortLabel: 'Cetak A+L' },
      { id: 'jenis-pemeriksaan', label: 'Jenis Pemeriksaan, Harga & Sharing', shortLabel: 'Jenis Pemeriksaan' },
      { id: 'kesan', label: 'Master Kesan (Expertise)', shortLabel: 'Master Kesan' },
      { id: 'radiolog-master', label: 'Master Radiolog', shortLabel: 'Master Radiolog' },
      { id: 'radiografer', label: 'Radiografer', shortLabel: 'Radiografer' },
      { id: 'kondisi-alat', label: 'Kondisi Alat', shortLabel: 'Kondisi Alat' },
      { id: 'logbook-pasien', label: 'Logbook Pasien', shortLabel: 'Logbook Pasien' },
      { id: 'gaji-karyawan', label: 'Daftar Gaji Karyawan', shortLabel: 'Gaji Karyawan' },
      { id: 'karyawan-radiologi', label: 'Daftar Karyawan', shortLabel: 'Daftar Karyawan' },
      { id: 'advantage', label: 'Advantage', shortLabel: 'Advantage' },
      { id: 'bhp-radiologi', label: 'BHP', shortLabel: 'BHP' },
      { id: 'analisa-foto-rontgen', label: 'Analisa Foto Rontgen', shortLabel: 'Analisa Foto Rontgen' },
      { id: 'usg', label: 'USG', shortLabel: 'USG' },
    ],
  },
  {
    id: 'laboratorium',
    label: 'Laboratorium',
    iconName: 'flask',
    items: [
      { id: 'laboratorium', label: 'Laboratorium', shortLabel: 'Laboratorium' },
      { id: 'lab', label: 'Registrasi Lab', shortLabel: 'Registrasi Lab' },
      { id: 'lab-duplikat', label: 'Duplikat Registrasi Lab', shortLabel: 'Duplikat Registrasi' },
      { id: 'kwitansi-laboratorium', label: 'Kwitansi', shortLabel: 'Kwitansi' },
      { id: 'sharing-lab', label: 'Sharing Lab', shortLabel: 'Sharing Lab' },
      { id: 'harga-pemeriksaan-lab', label: 'Harga Pemeriksaan Lab', shortLabel: 'Harga Pemeriksaan Lab' },
      { id: 'cetak-amplop-lab', label: 'Cetak Amplop', shortLabel: 'Cetak Amplop' },
      { id: 'cetak-label-lab', label: 'Cetak Label', shortLabel: 'Cetak Label' },
      { id: 'paket-lab-master', label: 'Jenis Pemeriksaan Lab', shortLabel: 'Jenis Pemeriksaan Lab' },
      { id: 'petugas-lab-master', label: 'Master Analis Laboratorium', shortLabel: 'Analis' },
      { id: 'klasifikasi-paket', label: 'Klasifikasi Paket', shortLabel: 'Klasifikasi Paket' },
      { id: 'hitungan-led', label: 'Hitungan LED', shortLabel: 'Hitungan LED' },
      { id: 'karyawan-laboratorium', label: 'Daftar Karyawan', shortLabel: 'Daftar Karyawan' },
    ],
  },
  {
    id: 'perhitungan-pajak',
    label: 'Perhitungan Pajak',
    iconName: 'currency',
    items: [
      { id: 'laporan-pajak', label: 'Pajak Radiologi - Laporan Tahunan', shortLabel: 'Pajak Radiologi (Tahunan)' },
      { id: 'laporan-pajak-bulanan', label: 'Pajak Radiologi - Laporan Bulanan', shortLabel: 'Pajak Radiologi (Bulanan)' },
      { id: 'neracarad', label: 'Neracarad', shortLabel: 'Neracarad' },
      { id: 'laporan-pajak-lab', label: 'Pajak Laboratorium - Laporan Tahunan', shortLabel: 'Pajak Lab (Tahunan)' },
      { id: 'laporan-pajak-bulanan-lab', label: 'Pajak Laboratorium - Laporan Bulanan', shortLabel: 'Pajak Lab (Bulanan)' },
      { id: 'laporan-neraca', label: 'Laporan Neraca', shortLabel: 'Laporan Neraca' },
    ],
  },
  {
    id: 'keuangan',
    label: 'Keuangan',
    iconName: 'currency',
    items: [
      { id: 'keuangan', label: 'Keuangan', shortLabel: 'Keuangan' },
      { id: 'keuangan-pembukuan', label: 'Sistem Keuangan & Pembukuan', shortLabel: 'Buku Kas & Keuangan' },
      { id: 'hasil-perbulan', label: 'Hasil Perbulan', shortLabel: 'Hasil Perbulan' },
      { id: 'penggajian', label: 'Penggajian', shortLabel: 'Penggajian' },
      { id: 'logo-perusahaan', label: 'Logo Perusahaan', shortLabel: 'Logo Perusahaan' },
      { id: 'sharing', label: 'Manajemen Sharing Dokter', shortLabel: 'Sharing Dokter' },
    ],
  },
  {
    id: 'master-sistem',
    label: 'Dokter',
    iconName: 'shield',
    items: [
      { id: 'master-sistem', label: 'Dokter', shortLabel: 'Dokter' },
      { id: 'dokter', label: 'Manajemen Dokter Pengirim', shortLabel: 'Dokter Pengirim' },
      { id: 'karyawan-klinik', label: 'Manajemen Karyawan Klinik', shortLabel: 'Karyawan Klinik' },
      { id: 'tanda-tangan-elektronik', label: 'Tanda Tangan Elektronik', shortLabel: 'Tanda Tangan Elektronik' },
      { id: 'role', label: 'Manajemen Role & Staff', shortLabel: 'Role & Staff' },
      { id: 'admin', label: 'Manajemen Admin', shortLabel: 'Admin' },
    ],
  },
  {
    id: 'farmasi',
    label: 'Farmasi',
    iconName: 'pill',
    items: [
      { id: 'farmasi', label: 'Farmasi', shortLabel: 'Farmasi' },
      { id: 'farmasi-bhp', label: 'Manajemen Farmasi & BHP', shortLabel: 'Stok Obat & BHP' },
      { id: 'kwitansi-farmasi', label: 'Kwitansi Farmasi', shortLabel: 'Kwitansi Farmasi' },
    ],
  },
  {
    id: 'anatomi',
    label: 'Expertise Canggih',
    iconName: 'stethoscope',
    items: [
      { id: 'ai-foto', label: 'AI Foto', shortLabel: 'AI Foto' },
    ],
  },
];

export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  { id: 'templet', label: 'Templet', shortLabel: 'Templet' },
  { id: 'musik-ph', label: 'Musik-PH', shortLabel: 'Musik-PH' },
  { id: 'fatra', label: 'Fatra', shortLabel: 'Fatra' },
  { id: 'mega-data', label: 'Mega Data', shortLabel: 'Mega Data' },
  { id: 'pengaturan', label: 'Pengaturan', shortLabel: 'Pengaturan' },
  { id: 'radiologi', label: 'Radiologi', shortLabel: 'Radiologi' },
  { id: 'usg', label: 'USG', shortLabel: 'USG' },
  { id: 'pasien', label: 'Data & Registrasi Radiologi', shortLabel: 'Registrasi Radiologi' },
  { id: 'laboratorium', label: 'Laboratorium', shortLabel: 'Laboratorium' },
  { id: 'master-sistem', label: 'Dokter', shortLabel: 'Dokter' },
  { id: 'farmasi', label: 'Farmasi', shortLabel: 'Farmasi' },
  { id: 'sosmed', label: 'Sosmed', shortLabel: 'Sosmed' },
  { id: 'global-warm', label: 'Global Warm', shortLabel: 'Global Warm' },
  { id: 'daftar-akun', label: 'Daftar Akun', shortLabel: 'Daftar Akun' },
  { id: 'expertise', label: 'Expertise', shortLabel: 'Expertise' },
  { id: 'trading', label: 'Trading XAU/USD', shortLabel: 'Trading' },
  { id: 'trading-candle', label: 'Trading Candle', shortLabel: 'Trading Candle' },
  { id: 'analisa-grafik', label: 'Analisa Grafik', shortLabel: 'Analisa Grafik' },
  { id: 'bullish-engulfing', label: 'Bullish Engulfing', shortLabel: 'Bullish Engulfing' },
  { id: 'bearish-engulfing', label: 'Bearish Engulfing', shortLabel: 'Bearish Engulfing' },
  { id: 'hammer', label: 'Hammer', shortLabel: 'Hammer' },
  { id: 'shooting-star', label: 'Shooting Star', shortLabel: 'Shooting Star' },
  { id: 'morning-star', label: 'Morning Star', shortLabel: 'Morning Star' },
  { id: 'evening-star', label: 'Evening Star', shortLabel: 'Evening Star' },
  { id: 'doji', label: 'Doji', shortLabel: 'Doji' },
  { id: 'inside-bar', label: 'Inside Bar', shortLabel: 'Inside Bar' },
  { id: 'breakout', label: 'Breakout', shortLabel: 'Breakout' },
  { id: 'support-resistance', label: 'Support/Resistance', shortLabel: 'Support/Resistance' },
  { id: 'trend', label: 'Trend', shortLabel: 'Trend' },
  { id: 'volume', label: 'Volume', shortLabel: 'Volume' },
  { id: 'rsi', label: 'RSI', shortLabel: 'RSI' },
  { id: 'macd', label: 'MACD', shortLabel: 'MACD' },
  { id: 'bollinger-band', label: 'Bollinger Band', shortLabel: 'Bollinger Band' },
  { id: 'video-modul', label: 'Video Modul', shortLabel: 'Video Modul' },
  { id: 'pendaftaran', label: 'Pendaftaran', shortLabel: 'Pendaftaran' },
  { id: 'pendaftaran-umum', label: 'Pendaftaran Umum', shortLabel: 'Pendaftaran Umum' },
  { id: 'transfer', label: 'Transfer', shortLabel: 'Transfer' },
  { id: 'absensi', label: 'Daftar Hadir Karyawan', shortLabel: 'Presensi Staff' },
  { id: 'farmasi-bhp', label: 'Manajemen Farmasi & BHP', shortLabel: 'Stok Obat & BHP' },
  { id: 'kwitansi-farmasi', label: 'Kwitansi Farmasi', shortLabel: 'Kwitansi Farmasi' },
  { id: 'keuangan', label: 'Keuangan', shortLabel: 'Keuangan' },
  { id: 'keuangan-pembukuan', label: 'Sistem Keuangan & Pembukuan', shortLabel: 'Buku Kas & Keuangan' },
  { id: 'hasil-perbulan', label: 'Hasil Perbulan', shortLabel: 'Hasil Perbulan' },
  { id: 'penggajian', label: 'Penggajian', shortLabel: 'Penggajian' },
  { id: 'admin-klinik', label: 'Admin Klinik', shortLabel: 'Admin Klinik' },
  { id: 'logo-perusahaan', label: 'Logo Perusahaan', shortLabel: 'Logo Perusahaan' },
  { id: 'foto-dashboard', label: 'Foto untuk Dashboard', shortLabel: 'Foto Dashboard' },
  { id: 'backup-database', label: 'Backup & Restore Database', shortLabel: 'Backup Database' },
  { id: 'lab', label: 'Registrasi Lab', shortLabel: 'Registrasi Lab' },
  { id: 'lab-duplikat', label: 'Duplikat Registrasi Lab', shortLabel: 'Duplikat Registrasi' },
  { id: 'kwitansi-laboratorium', label: 'Kwitansi Laboratorium', shortLabel: 'Kwitansi' },
  { id: 'sharing-lab', label: 'Sharing Lab', shortLabel: 'Sharing Lab' },
  { id: 'harga-pemeriksaan-lab', label: 'Harga Pemeriksaan Lab', shortLabel: 'Harga Pemeriksaan Lab' },
  { id: 'cetak-amplop-lab', label: 'Cetak Amplop (Laboratorium)', shortLabel: 'Cetak Amplop' },
  { id: 'cetak-label-lab', label: 'Cetak Label (Laboratorium)', shortLabel: 'Cetak Label' },
  { id: 'paket-lab-master', label: 'Jenis Pemeriksaan Lab', shortLabel: 'Jenis Pemeriksaan Lab' },
  { id: 'petugas-lab-master', label: 'Master Analis Laboratorium', shortLabel: 'Analis' },
  { id: 'klasifikasi-paket', label: 'Klasifikasi Paket', shortLabel: 'Klasifikasi Paket' },
  { id: 'hitungan-led', label: 'Hitungan LED', shortLabel: 'Hitungan LED' },
  { id: 'karyawan-laboratorium', label: 'Daftar Karyawan Laboratorium', shortLabel: 'Daftar Karyawan' },
  { id: 'sharing', label: 'Manajemen Sharing Dokter', shortLabel: 'Sharing Dokter' },
  { id: 'laporan-tahunan', label: 'Laporan Tahunan', shortLabel: 'Laporan Tahunan' },
  { id: 'laporan-pajak', label: 'Laporan Pajak', shortLabel: 'Laporan Pajak' },
  { id: 'laporan-pajak-bulanan', label: 'Laporan Pajak Bulanan', shortLabel: 'Laporan Pajak Bulanan' },
  { id: 'laporan-pajak-lab', label: 'Laporan Pajak Tahun Lab', shortLabel: 'Laporan Pajak Tahun Lab' },
  { id: 'laporan-pajak-bulanan-lab', label: 'Laporan Pajak Bulanan Lab', shortLabel: 'Laporan Pajak Bulanan Lab' },
  { id: 'laporan-neraca', label: 'Laporan Neraca', shortLabel: 'Laporan Neraca' },
  { id: 'neracarad', label: 'Neracarad', shortLabel: 'Neracarad' },
  { id: 'radiolog-duplikat', label: 'Duplikat Radiologi', shortLabel: 'Duplikat Radiologi' },
  { id: 'kwitansi-radiologi', label: 'Kwitansi Radiologi', shortLabel: 'Kwitansi' },
  { id: 'sharing-radiologi', label: 'Sharing Radiologi', shortLabel: 'Sharing Radiologi' },
  { id: 'sharing-radiolog', label: 'Sharing Radiolog', shortLabel: 'Sharing Radiolog' },
  { id: 'cetak-al', label: 'Cetak A+L (Amplop & Label)', shortLabel: 'Cetak A+L' },
  { id: 'dokter', label: 'Manajemen Dokter', shortLabel: 'Dokter' },
  { id: 'jenis-pemeriksaan', label: 'Manajemen Jenis Pemeriksaan', shortLabel: 'Jenis Pemeriksaan' },
  { id: 'kesan', label: 'Manajemen Kesan', shortLabel: 'Kesan' },
  { id: 'radiolog-master', label: 'Manajemen Radiolog', shortLabel: 'Radiolog (Master)' },
  { id: 'radiografer', label: 'Radiografer', shortLabel: 'Radiografer' },
  { id: 'kondisi-alat', label: 'Kondisi Alat', shortLabel: 'Kondisi Alat' },
  { id: 'logbook-pasien', label: 'Logbook Pasien', shortLabel: 'Logbook Pasien' },
  { id: 'gaji-karyawan', label: 'Daftar Gaji Karyawan', shortLabel: 'Gaji Karyawan' },
  { id: 'karyawan-radiologi', label: 'Daftar Karyawan Radiologi', shortLabel: 'Daftar Karyawan' },
  { id: 'advantage', label: 'Advantage Radiologi', shortLabel: 'Advantage' },
  { id: 'bhp-radiologi', label: 'BHP Radiologi', shortLabel: 'BHP' },
  { id: 'analisa-foto-rontgen', label: 'Analisa Foto Rontgen', shortLabel: 'Analisa Foto Rontgen' },
  { id: 'role', label: 'Manajemen Role', shortLabel: 'Role' },
  { id: 'admin', label: 'Manajemen Admin', shortLabel: 'Admin' },
  { id: 'hak-akses', label: 'Hak Akses', shortLabel: 'Hak Akses' },
  { id: 'karyawan-klinik', label: 'Manajemen Karyawan Klinik', shortLabel: 'Karyawan Klinik' },
  { id: 'daftar-telpon', label: 'Daftar Telpon', shortLabel: 'Daftar Telpon' },
  { id: 'kalender', label: 'Kalender', shortLabel: 'Kalender' },
  { id: 'whatsapp', label: 'WhatsApp', shortLabel: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram', shortLabel: 'Telegram' },
  { id: 'kalkulator', label: 'Kalkulator', shortLabel: 'Kalkulator' },
  { id: 'ai-gemini', label: 'AI Gemini', shortLabel: 'AI Gemini' },
  { id: 'ai-radiologi', label: 'AI Radiologi', shortLabel: 'AI Radiologi' },
  { id: 'ai-radiologi-grup', label: 'Data Master AI Radiologi', shortLabel: 'Data Master AI Radiologi' },
  { id: 'data-terbesar', label: 'Data Terbesar', shortLabel: 'Data Terbesar' },
  { id: 'tanda-tangan-elektronik', label: 'Tanda Tangan Elektronik', shortLabel: 'Tanda Tangan Elektronik' },
  { id: 'ai-foto', label: 'AI Foto', shortLabel: 'AI Foto' },
  { id: 'rawat-jalan', label: 'Rawat Jalan', shortLabel: 'Rawat Jalan' },
  { id: 'rawat-inap', label: 'Rawat Inap', shortLabel: 'Rawat Inap' },
  { id: 'hrd', label: 'HRD', shortLabel: 'HRD' },
  { id: 'lengkap', label: 'Lengkap', shortLabel: 'Lengkap' },
  { id: 'file', label: 'File', shortLabel: 'File' },
  { id: 'autote1', label: 'Autote1', shortLabel: 'Autote1' },
] as const;

export type MainNavId = (typeof MAIN_NAV_ITEMS)[number]['id'];

export const DASHBOARD_NAV_ID = 'dashboard' as const;

export type AppViewId = typeof DASHBOARD_NAV_ID | MainNavId;

const ALL_VIEW_IDS: readonly AppViewId[] = [
  DASHBOARD_NAV_ID,
  ...MAIN_NAV_ITEMS.map((item) => item.id),
];

export function isAppViewId(value: string): value is AppViewId {
  return (ALL_VIEW_IDS as readonly string[]).includes(value);
}

export function pathnameForView(id: AppViewId): string {
  return id === DASHBOARD_NAV_ID ? '/' : `/${id}`;
}

export function viewIdFromPathname(pathname: string): AppViewId {
  const segment = pathname.replace(/^\/+|\/+$/g, '').split('/')[0] ?? '';
  if (segment === '' || segment === DASHBOARD_NAV_ID) {
    return DASHBOARD_NAV_ID;
  }
  return isAppViewId(segment) ? segment : DASHBOARD_NAV_ID;
}

export function getNavLabel(id: AppViewId): string {
  if (id === DASHBOARD_NAV_ID) {
    return 'Dashboard';
  }
  const item = MAIN_NAV_ITEMS.find((n) => n.id === id);
  return item?.label ?? id;
}

export type WindowFrameColor = 'default' | 'blue' | 'red' | 'navy' | 'skyyellow';

const RADIOLOGI_NAV_IDS: ReadonlySet<string> = new Set(
  MAIN_NAV_CATEGORIES.find((c) => c.id === 'radiologi')?.items.map((item) => item.id) ?? [],
);
const LABORATORIUM_NAV_IDS: ReadonlySet<string> = new Set(
  MAIN_NAV_CATEGORIES.find((c) => c.id === 'laboratorium')?.items.map((item) => item.id) ?? [],
);
const PENDAFTARAN_NAV_IDS: ReadonlySet<string> = new Set(
  MAIN_NAV_CATEGORIES.find((c) => c.id === 'pendaftaran')?.items.map((item) => item.id) ?? [],
);

/** Warna jendela (WindowFrame) berdasarkan modul: Radiologi biru, Laboratorium
 * merah, Pendaftaran biru tua (navy) — kecuali Pendaftaran Umum yang punya
 * warna sendiri (biru muda + kuning). */
export function getViewFrameColor(id: AppViewId): WindowFrameColor {
  if (id === 'pendaftaran-umum') return 'skyyellow';
  if (RADIOLOGI_NAV_IDS.has(id)) return 'blue';
  if (LABORATORIUM_NAV_IDS.has(id)) return 'red';
  if (PENDAFTARAN_NAV_IDS.has(id)) return 'navy';
  return 'default';
}

export type StaffRole = 'ADMIN' | 'KARYAWAN' | 'CEO';

/** Departemen yang menjadi kunci akses staff KARYAWAN berdepartemen — hanya
 * boleh membuka modulnya sendiri. ADMIN dan CEO tidak dibatasi departemen. */
export type Departemen = 'PENDAFTARAN' | 'RADIOLOGI' | 'LABORATORIUM' | 'KEUANGAN' | 'FARMASI';

/** Menu/halaman yang hanya boleh diakses role manajemen (ADMIN atau CEO). */
export const MANAGEMENT_ONLY_NAV_IDS: ReadonlySet<AppViewId> = new Set([
  'keuangan-pembukuan',
  'hasil-perbulan',
  'penggajian',
  'sharing',
  'laporan-tahunan',
  'laporan-pajak',
  'laporan-pajak-bulanan',
  'laporan-pajak-lab',
  'laporan-pajak-bulanan-lab',
  'laporan-neraca',
  'neracarad',
  'role',
  'admin',
  'hak-akses',
  'backup-database',
]);

function navIdsForCategory(categoryId: string): ReadonlySet<AppViewId> {
  const items = MAIN_NAV_CATEGORIES.find((c) => c.id === categoryId)?.items ?? [];
  return new Set(items.map((item) => item.id as AppViewId));
}

/** Modul yang boleh dibuka tiap departemen (di luar Dashboard, yang selalu
 * boleh). Staff KARYAWAN berdepartemen hanya boleh membuka modul ini. */
export const DEPARTMENT_NAV_IDS: Readonly<Record<Departemen, ReadonlySet<AppViewId>>> = {
  PENDAFTARAN: navIdsForCategory('pendaftaran'),
  RADIOLOGI: navIdsForCategory('radiologi'),
  LABORATORIUM: navIdsForCategory('laboratorium'),
  KEUANGAN: navIdsForCategory('keuangan'),
  FARMASI: navIdsForCategory('farmasi'),
};

export function isViewAllowedForRole(id: AppViewId, role: StaffRole): boolean {
  if (role === 'ADMIN' || role === 'CEO') return true;
  return !MANAGEMENT_ONLY_NAV_IDS.has(id);
}

/** Gabungan pengecekan menu-manajemen (role) dan kunci modul per departemen. */
export function isViewAllowed(id: AppViewId, role: StaffRole, departemen: Departemen | null): boolean {
  if (!isViewAllowedForRole(id, role)) return false;
  if (role === 'ADMIN' || role === 'CEO' || !departemen) return true;
  if (id === DASHBOARD_NAV_ID) return true;
  return DEPARTMENT_NAV_IDS[departemen].has(id);
}
