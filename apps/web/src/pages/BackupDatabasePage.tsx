import { useRef, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import '../components/ui/ui.css';

export function BackupDatabasePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccessMessage(null);
    setPendingFile(file);
    setConfirmOpen(true);
  }

  async function handleConfirmImport() {
    if (!pendingFile) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pendingFile,
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Import gagal (${res.status})`);
      }
      setSuccessMessage(data.message ?? 'Import berhasil.');
      setConfirmOpen(false);
      setPendingFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengimpor database');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function cancelImport() {
    setConfirmOpen(false);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <>
      <div className="page-heading">
        <h2 className="page-heading__title">Backup &amp; Restore Database</h2>
        <p className="page-heading__subtitle">
          Export database SQLite untuk dipindahkan ke komputer lain, atau import file database dari komputer lain.
        </p>
      </div>

      {successMessage && <p className="alert alert--success">{successMessage}</p>}
      {error && <p className="alert alert--error">{error}</p>}

      <section className="chart-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="chart-card__title">⬇️ Export Database</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Unduh seluruh database (semua data pasien, transaksi, dan pengaturan) sebagai satu file{' '}
          <code>.db</code>. Pindahkan file ini ke komputer tujuan lalu gunakan tombol Import di bawah untuk
          memuatnya.
        </p>
        <a href="/api/backup/export" download className="btn btn--primary" style={{ textDecoration: 'none' }}>
          ⬇️ Export Database Sekarang
        </a>
      </section>

      <section className="chart-card">
        <h3 className="chart-card__title">⬆️ Import Database</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          Muat file database (<code>.db</code>) hasil export dari komputer lain. Database yang sedang berjalan
          akan dicadangkan otomatis sebelum ditimpa.
        </p>
        <p
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#92400e',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          ⚠️ Import akan <strong>mengganti seluruh data</strong> yang sedang berjalan di komputer ini dengan isi
          file yang diunggah. Setelah import berhasil, tutup dan buka kembali aplikasi agar database baru dimuat.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".db"
          onChange={handleFileChange}
          disabled={importing}
        />
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Import Database"
        message={`Yakin timpa database saat ini dengan file "${pendingFile?.name ?? ''}"? Data yang sedang berjalan akan dicadangkan otomatis, tapi aplikasi perlu di-restart setelah ini.`}
        confirmLabel={importing ? 'Mengimpor…' : 'Ya, Import'}
        loading={importing}
        onClose={cancelImport}
        onConfirm={() => void handleConfirmImport()}
      />
    </>
  );
}
