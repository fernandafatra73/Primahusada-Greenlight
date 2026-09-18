import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/// Nomor WA pemilik aplikasi yang wajib dihubungi untuk mendapatkan kode
/// aktivasi (baik saat pertama kali pakai maupun saat lisensi kedaluwarsa).
export const OWNER_WA_NUMBER_LOCAL = '085719325557';
/// Format internasional (tanpa "+", awalan 0 diganti 62) untuk link wa.me.
export const OWNER_WA_NUMBER_INTL = `62${OWNER_WA_NUMBER_LOCAL.slice(1)}`;

/// Lama aktivasi default (tahun) kalau pemilik tidak menentukan sendiri lewat
/// npm run activation:code -- "<kode-permintaan>" <tahun>. Pemilik bisa
/// membuat kode dengan durasi berapa pun (mis. 20 tahun untuk aktivasi
/// jangka panjang) — durasinya ikut ditandatangani di dalam kode itu sendiri.
export const DEFAULT_ACTIVATION_YEARS = 1;
const MIN_ACTIVATION_YEARS = 1;
const MAX_ACTIVATION_YEARS = 100;

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

export function isValidActivationYears(years: number): boolean {
  return Number.isInteger(years) && years >= MIN_ACTIVATION_YEARS && years <= MAX_ACTIVATION_YEARS;
}

function activationDigest(installId: string, cycle: number, years: number): string {
  return createHmac('sha256', getActivationSecret())
    .update(`${installId}:${cycle}:${years}`)
    .digest('hex')
    .toUpperCase()
    .slice(0, 10);
}

/// Kode aktivasi pendek (mudah diketik ulang) yang dikirim pemilik lewat
/// balasan WA, dihitung dari HMAC-SHA256(installId:cycle:years) dengan
/// secret di atas. Durasi (tahun) yang dipilih pemilik ikut ditandatangani
/// dan disertakan apa adanya di ekor kode ("-Y<tahun>") — kalau ekor itu
/// diubah tanpa tahu secret-nya, verifikasi akan gagal karena digest tidak
/// cocok lagi. Bukan enkripsi dua arah, hanya bisa dihitung ulang oleh
/// pihak yang tahu secret-nya (pemilik aplikasi, lewat
/// generate-activation-code.ts).
export function computeActivationCode(installId: string, cycle: number, years: number): string {
  const digest = activationDigest(installId, cycle, years);
  return `${digest.slice(0, 5)}-${digest.slice(5, 10)}-Y${years}`;
}

const ACTIVATION_CODE_PATTERN = /^([0-9A-F]{5})-?([0-9A-F]{5})-Y(\d{1,3})$/;

/// Mengembalikan jumlah tahun yang tertanam di kode kalau valid untuk
/// installId+cycle yang diberikan, atau `null` kalau kode salah/rusak.
export function verifyActivationCode(installId: string, cycle: number, submittedCode: string): number | null {
  const normalized = submittedCode.trim().toUpperCase().replace(/\s+/g, '');
  const match = ACTIVATION_CODE_PATTERN.exec(normalized);
  if (!match) return null;
  const [, part1, part2, yearsRaw] = match;
  const years = Number(yearsRaw);
  if (!isValidActivationYears(years)) return null;

  const expectedDigest = activationDigest(installId, cycle, years);
  const actualDigest = `${part1}${part2}`;
  const expectedHash = createHash('sha256').update(expectedDigest).digest();
  const actualHash = createHash('sha256').update(actualDigest).digest();
  return timingSafeEqual(expectedHash, actualHash) ? years : null;
}

export function addActivationDuration(from: Date, years: number): Date {
  const result = new Date(from);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export function buildOwnerWaLink(requestCode: string): string {
  const message = `Halo, saya minta kode aktivasi Primahusada.\nKode permintaan: ${requestCode}`;
  return `https://wa.me/${OWNER_WA_NUMBER_INTL}?text=${encodeURIComponent(message)}`;
}
