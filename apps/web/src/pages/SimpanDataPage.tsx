import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { IconTrash } from '../components/icons/ActionIcons.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, ApiError } from '../lib/api.ts';
import { formatDateShort } from '../lib/format.ts';
import '../components/ui/ui.css';

interface SimpanDataItem {
  readonly id: string;
  readonly nama: string;
  readonly kategori: string;
  readonly keterangan: string | null;
  readonly berkas: string;
  readonly berkasNama: string;
  readonly ukuran: number;
  readonly createdAt: string;
}

const KATEGORI_OPTIONS = [
  { value: 'excel', label: 'Excel' },
  { value: 'word', label: 'Word' },
  { value: 'foto', label: 'Foto' },
  { value: 'video', label: 'Video' },
  { value: 'aplikasi', label: 'Aplikasi' },
  { value: 'program', label: 'Program' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

function kategoriLabel(value: string): string {
  return KATEGORI_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function formatUkuran(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Upload mentah (octet-stream) agar berkas besar tidak membengkak jadi base64. */
async function uploadBerkas(file: File, nama: string, kategori: string, keterangan: string) {
  const params = new URLSearchParams({ berkasNama: file.name });
  if (nama.trim()) params.set('nama', nama.trim());
  if (kategori) params.set('kategori', kategori);
  if (keterangan.trim()) params.set('keterangan', keterangan.trim());
  const res = await fetch(`/api/simpan-data?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    let message = `Gagal mengunggah berkas (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // Respons bukan JSON — pakai pesan bawaan.
    }
    throw new ApiError(message, res.status);
  }
}

export function SimpanDataPage() {
  const [kategori, setKategori] = useState('');
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({ kategori }, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<SimpanDataItem>('/api/simpan-data', queryParams);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<SimpanDataItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [nama, setNama] = useState('');
  const [kategoriForm, setKategoriForm] = useState('');
  const [keterangan, setKeterangan] = useState('');

  function openCreate() {
    setFile(null);
    setNama('');
    setKategoriForm('');
    setKeterangan('');
    setError(null);
    setCreateOpen(true);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    if (picked && !nama.trim()) setNama(picked.name.replace(/\.[^/.]+$/, ''));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Ukuran berkas maksimal 512 MB');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await uploadBerkas(file, nama, kategoriForm, keterangan);
      setCreateOpen(false);
      await reload({ resetPage: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan berkas');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/simpan-data/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus berkas');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ListPageShell
      title="Simpan Data"
      subtitle="Tempat menyimpan berkas Excel, Word, foto, video, aplikasi, dan program"
      searchPlaceholder="Cari nama atau keterangan berkas..."
      searchValue={search}
      onSearchChange={setSearch}
      selects={[
        {
          id: 'kategori',
          label: 'Filter kategori',
          value: kategori,
          placeholder: 'Semua kategori',
          options: KATEGORI_OPTIONS,
          onChange: setKategori,
        },
      ]}
      onRefresh={() => void reload()}
      error={error}
      loading={loading}
      pagination={pagination}
      onPageChange={setPage}
      action={
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + Simpan Berkas
        </button>
      }
    >
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>No</th>
            <th>Nama</th>
            <th>Kategori</th>
            <th>Nama Berkas</th>
            <th style={{ textAlign: 'right' }}>Ukuran</th>
            <th>Tanggal</th>
            <th>Keterangan</th>
            <th style={{ width: '170px', textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem' }}>
                Belum ada berkas tersimpan.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id}>
                <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{item.nama}</td>
                <td>{kategoriLabel(item.kategori)}</td>
                <td>{item.berkasNama}</td>
                <td style={{ textAlign: 'right' }}>{formatUkuran(item.ukuran)}</td>
                <td>{formatDateShort(item.createdAt)}</td>
                <td>{item.keterangan ?? '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                    <a
                      className="btn btn--sm btn--ghost"
                      href={item.berkas}
                      download={item.berkasNama}
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      Unduh
                    </a>
                    <button
                      type="button"
                      className="icon-btn icon-btn--delete"
                      onClick={() => setDeleting(item)}
                      aria-label="Hapus berkas"
                      title="Hapus berkas"
                    >
                      <IconTrash className="icon-btn__svg" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {createOpen && (
        <Modal open={true} title="Simpan Berkas" onClose={() => setCreateOpen(false)}>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="simpanDataBerkas">Berkas *</label>
              <input
                id="simpanDataBerkas"
                type="file"
                required
                onChange={handleFileChange}
              />
              {file && <small>{formatUkuran(file.size)}</small>}
            </div>
            <div className="form-field">
              <label htmlFor="simpanDataNama">Nama</label>
              <input id="simpanDataNama" value={nama} onChange={(e) => setNama(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="simpanDataKategori">Kategori</label>
              <select
                id="simpanDataKategori"
                value={kategoriForm}
                onChange={(e) => setKategoriForm(e.target.value)}
              >
                <option value="">Otomatis dari jenis berkas</option>
                {KATEGORI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="simpanDataKeterangan">Keterangan</label>
              <input
                id="simpanDataKeterangan"
                value={keterangan}
                maxLength={1000}
                onChange={(e) => setKeterangan(e.target.value)}
              />
            </div>
            <ModalFormFooter
              onCancel={() => setCreateOpen(false)}
              submitLabel={submitting ? 'Mengunggah...' : 'Simpan'}
              loading={submitting}
            />
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={deleting !== null}
        title="Hapus Berkas"
        message={`Yakin hapus berkas "${deleting?.nama ?? ''}"? File di server ikut terhapus.`}
        loading={submitting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </ListPageShell>
  );
}
