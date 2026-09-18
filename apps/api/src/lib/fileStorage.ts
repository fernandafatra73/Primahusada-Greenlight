import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/// Folder tempat file foto (rontgen, USG, dll) disimpan di disk, sejajar
/// dengan folder build/ atau src/ tempat file terkompilasi ini berada —
/// pola yang sama dengan webDistDir di index.ts.
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');

const IMAGE_EXTENSION_BY_MEDIA_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const DATA_URL_PATTERN = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/s;

const MEDIA_TYPE_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/// Jika `value` adalah data URL base64 (mis. hasil upload dari browser),
/// simpan sebagai file di `UPLOADS_DIR/<subdir>/` dan kembalikan URL relatif
/// (`/uploads/<subdir>/<nama file>`) untuk disimpan di database, bukan
/// blob base64-nya. Jika bukan data URL (sudah berupa path/URL tersimpan,
/// atau kosong), kembalikan apa adanya.
export function saveImageDataUrl(value: string, subdir: string): string {
  const match = DATA_URL_PATTERN.exec(value);
  if (!match) return value;
  const [, mediaType, base64Data] = match;
  const extension = IMAGE_EXTENSION_BY_MEDIA_TYPE[mediaType!] ?? 'bin';
  const dir = join(UPLOADS_DIR, subdir);
  mkdirSync(dir, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  writeFileSync(join(dir, fileName), Buffer.from(base64Data!, 'base64'));
  return `/uploads/${subdir}/${fileName}`;
}

/// Kebalikan dari `saveImageDataUrl`: baca file yang sudah tersimpan di disk
/// dan bentuk ulang jadi data URL base64. Dipakai endpoint yang butuh isi
/// gambar mentah (mis. dikirim ke AI vision) padahal yang tersimpan di
/// database sekarang hanya path-nya. Kembalikan `null` jika bukan path
/// upload lokal atau filenya sudah tidak ada.
export function readStoredImageAsDataUrl(value: string): string | null {
  if (!value.startsWith('/uploads/')) return null;
  const filePath = join(UPLOADS_DIR, value.slice('/uploads/'.length));
  const mediaType = MEDIA_TYPE_BY_EXTENSION[extname(filePath).toLowerCase()];
  if (!mediaType || !existsSync(filePath)) return null;
  const base64Data = readFileSync(filePath).toString('base64');
  return `data:${mediaType};base64,${base64Data}`;
}

/// Hapus file yang sebelumnya disimpan lewat `saveImageDataUrl`, dipanggil
/// saat record dihapus atau fotonya diganti. Diam-diam diabaikan jika
/// `value` bukan path upload lokal atau filenya sudah tidak ada.
export function deleteStoredImage(value: string | null | undefined): void {
  if (!value || !value.startsWith('/uploads/')) return;
  const filePath = join(UPLOADS_DIR, value.slice('/uploads/'.length));
  if (existsSync(filePath)) unlinkSync(filePath);
}
