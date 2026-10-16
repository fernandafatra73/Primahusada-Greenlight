/** Validasi isian riwayat login (Mega Data > Tabel-login). */

// Foto webcam 480px JPEG sekitar 30-60 KB; batas ini menolak kiriman yang jelas bukan foto login.
const FOTO_MAKS_KARAKTER = 2_000_000;
const FOTO_PREFIX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const NAMA_MAKS = 120;

export type Parsed<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: string };

export interface LoginLogCreateBody {
  readonly staffId?: unknown;
  readonly nama?: unknown;
  readonly email?: unknown;
}

export interface LoginLogEditBody {
  readonly nama?: unknown;
  readonly loginAt?: unknown;
}

function teks(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseLoginLogCreate(
  body: LoginLogCreateBody,
): Parsed<{ staffId: string | null; nama: string; email: string }> {
  const nama = teks(body.nama);
  if (!nama) return { ok: false, error: 'Nama login wajib diisi' };
  if (nama.length > NAMA_MAKS) return { ok: false, error: 'Nama login terlalu panjang' };
  return { ok: true, data: { staffId: teks(body.staffId) || null, nama, email: teks(body.email) } };
}

export function parseLoginLogEdit(body: LoginLogEditBody): Parsed<{ nama?: string; loginAt?: Date }> {
  const data: { nama?: string; loginAt?: Date } = {};
  if (body.nama !== undefined) {
    const nama = teks(body.nama);
    if (!nama) return { ok: false, error: 'Nama login wajib diisi' };
    if (nama.length > NAMA_MAKS) return { ok: false, error: 'Nama login terlalu panjang' };
    data.nama = nama;
  }
  if (body.loginAt !== undefined) {
    const loginAt = typeof body.loginAt === 'string' ? new Date(body.loginAt) : null;
    if (!loginAt || Number.isNaN(loginAt.getTime())) return { ok: false, error: 'Waktu login tidak valid' };
    data.loginAt = loginAt;
  }
  return { ok: true, data };
}

export function parseFotoLogin(foto: unknown): Parsed<string> {
  if (typeof foto !== 'string' || foto.length > FOTO_MAKS_KARAKTER || !FOTO_PREFIX.test(foto)) {
    return { ok: false, error: 'Foto tidak valid' };
  }
  return { ok: true, data: foto };
}

/** Lama aplikasi dibuka (detik): sampai logout, atau sampai tanda aktif terakhir bila tidak sempat logout. */
export function durasiDetik(loginAt: Date, terakhirAktif: Date, logoutAt: Date | null): number {
  const akhir = logoutAt ?? terakhirAktif;
  return Math.max(0, Math.round((akhir.getTime() - loginAt.getTime()) / 1000));
}
