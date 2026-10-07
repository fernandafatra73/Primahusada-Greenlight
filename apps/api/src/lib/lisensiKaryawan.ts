/** Validasi body menu Lisensi > Surat Sehat dan Lisensi > Hasil Lab (pemeriksaan
 * tahunan karyawan). Berkas/tanda tangan divalidasi terpisah lewat
 * `validateLisensiBerkas`, karena hanya data URL baru yang perlu diperiksa. */

import { parseLisensiTanggal } from './lisensi.js';

export type ParseResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string };

const TEKS_MAX = 200;
const CATATAN_MAX = 1000;
export const HASIL_LAB_ITEM_MAX = 300;

export const KESIMPULAN_SURAT_SEHAT = ['SEHAT', 'TIDAK_SEHAT'] as const;
export type KesimpulanSuratSehat = (typeof KESIMPULAN_SURAT_SEHAT)[number];

function isKesimpulan(value: string): value is KesimpulanSuratSehat {
  return (KESIMPULAN_SURAT_SEHAT as readonly string[]).includes(value);
}

/** Teks opsional: dipangkas, kosong → null; `undefined` bila bukan string atau terlalu panjang. */
function teksOpsional(
  value: unknown,
  max = TEKS_MAX,
): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length > max) return undefined;
  return trimmed || null;
}

function teksWajib(value: unknown, max = TEKS_MAX): string | undefined {
  const teks = teksOpsional(value, max);
  return teks ?? undefined;
}

/** Tahun arsip diambil dari tanggal periksa (tanggal dikirim pada tengah hari waktu lokal). */
export function tahunDariTanggal(tanggal: Date): number {
  return tanggal.getFullYear();
}

export interface SuratSehatData {
  readonly tahun: number;
  readonly tanggalPeriksa: Date;
  readonly nomorSurat: string | null;
  readonly nama: string;
  readonly jabatan: string | null;
  readonly tempatTanggalLahir: string | null;
  readonly jenisKelamin: string | null;
  readonly alamat: string | null;
  readonly tinggiBadan: string | null;
  readonly beratBadan: string | null;
  readonly tekananDarah: string | null;
  readonly nadi: string | null;
  readonly butaWarna: string | null;
  readonly kesimpulan: KesimpulanSuratSehat;
  readonly keperluan: string | null;
  readonly catatan: string | null;
  readonly namaDokter: string;
  readonly sipDokter: string | null;
}

const SURAT_SEHAT_TEKS_OPSIONAL = [
  'nomorSurat',
  'jabatan',
  'tempatTanggalLahir',
  'jenisKelamin',
  'alamat',
  'tinggiBadan',
  'beratBadan',
  'tekananDarah',
  'nadi',
  'butaWarna',
  'keperluan',
  'sipDokter',
] as const;

/** Validasi seluruh isi surat sehat (tambah maupun ubah mengirim form lengkap). */
export function parseSuratSehatBody(
  body: Readonly<Record<string, unknown>>,
): ParseResult<SuratSehatData> {
  const nama = teksWajib(body.nama);
  if (!nama) return { ok: false, error: 'Nama karyawan wajib diisi' };
  const namaDokter = teksWajib(body.namaDokter);
  if (!namaDokter) return { ok: false, error: 'Nama dokter wajib diisi' };
  const tanggal =
    typeof body.tanggalPeriksa === 'string'
      ? parseLisensiTanggal(body.tanggalPeriksa)
      : undefined;
  if (!tanggal) return { ok: false, error: 'Tanggal periksa tidak valid' };
  const kesimpulan =
    typeof body.kesimpulan === 'string' ? body.kesimpulan : 'SEHAT';
  if (!isKesimpulan(kesimpulan))
    return { ok: false, error: 'Kesimpulan tidak dikenal' };
  const catatan = teksOpsional(body.catatan, CATATAN_MAX);
  if (catatan === undefined)
    return { ok: false, error: `Catatan maksimal ${CATATAN_MAX} karakter` };

  const opsional: Partial<
    Record<(typeof SURAT_SEHAT_TEKS_OPSIONAL)[number], string | null>
  > = {};
  for (const key of SURAT_SEHAT_TEKS_OPSIONAL) {
    const value = teksOpsional(body[key]);
    if (value === undefined)
      return {
        ok: false,
        error: `Isian ${key} tidak valid (maks. ${TEKS_MAX} karakter)`,
      };
    opsional[key] = value;
  }

  return {
    ok: true,
    data: {
      tahun: tahunDariTanggal(tanggal),
      tanggalPeriksa: tanggal,
      nama,
      namaDokter,
      kesimpulan,
      catatan,
      nomorSurat: opsional.nomorSurat ?? null,
      jabatan: opsional.jabatan ?? null,
      tempatTanggalLahir: opsional.tempatTanggalLahir ?? null,
      jenisKelamin: opsional.jenisKelamin ?? null,
      alamat: opsional.alamat ?? null,
      tinggiBadan: opsional.tinggiBadan ?? null,
      beratBadan: opsional.beratBadan ?? null,
      tekananDarah: opsional.tekananDarah ?? null,
      nadi: opsional.nadi ?? null,
      butaWarna: opsional.butaWarna ?? null,
      keperluan: opsional.keperluan ?? null,
      sipDokter: opsional.sipDokter ?? null,
    },
  };
}

