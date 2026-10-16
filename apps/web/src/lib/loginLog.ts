/** Riwayat login (Mega Data > Tabel-login); data dari GET /api/login-log. */

export interface LoginLogItem {
  readonly id: string;
  readonly nama: string;
  readonly email: string;
  readonly loginAt: string;
  readonly logoutAt: string | null;
  readonly durasiDetik: number;
  readonly foto: string | null;
}

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export interface WaktuLogin {
  readonly jam: string;
  readonly tanggal: number;
  readonly bulan: string;
  readonly tahun: number;
}

/** Waktu login dipecah per kolom tabel, mengikuti jam lokal komputer. */
export function pecahWaktuLogin(iso: string): WaktuLogin {
  const d = new Date(iso);
  return {
    jam: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    tanggal: d.getDate(),
    bulan: NAMA_BULAN[d.getMonth()] ?? '',
    tahun: d.getFullYear(),
  };
}

/** 59 -> "59 detik", 3720 -> "1 jam 2 menit", 90061 -> "1 hari 1 jam 1 menit". */
export function formatDurasi(detik: number): string {
  const total = Math.max(0, Math.floor(detik));
  if (total < 60) return `${total} detik`;
  const hari = Math.floor(total / 86_400);
  const jam = Math.floor((total % 86_400) / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const bagian: string[] = [];
  if (hari > 0) bagian.push(`${hari} hari`);
  if (jam > 0) bagian.push(`${jam} jam`);
  if (menit > 0) bagian.push(`${menit} menit`);
  return bagian.join(' ');
}

/** ISO -> nilai input datetime-local (waktu lokal, tanpa detik). */
export function keInputDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
