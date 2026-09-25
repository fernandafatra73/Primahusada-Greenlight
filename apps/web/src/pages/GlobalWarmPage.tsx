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

interface BankLink {
  readonly label: string;
  readonly url: string;
}

const BANK_LINKS: readonly BankLink[] = [
  { label: 'BCA', url: 'https://www.klikbca.com/' },
  { label: 'Mandiri', url: 'https://www.bankmandiri.co.id/layanan-echannel-ebanking' },
  { label: 'BRI', url: 'https://bri.co.id/en/web/bri-web-event/login' },
];

interface RekeningBankItem {
  readonly id: string;
  readonly nama: string;
  readonly bank: string;
  readonly noRekening: string;
}

const emptyForm = { nama: '', bank: '', noRekening: '' };

export function GlobalWarmPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<RekeningBankItem>('/api/rekening-bank', queryParams);
  const reload = useMutationReload(reloadList);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [disalinId, setDisalinId] = useState<string | null>(null);

  async function salinNoRekening(item: RekeningBankItem) {
    try {
      await navigator.clipboard.writeText(item.noRekening);
      setDisalinId(item.id);
      setTimeout(() => setDisalinId(null), 2000);
    } catch {
      setError('Tidak bisa menyalin otomatis — silakan salin manual.');
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setModalMode('add');
  }

  function openEdit(item: RekeningBankItem) {
    setEditingId(item.id);
    setForm({ nama: item.nama, bank: item.bank, noRekening: item.noRekening });
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        await apiPost('/api/rekening-bank', form);
      } else if (editingId) {
        await apiPatch(`/api/rekening-bank/${editingId}`, form);
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
      await apiDelete(`/api/rekening-bank/${deleteTarget.id}`);
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
      <ListPageShell title="Global Warm" subtitle="Akses cepat layanan e-banking">
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
          {BANK_LINKS.map((bank) => (
            <a
              key={bank.label}
              href={bank.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
              style={{
                flex: '1 1 200px',
                textAlign: 'center',
                padding: '1.5rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {bank.label}
            </a>
          ))}
        </div>
      </ListPageShell>

      <ListPageShell
        title="Daftar Rekening"
        subtitle="Nama, bank dan nomor rekening tujuan transfer"
        action={
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            + Tambah Rekening
          </button>
        }
        metrics={[
          { label: 'Total rekening', value: String(pagination.total), tone: 'blue', iconKind: 'clipboard' },
        ]}
        searchPlaceholder="Cari nama, bank, no rekening…"
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
              <th style={{ width: '4rem' }}>No</th>
              <th>Nama</th>
              <th>Bank</th>
              <th>No Rekening</th>
              <th style={{ width: '13rem' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Belum ada data rekening.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.nama}</td>
                  <td>{item.bank}</td>
                  <td>{item.noRekening}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn--sm btn--secondary"
                        onClick={() => void salinNoRekening(item)}
                        title="Salin no rekening"
                      >
                        {disalinId === item.id ? '✅' : '📋 Salin'}
                      </button>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleteTarget({ id: item.id, label: item.nama })}
                        editLabel="Ubah rekening"
                        deleteLabel="Hapus rekening"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <Modal
        open={modalMode !== null}
        title={modalMode === 'add' ? 'Tambah Rekening' : 'Ubah Rekening'}
        onClose={() => setModalMode(null)}
      >
        <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
          <div className="form-field form-grid--full">
            <label htmlFor="rb-nama">Nama *</label>
            <input
              id="rb-nama"
              required
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
            />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="rb-bank">Bank *</label>
            <input
              id="rb-bank"
              required
              value={form.bank}
              onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
              placeholder="Contoh: BCA, Mandiri, BRI"
            />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="rb-no-rekening">No Rekening *</label>
            <input
              id="rb-no-rekening"
              required
              value={form.noRekening}
              onChange={(e) => setForm((f) => ({ ...f, noRekening: e.target.value }))}
            />
          </div>
          <ModalFormFooter onCancel={() => setModalMode(null)} submitLabel="Simpan" loading={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus rekening"
        message={`Yakin hapus rekening "${deleteTarget?.label ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
