/** Masa aktivasi aplikasi: tanggal mulai + lama (bulan), diperpanjang dengan kode aktivasi sekali pakai. */

import { randomInt } from 'node:crypto';

/** Pilihan lama aktivasi (bulan): 1, 3, 6 bulan, 1, 2, 5 tahun. */
export const LAMA_AKTIVASI_BULAN: readonly number[] = [1, 3, 6, 12, 24, 60];

// Tanpa 0/O dan 1/I supaya kode yang disalin tangan tidak tertukar.
const ALFABET_ACAK = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PANJANG_ACAK = 8;

const TANGGAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface AktivasiAplikasiBody {
  readonly tanggalAktivasi?: unknown;
  readonly lamaBulan?: unknown;
  readonly kode?: unknown;
}

export type ParseAktivasiResult =
  | {
      readonly ok: true;
      readonly data: { readonly tanggalAktivasi: Date; readonly lamaBulan: number; readonly kode: string };
    }
  | { readonly ok: false; readonly error: string };

/** "YYYY-MM-DD" -> Date UTC tengah malam; null bila format/tanggal tidak valid (mis. 2026-02-30). */
export function parseTanggal(teks: unknown): Date | null {
  if (typeof teks !== 'string') return null;
  const match = TANGGAL_PATTERN.exec(teks.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) {
    return null;
  }
  return date;
}

export function formatTanggal(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Tanggal + n bulan; tanggal yang tidak ada di bulan tujuan dipotong ke akhir bulan (31 Jan + 1 = 28/29 Feb). */
export function tambahBulan(date: Date, bulan: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + bulan;
  const akhirBulan = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), akhirBulan)));
}

/** Tanggal lokal server sebagai YYYYMMDD, bagian depan kode aktivasi. */
export function tanggalKode(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Kode aktivasi: tanggal + urutan pada tanggal itu + 8 karakter acak kriptografis,
 * mis. "20261017-001-K7QF-9XMB". Bagian acak membuat kode tidak bisa ditebak
 * walau tanggal dan urutannya diketahui. `acak` bisa diganti di tes.
 */
export function buatKodeAktivasi(
  tanggal: string,
  urutan: number,
  acak: (batas: number) => number = randomInt,
): string {
  let bagianAcak = '';
  for (let i = 0; i < PANJANG_ACAK; i += 1) {
    bagianAcak += ALFABET_ACAK[acak(ALFABET_ACAK.length)] ?? '';
  }
  return `${tanggal}-${String(urutan).padStart(3, '0')}-${bagianAcak.slice(0, 4)}-${bagianAcak.slice(4)}`;
}

/** Abaikan spasi dan huruf kecil saat kode diketik ulang. */
export function normalisasiKode(kode: string): string {
  return kode.replace(/\s+/g, '').toUpperCase();
}

export function parseAktivasiBody(body: AktivasiAplikasiBody): ParseAktivasiResult {
  const kode = typeof body.kode === 'string' ? normalisasiKode(body.kode) : '';
  if (!kode) return { ok: false, error: 'Kode aktivasi wajib diisi' };
  const tanggalAktivasi = parseTanggal(body.tanggalAktivasi);
  if (!tanggalAktivasi) return { ok: false, error: 'Tanggal aktivasi tidak valid' };
  const lamaBulan = body.lamaBulan;
  if (typeof lamaBulan !== 'number' || !LAMA_AKTIVASI_BULAN.includes(lamaBulan)) {
    return { ok: false, error: 'Lama aktivasi tidak valid' };
  }
  return { ok: true, data: { tanggalAktivasi, lamaBulan, kode } };
}
