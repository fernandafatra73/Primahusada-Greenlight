import { useState, type FormEvent } from 'react';
import { pdf } from '@react-pdf/renderer';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { SharingPdfPreviewModal } from '../components/ui/SharingPdfPreviewModal.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiPatch, apiPost } from '../lib/api.ts';
import { formatDateShort } from '../lib/format.ts';
import { LogoPerusahaanReportDocument } from '../pdf/LogoPerusahaanReportDocument.tsx';
import '../components/ui/ui.css';

interface LogoPerusahaanItem {
  readonly id: string;
  readonly namaKlinik: string;
  readonly alamat: string | null;
  readonly noTelepon: string | null;
  readonly email: string | null;
  readonly penanggungJawab: string | null;
  readonly logoTandaTangan: string | null;
  readonly logoPerusahaan: string | null;
}

function FormSection({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div className="form-field form-field--full" style={{ marginTop: '0.25rem' }}>
      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--color-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.5rem',
        }}
      >
        {title}
      </p>
      <div className="form-grid" style={{ marginBottom: 0 }}>
        {children}
      </div>
    </div>
  );
}

function LogoUploadField({
  id,
  label,
  value,
  onChange,
  previewStyle,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly previewStyle: React.CSSProperties;
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="file" accept="image/*" onChange={handleFile} />
      {value && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src={value}
            alt={`Preview ${label}`}
            style={{ ...previewStyle, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: '6px', background: '#fff' }}
          />
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => onChange(null)}
            style={{ border: '1px solid var(--color-border)' }}
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}

export function LogoPerusahaanPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<LogoPerusahaanItem>('/api/logo-perusahaan', queryParams);
  const reload = useMutationReload(reloadList);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [namaKlinik, setNamaKlinik] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [email, setEmail] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState('');
  const [logoTandaTangan, setLogoTandaTangan] = useState<string | null>(null);
  const [logoPerusahaan, setLogoPerusahaan] = useState<string | null>(null);

  const [printingId, setPrintingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('Kop_Surat.pdf');

  function resetForm() {
    setNamaKlinik('');
    setAlamat('');
    setNoTelepon('');
    setEmail('');
    setPenanggungJawab('');
    setLogoTandaTangan(null);
    setLogoPerusahaan(null);
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setModalMode('add');
  }

  function openEdit(item: LogoPerusahaanItem) {
    setEditingId(item.id);
    setNamaKlinik(item.namaKlinik);
    setAlamat(item.alamat ?? '');
    setNoTelepon(item.noTelepon ?? '');
    setEmail(item.email ?? '');
    setPenanggungJawab(item.penanggungJawab ?? '');
    setLogoTandaTangan(item.logoTandaTangan);
    setLogoPerusahaan(item.logoPerusahaan);
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { namaKlinik, alamat, noTelepon, email, penanggungJawab, logoTandaTangan, logoPerusahaan };
    try {
      if (modalMode === 'add') {
        await apiPost('/api/logo-perusahaan', body);
      } else if (editingId) {
        await apiPatch(`/api/logo-perusahaan/${editingId}`, body);
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
      await apiDelete(`/api/logo-perusahaan/${deleteTarget.id}`);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handlePreview(item: LogoPerusahaanItem) {
    setPrintingId(item.id);
    try {
      const blob = await pdf(
        <LogoPerusahaanReportDocument
          data={{
            namaKlinik: item.namaKlinik,
            alamat: item.alamat,
            noTelepon: item.noTelepon,
            email: item.email,
            penanggungJawab: item.penanggungJawab,
            logoPerusahaan: item.logoPerusahaan,
            logoTandaTangan: item.logoTandaTangan,
            tanggalCetak: formatDateShort(new Date().toISOString()),
          }}
        />,
      ).toBlob();
      setPreviewFilename(`Contoh_Kop_Surat_${item.namaKlinik.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      setPreviewBlob(blob);
      setPreviewOpen(true);
    } finally {
      setPrintingId(null);
    }
  }

  const form = (
    <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
      <FormSection title="Identitas Klinik">
        <div className="form-field form-field--full">
          <label htmlFor="lp-nama-klinik">Nama Klinik</label>
          <input id="lp-nama-klinik" required value={namaKlinik} onChange={(e) => setNamaKlinik(e.target.value)} />
        </div>
        <div className="form-field form-field--full">
          <label htmlFor="lp-penanggung-jawab">Penanggung Jawab</label>
          <input
            id="lp-penanggung-jawab"
            placeholder="mis. dr. Andi Wijaya"
            value={penanggungJawab}
            onChange={(e) => setPenanggungJawab(e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title="Kontak">
        <div className="form-field form-field--full">
          <label htmlFor="lp-alamat">Alamat Klinik</label>
          <textarea id="lp-alamat" rows={2} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="lp-telepon">Nomor Telepon</label>
          <input id="lp-telepon" value={noTelepon} onChange={(e) => setNoTelepon(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="lp-email">Email</label>
          <input id="lp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </FormSection>

      <FormSection title="Logo & Tanda Tangan">
        <LogoUploadField
          id="lp-logo-perusahaan"
          label="Logo Perusahaan"
          value={logoPerusahaan}
          onChange={setLogoPerusahaan}
          previewStyle={{ width: 80, height: 80 }}
        />
        <LogoUploadField
          id="lp-logo-ttd"
          label="Logo Tanda Tangan"
          value={logoTandaTangan}
          onChange={setLogoTandaTangan}
          previewStyle={{ width: 120, height: 64 }}
        />
      </FormSection>

      <ModalFormFooter onCancel={() => setModalMode(null)} submitLabel="Simpan" loading={saving} />
    </form>
  );

  return (
    <>
      <ListPageShell
        title="Pengaturan Kop Surat & Logo"
        subtitle="Identitas, kontak, dan logo klinik untuk kop surat resmi"
        action={
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            + Tambah
          </button>
        }
        metrics={[
          {
            label: 'Total data',
            value: String(pagination.total),
            tone: 'blue',
            iconKind: 'clipboard',
          },
        ]}
        searchPlaceholder="Cari nama klinik, alamat, atau email…"
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
              <th>Logo</th>
              <th>Klinik</th>
              <th>Kontak</th>
              <th>Tanda Tangan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5}>Belum ada data.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.logoPerusahaan ? (
                      <img
                        src={item.logoPerusahaan}
                        alt={item.namaKlinik}
                        style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.namaKlinik}</div>
                    {item.penanggungJawab && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                        PJ: {item.penanggungJawab}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {item.alamat && <div>{item.alamat}</div>}
                    {item.noTelepon && <div style={{ color: 'var(--color-text-muted)' }}>{item.noTelepon}</div>}
                    {item.email && <div style={{ color: 'var(--color-text-muted)' }}>{item.email}</div>}
                    {!item.alamat && !item.noTelepon && !item.email && '—'}
                  </td>
                  <td>
                    {item.logoTandaTangan ? (
                      <img
                        src={item.logoTandaTangan}
                        alt={`Tanda tangan ${item.namaKlinik}`}
                        style={{ width: 80, height: 44, objectFit: 'contain', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <TableRowActions
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleteTarget({ id: item.id, label: item.namaKlinik })}
                      onPrint={() => void handlePreview(item)}
                      printLabel={printingId === item.id ? 'Membuat PDF…' : 'Cetak / Preview Kop Surat'}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <Modal open={modalMode === 'add'} title="Tambah Pengaturan Kop Surat & Logo" onClose={() => setModalMode(null)} size="lg">
        {form}
      </Modal>
      <Modal open={modalMode === 'edit'} title="Ubah Pengaturan Kop Surat & Logo" onClose={() => setModalMode(null)} size="lg">
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
        filename={previewFilename}
        onClose={() => setPreviewOpen(false)}
        title="Pratinjau Contoh Kop Surat"
      />
    </>
  );
}