export interface HasilLabItemData {
  readonly urutan: number;
  readonly jenis: string;
  readonly parameter: string;
  readonly hasil: string;
  readonly satuan: string | null;
  readonly nilaiNormal: string | null;
}

export interface HasilLabData {
  readonly tahun: number;
  readonly tanggalPeriksa: Date;
  readonly nama: string;
  readonly jabatan: string | null;
  readonly catatan: string | null;
  readonly namaAnalis: string | null;
  readonly items: ReadonlyArray<HasilLabItemData>;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validasi hasil lab lengkap. Baris parameter yang hasilnya kosong dibuang —
 * form dibuka dengan parameter bawaan dan tidak semuanya selalu diperiksa. */
export function parseHasilLabBody(
  body: Readonly<Record<string, unknown>>,
): ParseResult<HasilLabData> {
  const nama = teksWajib(body.nama);
  if (!nama) return { ok: false, error: 'Nama karyawan wajib diisi' };
  const tanggal =
    typeof body.tanggalPeriksa === 'string'
      ? parseLisensiTanggal(body.tanggalPeriksa)
      : undefined;
  if (!tanggal) return { ok: false, error: 'Tanggal periksa tidak valid' };
  const jabatan = teksOpsional(body.jabatan);
  if (jabatan === undefined) return { ok: false, error: 'Jabatan tidak valid' };
  const catatan = teksOpsional(body.catatan, CATATAN_MAX);
  if (catatan === undefined)
    return { ok: false, error: `Catatan maksimal ${CATATAN_MAX} karakter` };

  const namaAnalis = teksOpsional(body.namaAnalis);
  if (namaAnalis === undefined)
    return { ok: false, error: 'Nama analis tidak valid' };

  const rawItems = body.items ?? [];
  if (!Array.isArray(rawItems))
    return { ok: false, error: 'Daftar hasil tidak valid' };
  if (rawItems.length > HASIL_LAB_ITEM_MAX)
    return { ok: false, error: `Maksimal ${HASIL_LAB_ITEM_MAX} parameter` };

  const items: HasilLabItemData[] = [];
  for (const raw of rawItems) {
    if (!isRecord(raw)) return { ok: false, error: 'Baris hasil tidak valid' };
    const hasil = teksOpsional(raw.hasil);
    if (hasil === undefined)
      return { ok: false, error: 'Isian hasil tidak valid' };
    if (hasil === null) continue;
    const jenis = teksWajib(raw.jenis);
    const parameter = teksWajib(raw.parameter);
    if (!jenis || !parameter)
      return {
        ok: false,
        error: 'Jenis dan nama parameter wajib diisi untuk setiap hasil',
      };
    const satuan = teksOpsional(raw.satuan);
    const nilaiNormal = teksOpsional(raw.nilaiNormal);
    if (satuan === undefined || nilaiNormal === undefined)
      return { ok: false, error: 'Satuan/nilai normal tidak valid' };
    items.push({
      urutan: items.length,
      jenis,
      parameter,
      hasil,
      satuan,
      nilaiNormal,
    });
  }

  return {
    ok: true,
    data: {
      tahun: tahunDariTanggal(tanggal),
      tanggalPeriksa: tanggal,
      nama,
      jabatan,
      catatan,
      namaAnalis,
      items,
    },
  };
}
