import { pdf } from '@react-pdf/renderer';
import { loadLogoDataUrl } from './loadLogoDataUrl.ts';
import { Rad2ReportDocument, type Rad2ReportData } from './Rad2ReportDocument.tsx';

export type PrintRad2ReportInput = Omit<Rad2ReportData, 'logoSrc'>;

export async function generateRad2ReportBlob(input: PrintRad2ReportInput): Promise<Blob> {
  const logoSrc = await loadLogoDataUrl();
  return pdf(<Rad2ReportDocument data={{ ...input, logoSrc }} />).toBlob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
