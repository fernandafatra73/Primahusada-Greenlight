import { pdf } from '@react-pdf/renderer';
import { loadLogoDataUrl } from './loadLogoDataUrl.ts';
import {
  StrukturOrganisasiReportDocument,
  type StrukturOrganisasiReportAnggota,
} from './StrukturOrganisasiReportDocument.tsx';

export interface StrukturOrganisasiPrintInput {
  readonly pimpinan: StrukturOrganisasiReportAnggota;
  readonly penanggungJawab: StrukturOrganisasiReportAnggota;
  readonly unitKerja: readonly StrukturOrganisasiReportAnggota[];
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Foto bisa webp/gif yang tak didukung react-pdf maupun Word; digambar ulang ke PNG. */
export async function fotoToPngDataUrl(src: string | null): Promise<string | null> {
  if (!src) return null;
  try {
    const blob = await (await fetch(src)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    // Foto gagal dimuat — cetak tetap jalan dengan placeholder kosong.
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kartuHtml(anggota: StrukturOrganisasiReportAnggota): string {
  const foto = anggota.fotoSrc
    ? `<img src="${anggota.fotoSrc}" width="64" height="64" alt="" />`
    : '&nbsp;';
  return `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;display:inline-table;margin:4px">
    <tr>
      <td width="70" align="center">${foto}</td>
      <td width="170"><small>${escapeHtml(anggota.jabatan)}</small><br/><b>${escapeHtml(anggota.nama || '-')}</b></td>
    </tr>
  </table>`;
}

/** Dokumen HTML bertipe application/msword: dibuka langsung oleh Word tanpa library tambahan. */
export function buildStrukturOrganisasiWordHtml(
  logoSrc: string,
  input: StrukturOrganisasiPrintInput,
): string {
  const logo = logoSrc ? `<img src="${logoSrc}" width="44" height="44" alt="" />` : '';
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" /><title>Struktur Organisasi</title></head>
<body style="font-family:Arial,sans-serif">
  <table width="100%" cellspacing="0" cellpadding="4" style="border-bottom:2px solid #2b4c9b">
    <tr>
      <td width="56">${logo}</td>
      <td><b style="font-size:16pt;color:#2b4c9b">KLINIK PRIMA HUSADA</b><br/><small>Jl Siliwangi No 28 A Parung Kuda Telp. 0857-1932-5557</small></td>
    </tr>
  </table>
  <h3 align="center" style="color:#2b4c9b">STRUKTUR ORGANISASI</h3>
  <p align="center">${kartuHtml(input.pimpinan)}</p>
  <p align="center">&#9660;</p>
  <p align="center">${kartuHtml(input.penanggungJawab)}</p>
  <p align="center">&#9660;</p>
  <p align="center">${input.unitKerja.map(kartuHtml).join('')}</p>
</body></html>`;
}

export async function printStrukturOrganisasiPdf(input: StrukturOrganisasiPrintInput): Promise<void> {
  const logoSrc = await loadLogoDataUrl();
  const blob = await pdf(
    <StrukturOrganisasiReportDocument data={{ ...input, logoSrc }} />,
  ).toBlob();
  downloadBlob(blob, 'Struktur_Organisasi.pdf');
}

export async function printStrukturOrganisasiWord(input: StrukturOrganisasiPrintInput): Promise<void> {
  const logoSrc = await loadLogoDataUrl();
  const html = buildStrukturOrganisasiWordHtml(logoSrc, input);
  downloadBlob(
    new Blob(['﻿', html], { type: 'application/msword' }),
    'Struktur_Organisasi.doc',
  );
}
