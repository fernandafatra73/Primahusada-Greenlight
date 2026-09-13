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

interface PetugasLabItem {
  readonly id: string;
  readonly nama: string;
  readonly nip: string | null;
  readonly noTelepon: string | null;
  readonly logoTandaTangan: string | null;
  readonly createdAt: string;
}

export function PetugasLabPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<PetugasLabItem>('/api/petugas-lab', queryParams);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PetugasLabItem | null>(null);
  const [deleting, setDeleting] = useState<PetugasLabItem | null>(null);

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [logoTandaTangan, setLogoTandaTangan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setNama('');
    setNip('');
    setNoTelepon('');
    setLogoTandaTangan(null);
    setCreateOpen(true);
  }

  function openEdit(item: PetugasLabItem) {
    setEditing(item);
    setNama(item.nama);
    setNip(item.nip ?? '');
    setNoTelepon(item.noTelepon ?? '');
    setLogoTandaTangan(item.logoTandaTangan);
  }

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoTandaTangan(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/petugas-lab', {
        nama: nama.trim(),
        nip: nip.trim() || undefined,
        noTelepon: noTelepon.trim() || undefined,
        logoTandaTangan: logoTandaTangan || undefined,
      });
      setCreateOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat analis');
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
      await apiPatch(`/api/petugas-lab/${editing.id}`, {
        nama: nama.trim(),
        nip: nip.trim() || undefined,
        noTelepon: noTelepon.trim() || undefined,
        logoTandaTangan,
      });
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah analis');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/petugas-lab/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus analis');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ListPageShell
      title="Manajemen Analis Laboratorium"
      metrics={[
        {
          label: 'Total Analis',
          value: String(pagination.total),
          tone: 'blue',
          iconKind: 'users',
        },
      ]}
      searchPlaceholder="Cari nama, NIP, no. telepon..."
      searchValue={search}
      onSearchChange={setSearch}
      onRefresh={() => void reload()}
      error={error}
      loading={loading}
      pagination={pagination}
      onPageChange={setPage}
      action={
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + Tambah Analis
        </button>
      }
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Analis</th>
            <th>NIP / SIP</th>
            <th>No. Telepon</th>
            <th>Logo Tanda Tangan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                Belum ada data analis laboratorium.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id}>
                <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                <td>
                  <strong>{item.nama}</strong>
                </td>
                <td>{item.nip || '—'}</td>
                <td>{item.noTelepon || '—'}</td>
                <td>
                  {item.logoTandaTangan ? (
                    <img
                      src={item.logoTandaTangan}
                      alt={`Tanda tangan ${item.nama}`}
                      style={{ width: 80, height: 44, objectFit: 'contain', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <TableRowActions
                    onEdit={() => openEdit(item)}
                    onDelete={() => setDeleting(item)}
                    editLabel="Ubah analis"
                    deleteLabel="Hapus analis"
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {createOpen && (
        <Modal open={true} title="Tambah Analis Laboratorium" onClose={() => setCreateOpen(false)}>
          <form onSubmit={(e) => void handleCreate(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="petugas-nama">Nama Analis *</label>
              <input
                id="petugas-nama"
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: SUPATMI, Amd.A.K."
              />
            </div>

            <div className="form-field">
              <label htmlFor="petugas-nip">NIP / SIP (Opsional)</label>
              <input
                id="petugas-nip"
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 197501022009022002"
              />
            </div>

            <div className="form-field">
              <label htmlFor="petugas-telepon">No. Telepon (Opsional)</label>
              <input
                id="petugas-telepon"
                type="text"
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
              />
            </div>

            <div className="form-field">
              <label htmlFor="petugas-logo">Logo Tanda Tangan (Opsional)</label>
              <input id="petugas-logo" type="file" accept="image/*" onChange={handleLogoFileChange} />
              {logoTandaTangan && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={logoTandaTangan}
                    alt="Preview tanda tangan"
                    style={{ width: 120, height: 64, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: '6px', background: '#fff' }}
                  />
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => setLogoTandaTangan(null)}
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    Hapus Logo
                  </button>
                </div>
              )}
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
        <Modal open={true} title="Ubah Analis Laboratorium" onClose={() => setEditing(null)}>
          <form onSubmit={(e) => void handleUpdate(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="edit-petugas-nama">Nama Analis *</label>
              <input
                id="edit-petugas-nama"
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-petugas-nip">NIP / SIP</label>
              <input
                id="edit-petugas-nip"
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-petugas-telepon">No. Telepon</label>
              <input
                id="edit-petugas-telepon"
                type="text"
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-petugas-logo">Logo Tanda Tangan</label>
              <input id="edit-petugas-logo" type="file" accept="image/*" onChange={handleLogoFileChange} />
              {logoTandaTangan && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={logoTandaTangan}
                    alt="Preview tanda tangan"
                    style={{ width: 120, height: 64, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: '6px', background: '#fff' }}
                  />
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => setLogoTandaTangan(null)}
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    Hapus Logo
                  </button>
                </div>
              )}
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
          title="Hapus Analis Laboratorium"
          message={`Apakah Anda yakin ingin menghapus analis "${deleting.nama}"?`}
          confirmLabel="Hapus"
          onConfirm={() => void handleDeleteConfirm()}
          onClose={() => setDeleting(null)}
          loading={submitting}
        />
      )}
    </ListPageShell>
  );
}
