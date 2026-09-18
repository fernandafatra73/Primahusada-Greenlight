import { useEffect, useState, type FormEvent } from 'react';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import { apiGet, apiPost } from '../lib/api.ts';
import './login.css';
import './activation.css';

interface ActivationStatus {
  readonly activated: boolean;
  readonly activatedAt: string | null;
  readonly expiresAt: string | null;
  readonly requestCode: string;
  readonly ownerWaNumber: string;
  readonly ownerWaLink: string;
}

interface ActivationPageProps {
  readonly onActivated: () => void;
}

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ActivationPage({ onActivated }: ActivationPageProps) {
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadStatus(): Promise<void> {
    setLoadError(null);
    try {
      const result = await apiGet<ActivationStatus>('/api/activation/status');
      setStatus(result);
      if (result.activated) onActivated();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat status aktivasi');
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleCopy(): Promise<void> {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.requestCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API bisa gagal (izin browser dsb) — kode tetap bisa disalin manual.
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await apiPost<ActivationStatus>('/api/activation/activate', { code });
      setStatus(result);
      if (result.activated) onActivated();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Aktivasi gagal');
    } finally {
      setSubmitting(false);
    }
  }

  const expired = Boolean(status && status.activatedAt && !status.activated);

  return (
    <main className="login-page">
      <section className="login-panel activation-panel" aria-labelledby="activation-title">
        <div className="login-panel__brand">
          <img src={logoPrimahusada} alt="Klinik Prima Husada" className="login-panel__logo" />
          <p className="login-panel__eyebrow">Klinik Prima Husada</p>
        </div>

        <div className="login-panel__divider" aria-hidden />

        <h1 id="activation-title" className="login-panel__title">
          Aktivasi Aplikasi
        </h1>

        {loadError ? (
          <div className="activation-block">
            <p className="login-form__error">{loadError}</p>
            <button type="button" className="btn btn--ghost" onClick={() => void loadStatus()}>
              Coba lagi
            </button>
          </div>
        ) : !status ? (
          <p className="activation-hint">Memuat status aktivasi...</p>
        ) : (
          <>
            <p className="activation-hint">
              {expired
                ? `Masa aktivasi sudah habis${status.expiresAt ? ` sejak ${formatTanggal(status.expiresAt)}` : ''}. Aktivasi ulang untuk melanjutkan.`
                : 'Aplikasi ini perlu diaktivasi sebelum bisa dipakai.'}
            </p>

            <ol className="activation-steps">
              <li>
                Kirim kode permintaan di bawah ini ke WhatsApp <strong>{status.ownerWaNumber}</strong> (pemilik
                aplikasi).
              </li>
              <li>Pemilik akan membalas dengan kode aktivasi lewat WhatsApp.</li>
              <li>Ketik kode aktivasi tersebut di kolom di bawah, lalu tekan Aktifkan.</li>
            </ol>

            <div className="activation-code-box">
              <code>{status.requestCode}</code>
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => void handleCopy()}>
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>

            <a
              href={status.ownerWaLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn--primary activation-wa-btn"
            >
              Kirim ke WhatsApp
            </a>

            <form className="login-form activation-form" onSubmit={(event) => void handleSubmit(event)}>
              <div className="form-field">
                <label htmlFor="activation-code">Kode Aktivasi</label>
                <input
                  id="activation-code"
                  type="text"
                  autoComplete="off"
                  required
                  placeholder="mis. A1B2C-D3E4F"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>

              {submitError ? <p className="login-form__error">{submitError}</p> : null}

              <button type="submit" className="btn btn--primary login-form__submit" disabled={submitting}>
                {submitting ? 'Memeriksa...' : 'Aktifkan'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
