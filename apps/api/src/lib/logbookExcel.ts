import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import type { PrismaClient } from '../generated/prisma/client.js';
import { UPLOADS_DIR } from './fileStorage.js';

export const LOGBOOK_SUBDIR = 'logbook';
export const LOGBOOK_RADIOLOGI_FILENAME = 'Logbook_Pasien_Radiologi.xlsx';

export interface LogbookPasienSource {
  readonly nama: string;
  readonly tanggalLahir: Date;
  readonly alamat: string | null;
  readonly pemeriksaanNama: string;
  readonly pengirimNama: string;
  readonly registeredAt: Date;
}

export interface LogbookKondisiSource {
  readonly namaPasien: string;
  readonly kv: string;
  readonly sekon: string;
  readonly mAs: string;
  readonly beratBadan: string | null;
}

/// Kolom sama persis dengan tombol Export Excel di halaman Logbook Pasien.
export interface LogbookExcelRow {
  readonly No: number;
  readonly Nama: string;
  readonly Usia: string;
  readonly Alamat: string;
  readonly Pemeriksaan: string;
  readonly Pengirim: string;
  readonly Tanggal: string;
  readonly KV: string;
  readonly Sekond: string;
  readonly mAs: string;
  readonly 'Berat Badan': string;
}

function normalizeNama(nama: string): string {
  return nama.trim().toLowerCase();
}

function umurTahun(tanggalLahir: Date, ref: Date): number {
  let age = ref.getFullYear() - tanggalLahir.getFullYear();
  const monthDiff = ref.getMonth() - tanggalLahir.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < tanggalLahir.getDate())) {
    age -= 1;
  }
  return age < 0 ? 0 : age;
}

function formatTanggal(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

/**
 * Baris logbook dari arsip Duplikat Radiologi (urut terbaru dulu) digabung
 * dengan Kondisi Alat berdasarkan nama pasien — pencocokan yang sama dengan
 * halaman Logbook Pasien, jadi `kondisi` harus sudah urut terbaru dulu supaya
 * entri terbaru yang menang.
 */
export function buildLogbookRows(
  pasien: readonly LogbookPasienSource[],
  kondisi: readonly LogbookKondisiSource[],
  ref: Date,
): LogbookExcelRow[] {
  const kondisiByNama = new Map<string, LogbookKondisiSource>();
  for (const k of kondisi) {
    const key = normalizeNama(k.namaPasien);
    if (!kondisiByNama.has(key)) kondisiByNama.set(key, k);
  }
  return pasien.map((p, idx) => {
    const k = kondisiByNama.get(normalizeNama(p.nama));
    return {
      No: idx + 1,
      Nama: p.nama,
      Usia: `${umurTahun(p.tanggalLahir, ref)} tahun`,
      Alamat: p.alamat || '—',
      Pemeriksaan: p.pemeriksaanNama || '—',
      Pengirim: p.pengirimNama || '—',
      Tanggal: formatTanggal(p.registeredAt),
      KV: k?.kv ?? '—',
      Sekond: k?.sekon ?? '—',
      mAs: k?.mAs ?? '—',
      'Berat Badan': k?.beratBadan ? `${k.beratBadan} kg` : '—',
    };
  });
}

export function buildLogbookWorkbook(rows: readonly LogbookExcelRow[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet([...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Logbook Pasien');
  const out: unknown = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  if (!Buffer.isBuffer(out)) {
    throw new Error('Gagal membuat file Excel logbook');
  }
  return out;
}

/**
 * Tulis ulang seluruh file Excel logbook dari database. Dibangun penuh tiap kali
 * (bukan ditambah satu baris) supaya isinya selalu sama dengan tabel Logbook
 * Pasien, termasuk setelah data arsip diubah atau dihapus.
 */
export async function writeLogbookRadiologiExcel(
  prisma: PrismaClient,
  dir: string = join(UPLOADS_DIR, LOGBOOK_SUBDIR),
): Promise<string> {
  const [pasien, kondisi] = await Promise.all([
    prisma.pasienDuplikat.findMany({
      where: { asalModul: 'RADIOLOGI' },
      orderBy: { registeredAt: 'desc' },
    }),
    prisma.kondisiAlat.findMany({ orderBy: { tanggal: 'desc' } }),
  ]);
  const rows = buildLogbookRows(
    pasien,
    kondisi.map((k) => ({
      namaPasien: k.namaPasien,
      kv: k.kv.toString(),
      sekon: k.sekon.toString(),
      mAs: k.mAs.toString(),
      beratBadan: k.beratBadan !== null ? k.beratBadan.toString() : null,
    })),
    new Date(),
  );
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, LOGBOOK_RADIOLOGI_FILENAME);
  writeFileSync(filePath, buildLogbookWorkbook(rows));
  return filePath;
}
