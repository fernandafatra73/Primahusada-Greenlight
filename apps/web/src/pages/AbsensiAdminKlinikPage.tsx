import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { pdf } from '@react-pdf/renderer';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { SharingPdfPreviewModal } from '../components/ui/SharingPdfPreviewModal.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { loadLogoDataUrl } from '../pdf/loadLogoDataUrl.ts';
import {
  SuratPeringatanAdminKlinikDocument,
  type SuratPeringatanAdminKlinikData,
} from '../pdf/SuratPeringatanAdminKlinikDocument.tsx';
import '../components/ui/ui.css';

interface AdminKlinikOption {
  readonly id: string;
  readonly nama: string;
}

interface AbsensiItem {
  readonly id: string;
  readonly adminKlinikId: string;
  readonly namaKaryawan: string;
  readonly tanggal: string;
  readonly jamDatang: string | null;
  readonly jamPulang: string | null;
}

interface RekapItem {
  readonly adminKlinikId: string;
  readonly nama: string;
  readonly hariKerja: number;
  readonly hariHadir: number;
  readonly persentase: number;
}

interface SuratPeringatanItem {
  readonly id: string;
  readonly namaKaryawan: string;
  readonly jabatan: string;
  readonly level: string;
  readonly nomorSurat: string | null;
  readonly tanggalSurat: string;
  readonly alasan: string;
  readonly tempatSurat: string | null;
  readonly namaPenandatangan: string | null;
  readonly jabatanPenandatangan: string | null;
}

interface KopSuratData {
  readonly namaKlinik: string;
  readonly alamat: string;
  readonly telepon: string;
  readonly logoDataUrl: string | null;
}

const LEVEL_OPTIONS = [
  { value: 'SP1', label: 'SP1 — Surat Peringatan Pertama' },
  { value: 'SP2', label: 'SP2 — Surat Peringatan Kedua' },
  { value: 'SP3', label: 'SP3 — Surat Peringatan Ketiga' },
] as const;

function todayStr(): string {
  return new Date().toISOString().split('T')[0]!;
}

function formatTanggalLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function resolveLogoSrc(kopSuratLogo: string | null): Promise<string> {
  if (kopSuratLogo) return kopSuratLogo;
  return loadLogoDataUrl().catch(() => '');
}

const ABSENSI_TABS = [
  { id: 'absensi', label: 'Absensi & Rekap' },
  { id: 'surat-peringatan', label: 'Surat Peringatan' },
] as const;

type AbsensiTabId = (typeof ABSENSI_TABS)[number]['id'];

/** Tab "Absensi" di sebelah tab Admin Klinik pada halaman Pendaftaran: catat
 * jam datang/pulang staff Admin Klinik (tanggal terkunci ke hari pencatatan),
 * rekap persentase kehadiran per tahun (hari Minggu tidak dihitung), dan
 * cetak Surat Peringatan SP1/SP2/SP3. */
