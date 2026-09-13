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
import '../components/ui/ui.css';

interface FotoDashboardItem {
  readonly id: string;
  readonly nama: string;
  readonly foto: string | null;
}

export function FotoDashboardPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<FotoDashboardItem>('/api/foto-dashboard', queryParams);
  const reload = useMutationReload(reloadList);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [nama, setNama] = useState('');
  const [foto, setFoto] = useState<string | null>(null);

  function resetForm() {
    setNama('');
    setFoto(null);
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setModalMode('add');
  }

  function openEdit(item: FotoDashboardItem) {
    setEditingId(item.id);
    setNama(item.nama);
    setFoto(item.foto);
    setModalMode('edit');
  }

  function handleFotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { nama, foto };
    try {
      if (modalMode === 'add') {
        await apiPost('/api/foto-dashboard', body);
      } else if (editingId) {
        await apiPatch(`/api/foto-dashboard/${editingId}`, body);
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
      await apiDelete(`/api/foto-dashboard/${deleteTarget.id}`);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  const form = (
    <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
      <div className="form-field form-field--full">
        <label htmlFor="fd-nama">Nama</label>
        <input id="fd-nama" required value={nama} onChange={(e) => setNama(e.target.value)} />
      </div>
      <div className="form-field form-field--full">
        <label htmlFor="fd-foto">Foto</label>
        <input id="fd-foto" type="file" accept="image/*" onChange={handleFotoFileChange} />
        {foto && (
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src={foto}
              alt="Preview foto"
              style={{ width: 80, height: 80, objectFit: 'cover', border: '1px solid var(--color-border)', borderRadius: '6px', background: '#fff' }}
            />
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setFoto(null)}
              style={{ border: '1px solid var(--color-border)' }}
            >
              Hapus Foto
            </button>
          </div>
        )}
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
      <ListPageShell
        title="Foto untuk Dashboard"
        subtitle="Kelola foto yang ditampilkan pada kotak gambar di halaman Dashboard"
        action={
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            + Tambah Foto
          </button>
        }
        metrics={[
          {
            label: 'Total foto',
            value: String(pagination.total),
            tone: 'blue',
            iconKind: 'clipboard',
          },
        ]}
        searchPlaceholder="Cari nama…"
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
              <th>Foto</th>
              <th>Nama</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3}>Belum ada foto.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.foto ? (
                      <img
                        src={item.foto}
                        alt={item.nama}
                        style={{ width: 56, height: 56, objectFit: 'cover', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{item.nama}</td>
                  <td>
                    <TableRowActions
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleteTarget({ id: item.id, label: item.nama })}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <Modal open={modalMode === 'add'} title="Tambah Foto Dashboard" onClose={() => setModalMode(null)}>
        {form}
      </Modal>
      <Modal open={modalMode === 'edit'} title="Ubah Foto Dashboard" onClose={() => setModalMode(null)}>
        {form}
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus foto"
        message={`Yakin hapus "${deleteTarget?.label ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
