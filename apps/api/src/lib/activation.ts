import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/// Nomor WA pemilik aplikasi yang wajib dihubungi untuk mendapatkan kode
/// aktivasi (baik saat pertama kali pakai maupun saat lisensi kedaluwarsa).
export const OWNER_WA_NUMBER_LOCAL = '085719325557';
/// Format internasional (tanpa "+", awalan 0 diganti 62) untuk link wa.me.
export const OWNER_WA_NUMBER_INTL = `62${OWNER_WA_NUMBER_LOCAL.slice(1)}`;

export const ACTIVATION_DURATION_DAYS = 365;

/// Kunci rahasia untuk menghitung kode aktivasi dari kode permintaan.
/// Boleh dioverride lewat env ACTIVATION_SECRET; ada fallback bawaan agar
/// tetap berfungsi tanpa konfigurasi tambahan di instalasi klinik.
/// PENTING: nilai ini hanya berjalan di server (tidak pernah dikirim ke
/// frontend) dan dipakai bersama oleh scripts/generate-activation-code.ts
/// yang dijalankan pemilik aplikasi untuk membuat kode balasan WA.
function getActivationSecret(): string {
  return process.env.ACTIVATION_SECRET?.trim() || 'primahusada-lisensi-2026-default-secret';
}

/// Kode permintaan yang ditampilkan & dikirim klinik via WhatsApp ke pemilik.
/// Menyertakan installId penuh + cycle supaya pemilik bisa menghitung ulang
/// kode aktivasi yang cocok tanpa perlu akses ke database instalasi tsb.
export function formatRequestCode(installId: string, cycle: number): string {
  return `${installId}.${cycle}`;
}

export function parseRequestCode(requestCode: string): { installId: string; cycle: number } | null {
  const trimmed = requestCode.trim();
  const separatorIndex = trimmed.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) return null;
  const installId = trimmed.slice(0, separatorIndex);
  const cycle = Number(trimmed.slice(separatorIndex + 1));
  if (!installId || !Number.isInteger(cycle) || cycle < 1) return null;
  return { installId, cycle };
}

/// Kode aktivasi pendek (mudah diketik ulang) yang dikirim pemilik lewat
/// balasan WA, dihitung dari HMAC-SHA256(installId:cycle) dengan secret di
/// atas. Bukan enkripsi dua arah — hanya bisa dihitung ulang oleh pihak yang
/// tahu secret-nya (pemilik aplikasi, lewat generate-activation-code.ts).
export function computeActivationCode(installId: string, cycle: number): string {
  const digest = createHmac('sha256', getActivationSecret())
    .update(`${installId}:${cycle}`)
    .digest('hex')
    .toUpperCase();
  const raw = digest.slice(0, 10);
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function verifyActivationCode(installId: string, cycle: number, submittedCode: string): boolean {
  const expected = normalizeCode(computeActivationCode(installId, cycle));
  const actual = normalizeCode(submittedCode);
  // Samakan panjang dulu (hash SHA-256 dari dua string beda panjang) supaya
  // timingSafeEqual tidak throw — kalau panjangnya beda, sudah pasti tidak cocok.
  const expectedHash = createHash('sha256').update(expected).digest();
  const actualHash = createHash('sha256').update(actual).digest();
  return timingSafeEqual(expectedHash, actualHash);
}

export function addActivationDuration(from: Date): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + ACTIVATION_DURATION_DAYS);
  return result;
}

export function buildOwnerWaLink(requestCode: string): string {
  const message = `Halo, saya minta kode aktivasi Primahusada.\nKode permintaan: ${requestCode}`;
  return `https://wa.me/${OWNER_WA_NUMBER_INTL}?text=${encodeURIComponent(message)}`;
}
