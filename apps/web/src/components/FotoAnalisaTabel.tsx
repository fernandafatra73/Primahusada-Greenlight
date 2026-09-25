import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from './ui/ConfirmModal.tsx';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import './ui/ui.css';

interface FotoAnalisaItem {
  readonly id: string;
  readonly foto: string;
  readonly analisa: string;
  readonly createdAt: string;
}

interface FotoAnalisaTabelProps {
  readonly pasienId: string;
  readonly namaPasien: string;
  /** Foto dan analisa yang sedang terbuka di modal, untuk tombol Simpan. */
  readonly fotoSaatIni: string;
  readonly analisaSaatIni: string;
}

/** Arsip foto & analisa milik satu pasien, tampil di dalam modal Edit³.
 *
 * Analisa bisa disunting langsung di tabel karena hasil AI masih draft dan
 * sering perlu dirapikan radiolog sebelum benar-benar dipakai. */
export function FotoAnalisaTabel({
  pasienId,
  namaPasien,
  fotoSaatIni,
  analisaSaatIni,
}: FotoAnalisaTabelProps) {
  const [items, setItems] = useState<readonly FotoAnalisaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTeks, setEditTeks] = useState('');
  const [hapus, setHapus] = useState<FotoAnalisaItem | null>(null);
  const [hapusLoading, setHapusLoading] = useState(false);
  const [fotoBesar, setFotoBesar] = useState<string | null>(null);

  const muat = useCallback(async () => {
    if (!pasienId) return;
    setLoading(true);
    try {
      const res = await apiGet<{ items: FotoAnalisaItem[] }>(
        `/api/foto-pasien-analisa?pasienId=${encodeURIComponent(pasienId)}`,
      );
      setItems(res.items);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat arsip');
    } finally {
      setLoading(false);
    }
  }, [pasienId]);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function simpanBaru() {
    if (!fotoSaatIni) {
      setError('Belum ada foto untuk disimpan.');
      return;
    }
    if (!analisaSaatIni.trim()) {
      setError('Analisa masih kosong — jalankan analisa AI dulu.');
      return;
    }
    setSibuk(true);
    try {
      await apiPost('/api/foto-pasien-analisa', {
        pasienId,
        namaPasien,
        foto: fotoSaatIni,
        analisa: analisaSaatIni,
      });
      setError(null);
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSibuk(false);
    }
  }

  async function simpanSuntingan(id: string) {
    setSibuk(true);
    try {
      await apiPatch(`/api/foto-pasien-analisa/${id}`, { analisa: editTeks });
      setEditId(null);
      setError(null);
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
    } finally {
      setSibuk(false);
    }
  }

  async function konfirmasiHapus() {
    if (!hapus) return;
    setHapusLoading(true);
    try {
      await apiDelete(`/api/foto-pasien-analisa/${hapus.id}`);
      setHapus(null);
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setHapusLoading(false);
    }
  }

  return (
    <div className="form-grid--full" style={{ marginTop: '0.75rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.45rem',
        }}
      >
        <strong style={{ fontSize: '0.92rem' }}>Arsip Foto &amp; Analisa Pasien Ini</strong>
        <button
          type="button"
          className="btn btn--sm btn--primary"
          onClick={() => void simpanBaru()}
          disabled={sibuk || !fotoSaatIni || !analisaSaatIni.trim()}
        >
          💾 Simpan Foto &amp; Analisa
        </button>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '6rem' }}>Foto</th>
            <th>Analisa Foto</th>
            <th style={{ width: '9rem' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: '1.2rem' }}>
                Memuat…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: '1.2rem' }}>
                Belum ada yang tersimpan untuk pasien ini.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>
                  <button
                    type="button"
                    onClick={() => setFotoBesar(item.foto)}
                    title="Klik untuk perbesar"
                    style={{ border: 'none', background: 'none', padding: 0, cursor: 'zoom-in' }}
                  >
                    <img
                      src={item.foto}
                      alt="Foto pasien"
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
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {new Date(item.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </td>
                <td>
                  {editId === item.id ? (
                    <textarea
                      value={editTeks}
                      onChange={(e) => setEditTeks(e.target.value)}
                      rows={6}
                      style={{ width: '100%' }}
                      aria-label="Ubah analisa"
                    />
                  ) : (
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        maxHeight: '7rem',
                        overflowY: 'auto',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {item.analisa}
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {editId === item.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--sm btn--primary"
                          onClick={() => void simpanSuntingan(item.id)}
                          disabled={sibuk || !editTeks.trim()}
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => setEditId(null)}
                          style={{ border: '1px solid var(--color-border)' }}
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn--sm btn--secondary"
                          onClick={() => {
                            setEditId(item.id);
                            setEditTeks(item.analisa);
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--danger"
                          onClick={() => setHapus(item)}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {fotoBesar && (
        <div
          role="dialog"
          aria-label="Foto diperbesar"
          onClick={() => setFotoBesar(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            cursor: 'zoom-out',
          }}
        >
          <img src={fotoBesar} alt="Foto pasien diperbesar" style={{ maxWidth: '90vw', maxHeight: '90vh' }} />
        </div>
      )}

      <ConfirmModal
        open={hapus !== null}
        title="Hapus dari arsip"
        message="Hapus foto dan analisa ini dari arsip pasien?"
        onClose={() => setHapus(null)}
        onConfirm={() => void konfirmasiHapus()}
        loading={hapusLoading}
      />
    </div>
  );
}
