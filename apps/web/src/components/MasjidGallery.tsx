import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ConfirmModal } from './ui/ConfirmModal.tsx';
import { Modal } from './ui/Modal.tsx';
import { ModalFormFooter } from './ui/ModalFormFooter.tsx';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiPost } from '../lib/api.ts';
import './ui/ui.css';

interface GaleriMasjidItem {
  readonly id: string;
  readonly judul: string;
  readonly gambar: string;
}

const ROTATE_INTERVAL_MS = 5 * 60 * 1000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Gagal membaca file'));
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

/** Galeri foto masjid dari seluruh dunia — bergantian otomatis tiap 5 menit,
 * tampil di samping jam digital pada halaman Jam. */
export function MasjidGallery() {
  const { items, loading, error, setError, reload: reloadList } =
    usePaginatedList<GaleriMasjidItem>('/api/galeri-masjid');
  const reload = useMutationReload(reloadList);

  const [index, setIndex] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [judul, setJudul] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GaleriMasjidItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!judul.trim()) setJudul(f.name.replace(/\.[^/.]+$/, ''));
  }

  function openAdd() {
    setJudul('');
    setFile(null);
    setError(null);
    setAddOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !judul.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const gambar = await readFileAsDataUrl(file);
      await apiPost('/api/galeri-masjid', { judul: judul.trim(), gambar });
      setAddOpen(false);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await apiDelete(`/api/galeri-masjid/${deleteTarget.id}`);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus foto');
    } finally {
      setDeleteLoading(false);
    }
  }

  const current = items[index] ?? null;

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: '10px',
        overflow: 'hidden',
        color: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: '#1e293b',
        }}
      >
        <strong>🕌 Galeri Masjid Dunia</strong>
        <button type="button" className="btn btn--sm btn--secondary" onClick={openAdd}>
          + Tambah Foto
        </button>
      </div>

      {error && (
        <div className="alert alert--error" style={{ margin: '0.75rem 1rem 0' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#cbd5e1' }}>Memuat…</p>
      ) : !current ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#cbd5e1' }}>
          Belum ada foto masjid. Klik "+ Tambah Foto" untuk mulai mengisi galeri — akan bergantian
          otomatis tiap 5 menit.
        </p>
      ) : (
        <div>
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
            <img
              src={current.gambar}
              alt={current.judul}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
            }}
          >
            <span style={{ fontWeight: 700 }}>{current.judul}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {index + 1}/{items.length}
              </span>
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
                disabled={items.length < 2}
                title="Foto sebelumnya"
              >
                ⬅️
              </button>
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                onClick={() => setIndex((i) => (i + 1) % items.length)}
                disabled={items.length < 2}
                title="Foto berikutnya"
              >
                ➡️
              </button>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => setDeleteTarget(current)}
                title="Hapus foto ini"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={addOpen} title="Tambah Foto Masjid" onClose={() => setAddOpen(false)}>
        <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
          <div className="form-field form-grid--full">
            <label htmlFor="gm-file">Foto *</label>
            <input id="gm-file" type="file" accept="image/*" required onChange={handleFileChange} />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="gm-judul">Judul *</label>
            <input
              id="gm-judul"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Masjidil Haram, Mekah"
            />
          </div>
          <ModalFormFooter
            onCancel={() => setAddOpen(false)}
            submitLabel="Simpan"
            loading={saving}
          />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus foto masjid"
        message={`Yakin hapus foto "${deleteTarget?.judul ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