export function AbsensiAdminKlinikPage() {
  const [activeTab, setActiveTab] = useState<AbsensiTabId>('absensi');

  return (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {ABSENSI_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn--sm ${activeTab === tab.id ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab !== tab.id ? { border: '1px solid var(--color-border)' } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'absensi' ? <AbsensiRekapSection /> : <SuratPeringatanSection />}
    </>
  );
}

function AbsensiRekapSection() {
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(String(currentYear));
  const [rekap, setRekap] = useState<RekapItem[]>([]);
  const [rekapLoading, setRekapLoading] = useState(true);
  const [rekapError, setRekapError] = useState<string | null>(null);

  const [adminOptions, setAdminOptions] = useState<AdminKlinikOption[]>([]);

  const { search, setSearch } = useListSearch();
  const [tanggalFilter, setTanggalFilter] = useState(todayStr());
  const queryParams = useListQueryParams({ tanggal: tanggalFilter }, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<AbsensiItem>('/api/absensi-admin-klinik', queryParams);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AbsensiItem | null>(null);
  const [deleting, setDeleting] = useState<AbsensiItem | null>(null);
  const [adminKlinikId, setAdminKlinikId] = useState('');
  const [jamDatang, setJamDatang] = useState('');
  const [jamPulang, setJamPulang] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRekap = useCallback(async () => {
    setRekapLoading(true);
    setRekapError(null);
    try {
      const res = await apiGet<{ items: RekapItem[] }>(`/api/absensi-admin-klinik/rekap?tahun=${tahun}`);
      setRekap(res.items);
    } catch (err) {
      setRekapError(err instanceof Error ? err.message : 'Gagal memuat rekap kehadiran');
    } finally {
      setRekapLoading(false);
    }
  }, [tahun]);

  useEffect(() => {
    void loadRekap();
  }, [loadRekap]);

  useEffect(() => {
    apiGet<{ items: AdminKlinikOption[] }>('/api/admin-klinik?limit=100')
      .then((res) => setAdminOptions(res.items))
      .catch(() => {});
  }, []);

  function openCreate() {
    setAdminKlinikId('');
    setJamDatang('');
    setJamPulang('');
    setCreateOpen(true);
  }

  function openEdit(item: AbsensiItem) {
    setEditing(item);
    setJamDatang(item.jamDatang ?? '');
    setJamPulang(item.jamPulang ?? '');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!adminKlinikId) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/absensi-admin-klinik', {
        adminKlinikId,
        jamDatang: jamDatang || undefined,
        jamPulang: jamPulang || undefined,
      });
      setCreateOpen(false);
      await reload();
      await loadRekap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat absensi');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPatch(`/api/absensi-admin-klinik/${editing.id}`, {
        jamDatang: jamDatang || null,
        jamPulang: jamPulang || null,
      });
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah absensi');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/absensi-admin-klinik/${deleting.id}`);
      setDeleting(null);
      await reload();
      await loadRekap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus absensi');
    } finally {
      setSubmitting(false);
    }
  }

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);
    return years;
  }, [currentYear]);

  function badgeClassFor(persentase: number): string {
    if (persentase >= 90) return 'badge--ok';
    if (persentase >= 75) return 'badge--pending';
    return 'badge--warn';
  }

  return (
    <>
      <ListPageShell
        title="Rekap Kehadiran Admin Klinik"
        subtitle="Persentase kehadiran per tahun — hari Minggu tidak dihitung sebagai hari kerja"
        selects={[
          {
            id: 'rekap-tahun',
            label: 'Tahun',
            value: tahun,
            options: yearOptions.map((y) => ({ value: String(y), label: `Tahun ${y}` })),
            onChange: setTahun,
          },
        ]}
        error={rekapError}
        loading={rekapLoading}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>Hari Kerja ({tahun})</th>
              <th>Hari Hadir</th>
              <th>Persentase</th>
            </tr>
          </thead>
          <tbody>
            {rekap.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Belum ada staff Admin Klinik.
                </td>
              </tr>
            ) : (
              rekap.map((r, idx) => (
                <tr key={r.adminKlinikId}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{r.nama}</strong>
                  </td>
                  <td>{r.hariKerja}</td>
                  <td>{r.hariHadir}</td>
                  <td>
                    <span className={`badge ${badgeClassFor(r.persentase)}`}>{r.persentase}%</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <div style={{ marginTop: '1.25rem' }}>
        <ListPageShell
          title="Catat Absensi Harian"
          subtitle="Jam datang & jam pulang staff Admin Klinik — tanggal terkunci ke hari pencatatan"
          metrics={[{ label: 'Total Data', value: String(pagination.total), tone: 'blue', iconKind: 'clock' }]}
          searchPlaceholder="Cari nama karyawan..."
          searchValue={search}
          onSearchChange={setSearch}
          onRefresh={() => void reload()}
          error={error}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          filterExtra={
            <input
              type="date"
              className="filter-control"
              value={tanggalFilter}
              onChange={(e) => setTanggalFilter(e.target.value)}
              aria-label="Filter tanggal"
            />
          }
          action={
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              + Catat Kehadiran
            </button>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Tanggal</th>
                <th>Jam Datang</th>
                <th>Jam Pulang</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    Belum ada data absensi untuk tanggal ini.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                    <td>
                      <strong>{item.namaKaryawan}</strong>
                    </td>
                    <td>{formatTanggalLabel(item.tanggal)}</td>
                    <td>{item.jamDatang || '—'}</td>
                    <td>{item.jamPulang || '—'}</td>
                    <td>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleting(item)}
                        editLabel="Ubah jam datang/pulang"
                        deleteLabel="Hapus absensi"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ListPageShell>
      </div>

      {createOpen && (
        <Modal open={true} title="Catat Kehadiran" onClose={() => setCreateOpen(false)}>
          <form onSubmit={(e) => void handleCreate(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="ab-nama">Nama Karyawan *</label>
              <select
                id="ab-nama"
                required
                value={adminKlinikId}
                onChange={(e) => setAdminKlinikId(e.target.value)}
              >
                <option value="">Pilih staff Admin Klinik...</option>
                {adminOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="ab-tanggal">Tanggal (terkunci hari ini)</label>
              <input id="ab-tanggal" type="date" value={todayStr()} disabled readOnly />
            </div>

            <div className="form-field">
              <label htmlFor="ab-jamdatang">Jam Datang</label>
              <input
                id="ab-jamdatang"
                type="time"
                value={jamDatang}
                onChange={(e) => setJamDatang(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="ab-jampulang">Jam Pulang</label>
              <input
                id="ab-jampulang"
                type="time"
                value={jamPulang}
                onChange={(e) => setJamPulang(e.target.value)}
              />
            </div>

            <ModalFormFooter onCancel={() => setCreateOpen(false)} submitLabel="Simpan" loading={submitting} />
          </form>
        </Modal>
      )}

      {editing && (
        <Modal open={true} title="Ubah Jam Datang/Pulang" onClose={() => setEditing(null)}>
          <form onSubmit={(e) => void handleUpdate(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="edit-ab-nama">Nama Karyawan</label>
              <input id="edit-ab-nama" type="text" value={editing.namaKaryawan} disabled readOnly />
            </div>

            <div className="form-field">
              <label htmlFor="edit-ab-tanggal">Tanggal (tidak bisa diubah)</label>
              <input id="edit-ab-tanggal" type="date" value={editing.tanggal} disabled readOnly />
            </div>

            <div className="form-field">
              <label htmlFor="edit-ab-jamdatang">Jam Datang</label>
              <input
                id="edit-ab-jamdatang"
                type="time"
                value={jamDatang}
                onChange={(e) => setJamDatang(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-ab-jampulang">Jam Pulang</label>
              <input
                id="edit-ab-jampulang"
                type="time"
                value={jamPulang}
                onChange={(e) => setJamPulang(e.target.value)}
              />
            </div>

            <ModalFormFooter onCancel={() => setEditing(null)} submitLabel="Simpan Perubahan" loading={submitting} />
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          open={true}
          title="Hapus Absensi"
          message={`Apakah Anda yakin ingin menghapus catatan absensi "${deleting.namaKaryawan}" tanggal ${formatTanggalLabel(deleting.tanggal)}?`}
          confirmLabel="Hapus"
          onConfirm={() => void handleDeleteConfirm()}
          onClose={() => setDeleting(null)}
          loading={submitting}
        />
      )}
    </>
  );
}

function SuratPeringatanSection() {
  const [adminOptions, setAdminOptions] = useState<AdminKlinikOption[]>([]);
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<SuratPeringatanItem>('/api/surat-peringatan-admin-klinik', queryParams);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SuratPeringatanItem | null>(null);
  const [deleting, setDeleting] = useState<SuratPeringatanItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const [namaKaryawan, setNamaKaryawan] = useState('');
  const [jabatan, setJabatan] = useState('Admin Klinik');
  const [level, setLevel] = useState<string>('SP1');
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState(todayStr());
  const [alasan, setAlasan] = useState('');
  const [tempatSurat, setTempatSurat] = useState('');
  const [namaPenandatangan, setNamaPenandatangan] = useState('');
  const [jabatanPenandatangan, setJabatanPenandatangan] = useState('Pimpinan Klinik');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('surat-peringatan.pdf');

  useEffect(() => {
    apiGet<{ items: AdminKlinikOption[] }>('/api/admin-klinik?limit=100')
      .then((res) => setAdminOptions(res.items))
      .catch(() => {});
  }, []);

  function resetForm() {
    setNamaKaryawan('');
    setJabatan('Admin Klinik');
    setLevel('SP1');
    setNomorSurat('');
    setTanggalSurat(todayStr());
    setAlasan('');
    setTempatSurat('');
    setNamaPenandatangan('');
    setJabatanPenandatangan('Pimpinan Klinik');
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function openEdit(item: SuratPeringatanItem) {
    setEditing(item);
    setNamaKaryawan(item.namaKaryawan);
    setJabatan(item.jabatan);
    setLevel(item.level);
    setNomorSurat(item.nomorSurat ?? '');
    setTanggalSurat(item.tanggalSurat);
    setAlasan(item.alasan);
    setTempatSurat(item.tempatSurat ?? '');
    setNamaPenandatangan(item.namaPenandatangan ?? '');
    setJabatanPenandatangan(item.jabatanPenandatangan ?? 'Pimpinan Klinik');
  }

  function buildBody() {
    return {
      namaKaryawan: namaKaryawan.trim(),
      jabatan: jabatan.trim() || undefined,
      level,
      nomorSurat: nomorSurat.trim() || undefined,
      tanggalSurat,
      alasan: alasan.trim(),
      tempatSurat: tempatSurat.trim() || undefined,
      namaPenandatangan: namaPenandatangan.trim() || undefined,
      jabatanPenandatangan: jabatanPenandatangan.trim() || undefined,
    };
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!namaKaryawan.trim() || !alasan.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/surat-peringatan-admin-klinik', buildBody());
      setCreateOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat surat peringatan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing || !namaKaryawan.trim() || !alasan.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPatch(`/api/surat-peringatan-admin-klinik/${editing.id}`, buildBody());
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah surat peringatan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/surat-peringatan-admin-klinik/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus surat peringatan');
    } finally {
      setSubmitting(false);
    }
  }

  async function buildPdfData(item: SuratPeringatanItem): Promise<SuratPeringatanAdminKlinikData> {
    const kop = await apiGet<{ item: KopSuratData }>('/api/kop-surat');
    const logoSrc = await resolveLogoSrc(kop.item.logoDataUrl);
    return {
      logoSrc,
      namaKlinik: kop.item.namaKlinik,
      alamatKlinik: kop.item.alamat,
      teleponKlinik: kop.item.telepon,
      nomorSurat: item.nomorSurat ?? '',
      level: item.level,
      namaKaryawan: item.namaKaryawan,
      jabatan: item.jabatan,
      alasan: item.alasan,
      tempatSurat: item.tempatSurat ?? '',
      tanggalSurat: formatTanggalLabel(item.tanggalSurat),
      namaPenandatangan: item.namaPenandatangan ?? '',
      jabatanPenandatangan: item.jabatanPenandatangan ?? '',
    };
  }

  async function handlePreview(item: SuratPeringatanItem) {
    setPrintingId(item.id);
    try {
      const data = await buildPdfData(item);
      const blob = await pdf(<SuratPeringatanAdminKlinikDocument data={data} />).toBlob();
      setPreviewFilename(`Surat_Peringatan_${item.level}_${item.namaKaryawan || 'Karyawan'}.pdf`);
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF surat peringatan');
    } finally {
      setPrintingId(null);
    }
  }

  return (
    <>
      <ListPageShell
        title="Surat Peringatan (SP1/SP2/SP3)"
        subtitle="Dicetak berdasarkan rekap kehadiran staff Admin Klinik"
        searchPlaceholder="Cari nama karyawan, nomor surat..."
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        action={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + Buat Surat Peringatan
          </button>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>Level</th>
              <th>Nomor Surat</th>
              <th>Tanggal</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Belum ada surat peringatan.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                  <td>
                    <strong>{item.namaKaryawan}</strong>
                  </td>
                  <td>
                    <span className="badge badge--warn">{item.level}</span>
                  </td>
                  <td>{item.nomorSurat || '—'}</td>
                  <td>{formatTanggalLabel(item.tanggalSurat)}</td>
                  <td>
                    <TableRowActions
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleting(item)}
                      onPrint={() => void handlePreview(item)}
                      editLabel="Ubah surat peringatan"
                      deleteLabel="Hapus surat peringatan"
                      printLabel={printingId === item.id ? 'Membuat PDF…' : 'Cetak surat peringatan'}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      {(createOpen || editing) && (
        <Modal
          open={true}
          title={editing ? 'Ubah Surat Peringatan' : 'Buat Surat Peringatan'}
          onClose={() => (editing ? setEditing(null) : setCreateOpen(false))}
          size="lg"
        >
          <form onSubmit={(e) => void (editing ? handleUpdate(e) : handleCreate(e))} className="form-grid">
            <div className="form-field">
              <label htmlFor="sp-nama">Nama Karyawan *</label>
              <input
                id="sp-nama"
                type="text"
                list="sp-nama-options"
                required
                value={namaKaryawan}
                onChange={(e) => setNamaKaryawan(e.target.value)}
                placeholder="Pilih atau ketik nama"
              />
              <datalist id="sp-nama-options">
                {adminOptions.map((opt) => (
                  <option key={opt.id} value={opt.nama} />
                ))}
              </datalist>
            </div>

            <div className="form-field">
              <label htmlFor="sp-jabatan">Jabatan</label>
              <input id="sp-jabatan" type="text" value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
            </div>

            <div className="form-field">
              <label htmlFor="sp-level">Level Surat Peringatan *</label>
              <select id="sp-level" required value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="sp-nomor">Nomor Surat</label>
              <input
                id="sp-nomor"
                type="text"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
                placeholder="Contoh: 001/SP1/IX/2026"
              />
            </div>

            <div className="form-field">
              <label htmlFor="sp-tanggal">Tanggal Surat</label>
              <input
                id="sp-tanggal"
                type="date"
                value={tanggalSurat}
                onChange={(e) => setTanggalSurat(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="sp-tempat">Tempat Surat</label>
              <input
                id="sp-tempat"
                type="text"
                value={tempatSurat}
                onChange={(e) => setTempatSurat(e.target.value)}
                placeholder="Contoh: Sukabumi"
              />
            </div>

            <div className="form-field form-field--full">
              <label htmlFor="sp-alasan">Alasan/Isi Peringatan *</label>
              <textarea
                id="sp-alasan"
                required
                rows={4}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Contoh: Ketidakhadiran tanpa keterangan berulang kali pada bulan Agustus 2026"
              />
            </div>

            <div className="form-field">
              <label htmlFor="sp-penandatangan">Nama Penandatangan</label>
              <input
                id="sp-penandatangan"
                type="text"
                value={namaPenandatangan}
                onChange={(e) => setNamaPenandatangan(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="sp-jabatan-penandatangan">Jabatan Penandatangan</label>
              <input
                id="sp-jabatan-penandatangan"
                type="text"
                value={jabatanPenandatangan}
                onChange={(e) => setJabatanPenandatangan(e.target.value)}
              />
            </div>

            <ModalFormFooter
              onCancel={() => (editing ? setEditing(null) : setCreateOpen(false))}
              submitLabel={editing ? 'Simpan Perubahan' : 'Simpan'}
              loading={submitting}
            />
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          open={true}
          title="Hapus Surat Peringatan"
          message={`Apakah Anda yakin ingin menghapus ${deleting.level} atas nama "${deleting.namaKaryawan}"?`}
          confirmLabel="Hapus"
          onConfirm={() => void handleDeleteConfirm()}
          onClose={() => setDeleting(null)}
          loading={submitting}
        />
      )}

      <SharingPdfPreviewModal
        open={previewOpen}
        blob={previewBlob}
        filename={previewFilename}
        onClose={() => setPreviewOpen(false)}
        title="Pratinjau Surat Peringatan"
      />
    </>
  );
}
