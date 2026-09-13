import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { useListQueryParams } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiPatch, apiPost } from '../lib/api.ts';
import { formatDateShort, formatRupiah } from '../lib/format.ts';
import { withIndonesianVoice } from '../lib/speechVoice.ts';
import '../components/ui/ui.css';

interface PemakaianFilmItem {
  readonly id: string;
  readonly tanggal: string;
  readonly pemakaianHarian: number;
  readonly stok: number;
  readonly tanggalPembelian: string | null;
  readonly jumlahPembelian: number;
  readonly hargaPembelian: string;
}

const emptyForm = {
  tanggal: new Date().toISOString().split('T')[0]!,
  pemakaianHarian: '0',
  tanggalPembelian: '',
  jumlahPembelian: '0',
  hargaPembelian: '0',
};

/** Ambang batas stok film — di bawah/sama dengan ini tombol peringatan
 * "Film harus di beli" muncul di samping tombol Tambah, dan suara
 * peringatan diucapkan. */
const STOK_MINIMUM = 50;

/** Ucapkan peringatan stok film menipis lewat speaker (sama seperti pola
 * panggilan antrian di PendaftaranUmumPage). */
function speakFilmWarning(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const text =
    'Mohon perhatian. Stok film di bawah 50 persen. Segera kontak pembelian film dan langsung segera pesan. Terima kasih atas perhatiannya.';
  withIndonesianVoice((voice) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voice?.lang ?? 'id-ID';
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  });
}

