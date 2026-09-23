import { useState, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiPatch, apiPost } from '../lib/api.ts';
import { resolveSiaranTvPlayable } from '../lib/siaranTv.ts';
import '../components/ui/ui.css';

type SiaranTvKategori = 'NASIONAL' | 'LUAR_NEGERI';

interface SiaranTv {
  readonly id: string;
  readonly nama: string;
  readonly kategori: SiaranTvKategori;
  readonly url: string;
}

const KATEGORI_LABEL: Record<SiaranTvKategori, string> = {
  NASIONAL: 'Nasional',
  LUAR_NEGERI: 'Luar Negeri',
};

export function SiaranTvPage() {
  const { search, setSearch } = useListSearch();
  const [kategoriTab, setKategoriTab] = useState('all');
  const queryParams = useListQueryParams(
    { kategori: kategoriTab !== 'all' ? kategoriTab : '' },
    search,
  );
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<SiaranTv>('/api/siaran-tv', queryParams);
  const reload = useMutationReload(reloadList);

  const [nowPlaying, setNowPlaying] = useState<SiaranTv | null>(null);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<SiaranTvKategori>('NASIONAL');
  const [url, setUrl] = useState('');

  function resetForm() {
    setNama('');
    setKategori('NASIONAL');
    setUrl('');
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setModalMode('add');
  }

  function openEdit(item: SiaranTv) {
    setEditingId(item.id);
    setNama(item.nama);
    setKategori(item.kategori);
    setUrl(item.url);
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { nama, kategori, url };
    try {
      if (modalMode === 'add') {
        await apiPost('/api/siaran-tv', body);
      } else if (editingId) {
        await apiPatch(`/api/siaran-tv/${editingId}`, body);
      }
      setModalMode(null);
      resetForm();
      await reload({ resetPage: modalMode === 'add' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await apiDelete(`/api/siaran-tv/${deleteTarget.id}`);
      if (nowPlaying?.id === deleteTarget.id) setNowPlaying(null);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  const playable = nowPlaying ? resolveSiaranTvPlayable(nowPlaying.url) : null;

  const form = (
    <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
      <div className="form-field">
        <label htmlFor="tv-nama">Nama Siaran</label>
        <input id="tv-nama" required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: TVRI Nasional" />
      </div>
      <div className="form-field">
        <label htmlFor="tv-kategori">Kategori</label>
        <select
          id="tv-kategori"
          required
          value={kategori}
          onChange={(e) => setKategori(e.target.value as SiaranTvKategori)}
        >
          <option value="NASIONAL">Nasional</option>
          <option value="LUAR_NEGERI">Luar Negeri</option>
        </select>
      </div>
      <div className="form-field form-grid--full">
        <label htmlFor="tv-url">Alamat Streaming / Embed *</label>
        <input
          id="tv-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link YouTube live, atau alamat embed/stream (.m3u8, dsb.)"
        />
        <p className="form-hint">
          Bisa link YouTube (watch/live/youtu.be), alamat stream langsung (.m3u8, .mp4), atau alamat halaman embed lain.
        </p>
      </div>
      <ModalFormFooter
        onCancel={() => setModalMode(null)}
        submitLabel="Simpan"
        loading={saving}
      />
    </form>
  );

  return (
    <>
      <div
        style={{
          background: '#0f172a',
          borderRadius: '10px',
          padding: nowPlaying ? '0' : '2rem',
          marginBottom: '1.25rem',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        {nowPlaying && playable ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: '#1e293b',
              }}
            >
              <div style={{ fontWeight: 700 }}>
                📺 {nowPlaying.nama}{' '}
                <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#94a3b8' }}>
                  ({KATEGORI_LABEL[nowPlaying.kategori]})
                </span>
              </div>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => setNowPlaying(null)}
              >
                ⏹️ Berhenti
              </button>
            </div>
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
              {playable.kind === 'video' ? (
                <video
                  key={playable.src}
                  src={playable.src}
                  controls
                  autoPlay
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
              ) : (
                <iframe
                  key={playable.src}
                  src={playable.src}
                  title={nowPlaying.nama}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, textAlign: 'center', color: '#cbd5e1' }}>
            📺 Pilih saluran TV di daftar bawah untuk mulai menonton dari komputer.
          </p>
        )}
      </div>

      <ListPageShell
        title="Siaran TV"
        subtitle="Kelola daftar siaran TV nasional & luar negeri yang bisa ditonton dari komputer"
        action={
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            + Tambah Siaran
          </button>
        }
        metrics={[
          {
            label: 'Total siaran',
            value: String(pagination.total),
            tone: 'blue',
            iconKind: 'clipboard',
          },
        ]}
        tabs={[
          { id: 'all', label: 'Semua' },
          { id: 'NASIONAL', label: 'Nasional' },
          { id: 'LUAR_NEGERI', label: 'Luar Negeri' },
        ]}
        activeTab={kategoriTab}
        onTabChange={setKategoriTab}
        searchPlaceholder="Cari nama siaran…"
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama Siaran</th>
              <th>Kategori</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3}>Belum ada siaran TV. Klik "+ Tambah Siaran" untuk menambahkan.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} style={nowPlaying?.id === item.id ? { background: '#f0f9ff' } : undefined}>
                  <td>{item.nama}</td>
                  <td>{KATEGORI_LABEL[item.kategori]}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn--sm btn--secondary"
                        onClick={() => setNowPlaying(item)}
                      >
                        ▶️ Tonton
                      </button>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleteTarget({ id: item.id, label: item.nama })}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <Modal open={modalMode === 'add'} title="Tambah Siaran TV" onClose={() => setModalMode(null)}>
        {form}
      </Modal>
      <Modal open={modalMode === 'edit'} title="Ubah Siaran TV" onClose={() => setModalMode(null)}>
        {form}
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus siaran TV"
        message={`Yakin hapus "${deleteTarget?.label ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
