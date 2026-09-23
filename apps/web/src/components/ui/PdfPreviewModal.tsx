import { useEffect, useRef, useState } from 'react';
import { clampClinicalInput } from '../../lib/clinicalText.ts';
import { Modal } from './Modal.tsx';

type PdfVersion =
  | 'with-signature'
  | 'without-signature'
  | 'with-signature-no-frame'
  | 'without-signature-no-frame'
  | 'cetak-terbaru';

interface PdfPreviewModalProps {
  readonly open: boolean;
  readonly withSignature: Blob | null;
  readonly withoutSignature: Blob | null;
  readonly withSignatureNoFrame: Blob | null;
  readonly withoutSignatureNoFrame: Blob | null;
  readonly cetakTerbaru: Blob | null;
  readonly filename: string;
  /** Nilai Kesan/Temuan saat ini, dipakai mengisi awal panel edit di tab "Cetak Terbaru". */
  readonly initialKesan?: string;
  readonly initialTemuan?: string;
  /** Hanya disediakan untuk pratinjau yang datanya bisa disimpan ulang (mis. dari Pasien) —
   * kalau kosong, panel edit Kesan/Temuan di tab "Cetak Terbaru" tidak ditampilkan. */
  readonly onSaveKesanTemuan?: (kesan: string, temuan: string) => Promise<void>;
  readonly onClose: () => void;
}

export function PdfPreviewModal({
  open,
  withSignature,
  withoutSignature,
  withSignatureNoFrame,
  withoutSignatureNoFrame,
  cetakTerbaru,
  filename,
  initialKesan = '',
  initialTemuan = '',
  onSaveKesanTemuan,
  onClose,
}: PdfPreviewModalProps) {
  const [version, setVersion] = useState<PdfVersion>('with-signature');
  const [url, setUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [kesanDraft, setKesanDraft] = useState(initialKesan);
  const [temuanDraft, setTemuanDraft] = useState(initialTemuan);
  const [savingKesanTemuan, setSavingKesanTemuan] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const blobByVersion: Record<PdfVersion, Blob | null> = {
    'with-signature': withSignature,
    'without-signature': withoutSignature,
    'with-signature-no-frame': withSignatureNoFrame,
    'without-signature-no-frame': withoutSignatureNoFrame,
    'cetak-terbaru': cetakTerbaru,
  };
  const activeBlob = blobByVersion[version];

  useEffect(() => {
    if (!open) {
      setVersion('with-signature');
    }
  }, [open]);

  // Nilai awal (kesan lama sebelum diedit, atau hasil terbaru setelah disimpan) selalu
  // datang dari caller lewat prop — disinkronkan ke draft supaya textarea tidak "basi".
  useEffect(() => {
    setKesanDraft(initialKesan);
    setTemuanDraft(initialTemuan);
    setSaveError(null);
  }, [initialKesan, initialTemuan]);

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
      'cetak-terbaru': '-cetak-terbaru',
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

  async function handleSaveKesanTemuan() {
    if (!onSaveKesanTemuan) return;
    setSavingKesanTemuan(true);
    setSaveError(null);
    try {
      await onSaveKesanTemuan(kesanDraft, temuanDraft);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan Kesan/Temuan');
    } finally {
      setSavingKesanTemuan(false);
    }
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
          <button
            type="button"
            role="tab"
            aria-selected={version === 'cetak-terbaru'}
            className={`filter-tab${version === 'cetak-terbaru' ? ' filter-tab--active' : ''}`}
            onClick={() => setVersion('cetak-terbaru')}
          >
            Cetak Terbaru
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
        {version === 'cetak-terbaru' && onSaveKesanTemuan && (
          <div className="form-grid pdf-preview__edit-panel">
            <div className="form-field">
              <label htmlFor="pdf-preview-temuan">Edit Temuan</label>
              <textarea
                id="pdf-preview-temuan"
                rows={2}
                value={temuanDraft}
                onChange={(e) => setTemuanDraft(clampClinicalInput(e.target.value))}
                placeholder="Temuan radiologi..."
              />
            </div>
            <div className="form-field">
              <label htmlFor="pdf-preview-kesan">Edit Kesan</label>
              <textarea
                id="pdf-preview-kesan"
                rows={3}
                value={kesanDraft}
                onChange={(e) => setKesanDraft(clampClinicalInput(e.target.value))}
                placeholder="Isi kesan radiologi..."
              />
            </div>
            {saveError && <div className="alert alert--error form-grid--full">{saveError}</div>}
            <div className="form-grid--full">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={savingKesanTemuan}
                onClick={() => void handleSaveKesanTemuan()}
              >
                {savingKesanTemuan ? 'Menyimpan...' : '💾 Simpan & Perbarui Cetak Terbaru'}
              </button>
            </div>
          </div>
        )}
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
