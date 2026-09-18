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

interface LabParameterRow {
  readonly pemeriksaan: string;
  readonly hasil: string;
  readonly nilaiRujukan: string;
  readonly satuan: string;
}

interface AiLabItem {
  readonly id: string;
  readonly namaPasien: string;
  readonly kategori: string;
  readonly parameterData: readonly LabParameterRow[];
  readonly namaPenyakit: string | null;
  readonly kesan: string | null;
  readonly isDraftAi: boolean;
  readonly petugasLabNama: string | null;
  readonly tanggal: string;
}

const KATEGORI_LIST = ['Hematologi', 'Kimia Darah', 'Widal'] as const;
type Kategori = (typeof KATEGORI_LIST)[number];

const PARAMETER_TEMPLATE: Readonly<Record<Kategori, readonly Omit<LabParameterRow, 'hasil'>[]>> = {
  Hematologi: [
    { pemeriksaan: 'Hemoglobin (Hb)', nilaiRujukan: '12 - 16 g/dL', satuan: 'g/dL' },
    { pemeriksaan: 'Leukosit (WBC)', nilaiRujukan: '4.000 - 10.000 /µL', satuan: '/µL' },
    { pemeriksaan: 'Trombosit (PLT)', nilaiRujukan: '150.000 - 400.000 /µL', satuan: '/µL' },
    { pemeriksaan: 'Erytrosit (RBC)', nilaiRujukan: '4,0 - 5,5 juta/µL', satuan: 'juta/µL' },
    { pemeriksaan: 'Hematokrit (Ht)', nilaiRujukan: '37 - 48 %', satuan: '%' },
    { pemeriksaan: 'MCV', nilaiRujukan: '80 - 100 fL', satuan: 'fL' },
    { pemeriksaan: 'MCH', nilaiRujukan: '27 - 34 pg', satuan: 'pg' },
    { pemeriksaan: 'MCHC', nilaiRujukan: '32 - 36 g/dL', satuan: 'g/dL' },
  ],
  'Kimia Darah': [
    { pemeriksaan: 'SGOT (AST)', nilaiRujukan: '< 35 U/L', satuan: 'U/L' },
    { pemeriksaan: 'SGPT (ALT)', nilaiRujukan: '< 40 U/L', satuan: 'U/L' },
    { pemeriksaan: 'Ureum', nilaiRujukan: '15 - 45 mg/dL', satuan: 'mg/dL' },
    { pemeriksaan: 'Kreatinin', nilaiRujukan: '0,6 - 1,2 mg/dL', satuan: 'mg/dL' },
    { pemeriksaan: 'Asam Urat', nilaiRujukan: '2,4 - 7,0 mg/dL', satuan: 'mg/dL' },
    { pemeriksaan: 'Kolesterol Total', nilaiRujukan: '< 200 mg/dL', satuan: 'mg/dL' },
    { pemeriksaan: 'Trigliserida', nilaiRujukan: '< 150 mg/dL', satuan: 'mg/dL' },
    { pemeriksaan: 'HDL Kolesterol', nilaiRujukan: '> 40 mg/dL', satuan: 'mg/dL' },
    { pemeriksaan: 'LDL Kolesterol', nilaiRujukan: '< 100 mg/dL', satuan: 'mg/dL' },
    { pemeriksaan: 'Bilirubin Total', nilaiRujukan: '0,2 - 1,2 mg/dL', satuan: 'mg/dL' },
  ],
  Widal: [
    { pemeriksaan: 'Salmonella Typhi O', nilaiRujukan: '(-) Negatif', satuan: 'Titer' },
    { pemeriksaan: 'Salmonella Paratyphi AO', nilaiRujukan: '(-) Negatif', satuan: 'Titer' },
    { pemeriksaan: 'Salmonella Paratyphi BO', nilaiRujukan: '(-) Negatif', satuan: 'Titer' },
    { pemeriksaan: 'Salmonella Paratyphi CO', nilaiRujukan: '(-) Negatif', satuan: 'Titer' },
    { pemeriksaan: 'Salmonella Typhi H', nilaiRujukan: '(-) Negatif', satuan: 'Titer' },
    { pemeriksaan: 'Salmonella Paratyphi AH', nilaiRujukan: '(-) Negatif', satuan: 'Titer' },
    { pemeriksaan: 'Salmonella Paratyphi BH', nilaiRujukan: '(-) Negatif', satuan: 'Titer' },
    { pemeriksaan: 'Salmonella Paratyphi CH', nilaiRujukan: '(-) Negatif', satuan: 'Titer' },
  ],
};