export function PemakaianFilmPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryParams = useListQueryParams({ startDate, endDate }, '');
  const {
    items,
    pagination,
    setPage,
    loading,
    error,
    setError,
    reload: reloadList,
  } = usePaginatedList<PemakaianFilmItem>('/api/pemakaian-film', queryParams);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PemakaianFilmItem | null>(null);
  const [deleting, setDeleting] = useState<PemakaianFilmItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Data diurutkan tanggal terbaru dulu, jadi baris pertama pada halaman 1
  // tanpa filter tanggal merepresentasikan stok terkini yang sebenarnya.
  const stokTerkini = items.length > 0 && pagination.page === 1 && !startDate && !endDate ? items[0]!.stok : null;
  const stokMenipis = stokTerkini !== null && stokTerkini <= STOK_MINIMUM;

  // Ucapkan peringatan hanya saat status berpindah dari aman ke menipis
  // (bukan setiap render), supaya tidak terus-menerus bersuara saat sudah
  // dalam status menipis.
  const stokMenipisSebelumnyaRef = useRef(false);
  useEffect(() => {
    if (stokMenipis && !stokMenipisSebelumnyaRef.current) {
      speakFilmWarning();
    }
    stokMenipisSebelumnyaRef.current = stokMenipis;
  }, [stokMenipis]);

  const totalPemakaian = useMemo(
    () => items.reduce((sum, item) => sum + item.pemakaianHarian, 0),
    [items],
  );

  const totalPembelianHarga = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.hargaPembelian || 0), 0),
    [items],
  );

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(item: PemakaianFilmItem) {
    setForm({
      tanggal: item.tanggal.split('T')[0]!,
      pemakaianHarian: String(item.pemakaianHarian),
      tanggalPembelian: item.tanggalPembelian ? item.tanggalPembelian.split('T')[0]! : '',
      jumlahPembelian: String(item.jumlahPembelian),
      hargaPembelian: item.hargaPembelian,
    });
    setError(null);
    setEditing(item);
  }

  function closeModal() {
    setCreateOpen(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        tanggal: form.tanggal,
        pemakaianHarian: Number(form.pemakaianHarian) || 0,
        tanggalPembelian: form.tanggalPembelian || null,
        jumlahPembelian: Number(form.jumlahPembelian) || 0,
        hargaPembelian: Number(form.hargaPembelian) || 0,
      };
      if (editing) {
        await apiPatch(`/api/pemakaian-film/${editing.id}`, body);
      } else {
        await apiPost('/api/pemakaian-film', body);
      }
      closeModal();
      await reload({ resetPage: !editing });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data pemakaian film');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/pemakaian-film/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data pemakaian film');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ListPageShell
        title="Pemakaian Film Rontgen"
        subtitle="Log harian pemakaian film — stok berkurang otomatis; isi Tanggal & Harga Pembelian saat restock"
        metrics={[
          {
            label: 'Stok Saat Ini',
            value: stokTerkini === null ? '—' : `${stokTerkini} lembar`,
            tone: stokTerkini === null || stokTerkini > 0 ? 'green' : 'rose',
            iconKind: 'clipboard',
          },
          { label: 'Total Pemakaian (tampilan)', value: `${totalPemakaian} lembar`, tone: 'blue', iconKind: 'document' },
          { label: 'Total Pembelian (tampilan)', value: formatRupiah(totalPembelianHarga), tone: 'green', iconKind: 'check' },
          { label: 'Total Data', value: String(pagination.total), tone: 'blue', iconKind: 'clipboard' },
        ]}
        onRefresh={() => void reload()}
        filterExtra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              aria-label="Dari tanggal"
            />
            <span>s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
              aria-label="Sampai tanggal"
            />
          </div>
        }
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        action={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {stokMenipis && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={openCreate}
                title={`Stok tinggal ${stokTerkini} lembar`}
              >
                ⚠️ Film harus di beli
              </button>
            )}
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              + Tambah Pemakaian Film
            </button>
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th style={{ textAlign: 'right' }}>Pemakaian Harian</th>
                <th>Tanggal Pembelian</th>
                <th style={{ textAlign: 'right' }}>Jumlah Pembelian</th>
                <th style={{ textAlign: 'right' }}>Harga Pembelian</th>
                <th style={{ textAlign: 'right' }}>Stok</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Belum ada data pemakaian film.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                    <td>{formatDateShort(item.tanggal)}</td>
                    <td style={{ textAlign: 'right' }}>{item.pemakaianHarian}</td>
                    <td>{item.tanggalPembelian ? formatDateShort(item.tanggalPembelian) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{item.jumlahPembelian || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {Number(item.hargaPembelian) > 0 ? formatRupiah(item.hargaPembelian) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {item.stok}
                    </td>
                    <td>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleting(item)}
                        editLabel="Ubah data pemakaian film"
                        deleteLabel="Hapus data pemakaian film"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ListPageShell>

      {(createOpen || editing) && (
        <Modal
          open={true}
          title={editing ? 'Ubah Data Pemakaian Film' : 'Tambah Data Pemakaian Film'}
          onClose={closeModal}
        >
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <div className="form-field">
              <label htmlFor="pf-tanggal">Tanggal *</label>
              <input
                id="pf-tanggal"
                type="date"
                required
                value={form.tanggal}
                onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="pf-pemakaian-harian">Pemakaian Harian (lembar)</label>
              <input
                id="pf-pemakaian-harian"
                type="number"
                min="0"
                step="1"
                value={form.pemakaianHarian}
                onChange={(e) => setForm((f) => ({ ...f, pemakaianHarian: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="pf-tanggal-pembelian">Tanggal Pembelian (jika restock)</label>
              <input
                id="pf-tanggal-pembelian"
                type="date"
                value={form.tanggalPembelian}
                onChange={(e) => setForm((f) => ({ ...f, tanggalPembelian: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="pf-jumlah-pembelian">Jumlah Pembelian (lembar)</label>
              <input
                id="pf-jumlah-pembelian"
                type="number"
                min="0"
                step="1"
                value={form.jumlahPembelian}
                onChange={(e) => setForm((f) => ({ ...f, jumlahPembelian: e.target.value }))}
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="pf-harga-pembelian">Harga Pembelian (Rp)</label>
              <input
                id="pf-harga-pembelian"
                type="number"
                min="0"
                step="1"
                value={form.hargaPembelian}
                onChange={(e) => setForm((f) => ({ ...f, hargaPembelian: e.target.value }))}
              />
            </div>
            <p
              className="form-field form-field--full"
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}
            >
              Stok dihitung otomatis: akumulasi Jumlah Pembelian dikurangi Pemakaian Harian, berurutan dari tanggal
              paling awal.
            </p>
            <ModalFormFooter
              onCancel={closeModal}
              submitLabel={editing ? 'Simpan Perubahan' : 'Simpan'}
              loading={submitting}
            />
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={deleting !== null}
        title="Hapus Data Pemakaian Film"
        message={`Yakin hapus data pemakaian film tanggal ${deleting ? formatDateShort(deleting.tanggal) : ''}?`}
        loading={submitting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}
