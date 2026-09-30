import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CetakALModal, type CetakALPasien } from '../components/CetakALModal.tsx';
import { KesanEditorModal } from '../components/KesanEditorModal.tsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { SharingPdfPreviewModal } from '../components/ui/SharingPdfPreviewModal.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { formatDateShort, formatRupiah } from '../lib/format.ts';
import type { PaginatedResponse } from '../lib/pagination.ts';
import { formatRadiologName } from '../lib/pasienPrint.ts';
import {
  pendaftaranToRad2Fill,
  pendaftaranUmumToRad2Fill,
  type PendaftaranForRad2,
  type PendaftaranUmumForRad2,
} from '../lib/pendaftaranToRad2.ts';
import { RAD2_PERIOD_OPTIONS, resolveRad2Period, type Rad2PeriodKind } from '../lib/rad2Period.ts';
import { computeRad2Sharing, type Rad2SharingResult } from '../lib/rad2Sharing.ts';
import { downloadBlob, generateRad2ReportBlob } from '../pdf/printRad2Report.tsx';
import { printRadiologyReport } from '../pdf/printRadiologyReport.tsx';
import '../components/ui/ui.css';

interface Rad2Item {
  readonly id: string;
  readonly nama: string;
  readonly umur: number;
  readonly alamat: string | null;
  readonly tanggal: string;
  readonly pemeriksaan: string;
  readonly pengirim: string;
  readonly klinis: string | null;
  readonly kesan: string | null;
  readonly radiologi: string | null;
  readonly harga: string;
  readonly sharing: string;
}

interface Rad2ListResponse extends PaginatedResponse<Rad2Item> {
  readonly totalHarga: string;
  readonly totalSharing: string;
}

interface NamaOption {
  readonly id: string;
  readonly nama: string;
}

interface JenisPemeriksaanOption extends NamaOption {
  readonly harga: string | null;
}

interface PilihanSharingOption {
  readonly id: string;
  readonly nominal: number;
}

interface AdminKlinikOption {
  readonly id: string;
  readonly nama: string;
}

interface PendaftaranOption extends PendaftaranForRad2 {
  readonly id: string;
  readonly regCode: string;
}

interface PendaftaranUmumOption extends PendaftaranUmumForRad2 {
  readonly id: string;
  readonly noRegistrasi: string;
}

/** Laporan mengambil seluruh data yang cocok dengan filter, bukan hanya halaman yang tampil. */
const REPORT_PAGE_LIMIT = 100;

interface Rad2Form {
  readonly nama: string;
  readonly umur: string;
  readonly alamat: string;
  readonly tanggal: string;
  readonly pemeriksaan: string;
  readonly pengirim: string;
  readonly klinis: string;
  readonly kesan: string;
  readonly radiologi: string;
  readonly harga: string;
  readonly sharing: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): Rad2Form {
  return {
    nama: '',
    umur: '',
    alamat: '',
    tanggal: todayIso(),
    pemeriksaan: '',
    pengirim: '',
    klinis: '',
    kesan: '',
    radiologi: '',
    harga: '',
    sharing: '',
  };
}

/** Field yang memengaruhi aturan sharing; mengubahnya menghitung ulang sharing. */
const SHARING_SOURCE_FIELDS: ReadonlySet<keyof Rad2Form> = new Set(['pengirim', 'pemeriksaan', 'umur', 'harga']);

function autoSharingFor(form: Rad2Form): Rad2SharingResult | null {
  if (!form.pengirim.trim() || !form.pemeriksaan.trim() || form.umur.trim() === '') return null;
  return computeRad2Sharing({
    pengirim: form.pengirim,
    pemeriksaan: form.pemeriksaan,
    umur: Number(form.umur),
    harga: Number(form.harga || 0),
  });
}

/** Isi sharing otomatis; nilainya tetap bisa diubah manual sesudahnya. */
function withAutoSharing(form: Rad2Form): Rad2Form {
  const result = autoSharingFor(form);
  return result ? { ...form, sharing: String(result.nominal) } : form;
}

/** Bentuk data yang dipakai modal Cetak A+L; Rad2 tidak punya No. Foto, jadi
 * nomor urut baris dipakai sebagai gantinya (masih bisa diubah di modal). */
