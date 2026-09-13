import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal.tsx';

type PdfVersion =
  | 'with-signature'
  | 'without-signature'
  | 'with-signature-no-frame'
  | 'without-signature-no-frame';

interface PdfPreviewModalProps {
  readonly open: boolean;
  readonly withSignature: Blob | null;
  readonly withoutSignature: Blob | null;
  readonly withSignatureNoFrame: Blob | null;
  readonly withoutSignatureNoFrame: Blob | null;
  readonly filename: string;
  readonly onClose: () => void;
}

export function PdfPreviewModal({
  open,
  withSignature,
  withoutSignature,
  withSignatureNoFrame,
  withoutSignatureNoFrame,
  filename,
  onClose,
}: PdfPreviewModalProps) {
  const [version, setVersion] = useState<PdfVersion>('with-signature');
  const [url, setUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const blobByVersion: Record<PdfVersion, Blob | null> = {
    'with-signature': withSignature,
    'without-signature': withoutSignature,
    'with-signature-no-frame': withSignatureNoFrame,
    'without-signature-no-frame': withoutSignatureNoFrame,
  };
  const activeBlob = blobByVersion[version];

  useEffect(() => {
    if (!open) {
      setVersion('with-signature');
    }
  }, [open]);

  useEffect(() => {
    if (!activeBlob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(activeBlob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [activeBlob]);

  function handlePrint() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }

  function handleDownload() {
    if (!activeBlob) return;
    const suffixByVersion: Record<PdfVersion, string> = {
      'with-signature': '',
      'without-signature': '-tanpa-ttd',
      'with-signature-no-frame': '-tanpa-kerangka',
      'without-signature-no-frame': '-tanpa-ttd-tanpa-kerangka',
    };
    const suffix = suffixByVersion[version];
    const base = filename.replace(/\.pdf$/i, '');
    const objectUrl = URL.createObjectURL(activeBlob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `${base}${suffix}.pdf`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <Modal open={open} title="Pratinjau hasil radiologi" onClose={onClose} size="xl">
      <div className="pdf-preview">
        <div className="pdf-preview__versions filter-tabs" role="tablist" aria-label="Versi PDF">
          <button
            type="button"
            role="tab"
            aria-selected={version === 'with-signature'}
            className={`filter-tab${version === 'with-signature' ? ' filter-tab--active' : ''}`}
            onClick={() => setVersion('with-signature')}
          >
            Dengan tanda tangan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={version === 'without-signature'}
            className={`filter-tab${version === 'without-signature' ? ' filter-tab--active' : ''}`}
            onClick={() => setVersion('without-signature')}
          >
            Tanpa tanda tangan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={version === 'with-signature-no-frame'}
            className={`filter-tab${version === 'with-signature-no-frame' ? ' filter-tab--active' : ''}`}
            onClick={() => setVersion('with-signature-no-frame')}
          >
            Dengan TTD tanpa kerangka
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={version === 'without-signature-no-frame'}
            className={`filter-tab${version === 'without-signature-no-frame' ? ' filter-tab--active' : ''}`}
            onClick={() => setVersion('without-signature-no-frame')}
          >
            Tanpa TTD tanpa kerangka
          </button>
        </div>
        <div className="pdf-preview__toolbar">
          <button type="button" className="btn btn--primary btn--sm" onClick={handlePrint}>
            Cetak
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleDownload}>
            Unduh PDF
          </button>
        </div>
        {url ? (
          <iframe
            ref={iframeRef}
            title="Pratinjau PDF"
            className="pdf-preview__frame pdf-preview__frame--radiologi"
            src={url}
          />
        ) : (
          <p className="loading-text">Menyiapkan PDF…</p>
        )}
      </div>
    </Modal>
  );
}
