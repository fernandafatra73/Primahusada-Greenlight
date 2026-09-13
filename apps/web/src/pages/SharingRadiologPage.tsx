import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { SharingPdfPreviewModal } from '../components/ui/SharingPdfPreviewModal.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { formatRupiah } from '../lib/format.ts';
import { generateSharingRadiologReportBlob } from '../pdf/printSharingRadiologReport.tsx';
import '../components/ui/ui.css';

const SHARING_OPTIONS = [20000, 25000, 30000, 50000];

interface RadiologOption {
  readonly id: string;
  readonly nama: string;
}

interface AdminKlinikOption {
  readonly id: string;
  readonly nama: string;
}

interface SharingRadiologItem {
  readonly id: string;
  readonly namaPemeriksaan: string;
  readonly jumlahPemeriksaan: number;
  readonly sharingNominal: string;
  readonly totalSharing: string;
  readonly radiologId: string;
  readonly radiolog: RadiologOption;
}

export function SharingRadiologPage() {
  const { search, setSearch } = useListSearch();
  const [filterRadiologId, setFilterRadiologId] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('');
  const queryParams = useListQueryParams(
    { radiologId: filterRadiologId, tanggal: filterTanggal },
    search,
  );
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<SharingRadiologItem>('/api/sharing-radiolog', queryParams);
  const reload = useMutationReload(reloadList);

  const [radiologOptions, setRadiologOptions] = useState<readonly RadiologOption[]>([]);
  const loadRadiologOptions = useCallback(async () => {
    try {
      const res = await apiGet<{ items: RadiologOption[] }>('/api/radiolog?limit=200');
      setRadiologOptions(res.items);
    } catch {
      setRadiologOptions([]);
    }
  }, []);
  useEffect(() => {
    void loadRadiologOptions();
  }, [loadRadiologOptions]);

  const [adminKlinikOptions, setAdminKlinikOptions] = useState<readonly AdminKlinikOption[]>([]);
  const [adminKlinikId, setAdminKlinikId] = useState('');
  const loadAdminKlinikOptions = useCallback(async () => {
    try {
      const res = await apiGet<{ items: AdminKlinikOption[] }>('/api/admin-klinik?limit=200');
      setAdminKlinikOptions(res.items);
    } catch {
      setAdminKlinikOptions([]);
    }
  }, []);
  useEffect(() => {
    void loadAdminKlinikOptions();
  }, [loadAdminKlinikOptions]);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [namaPemeriksaan, setNamaPemeriksaan] = useState('');
  const [jumlahPemeriksaan, setJumlahPemeriksaan] = useState('1');
  const [sharingNominal, setSharingNominal] = useState(String(SHARING_OPTIONS[0]));
  const [radiologId, setRadiologId] = useState('');
  const totalSharing = (Number(jumlahPemeriksaan) || 0) * (Number(sharingNominal) || 0);

  const [printing, setPrinting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  function resetForm() {
    setNamaPemeriksaan('');
    setJumlahPemeriksaan('1');
    setSharingNominal(String(SHARING_OPTIONS[0]));
    setRadiologId(radiologOptions[0]?.id ?? '');
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setModalMode('add');
  }

  function openEdit(item: SharingRadiologItem) {
    setEditingId(item.id);
    setNamaPemeriksaan(item.namaPemeriksaan);
    setJumlahPemeriksaan(String(item.jumlahPemeriksaan));
    setSharingNominal(item.sharingNominal);
    setRadiologId(item.radiologId);
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!radiologId) {
      setError('Pilih nama radiolog terlebih dahulu');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      namaPemeriksaan,
      jumlahPemeriksaan: Number(jumlahPemeriksaan) || 1,
      sharingNominal: Number(sharingNominal) || 0,
      radiologId,
    };
    try {
      if (modalMode === 'add') {
        await apiPost('/api/sharing-radiolog', body);
      } else if (editingId) {
        await apiPatch(`/api/sharing-radiolog/${editingId}`, body);
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
      await apiDelete(`/api/sharing-radiolog/${deleteTarget.id}`);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleCetak() {
    setPrinting(true);
    try {
      const totalSharingSum = items.reduce((sum, it) => sum + Number(it.totalSharing), 0);
      const adminNama = adminKlinikOptions.find((a) => a.id === adminKlinikId)?.nama ?? '';
      const blob = await generateSharingRadiologReportBlob({
        tanggalCetak: new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        items: items.map((it, idx) => ({
          no: idx + 1,
          namaPemeriksaan: it.namaPemeriksaan,
          jumlahPemeriksaan: it.jumlahPemeriksaan,
          namaRadiolog: it.radiolog.nama,
          sharingFormatted: formatRupiah(it.sharingNominal),
          totalSharingFormatted: formatRupiah(it.totalSharing),
        })),
        totalData: items.length,
        totalSharingFormatted: formatRupiah(totalSharingSum),
        adminNama,
      });
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } finally {
      setPrinting(false);
    }
  }

  const form = (
    <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
      <div className="form-field form-field--full">
        <label htmlFor="sr-pemeriksaan">Nama Pemeriksaan</label>
        <input
          id="sr-pemeriksaan"
          required
          value={namaPemeriksaan}
          onChange={(e) => setNamaPemeriksaan(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="sr-jumlah">Jumlah Pemeriksaan</label>
        <input
          id="sr-jumlah"
          type="number"
          min="1"
          required
          value={jumlahPemeriksaan}
          onChange={(e) => setJumlahPemeriksaan(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="sr-sharing">Sharing (pilih atau ketik manual)</label>
        <input
          id="sr-sharing"
          type="number"
          min="0"
          required
          list="sr-sharing-options"
          value={sharingNominal}
          onChange={(e) => setSharingNominal(e.target.value)}
        />
        <datalist id="sr-sharing-options">
          {SHARING_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {formatRupiah(opt)}
            </option>
          ))}
        </datalist>
      </div>
      <div className="form-field">
        <label htmlFor="sr-total">Total Sharing (otomatis)</label>
        <input id="sr-total" readOnly value={formatRupiah(totalSharing)} />
      </div>
      <div className="form-field form-field--full">
        <label htmlFor="sr-radiolog">Nama Radiolog</label>
        <select id="sr-radiolog" required value={radiologId} onChange={(e) => setRadiologId(e.target.value)}>
          <option value="" disabled>
            Pilih radiolog…
          </option>
          {radiologOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama}
            </option>
          ))}
        </select>
      </div>
      <ModalFormFooter onCancel={() => setModalMode(null)} submitLabel="Simpan" loading={saving} />
    </form>
  );

  return (
    <>
      <ListPageShell
        title="Sharing Radiolog"
        subtitle="Data sharing radiolog per pemeriksaan yang diisi manual"
        action={
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="sr-admin-klinik">Nama Admin Klinik</label>
              <select
                id="sr-admin-klinik"
                value={adminKlinikId}
                onChange={(e) => setAdminKlinikId(e.target.value)}
              >
                <option value="">Pilih admin klinik…</option>
                {adminKlinikOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn--primary" onClick={openAdd}>
              + Tambah
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void handleCetak()}
              disabled={printing}
              style={{ border: '1px solid var(--color-border)' }}
            >
              🖨️ {printing ? 'Menyiapkan…' : 'Cetak'}
            </button>
          </div>
        }
        metrics={[
          {
            label: 'Total data',
            value: String(pagination.total),
            tone: 'blue',
            iconKind: 'clipboard',
          },
        ]}
        selects={[
          {
            id: 'sr-filter-radiolog',
            label: 'Filter Nama Radiolog',
            value: filterRadiologId,
            placeholder: 'Semua Radiolog',
            options: radiologOptions.map((r) => ({ value: r.id, label: r.nama })),
            onChange: (value) => {
              setFilterRadiologId(value);
              setPage(1);
            },
          },
        ]}
        filterExtra={
          <input
            type="date"
            className="filter-control"
            aria-label="Filter Tanggal"
            value={filterTanggal}
            onChange={(e) => {
              setFilterTanggal(e.target.value);
              setPage(1);
            }}
          />
        }
        searchPlaceholder="Cari nama pemeriksaan atau radiolog…"
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
              <th>Nama Pemeriksaan</th>
              <th>Jumlah</th>
              <th>Nama Radiolog</th>
              <th>Sharing</th>
              <th>Total Sharing</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6}>Belum ada data sharing radiolog.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.namaPemeriksaan}</td>
                  <td>{item.jumlahPemeriksaan}</td>
                  <td>{item.radiolog.nama}</td>
                  <td>{formatRupiah(item.sharingNominal)}</td>
                  <td>{formatRupiah(item.totalSharing)}</td>
                  <td>
                    <TableRowActions
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleteTarget({ id: item.id, label: item.namaPemeriksaan })}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <Modal open={modalMode === 'add'} title="Tambah Sharing Radiolog" onClose={() => setModalMode(null)}>
        {form}
      </Modal>
      <Modal open={modalMode === 'edit'} title="Ubah Sharing Radiolog" onClose={() => setModalMode(null)}>
        {form}
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus data"
        message={`Yakin hapus "${deleteTarget?.label ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

      <SharingPdfPreviewModal
        open={previewOpen}
        blob={previewBlob}
        filename="Laporan_Sharing_Radiolog.pdf"
        onClose={() => setPreviewOpen(false)}
        title="Pratinjau Laporan Sharing Radiolog"
      />
    </>
  );
}
