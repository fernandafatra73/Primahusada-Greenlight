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

interface DaftarAkunItem {
  readonly id: string;
  readonly namaAkun: string;
  readonly gmail: string | null;
  readonly password: string | null;
  readonly nomorHp: string | null;
  readonly otentikator: string | null;
  readonly passwordGmail: string | null;
}

const emptyForm = {
  namaAkun: '',
  gmail: '',
  password: '',
  nomorHp: '',
  otentikator: '',
  passwordGmail: '',
};

function maskValue(value: string | null): string {
  return value ? '••••••••' : '—';
}

interface DaftarAkunPageProps {
  readonly onClose?: () => void;
}

export function DaftarAkunPage({ onClose }: DaftarAkunPageProps) {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<DaftarAkunItem>('/api/daftar-akun', queryParams);
  const reload = useMutationReload(reloadList);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordGmail, setShowPasswordGmail] = useState(false);

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowPassword(false);
    setShowPasswordGmail(false);
    setModalMode('add');
  }

  function openEdit(item: DaftarAkunItem) {
    setEditingId(item.id);
    setForm({
      namaAkun: item.namaAkun,
      gmail: item.gmail ?? '',
      password: item.password ?? '',
      nomorHp: item.nomorHp ?? '',
      otentikator: item.otentikator ?? '',
      passwordGmail: item.passwordGmail ?? '',
    });
    setShowPassword(false);
    setShowPasswordGmail(false);
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        await apiPost('/api/daftar-akun', form);
      } else if (editingId) {
        await apiPatch(`/api/daftar-akun/${editingId}`, form);
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
      await apiDelete(`/api/daftar-akun/${deleteTarget.id}`);
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
      <ListPageShell
        title="Daftar Akun"
        subtitle="Kredensial akun sosmed/email pribadi — password disamarkan di tabel, buka Ubah untuk melihat"
        action={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--primary" onClick={openAdd}>
              + Tambah Akun
            </button>
            {onClose && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
                style={{ border: '1px solid var(--color-border)' }}
              >
                ✕ Keluar
              </button>
            )}
          </div>
        }
        metrics={[
          {
            label: 'Total akun',
            value: String(pagination.total),
            tone: 'blue',
            iconKind: 'clipboard',
          },
        ]}
        searchPlaceholder="Cari nama akun, gmail, nomor HP…"
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Akun</th>
                <th>Gmail</th>
                <th>Nomor HP</th>
                <th>Otentikator</th>
                <th>Password</th>
                <th>Password Gmail</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Belum ada data akun.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.namaAkun}</td>
                    <td>{item.gmail ?? '—'}</td>
                    <td>{item.nomorHp ?? '—'}</td>
                    <td>{item.otentikator ?? '—'}</td>
                    <td>{maskValue(item.password)}</td>
                    <td>{maskValue(item.passwordGmail)}</td>
                    <td>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleteTarget({ id: item.id, label: item.namaAkun })}
                        editLabel="Ubah akun"
                        deleteLabel="Hapus akun"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ListPageShell>

      <Modal
        open={modalMode !== null}
        title={modalMode === 'add' ? 'Tambah Akun' : 'Ubah Akun'}
        onClose={() => setModalMode(null)}
      >
        <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
          <div className="form-field form-field--full">
            <label htmlFor="da-nama-akun">Nama Akun *</label>
            <input
              id="da-nama-akun"
              required
              value={form.namaAkun}
              onChange={(e) => setForm((f) => ({ ...f, namaAkun: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="da-gmail">Gmail</label>
            <input
              id="da-gmail"
              type="email"
              value={form.gmail}
              onChange={(e) => setForm((f) => ({ ...f, gmail: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="da-nomor-hp">Nomor HP</label>
            <input
              id="da-nomor-hp"
              value={form.nomorHp}
              onChange={(e) => setForm((f) => ({ ...f, nomorHp: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="da-password">Password</label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <input
                id="da-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowPassword((s) => !s)}
                title={showPassword ? 'Sembunyikan' : 'Lihat'}
                style={{ border: '1px solid var(--color-border)' }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="da-otentikator">Otentikator</label>
            <input
              id="da-otentikator"
              placeholder="Kode/kunci otentikator (2FA)"
              value={form.otentikator}
              onChange={(e) => setForm((f) => ({ ...f, otentikator: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="da-password-gmail">Password Gmail</label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <input
                id="da-password-gmail"
                type={showPasswordGmail ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.passwordGmail}
                onChange={(e) => setForm((f) => ({ ...f, passwordGmail: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowPasswordGmail((s) => !s)}
                title={showPasswordGmail ? 'Sembunyikan' : 'Lihat'}
                style={{ border: '1px solid var(--color-border)' }}
              >
                {showPasswordGmail ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <ModalFormFooter onCancel={() => setModalMode(null)} submitLabel="Simpan" loading={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus akun"
        message={`Yakin hapus akun "${deleteTarget?.label ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
