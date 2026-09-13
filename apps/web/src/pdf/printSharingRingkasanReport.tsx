import { pdf } from '@react-pdf/renderer';
import { loadLogoDataUrl } from './loadLogoDataUrl.ts';
import {
  SharingRingkasanReportDocument,
  type SharingRingkasanReportData,
} from './SharingRingkasanReportDocument.tsx';

export type PrintSharingRingkasanReportInput = Omit<SharingRingkasanReportData, 'logoSrc'>;

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function generateSharingRingkasanReportBlob(
  input: PrintSharingRingkasanReportInput,
): Promise<Blob> {
  const logoSrc = await loadLogoDataUrl();
  return pdf(<SharingRingkasanReportDocument data={{ ...input, logoSrc }} />).toBlob();
}

export async function printSharingRingkasanReport(
  input: PrintSharingRingkasanReportInput,
): Promise<void> {
  const blob = await generateSharingRingkasanReportBlob(input);
  const cleanModule = input.moduleLabel.trim().replace(/[/\\?%*:|"<>]/g, '_') || 'Ringkasan';
  const filename = `Laporan_Sharing_Ringkasan_${cleanModule}.pdf`;
  downloadBlob(blob, filename);
}