function toCetakALPasien(item: Rad2Item, rowNo: number): CetakALPasien {
  return {
    id: item.id,
    regCode: String(rowNo),
    nama: item.nama,
    umur: item.umur,
    tanggalLahir: '',
    createdAt: item.tanggal,
    alamat: item.alamat,
    pengirim: { nama: item.pengirim },
    radiolog: item.radiologi ? { nama: item.radiologi } : null,
    pemeriksaan: [{ nama: item.pemeriksaan }],
  };
}

export function Rad2Page() {
  const { search, setSearch } = useListSearch();
  const [dokterFilter, setDokterFilter] = useState('');
  const [periodKind, setPeriodKind] = useState<Rad2PeriodKind>('semua');
  const [customDari, setCustomDari] = useState('');
  const [customSampai, setCustomSampai] = useState('');
  const period = useMemo(
    () => resolveRad2Period(periodKind, new Date(), { dari: customDari, sampai: customSampai }),
    [periodKind, customDari, customSampai],
  );
  const queryParams = useListQueryParams(
    { pengirim: dokterFilter, dari: period.dari, sampai: period.sampai },
    search,
  );
  const [totals, setTotals] = useState({ harga: '0', sharing: '0' });
  const onLoaded = useCallback((res: Rad2ListResponse) => {
    setTotals({ harga: res.totalHarga, sharing: res.totalSharing });
  }, []);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<Rad2Item, Rad2ListResponse>('/api/rad2', queryParams, onLoaded);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Rad2Item | null>(null);
  const [deleting, setDeleting] = useState<Rad2Item | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Rad2Form>(emptyForm);

  const [kesanTarget, setKesanTarget] = useState<Rad2Item | null>(null);
  const [kesanSaving, setKesanSaving] = useState(false);
  const [kesanError, setKesanError] = useState<string | null>(null);

  const [cetakPasien, setCetakPasien] = useState<CetakALPasien | null>(null);
  const [cetakMode, setCetakMode] = useState<'amplop' | 'label'>('amplop');

  const [dokterOptions, setDokterOptions] = useState<readonly NamaOption[]>([]);
  const [radiologOptions, setRadiologOptions] = useState<readonly NamaOption[]>([]);
  const [jenisOptions, setJenisOptions] = useState<readonly JenisPemeriksaanOption[]>([]);
  const [sharingOptions, setSharingOptions] = useState<readonly PilihanSharingOption[]>([]);

  const [adminOptions, setAdminOptions] = useState<readonly AdminKlinikOption[]>([]);
  const [adminKlinikId, setAdminKlinikId] = useState('');
  const [reporting, setReporting] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [pendaftaranQuery, setPendaftaranQuery] = useState('');
  const debouncedPendaftaranQuery = useDebouncedValue(pendaftaranQuery);
  const [pendaftaranOptions, setPendaftaranOptions] = useState<readonly PendaftaranOption[]>([]);
  const [umumOptions, setUmumOptions] = useState<readonly PendaftaranUmumOption[]>([]);
  const [pendaftaranLoading, setPendaftaranLoading] = useState(false);
  const [pendaftaranError, setPendaftaranError] = useState<string | null>(null);
  const [pendaftaranNotice, setPendaftaranNotice] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    // Pilihan hanya membantu pengisian; kalau gagal dimuat, form tetap bisa diketik manual.
    const [dokter, radiolog, jenis, sharing, admin] = await Promise.allSettled([
      apiGet<{ items: NamaOption[] }>('/api/dokter?limit=100'),
      apiGet<{ items: NamaOption[] }>('/api/radiolog?limit=100'),
      apiGet<{ items: JenisPemeriksaanOption[] }>('/api/jenis-pemeriksaan?limit=100'),
      apiGet<{ items: PilihanSharingOption[] }>('/api/pilihan-sharing'),
      apiGet<{ items: AdminKlinikOption[] }>('/api/admin-klinik?limit=100'),
    ]);
    setDokterOptions(dokter.status === 'fulfilled' ? dokter.value.items : []);
    setRadiologOptions(radiolog.status === 'fulfilled' ? radiolog.value.items : []);
    setJenisOptions(jenis.status === 'fulfilled' ? jenis.value.items : []);
    setSharingOptions(sharing.status === 'fulfilled' ? sharing.value.items : []);
    setAdminOptions(admin.status === 'fulfilled' ? admin.value.items : []);
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  // Pendaftaran radiologi terbaru (atau hasil pencarian) untuk pengisian otomatis di form Tambah.
  const formOpenForCreate = createOpen;
  useEffect(() => {
    if (!formOpenForCreate) return;
    let cancelled = false;
    setPendaftaranLoading(true);
    setPendaftaranError(null);
    const params = new URLSearchParams({ limit: '8' });
    if (debouncedPendaftaranQuery.trim()) params.set('q', debouncedPendaftaranQuery.trim());
    const query = params.toString();
    // Dua sumber: Pendaftaran (radiologi) dan Pendaftaran Umum. Satu gagal tidak menyembunyikan yang lain.
    void Promise.allSettled([
      apiGet<{ items: PendaftaranOption[] }>(`/api/pasien?modul=RADIOLOGI&${query}`),
      apiGet<{ items: PendaftaranUmumOption[] }>(`/api/pendaftaran-umum?${query}`),
    ]).then(([pasien, umum]) => {
      if (cancelled) return;
      setPendaftaranOptions(pasien.status === 'fulfilled' ? pasien.value.items : []);
      setUmumOptions(umum.status === 'fulfilled' ? umum.value.items : []);
      if (pasien.status === 'rejected' && umum.status === 'rejected') {
        // Form tetap bisa diisi manual; pesan ini hanya menjelaskan kenapa daftar kosong.
        const reason: unknown = pasien.reason;
        setPendaftaranError(reason instanceof Error ? reason.message : 'Gagal memuat data pendaftaran');
      }
      setPendaftaranLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [formOpenForCreate, debouncedPendaftaranQuery]);

  function pickPendaftaran(p: PendaftaranOption) {
    const fill = pendaftaranToRad2Fill(p, todayIso());
    setForm((f) => withAutoSharing({ ...f, ...fill }));
    setPendaftaranNotice(`Data diisi dari pendaftaran ${p.regCode} — ${p.nama}. Periksa kembali sebelum menyimpan.`);
  }

  function pickPendaftaranUmum(p: PendaftaranUmumOption) {
    const fill = pendaftaranUmumToRad2Fill(p, todayIso());
    setForm((f) => withAutoSharing({ ...f, ...fill }));
    setPendaftaranNotice(
      `Data diisi dari pendaftaran umum ${p.noRegistrasi} — ${p.namaPasien}. Pemeriksaan, radiologi, dan harga belum ada di data ini, isi manual.`,
    );
  }

  function updateForm(field: keyof Rad2Form, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      return SHARING_SOURCE_FIELDS.has(field) ? withAutoSharing(next) : next;
    });
  }

  function handlePemeriksaanChange(value: string) {
    const match = jenisOptions.find((j) => j.nama === value);
    setForm((f) =>
      withAutoSharing({
        ...f,
        pemeriksaan: value,
        harga: match?.harga ? String(Math.round(Number(match.harga))) : f.harga,
      }),
    );
  }

  const sharingRule = autoSharingFor(form);

  function openCreate() {
    setPendaftaranQuery('');
    setPendaftaranNotice(null);
    setForm(emptyForm());
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(item: Rad2Item) {
    setForm({
      nama: item.nama,
      umur: String(item.umur),
      alamat: item.alamat ?? '',
      tanggal: item.tanggal.slice(0, 10),
      pemeriksaan: item.pemeriksaan,
      pengirim: item.pengirim,
      klinis: item.klinis ?? '',
      kesan: item.kesan ?? '',
      radiologi: item.radiologi ?? '',
      harga: String(Math.round(Number(item.harga))),
      sharing: String(Math.round(Number(item.sharing))),
    });
    setError(null);
    setEditing(item);
  }

  function closeModal() {
    setCreateOpen(false);
    setEditing(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        ...form,
        umur: Number(form.umur),
        harga: Number(form.harga || 0),
        sharing: Number(form.sharing || 0),
      };
      if (editing) {
        await apiPatch(`/api/rad2/${editing.id}`, body);
      } else {
        await apiPost('/api/rad2', body);
      }
      closeModal();
      await reload({ resetPage: !editing });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data Rad2');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/rad2/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data Rad2');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleKesanSave(kesan: string) {
    if (!kesanTarget) return;
    setKesanSaving(true);
    setKesanError(null);
    try {
      // API update memvalidasi seluruh field, jadi field lain dikirim apa adanya.
      await apiPatch(`/api/rad2/${kesanTarget.id}`, {
        nama: kesanTarget.nama,
        umur: kesanTarget.umur,
        alamat: kesanTarget.alamat,
        tanggal: kesanTarget.tanggal.slice(0, 10),
        pemeriksaan: kesanTarget.pemeriksaan,
        pengirim: kesanTarget.pengirim,
        klinis: kesanTarget.klinis,
        kesan,
        radiologi: kesanTarget.radiologi,
        harga: Math.round(Number(kesanTarget.harga)),
        sharing: Math.round(Number(kesanTarget.sharing)),
      });
      setKesanTarget(null);
      await reload();
    } catch (err: unknown) {
      setKesanError(err instanceof Error ? err.message : 'Gagal menyimpan kesan');
    } finally {
      setKesanSaving(false);
    }
  }

  async function handlePrint(item: Rad2Item, rowNo: number) {
    setError(null);
    try {
      await printRadiologyReport({
        regCode: String(rowNo),
        nama: item.nama,
        umurLabel: `${item.umur} tahun`,
        tanggal: formatDateShort(item.tanggal),
        alamat: item.alamat?.trim() || '—',
        pemeriksaan: item.pemeriksaan,
        dokterPengirim: item.pengirim,
        klinis: item.klinis?.trim() || '—',
        kesan: item.kesan?.trim() || '—',
        radiologNama: formatRadiologName(item.radiologi),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mencetak hasil');
    }
  }

  /** Bangun PDF laporan dari semua baris yang cocok dengan pencarian + filter aktif. */
  async function buildReportBlob(): Promise<Blob> {
    const rows: Rad2Item[] = [];
    let totalHarga = '0';
    let totalSharing = '0';
    let pageNo = 1;
    let totalPages = 1;
    while (pageNo <= totalPages) {
      const params = new URLSearchParams({ page: String(pageNo), limit: String(REPORT_PAGE_LIMIT) });
      for (const [key, value] of Object.entries(queryParams)) {
        if (value) params.set(key, value);
      }
      const res = await apiGet<Rad2ListResponse>(`/api/rad2?${params.toString()}`);
      rows.push(...res.items);
      totalHarga = res.totalHarga;
      totalSharing = res.totalSharing;
      totalPages = res.pagination.totalPages;
      pageNo += 1;
    }
    return generateRad2ReportBlob({
      dokterLabel: dokterFilter || 'Semua dokter',
      periodeLabel: period.label,
      tanggalCetak: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      items: rows.map((r, idx) => ({
        no: idx + 1,
        nama: r.nama,
        umur: `${r.umur} th`,
        tanggal: formatDateShort(r.tanggal),
        pemeriksaan: r.pemeriksaan,
        pengirim: r.pengirim,
        radiologi: r.radiologi ?? '',
        hargaFormatted: formatRupiah(r.harga),
        sharingFormatted: formatRupiah(r.sharing),
      })),
      totalData: rows.length,
      totalHargaFormatted: formatRupiah(totalHarga),
      totalSharingFormatted: formatRupiah(totalSharing),
      adminNama: adminOptions.find((a) => a.id === adminKlinikId)?.nama ?? '',
    });
  }

  function reportFilename(): string {
    const parts = [dokterFilter, period.dari ? `${period.dari}_${period.sampai || 'akhir'}` : ''].filter(Boolean);
    const suffix = parts.join('_').replace(/[^A-Za-z0-9._-]+/g, '_');
    return suffix ? `Laporan_Rad2_${suffix}.pdf` : 'Laporan_Rad2.pdf';
  }

  async function handleLaporan(mode: 'cetak' | 'pdf') {
    setReporting(true);
    setError(null);
    try {
      const blob = await buildReportBlob();
      if (mode === 'cetak') {
        setPreviewBlob(blob);
        setPreviewOpen(true);
      } else {
        downloadBlob(blob, reportFilename());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat laporan');
    } finally {
      setReporting(false);
    }
  }

  function openCetak(item: Rad2Item, rowNo: number, mode: 'amplop' | 'label') {
    setCetakMode(mode);
    setCetakPasien(toCetakALPasien(item, rowNo));
  }

  return (
    <div className="page-frame page-frame--blue">
      <ListPageShell
        title="Rad2"
        subtitle="Register pemeriksaan radiologi beserta harga dan sharing"
        metrics={[
          { label: 'Total data', value: String(pagination.total), tone: 'blue', iconKind: 'clipboard' },
          { label: 'Total Harga', value: formatRupiah(totals.harga), tone: 'green', iconKind: 'currency' },
          { label: 'Total Sharing', value: formatRupiah(totals.sharing), tone: 'amber', iconKind: 'percent' },
        ]}
        searchPlaceholder="Cari nama, pemeriksaan, pengirim, radiologi..."
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        filterExtra={
          <>
            <select
              className="filter-control filter-control--select"
              value={dokterFilter}
              onChange={(e) => setDokterFilter(e.target.value)}
              aria-label="Filter dokter pengirim"
            >
              <option value="">Semua dokter pengirim</option>
              {dokterOptions.map((d) => (
                <option key={d.id} value={d.nama}>
                  {d.nama}
                </option>
              ))}
            </select>
            <select
              className="filter-control filter-control--select"
              value={periodKind}
              onChange={(e) => setPeriodKind(e.target.value as Rad2PeriodKind)}
              aria-label="Filter periode"
            >
              {RAD2_PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {periodKind === 'custom' && (
              <>
                <input
                  type="date"
                  className="filter-control"
                  value={customDari}
                  max={customSampai || undefined}
                  onChange={(e) => setCustomDari(e.target.value)}
                  aria-label="Tanggal awal"
                />
                <span aria-hidden>s/d</span>
                <input
                  type="date"
                  className="filter-control"
                  value={customSampai}
                  min={customDari || undefined}
                  onChange={(e) => setCustomSampai(e.target.value)}
                  aria-label="Tanggal akhir"
                />
              </>
            )}
            <select
              className="filter-control filter-control--select"
              value={adminKlinikId}
              onChange={(e) => setAdminKlinikId(e.target.value)}
              aria-label="Nama admin pada laporan"
            >
              <option value="">Nama admin…</option>
              {adminOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--secondary" disabled={reporting} onClick={() => void handleLaporan('cetak')}>
              🖨️ {reporting ? 'Menyiapkan…' : 'Cetak'}
            </button>
            <button type="button" className="btn btn--secondary" disabled={reporting} onClick={() => void handleLaporan('pdf')}>
              📄 PDF
            </button>
          </>
        }
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        action={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + Tambah Data
          </button>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>Umur</th>
              <th>Alamat</th>
              <th>Tanggal</th>
              <th>Pemeriksaan</th>
              <th>Pengirim</th>
              <th>Klinis</th>
              <th>Kesan</th>
              <th>Radiologi</th>
              <th style={{ textAlign: 'right' }}>Harga</th>
              <th style={{ textAlign: 'right' }}>Sharing</th>
              <th>Aksi</th>
              <th style={{ textAlign: 'center' }}>Cetak</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Belum ada data Rad2.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const rowNo = (pagination.page - 1) * pagination.limit + idx + 1;
                return (
                  <tr key={item.id}>
                    <td>{rowNo}</td>
                    <td style={{ fontWeight: 600 }}>{item.nama}</td>
                    <td>{item.umur} th</td>
                    <td>{item.alamat || '—'}</td>
                    <td>{formatDateShort(item.tanggal)}</td>
                    <td>{item.pemeriksaan}</td>
                    <td>{item.pengirim}</td>
                    <td style={{ whiteSpace: 'pre-wrap' }}>{item.klinis || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                        <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{item.kesan || '—'}</span>
                        <button
                          type="button"
                          className="btn btn--xs btn--secondary"
                          onClick={() => {
                            setKesanError(null);
                            setKesanTarget(item);
                          }}
                          title="Edit kesan"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </td>
                    <td>{item.radiologi || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(item.harga)}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(item.sharing)}</td>
                    <td>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleting(item)}
                        onPrint={() => void handlePrint(item, rowNo)}
                        editLabel="Ubah data Rad2"
                        deleteLabel="Hapus data Rad2"
                        printLabel="Print hasil"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn--xs btn--secondary"
                          onClick={() => openCetak(item, rowNo, 'amplop')}
                          title="Cetak Amplop"
                        >
                          ✉️ Amplop
                        </button>
                        <button
                          type="button"
                          className="btn btn--xs btn--secondary"
                          onClick={() => openCetak(item, rowNo, 'label')}
                          title="Cetak Label"
                        >
                          🏷️ Label
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={10} style={{ textAlign: 'right' }}>
                  Total ({pagination.total} data)
                </td>
                <td style={{ textAlign: 'right' }}>{formatRupiah(totals.harga)}</td>
                <td style={{ textAlign: 'right' }}>{formatRupiah(totals.sharing)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </ListPageShell>

      {(createOpen || editing) && (
        <Modal open={true} title={editing ? 'Ubah Data Rad2' : 'Tambah Data Rad2'} onClose={closeModal}>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            {!editing && (
              <div className="form-field form-field--full">
                <label htmlFor="rad2-pendaftaran">Ambil otomatis dari Pendaftaran</label>
                <input
                  id="rad2-pendaftaran"
                  type="search"
                  value={pendaftaranQuery}
                  onChange={(e) => setPendaftaranQuery(e.target.value)}
                  // Enter di kolom pencarian tidak boleh menyimpan form.
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  placeholder="Cari nama / no. registrasi, lalu klik pasien untuk mengisi form"
                />
                {pendaftaranNotice && <p className="form-hint">{pendaftaranNotice}</p>}
                <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '0.4rem' }}>
                  {pendaftaranLoading && pendaftaranOptions.length === 0 && umumOptions.length === 0 ? (
                    <p className="form-hint">Memuat pendaftaran…</p>
                  ) : pendaftaranError ? (
                    <p className="alert alert--error">Gagal memuat pendaftaran: {pendaftaranError}</p>
                  ) : pendaftaranOptions.length === 0 && umumOptions.length === 0 ? (
                    <p className="form-hint">
                      {debouncedPendaftaranQuery.trim()
                        ? 'Tidak ada pendaftaran yang cocok dengan pencarian ini.'
                        : 'Belum ada data di Pendaftaran maupun Pendaftaran Umum.'}
                    </p>
                  ) : (
                    <>
                      {pendaftaranOptions.map((p) => (
                        <button
                          key={`pasien-${p.id}`}
                          type="button"
                          className="btn btn--sm btn--secondary"
                          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '0.25rem' }}
                          onClick={() => pickPendaftaran(p)}
                          title="Isi form dari pendaftaran ini"
                        >
                          <strong>{p.nama}</strong> ({p.umur} th) · {p.pemeriksaan.map((x) => x.nama).join(', ') || '—'} ·{' '}
                          {p.pengirim.nama} · {formatDateShort(p.createdAt)} · {p.regCode}
                        </button>
                      ))}
                      {umumOptions.map((p) => (
                        <button
                          key={`umum-${p.id}`}
                          type="button"
                          className="btn btn--sm btn--secondary"
                          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '0.25rem' }}
                          onClick={() => pickPendaftaranUmum(p)}
                          title="Isi form dari pendaftaran umum ini"
                        >
                          <strong>{p.namaPasien}</strong> ({p.umur || '—'}) · Umum · {p.dokterPengirim || '—'} ·{' '}
                          {formatDateShort(p.tanggalMasuk)} · {p.noRegistrasi}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="form-field form-field--full">
              <label htmlFor="rad2-nama">Nama *</label>
              <input id="rad2-nama" required value={form.nama} onChange={(e) => updateForm('nama', e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="rad2-umur">Umur (tahun) *</label>
              <input
                id="rad2-umur"
                type="number"
                min="0"
                max="150"
                step="1"
                required
                value={form.umur}
                onChange={(e) => updateForm('umur', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="rad2-tanggal">Tanggal *</label>
              <input
                id="rad2-tanggal"
                type="date"
                required
                value={form.tanggal}
                onChange={(e) => updateForm('tanggal', e.target.value)}
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="rad2-alamat">Alamat</label>
              <input id="rad2-alamat" value={form.alamat} onChange={(e) => updateForm('alamat', e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="rad2-pemeriksaan">Pemeriksaan *</label>
              <input
                id="rad2-pemeriksaan"
                required
                list="rad2-pemeriksaan-list"
                value={form.pemeriksaan}
                onChange={(e) => handlePemeriksaanChange(e.target.value)}
              />
              <datalist id="rad2-pemeriksaan-list">
                {jenisOptions.map((j) => (
                  <option key={j.id} value={j.nama} />
                ))}
              </datalist>
            </div>
            <div className="form-field">
              <label htmlFor="rad2-pengirim">Pengirim *</label>
              <input
                id="rad2-pengirim"
                required
                list="rad2-pengirim-list"
                value={form.pengirim}
                onChange={(e) => updateForm('pengirim', e.target.value)}
              />
              <datalist id="rad2-pengirim-list">
                {dokterOptions.map((d) => (
                  <option key={d.id} value={d.nama} />
                ))}
              </datalist>
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="rad2-klinis">Klinis</label>
              <textarea
                id="rad2-klinis"
                rows={2}
                value={form.klinis}
                onChange={(e) => updateForm('klinis', e.target.value)}
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="rad2-kesan">Kesan</label>
              <textarea id="rad2-kesan" rows={4} value={form.kesan} onChange={(e) => updateForm('kesan', e.target.value)} />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="rad2-radiologi">Radiologi</label>
              <input
                id="rad2-radiologi"
                list="rad2-radiologi-list"
                value={form.radiologi}
                onChange={(e) => updateForm('radiologi', e.target.value)}
              />
              <datalist id="rad2-radiologi-list">
                {radiologOptions.map((r) => (
                  <option key={r.id} value={r.nama} />
                ))}
              </datalist>
            </div>
            <div className="form-field">
              <label htmlFor="rad2-harga">Harga (Rp)</label>
              <input
                id="rad2-harga"
                type="number"
                min="0"
                step="1"
                value={form.harga}
                onChange={(e) => updateForm('harga', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="rad2-sharing">Sharing (Rp)</label>
              <input
                id="rad2-sharing"
                type="number"
                min="0"
                step="1"
                list="rad2-sharing-list"
                value={form.sharing}
                onChange={(e) => updateForm('sharing', e.target.value)}
              />
              <datalist id="rad2-sharing-list">
                {sharingOptions.map((s) => (
                  <option key={s.id} value={s.nominal} />
                ))}
              </datalist>
              {sharingRule && (
                <small className="form-hint">
                  Otomatis: {formatRupiah(sharingRule.nominal)} ({sharingRule.keterangan})
                  {form.sharing !== String(sharingRule.nominal) && ' — diubah manual'}
                </small>
              )}
            </div>
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
        title="Hapus Data Rad2"
        message={`Yakin hapus data "${deleting?.nama ?? ''}"? Tindakan ini tidak bisa dibatalkan.`}
        loading={submitting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />

      <SharingPdfPreviewModal
        open={previewOpen}
        blob={previewBlob}
        filename={reportFilename()}
        onClose={() => setPreviewOpen(false)}
        title="Pratinjau Laporan Rad2"
      />

      {kesanTarget && (
        <KesanEditorModal
          key={kesanTarget.id}
          nama={kesanTarget.nama}
          initialKesan={kesanTarget.kesan ?? ''}
          saving={kesanSaving}
          error={kesanError}
          onClose={() => setKesanTarget(null)}
          onSave={(kesan) => void handleKesanSave(kesan)}
        />
      )}

      {/* Dipasang ulang tiap dibuka: CetakALModal hanya membaca initialMode saat mount. */}
      {cetakPasien && (
        <CetakALModal
          key={`${cetakPasien.id}-${cetakMode}`}
          open={true}
          onClose={() => setCetakPasien(null)}
          pasien={cetakPasien}
          initialMode={cetakMode}
        />
      )}
    </div>
  );
}
