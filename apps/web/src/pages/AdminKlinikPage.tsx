import { useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiPatch, apiPost } from '../lib/api.ts';
import '../components/ui/ui.css';

interface AdminKlinikItem {
  readonly id: string;
  readonly nama: string;
  readonly noHp: string | null;
  readonly statusHadir: string | null;
  readonly statusTanggal: string | null;
  readonly createdAt: string;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]!;
}

/** Daftar staff Admin Klinik gabungan — sebelumnya terpisah jadi Petugas
 * Kasir, Petugas Admin Klinik, dan Admin Pendaftaran. */
export function AdminKlinikPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<AdminKlinikItem>('/api/admin-klinik', queryParams);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminKlinikItem | null>(null);
  const [deleting, setDeleting] = useState<AdminKlinikItem | null>(null);

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  function openCreate() {
    setNama('');
    setNoHp('');
    setCreateOpen(true);
  }

  function openEdit(item: AdminKlinikItem) {
    setEditing(item);
    setNama(item.nama);
    setNoHp(item.noHp ?? '');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/admin-klinik', {
        nama: nama.trim(),
        noHp: noHp.trim() || undefined,
      });
      setCreateOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat admin klinik');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !nama.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPatch(`/api/admin-klinik/${editing.id}`, {
        nama: nama.trim(),
        noHp: noHp.trim() || undefined,
      });
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah admin klinik');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/admin-klinik/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus admin klinik');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTandaiStatus(item: AdminKlinikItem, status: 'HADIR' | 'ABSEN') {
    setStatusUpdatingId(item.id);
    setError(null);
    try {
      await apiPatch(`/api/admin-klinik/${item.id}`, {
        statusHadir: status,
        statusTanggal: todayStr(),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menandai kehadiran');
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <ListPageShell
      title="Admin Klinik"
      subtitle="Daftar staff admin klinik (gabungan Kasir, Petugas Admin Klinik, Admin Pendaftaran) & presensi hari ini"
      metrics={[
        {
          label: 'Total Admin Klinik',
          value: String(pagination.total),
          tone: 'blue',
          iconKind: 'users',
        },
      ]}
      searchPlaceholder="Cari nama, no. HP..."
      searchValue={search}
      onSearchChange={setSearch}
      onRefresh={() => void reload()}
      error={error}
      loading={loading}
      pagination={pagination}
      onPageChange={setPage}
      action={
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + Tambah Admin Klinik
        </button>
      }
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama</th>
            <th>No. HP</th>
            <th>Status Hari Ini</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                Belum ada data admin klinik.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const statusToday = item.statusTanggal === todayStr() ? item.statusHadir : null;
              return (
                <tr key={item.id}>
                  <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                  <td>
                    <strong>{item.nama}</strong>
                  </td>
                  <td>{item.noHp || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {statusToday === 'HADIR' && (
                        <span className="badge badge--ok">Hadir</span>
                      )}
                      {statusToday === 'ABSEN' && (
                        <span className="badge badge--pending">Absen</span>
                      )}
                      {!statusToday && (
                        <span className="badge badge--muted">Belum ditandai</span>
                      )}
                      <button
                        type="button"
                        className="btn btn--xs btn--secondary"
                        disabled={statusUpdatingId === item.id}
                        onClick={() => void handleTandaiStatus(item, 'HADIR')}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        ✅ Hadir
                      </button>
                      <button
                        type="button"
                        className="btn btn--xs btn--ghost"
                        disabled={statusUpdatingId === item.id}
                        onClick={() => void handleTandaiStatus(item, 'ABSEN')}
                        style={{ whiteSpace: 'nowrap', border: '1px solid var(--color-border)', color: '#ef4444' }}
                      >
                        ❌ Absen
                      </button>
                    </div>
                  </td>
                  <td>
                    <TableRowActions
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleting(item)}
                      editLabel="Ubah admin klinik"
                      deleteLabel="Hapus admin klinik"
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {createOpen && (
        <Modal open={true} title="Tambah Admin Klinik" onClose={() => setCreateOpen(false)}>
          <form onSubmit={(e) => void handleCreate(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="ak-nama">Nama *</label>
              <input
                id="ak-nama"
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Siti Aminah"
              />
            </div>

            <div className="form-field">
              <label htmlFor="ak-nohp">No. HP (Opsional)</label>
              <input
                id="ak-nohp"
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
              />
            </div>

            <ModalFormFooter
              onCancel={() => setCreateOpen(false)}
              submitLabel="Simpan"
              loading={submitting}
            />
          </form>
        </Modal>
      )}

      {editing && (
        <Modal open={true} title="Ubah Admin Klinik" onClose={() => setEditing(null)}>
          <form onSubmit={(e) => void handleUpdate(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="edit-ak-nama">Nama *</label>
              <input
                id="edit-ak-nama"
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-ak-nohp">No. HP</label>
              <input
                id="edit-ak-nohp"
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
              />
            </div>

            <ModalFormFooter
              onCancel={() => setEditing(null)}
              submitLabel="Simpan Perubahan"
              loading={submitting}
            />
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          open={true}
          title="Hapus Admin Klinik"
          message={`Apakah Anda yakin ingin menghapus admin klinik "${deleting.nama}"?`}
          confirmLabel="Hapus"
          onConfirm={() => void handleDeleteConfirm()}
          onClose={() => setDeleting(null)}
          loading={submitting}
        />
      )}
    </ListPageShell>
  );
}
