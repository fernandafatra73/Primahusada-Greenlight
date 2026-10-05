import { pdf } from '@react-pdf/renderer';
import { loadLogoDataUrl } from './loadLogoDataUrl.ts';
import { PjLabReportDocument, type PjLabReportData } from './PjLabReportDocument.tsx';

export type PrintPjLabReportInput = Omit<PjLabReportData, 'logoSrc'>;

export async function generatePjLabReportBlob(input: PrintPjLabReportInput): Promise<Blob> {
  const logoSrc = await loadLogoDataUrl();
  return pdf(<PjLabReportDocument data={{ ...input, logoSrc }} />).toBlob();
}
