import { pdf } from '@react-pdf/renderer';
import { loadLogoDataUrl } from './loadLogoDataUrl.ts';
import {
  SharingRadiologReportDocument,
  type SharingRadiologReportData,
} from './SharingRadiologReportDocument.tsx';

export type PrintSharingRadiologReportInput = Omit<SharingRadiologReportData, 'logoSrc'>;

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function generateSharingRadiologReportBlob(
  input: PrintSharingRadiologReportInput,
): Promise<Blob> {
  const logoSrc = await loadLogoDataUrl();
  return pdf(<SharingRadiologReportDocument data={{ ...input, logoSrc }} />).toBlob();
}

export async function printSharingRadiologReport(
  input: PrintSharingRadiologReportInput,
): Promise<void> {
  const blob = await generateSharingRadiologReportBlob(input);
  downloadBlob(blob, 'Laporan_Sharing_Radiolog.pdf');
}
