import { useEffect, useState, type ReactNode } from 'react';
import { PdfPreviewModal } from '../components/ui/PdfPreviewModal.tsx';
import {
  registerPdfPreviewHandler,
  type PrintRadiologyReportInput,
  type RadiologyPdfPreview,
  type RadiologyPdfPreviewMeta,
} from './printRadiologyReport.tsx';

export function PdfPreviewHost({ children }: { readonly children: ReactNode }) {
  const [preview, setPreview] = useState<RadiologyPdfPreview | null>(null);
  const [input, setInput] = useState<PrintRadiologyReportInput | null>(null);
  const [meta, setMeta] = useState<RadiologyPdfPreviewMeta | undefined>(undefined);

  useEffect(() => {
    return registerPdfPreviewHandler((next, nextInput, nextMeta) => {
      setPreview(next);
      setInput(nextInput);
      setMeta(nextMeta);
    });
  }, []);

  return (
    <>
      {children}
      <PdfPreviewModal
        open={preview !== null}
        withSignature={preview?.withSignature ?? null}
        withoutSignature={preview?.withoutSignature ?? null}
        withSignatureNoFrame={preview?.withSignatureNoFrame ?? null}
        withoutSignatureNoFrame={preview?.withoutSignatureNoFrame ?? null}
        cetakTerbaru={preview?.cetakTerbaru ?? null}
        filename={preview?.filename ?? 'hasil-radiologi.pdf'}
        initialKesan={input?.kesan ?? ''}
        initialTemuan={input?.temuan ?? ''}
        onSaveKesanTemuan={meta?.onSaveKesanTemuan}
        onClose={() => {
          setPreview(null);
          setInput(null);
          setMeta(undefined);
        }}
      />
    </>
  );
}