function buildRowsForKategori(kategori: Kategori): LabParameterRow[] {
  return PARAMETER_TEMPLATE[kategori].map((p) => ({ ...p, hasil: '' }));
}

const emptyForm = {
  namaPasien: '',
  kategori: 'Hematologi' as Kategori,
  petugasLabNama: '',
  namaPenyakit: '',
  kesan: '',
};

export function AiLabPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const {
    items,
    pagination,
    setPage,
    loading,
    error,
    setError,
    reload: reloadList,
  } = usePaginatedList<AiLabItem>('/api/analisa-lab-ai', queryParams);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AiLabItem | null>(null);
  const [deleting, setDeleting] = useState<AiLabItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState<LabParameterRow[]>(buildRowsForKategori('Hematologi'));

  const [isDraftAi, setIsDraftAi] = useState(false);
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [fotoDataUrl, setFotoDataUrl] = useState('');
  const [readingFoto, setReadingFoto] = useState(false);
  const [readFotoError, setReadFotoError] = useState<string | null>(null);

  function openCreate() {
    setForm(emptyForm);
    setRows(buildRowsForKategori('Hematologi'));
    setIsDraftAi(false);
    setConfirmReviewed(false);
    setAnalyzeError(null);
    setError(null);
    setFotoDataUrl('');
    setReadFotoError(null);
    setCreateOpen(true);
  }

  function openEdit(item: AiLabItem) {
    const kategori = (KATEGORI_LIST as readonly string[]).includes(item.kategori)
      ? (item.kategori as Kategori)
      : 'Hematologi';
    setForm({
      namaPasien: item.namaPasien,
      kategori,
      petugasLabNama: item.petugasLabNama ?? '',
      namaPenyakit: item.namaPenyakit ?? '',
      kesan: item.kesan ?? '',
    });
    setRows(
      item.parameterData.length > 0
        ? item.parameterData.map((p) => ({ ...p }))
        : buildRowsForKategori(kategori),
    );
    setIsDraftAi(item.isDraftAi);
    setConfirmReviewed(false);
    setAnalyzeError(null);
    setError(null);
    setFotoDataUrl('');
    setReadFotoError(null);
    setEditing(item);
  }

  function closeModal() {
    setCreateOpen(false);
    setEditing(null);
  }

  function handleKategoriChange(kategori: Kategori) {
    setForm((f) => ({ ...f, kategori }));
    setRows(buildRowsForKategori(kategori));
  }

  function handleHasilChange(index: number, hasil: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, hasil } : row)));
  }

  function handleFotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFotoDataUrl(reader.result);
        setReadFotoError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleReadFoto() {
    if (!fotoDataUrl) {
      setReadFotoError('Unggah foto hasil pemeriksaan terlebih dahulu.');
      return;
    }
    setReadingFoto(true);
    setReadFotoError(null);
    try {
      const res = await apiPost<{ results: readonly { pemeriksaan: string; hasil: string }[] }>(
        '/api/analisa-lab-ai/read-foto',
        { fotoDataUrl, parameterNames: rows.map((r) => r.pemeriksaan) },
      );
      setRows((prev) =>
        prev.map((row) => {
          const match = res.results.find(
            (r) => r.pemeriksaan.trim().toLowerCase() === row.pemeriksaan.trim().toLowerCase(),
          );
          return match && match.hasil ? { ...row, hasil: match.hasil } : row;
        }),
      );
    } catch (err) {
      setReadFotoError(err instanceof Error ? err.message : 'Gagal membaca foto dengan AI');
    } finally {
      setReadingFoto(false);
    }
  }

  async function handleStartAnalyze() {
    const filledRows = rows.filter((r) => r.hasil.trim());
    if (filledRows.length === 0) {
      setAnalyzeError('Isi minimal satu hasil pemeriksaan sebelum memulai analisa AI.');
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await apiPost<{ namaPenyakit: string; kesan: string }>('/api/analisa-lab-ai/analyze', {
        namaPasien: form.namaPasien || undefined,
        kategori: form.kategori,
        parameterData: filledRows,
      });
      setForm((f) => ({ ...f, namaPenyakit: res.namaPenyakit, kesan: res.kesan }));
      setIsDraftAi(true);
      setConfirmReviewed(false);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Gagal menganalisa data dengan AI');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filledRows = rows.filter((r) => r.hasil.trim());
    if (!form.namaPasien.trim() || filledRows.length === 0) {
      setError('Nama pasien dan minimal satu hasil pemeriksaan wajib diisi');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        namaPasien: form.namaPasien,
        kategori: form.kategori,
        parameterData: filledRows,
        namaPenyakit: form.namaPenyakit || undefined,
        kesan: form.kesan || undefined,
        petugasLabNama: form.petugasLabNama || undefined,
        isDraftAi: isDraftAi && !confirmReviewed,
      };
      if (editing) {
        await apiPatch(`/api/analisa-lab-ai/${editing.id}`, body);
      } else {
        await apiPost('/api/analisa-lab-ai', body);
      }
      closeModal();
      await reload({ resetPage: !editing });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data AI Lab');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/analisa-lab-ai/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data AI Lab');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ListPageShell
        title="AI Lab"
        subtitle="Isi hasil pemeriksaan Hematologi, Kimia Darah, atau Widal — AI memberi draft kemungkinan penyakit & kesan, wajib ditinjau ulang petugas lab/dokter sebelum dipakai"
        metrics={[{ label: 'Total Data', value: String(pagination.total), tone: 'blue', iconKind: 'clipboard' }]}
        searchPlaceholder="Cari nama pasien..."
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        action={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + Tambah AI Lab
          </button>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Pasien</th>
                <th>Kategori</th>
                <th>Kemungkinan Penyakit</th>
                <th>Kesan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Belum ada data AI Lab.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.namaPasien}</td>
                    <td>{item.kategori}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                      {item.isDraftAi && (
                        <span className="badge badge--warn" style={{ display: 'inline-block', marginBottom: '0.3rem' }}>
                          ⚠️ DRAFT AI — belum ditinjau
                        </span>
                      )}
                      {item.namaPenyakit || '—'}
                    </td>
                    <td style={{ maxWidth: '260px', whiteSpace: 'normal' }}>{item.kesan || '—'}</td>
                    <td>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleting(item)}
                        editLabel="Ubah / tinjau data"
                        deleteLabel="Hapus data"
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
        <Modal open={true} title={editing ? 'Ubah / Tinjau AI Lab' : 'Tambah AI Lab'} onClose={closeModal} size="xl">
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <div className="form-field">
              <label htmlFor="al-nama">Nama Pasien *</label>
              <input
                id="al-nama"
                required
                value={form.namaPasien}
                onChange={(e) => setForm((f) => ({ ...f, namaPasien: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="al-kategori">Kategori *</label>
              <select
                id="al-kategori"
                value={form.kategori}
                onChange={(e) => handleKategoriChange(e.target.value as Kategori)}
              >
                {KATEGORI_LIST.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="al-petugas">Nama Petugas Lab/Dokter</label>
              <input
                id="al-petugas"
                value={form.petugasLabNama}
                onChange={(e) => setForm((f) => ({ ...f, petugasLabNama: e.target.value }))}
              />
            </div>

            <div className="form-field form-grid--full">
              <label htmlFor="al-foto">Foto Hasil Pemeriksaan (opsional)</label>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Unggah foto print out alat/hasil manual — AI akan membaca nilainya dan mengisi otomatis kolom
                Hasil di tabel bawah sesuai nama parameternya.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <input id="al-foto" type="file" accept="image/*" onChange={handleFotoFileChange} />
                {fotoDataUrl && (
                  <img
                    src={fotoDataUrl}
                    alt="Preview foto hasil pemeriksaan"
                    style={{ height: '60px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  />
                )}
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  disabled={!fotoDataUrl || readingFoto}
                  onClick={() => void handleReadFoto()}
                >
                  {readingFoto ? '⏳ Membaca foto...' : '📷 Baca & Isi Otomatis'}
                </button>
              </div>
              {readFotoError && (
                <p className="alert alert--error" style={{ margin: '0.4rem 0 0' }}>
                  {readFotoError}
                </p>
              )}
            </div>

            <div className="form-field form-grid--full">
              <label>Hasil Pemeriksaan ({form.kategori})</label>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Hasil</th>
                      <th>Satuan</th>
                      <th>Nilai Rujukan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.pemeriksaan}>
                        <td>{row.pemeriksaan}</td>
                        <td>
                          <input
                            value={row.hasil}
                            onChange={(e) => handleHasilChange(index, e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>{row.satuan}</td>
                        <td>{row.nilaiRujukan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-field form-grid--full">
              <button
                type="button"
                className="aifoto-analyze-btn"
                disabled={analyzing}
                onClick={() => void handleStartAnalyze()}
              >
                {analyzing ? '⏳ Menganalisa data...' : '✨ Start — Analisa Lab dengan AI'}
              </button>
              {analyzeError && (
                <p className="alert alert--error" style={{ margin: 0 }}>
                  {analyzeError}
                </p>
              )}
            </div>

            {isDraftAi && (
              <div className="form-grid--full aifoto-draft-banner">
                <strong style={{ color: '#92400e' }}>⚠️ Draft AI — belum final.</strong>{' '}
                <span style={{ color: '#78350f', fontSize: '0.85rem' }}>
                  Kemungkinan penyakit dan kesan di bawah dihasilkan otomatis oleh AI dan WAJIB diperiksa
                  ulang oleh petugas lab/dokter sebelum dipakai. Periksa dan edit bila perlu, lalu centang
                  konfirmasi berikut sebelum menyimpan sebagai hasil final.
                </span>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.6rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#78350f',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmReviewed}
                    onChange={(e) => setConfirmReviewed(e.target.checked)}
                  />
                  Saya (petugas lab/dokter) sudah meninjau ulang hasil ini dan menyatakannya benar
                </label>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="al-penyakit">Kemungkinan Penyakit</label>
              <input
                id="al-penyakit"
                value={form.namaPenyakit}
                onChange={(e) => setForm((f) => ({ ...f, namaPenyakit: e.target.value }))}
              />
            </div>
            <div className="form-field form-grid--full">
              <label htmlFor="al-kesan">Kesan</label>
              <textarea
                id="al-kesan"
                rows={4}
                value={form.kesan}
                onChange={(e) => setForm((f) => ({ ...f, kesan: e.target.value }))}
              />
            </div>

            <ModalFormFooter onCancel={closeModal} submitLabel={editing ? 'Simpan Perubahan' : 'Simpan'} loading={submitting} />
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={deleting !== null}
        title="Hapus AI Lab"
        message={`Yakin hapus data AI Lab "${deleting?.namaPasien ?? ''}"?`}
        loading={submitting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}
