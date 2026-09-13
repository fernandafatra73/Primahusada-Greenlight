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
import type { AppViewId } from '../config/navigation.ts';
import '../components/ui/ui.css';

interface AiRadiologiGrup {
  readonly id: string;
  readonly nama: string;
}

interface AiRadiologiGrupPageProps {
  readonly onNavigate?: (view: AppViewId) => void;
}

const DATA_MASTER_MENUBAR_ITEMS: ReadonlyArray<{ readonly id: AppViewId; readonly label: string }> = [
  { id: 'file', label: 'File' },
  { id: 'pendaftaran-umum', label: 'Daftar' },
  { id: 'pasien', label: 'Radiologi' },
  { id: 'lab', label: 'Laboratorium' },
  { id: 'keuangan-pembukuan', label: 'Keuangan' },
];

export function AiRadiologiGrupPage({ onNavigate }: AiRadiologiGrupPageProps) {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<AiRadiologiGrup>('/api/ai-radiologi-grup', queryParams);
  const reload = useMutationReload(reloadList);
  const [nama, setNama] = useState('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function openAdd() {
    setNama('');
    setEditingId(null);
    setModalMode('add');
  }

  function openEdit(g: AiRadiologiGrup) {
    setEditingId(g.id);
    setNama(g.nama);
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { nama };
    try {
      if (modalMode === 'add') {
        await apiPost('/api/ai-radiologi-grup', body);
      } else if (editingId) {
        await apiPatch(`/api/ai-radiologi-grup/${editingId}`, body);
      }
      setModalMode(null);
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
      await apiDelete(`/api/ai-radiologi-grup/${deleteTarget.id}`);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      {onNavigate && (
        <div className="vb6-menubar" role="menubar" aria-label="Data Master">
          {DATA_MASTER_MENUBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="vb6-menubar-item"
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <ListPageShell
        title="Data Master AI Radiologi"
        subtitle="Kelola grup data master untuk fitur AI Radiologi"
        action={
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            + Tambah Grup
          </button>
        }
        metrics={[
          {
            label: 'Total grup',
            value: String(pagination.total),
            tone: 'blue',
            iconKind: 'stethoscope',
          },
        ]}
        searchPlaceholder="Cari nama grup…"
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
              <th>Nama Grup</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={2}>Belum ada grup.</td>
              </tr>
            ) : (
              items.map((g) => (
                <tr key={g.id}>
                  <td>{g.nama}</td>
                  <td>
                    <TableRowActions
                      onEdit={() => openEdit(g)}
                      onDelete={() => setDeleteTarget({ id: g.id, label: g.nama })}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <Modal
        open={modalMode !== null}
        title={modalMode === 'add' ? 'Tambah Grup' : 'Ubah Grup'}
        onClose={() => setModalMode(null)}
      >
        <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
          <div className="form-field">
            <label htmlFor="grn">Nama Grup</label>
            <input id="grn" required value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <ModalFormFooter
            onCancel={() => setModalMode(null)}
            submitLabel="Simpan"
            loading={saving}
          />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus grup"
        message={`Yakin hapus "${deleteTarget?.label ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
