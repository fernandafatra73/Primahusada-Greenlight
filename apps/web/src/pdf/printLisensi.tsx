import { pdf } from '@react-pdf/renderer';
import type {
  LisensiCetakBagian,
  LisensiCetakLampiran,
} from '../lib/lisensi.ts';
import { LisensiDocument } from './LisensiDocument.tsx';
import { loadLogoDataUrl } from './loadLogoDataUrl.ts';

export interface PrintLisensiInput {
  readonly judul: string;
  readonly tanggalCetak: string;
  readonly bagian: ReadonlyArray<LisensiCetakBagian>;
  readonly lampiran: ReadonlyArray<LisensiCetakLampiran>;
  readonly padat?: boolean;
}

/** react-pdf hanya membaca PNG/JPEG, sedangkan unggahan bisa GIF/WEBP — gambar
 * ulang lewat kanvas menjadi PNG data URL. */
export function gambarKePng(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = (): void => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Kanvas tidak tersedia'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (): void =>
      reject(new Error(`Gambar tidak bisa dimuat: ${src}`));
    img.src = src;
  });
}

export async function generateLisensiBlob(
  input: PrintLisensiInput,
): Promise<Blob> {
  const logoSrc = await loadLogoDataUrl();
  const cache = new Map<string, Promise<string>>();
  const png = (src: string): Promise<string> => {
    let hasil = cache.get(src);
    if (!hasil) {
      hasil = gambarKePng(src);
      cache.set(src, hasil);
    }
    return hasil;
  };

  const bagian = await Promise.all(
    input.bagian.map(async (b): Promise<LisensiCetakBagian> => {
      if (b.tipe === 'pejabat')
        return { ...b, ttd: b.ttd ? await png(b.ttd) : null };
      const baris = await Promise.all(
        b.baris.map(async (r) => ({
          ...r,
          ttd: r.ttd ? await png(r.ttd) : null,
        })),
      );
      return { ...b, baris };
    }),
  );
  const lampiran = await Promise.all(
    input.lampiran.map(async (l) => ({ ...l, src: await png(l.src) })),
  );

  return pdf(
    <LisensiDocument
      data={{
        logoSrc,
        judul: input.judul,
        tanggalCetak: input.tanggalCetak,
        bagian,
        lampiran,
        padat: input.padat,
      }}
    />,
  ).toBlob();
}

/** Lampiran PDF dicetak apa adanya — ambil file aslinya sebagai Blob. */
export async function fetchBerkasBlob(path: string): Promise<Blob> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Berkas tidak bisa diambil (${res.status})`);
  return res.blob();
}
