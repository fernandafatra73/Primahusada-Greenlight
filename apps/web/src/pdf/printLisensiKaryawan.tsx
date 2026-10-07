import { pdf } from '@react-pdf/renderer';
import {
  HasilLabKaryawanDocument,
  SuratSehatKaryawanDocument,
  type HasilLabKaryawanData,
  type SuratSehatKaryawanData,
} from './LisensiKaryawanDocument.tsx';
import { loadLogoDataUrl } from './loadLogoDataUrl.ts';
import { gambarKePng } from './printLisensi.tsx';

export async function generateSuratSehatKaryawanBlob(
  input: Omit<SuratSehatKaryawanData, 'logoSrc'>,
): Promise<Blob> {
  const logoSrc = await loadLogoDataUrl();
  const ttdDokter = input.ttdDokter ? await gambarKePng(input.ttdDokter) : null;
  return pdf(
    <SuratSehatKaryawanDocument data={{ ...input, logoSrc, ttdDokter }} />,
  ).toBlob();
}

export async function generateHasilLabKaryawanBlob(
  input: Omit<HasilLabKaryawanData, 'logoSrc'>,
): Promise<Blob> {
  const logoSrc = await loadLogoDataUrl();
  return pdf(
    <HasilLabKaryawanDocument data={{ ...input, logoSrc }} />,
  ).toBlob();
}
