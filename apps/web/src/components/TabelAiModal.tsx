import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from './ui/ConfirmModal.tsx';
import { Modal } from './ui/Modal.tsx';
import { apiDelete, apiGet } from '../lib/api.ts';
import './ui/ui.css';

interface TabelAiItem {
  readonly id: string;
  readonly namaPenyakit: string | null;
  readonly foto: string;
  readonly hasilAnalisa: string;
  readonly asal: string | null;
  readonly namaPasien: string | null;
  readonly createdAt: string;
}

/** Arsip hasil pembacaan AI yang disimpan dari modal AI Foto dan AI Banding 2. */
export function TabelAiModal({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const [items, setItems] = useState<readonly TabelAiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cari, setCari] = useState('');
  const [hapus, setHapus] = useState<TabelAiItem | null>(null);
  const [hapusLoading, setHapusLoading] = useState(false);
  const [disalinId, setDisalinId] = useState<string | null>(null);
  const [fotoBesar, setFotoBesar] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ items: TabelAiItem[] }>(
        `/api/tabel-ai?limit=100${cari.trim() ? `&q=${encodeURIComponent(cari.trim())}` : ''}`,
      );
      setItems(res.items);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat Tabel AI');
    } finally {
      setLoading(false);
    }
  }, [cari]);

  useEffect(() => {
    if (open) void muat();
  }, [open, muat]);

  async function salin(item: TabelAiItem) {
    const teks = item.namaPenyakit
      ? `${item.namaPenyakit}\n\n${item.hasilAnalisa}`
      : item.hasilAnalisa;
    try {
      await navigator.clipboard.writeText(teks);
      setDisalinId(item.id);
      setTimeout(() => setDisalinId(null), 2000);
    } catch {
      setError('Tidak bisa menyalin otomatis — silakan salin manual.');
    }
  }

  async function konfirmasiHapus() {
    if (!hapus) return;
    setHapusLoading(true);
    try {
      await apiDelete(`/api/tabel-ai/${hapus.id}`);
      setHapus(null);
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setHapusLoading(false);
    }
  }

  return (
    <>
      <Modal open={open} title="🗂️ Tabel AI — Arsip Hasil Analisa" onClose={onClose} size="xl">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama penyakit, hasil analisa, atau pasien…"
            aria-label="Cari di Tabel AI"
            style={{ flex: '1 1 18rem', padding: '0.35rem 0.6rem' }}
          />
          <button type="button" className="btn btn--sm btn--secondary" onClick={() => void muat()}>
            🔄 Muat Ulang
          </button>
        </div>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: '0.6rem' }}>
            {error}
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '13rem' }}>Nama Penyakit</th>
              <th style={{ width: '6rem' }}>Foto</th>
              <th>Hasil Analisa</th>
              <th style={{ width: '8rem' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Memuat…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Belum ada hasil tersimpan. Simpan dari modal AI Foto atau AI Banding 2.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.namaPenyakit || '—'}</strong>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {item.asal || 'AI'}
                      {item.namaPasien ? ` · ${item.namaPasien}` : ''}
                      <br />
                      {new Date(item.createdAt).toLocaleString('id-ID')}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setFotoBesar(item.foto)}
                      title="Klik untuk perbesar"
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'zoom-in' }}
                    >
                      <img
                        src={item.foto}
                        alt={`Foto ${item.namaPenyakit ?? 'hasil AI'}`}
                        style={{
                          width: '64px',
                          height: '64px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          display: 'block',
                        }}
                      />
                    </button>
                  </td>
                  <td>
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        maxHeight: '8rem',
                        overflowY: 'auto',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {item.hasilAnalisa}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn--sm btn--secondary"
                        onClick={() => void salin(item)}
                      >
                        {disalinId === item.id ? '✅' : '📋 Salin'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--danger"
                        onClick={() => setHapus(item)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Modal>

      {fotoBesar && (
        <Modal open={true} title="Foto" onClose={() => setFotoBesar(null)} size="lg">
          <img src={fotoBesar} alt="Foto hasil AI" style={{ width: '100%', display: 'block' }} />
        </Modal>
      )}

      <ConfirmModal
        open={hapus !== null}
        title="Hapus dari Tabel AI"
        message={`Hapus hasil "${hapus?.namaPenyakit ?? 'tanpa nama penyakit'}" dari arsip?`}
        onClose={() => setHapus(null)}
        onConfirm={() => void konfirmasiHapus()}
        loading={hapusLoading}
      />
    </>
  );
}
