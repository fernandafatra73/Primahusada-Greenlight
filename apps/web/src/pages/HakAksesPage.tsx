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
import type { Departemen, StaffRole } from '../config/navigation.ts';
import '../components/ui/ui.css';

interface Staff {
  readonly id: string;
  readonly nama: string;
  readonly email: string;
  readonly role: StaffRole;
  readonly departemen: Departemen | null;
}

const DEPARTEMEN_LABEL: Record<Departemen, string> = {
  PENDAFTARAN: 'Pendaftaran',
  RADIOLOGI: 'Radiologi',
  LABORATORIUM: 'Laboratorium',
  KEUANGAN: 'Keuangan',
  FARMASI: 'Farmasi',
};

function printAccessList(items: readonly Staff[]): void {
  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) return;
  const rows = items
    .map(
      (s) => `
        <tr>
          <td>${s.nama}</td>
          <td>${s.email}</td>
          <td>${s.role}</td>
          <td>${s.role === 'KARYAWAN' ? (s.departemen ? DEPARTEMEN_LABEL[s.departemen] : 'Tidak dibatasi') : 'Semua modul'}</td>
        </tr>`,
    )
    .join('');
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Hak Akses Staff</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p { font-size: 12px; color: #555; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h1>Klinik Prima Husada — Hak Akses Staff</h1>
        <p>Dicetak ${new Date().toLocaleString('id-ID')}</p>
        <table>
          <thead>
            <tr><th>Nama</th><th>Email</th><th>Role</th><th>Departemen (Hak Akses)</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export function HakAksesPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<Staff>('/api/staff', queryParams);
  const reload = useMutationReload(reloadList);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('KARYAWAN');
  const [departemen, setDepartemen] = useState<Departemen | ''>('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function openAdd() {
    setNama('');
    setEmail('');
    setPassword('');
    setRole('KARYAWAN');
    setDepartemen('');
    setEditingId(null);
    setModalMode('add');
  }

  function openEdit(s: Staff) {
    setEditingId(s.id);
    setNama(s.nama);
    setEmail(s.email);
    setPassword('');
    setRole(s.role);
    setDepartemen(s.departemen ?? '');
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body =
      modalMode === 'add' || password.trim()
        ? { nama, email, password, role, departemen: role === 'KARYAWAN' ? departemen || null : null }
        : { nama, email, role, departemen: role === 'KARYAWAN' ? departemen || null : null };
    try {
      if (modalMode === 'add') {
        await apiPost('/api/staff', body);
      } else if (editingId) {
        await apiPatch(`/api/staff/${editingId}`, body);
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
      await apiDelete(`/api/staff/${deleteTarget.id}`);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleDepartemenChange(staff: Staff, value: string) {
    setSavingId(staff.id);
    setError(null);
    try {
      await apiPatch(`/api/staff/${staff.id}`, { departemen: value || null });
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <ListPageShell
        title="Hak Akses"
        subtitle="Kunci akses staff KARYAWAN ke satu departemen saja. ADMIN dan CEO selalu bisa membuka semua modul."
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => printAccessList(items)}
              disabled={items.length === 0}
            >
              🖨️ Cetak
            </button>
            <button type="button" className="btn btn--primary" onClick={openAdd}>
              + Tambah Staff
            </button>
          </div>
        }
        searchPlaceholder="Cari nama atau email…"
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
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Departemen (Hak Akses)</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5}>Belum ada staff.</td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s.id}>
                  <td>{s.nama}</td>
                  <td>{s.email}</td>
                  <td>
                    <span className={`badge ${s.role === 'KARYAWAN' ? 'badge--muted' : 'badge--ok'}`}>{s.role}</span>
                  </td>
                  <td>
                    {s.role === 'KARYAWAN' ? (
                      <select
                        value={s.departemen ?? ''}
                        disabled={savingId === s.id}
                        onChange={(e) => void handleDepartemenChange(s, e.target.value)}
                      >
                        <option value="">— Tidak dibatasi —</option>
                        {Object.entries(DEPARTEMEN_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Semua modul</span>
                    )}
                  </td>
                  <td>
                    <TableRowActions onEdit={() => openEdit(s)} onDelete={() => setDeleteTarget({ id: s.id, label: s.nama })} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <Modal
        open={modalMode !== null}
        title={modalMode === 'add' ? 'Tambah Staff' : 'Ubah Data Staff'}
        onClose={() => setModalMode(null)}
      >
        <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
          <div className="form-field">
            <label htmlFor="ha-nama">Nama</label>
            <input id="ha-nama" required value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="ha-email">Email</label>
            <input id="ha-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="ha-password">Password</label>
            <input
              id="ha-password"
              type="password"
              required={modalMode === 'add'}
              minLength={6}
              autoComplete="new-password"
              placeholder={modalMode === 'edit' ? 'Kosongkan jika tidak diganti' : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="ha-role">Role</label>
            <select
              id="ha-role"
              value={role}
              onChange={(e) => {
                const next = e.target.value as StaffRole;
                setRole(next);
                if (next !== 'KARYAWAN') setDepartemen('');
              }}
            >
              <option value="ADMIN">Admin</option>
              <option value="KARYAWAN">Karyawan</option>
              <option value="CEO">CEO</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="ha-departemen">Departemen (Hak Akses)</label>
            <select
              id="ha-departemen"
              value={departemen}
              disabled={role !== 'KARYAWAN'}
              onChange={(e) => setDepartemen(e.target.value as Departemen | '')}
            >
              <option value="">— Tidak dibatasi —</option>
              {Object.entries(DEPARTEMEN_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <ModalFormFooter onCancel={() => setModalMode(null)} submitLabel="Simpan" loading={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus staff"
        message={`Yakin hapus "${deleteTarget?.label ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
