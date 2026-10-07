import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { SignaturePad } from '../components/SignaturePad.tsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { formatDateShort } from '../lib/format.ts';
import { readFileAsDataUrl } from '../lib/fotoUpload.ts';
import {
  jadwalTldBerikutnya,
  langkahBelumAda,
  LISENSI_TABS,
  sisaHari,
  validateLisensiFile,
  type LisensiKategori,
  type LisensiSectionSpec,
} from '../lib/lisensi.ts';

interface LisensiItem {
  readonly id: string;
  readonly kategori: string;
  readonly jenis: string;
  readonly nama: string;
  readonly keterangan: string | null;
  readonly tanggal: string | null;
  readonly berkas: string | null;
  readonly berkasNama: string | null;
  readonly selesai: boolean;
}

interface EntriForm {
  readonly nama: string;
  readonly tanggal: string;
  readonly keterangan: string;
  readonly selesai: boolean;
  /** Data URL baru, path tersimpan, atau `null` bila tidak ada berkas. */
  readonly berkas: string | null;
  readonly berkasNama: string | null;
}

const EMPTY_FORM: EntriForm = {
  nama: '',
  tanggal: '',
  keterangan: '',
  selesai: false,
  berkas: null,
  berkasNama: null,
};

/** ISO → `YYYY-MM-DD` waktu lokal, untuk `<input type="date">`. */
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` → ISO pada tengah hari waktu lokal, supaya tanggalnya tidak bergeser oleh zona waktu. */
function fromDateInput(value: string): string | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12).toISOString();
}

function isStoredPath(berkas: string | null): berkas is string {
  return berkas !== null && berkas.startsWith('/uploads/');
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

interface SectionProps {
  readonly kategori: LisensiKategori;
  readonly spec: LisensiSectionSpec;
  readonly items: readonly LisensiItem[];
  readonly onChanged: () => Promise<void>;
}

function LisensiSection({ kategori, spec, items, onChanged }: SectionProps) {
  const [form, setForm] = useState<EntriForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LisensiItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Kanvas tanda tangan di-mount ulang lewat key ini saat form direset. */
  const [padKey, setPadKey] = useState(0);
  const idPrefix = `lisensi-${kategori}-${spec.jenis}`;
  const showForm = !spec.tunggal || items.length === 0 || editingId !== null;

  function resetForm(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPadKey((k) => k + 1);
  }

  function startEdit(item: LisensiItem): void {
    setEditingId(item.id);
    setError(null);
    setForm({
      nama: item.nama,
      tanggal: toDateInput(item.tanggal),
      keterangan: item.keterangan ?? '',
      selesai: item.selesai,
      berkas: item.berkas,
      berkasNama: item.berkasNama,
    });
    setPadKey((k) => k + 1);
  }

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const invalid = validateLisensiFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setError(null);
      setForm((f) => ({ ...f, berkas: dataUrl, berkasNama: file.name }));
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal membaca file'));
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (spec.berkas === 'ttd' && !form.berkas) {
      setError('Tanda tangan belum diisi');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      nama: form.nama,
      tanggal: fromDateInput(form.tanggal),
      keterangan: form.keterangan,
      selesai: form.selesai,
      berkas: form.berkas,
      berkasNama: form.berkasNama,
    };
    try {
      if (editingId) {
        await apiPatch(`/api/lisensi/${editingId}`, body);
      } else {
        await apiPost('/api/lisensi', { ...body, kategori, jenis: spec.jenis });
      }
      resetForm();
      await onChanged();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleSelesai(item: LisensiItem): Promise<void> {
    setError(null);
    try {
      await apiPatch(`/api/lisensi/${item.id}`, { selesai: !item.selesai });
      await onChanged();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal mengubah status'));
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/lisensi/${deleteTarget.id}`);
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await onChanged();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal menghapus'));
    } finally {
      setDeleting(false);
    }
  }

  const langkahKurang = spec.langkahBawaan
    ? langkahBelumAda(
        spec.langkahBawaan,
        items.map((item) => item.nama),
      )
    : [];

  async function isiLangkahBawaan(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      // Berurutan supaya urutan createdAt (urutan tampil) sama dengan urutan tahapan.
      for (const nama of langkahKurang) {
        await apiPost('/api/lisensi', { kategori, jenis: spec.jenis, nama });
      }
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal mengisi tahapan'));
    } finally {
      setSaving(false);
      await onChanged();
    }
  }

  const today = new Date();
  const tldBerikutnya = spec.jadwalTld
    ? jadwalTldBerikutnya(items.map((item) => item.tanggal))
    : null;
  const tldSisa = tldBerikutnya ? sisaHari(tldBerikutnya, today) : null;
  const columnCount =
    3 +
    (spec.tanggalLabel ? 1 : 0) +
    (spec.keteranganLabel ? 1 : 0) +
    (spec.berkas !== 'none' ? 1 : 0) +
    (spec.selesaiLabel ? 1 : 0) -
    (spec.tunggal ? 1 : 0);

  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.2rem', fontSize: '1rem' }}>{spec.judul}</h3>
      {spec.keterangan ? (
        <p
          style={{
            margin: '0 0 0.6rem',
            fontSize: '0.82rem',
            color: '#64748b',
          }}
        >
          {spec.keterangan}
        </p>
      ) : null}

      {spec.jadwalTld ? (
        <p
          className={`alert ${tldSisa !== null && tldSisa < 0 ? 'alert--error' : 'alert--success'}`}
          style={{ marginBottom: '0.6rem' }}
        >
          {tldBerikutnya && tldSisa !== null ? (
            <>
              Pengiriman TLD berikutnya:{' '}
              <strong>{formatDateShort(tldBerikutnya.toISOString())}</strong>{' '}
              {tldSisa < 0
                ? `(terlambat ${-tldSisa} hari)`
                : tldSisa === 0
                  ? '(hari ini)'
                  : `(${tldSisa} hari lagi)`}
            </>
          ) : (
            'Belum ada pengiriman TLD. Catat pengiriman pertama; jadwal berikutnya dihitung otomatis setiap 3 bulan.'
          )}
        </p>
      ) : null}

      {showForm ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
          <div className="form-field">
            <label htmlFor={`${idPrefix}-nama`}>{spec.namaLabel} *</label>
            <input
              id={`${idPrefix}-nama`}
              required
              maxLength={200}
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
            />
          </div>
          {spec.tanggalLabel ? (
            <div className="form-field">
              <label htmlFor={`${idPrefix}-tanggal`}>
                {spec.tanggalLabel}
                {spec.tanggalWajib ? ' *' : ''}
              </label>
              <input
                id={`${idPrefix}-tanggal`}
                type="date"
                required={spec.tanggalWajib}
                value={form.tanggal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tanggal: e.target.value }))
                }
              />
            </div>
          ) : null}
          {spec.keteranganLabel ? (
            <div className="form-field">
              <label htmlFor={`${idPrefix}-keterangan`}>
                {spec.keteranganLabel}
              </label>
              <input
                id={`${idPrefix}-keterangan`}
                maxLength={1000}
                value={form.keterangan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keterangan: e.target.value }))
                }
              />
            </div>
          ) : null}
          {spec.selesaiLabel ? (
            <div className="form-field">
              <label htmlFor={`${idPrefix}-selesai`}>{spec.selesaiLabel}</label>
              <input
                id={`${idPrefix}-selesai`}
                type="checkbox"
                checked={form.selesai}
                onChange={(e) =>
                  setForm((f) => ({ ...f, selesai: e.target.checked }))
                }
                style={{ width: 'auto' }}
              />
            </div>
          ) : null}

          {spec.berkas === 'ttd' ? (
            <div className="form-field form-field--full">
              <label>{spec.berkasLabel} *</label>
              {isStoredPath(form.berkas) ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <img
                    src={form.berkas}
                    alt="Tanda tangan tersimpan"
                    style={{ height: '70px', background: '#fff' }}
                  />
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setForm((f) => ({ ...f, berkas: null }))}
                  >
                    Gambar Ulang
                  </button>
                </div>
              ) : (
                <SignaturePad
                  key={padKey}
                  onChange={(dataUrl) =>
                    setForm((f) => ({ ...f, berkas: dataUrl }))
                  }
                />
              )}
            </div>
          ) : null}

          {spec.berkas === 'file' ? (
            <div className="form-field form-field--full">
              <label htmlFor={`${idPrefix}-berkas`}>
                {spec.berkasLabel} (PDF / gambar, maks. 10 MB)
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  id={`${idPrefix}-berkas`}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => void handleFile(e)}
                />
                {form.berkas ? (
                  <>
                    <span style={{ fontSize: '0.82rem' }}>
                      {form.berkasNama ?? 'Berkas terlampir'}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          berkas: null,
                          berkasNama: null,
                        }))
                      }
                    >
                      Lepas Berkas
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            className="form-field form-field--full"
            style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem' }}
          >
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={saving}
            >
              {saving
                ? 'Menyimpan...'
                : editingId
                  ? 'Simpan Perubahan'
                  : '+ Tambah'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={resetForm}
              >
                Batal Ubah
              </button>
            ) : null}
            {langkahKurang.length > 0 && !editingId ? (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={saving}
                onClick={() => void isiLangkahBawaan()}
              >
                Isi Tahapan Standar ({langkahKurang.length})
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? <p className="alert alert--error">{error}</p> : null}

      <table className="data-table" style={{ marginTop: '0.6rem' }}>
        <thead>
          <tr>
            {spec.tunggal ? null : <th style={{ width: '50px' }}>No</th>}
            <th>{spec.namaLabel}</th>
            {spec.tanggalLabel ? (
              <th style={{ width: '130px' }}>{spec.tanggalLabel}</th>
            ) : null}
            {spec.keteranganLabel ? <th>{spec.keteranganLabel}</th> : null}
            {spec.berkas !== 'none' ? <th>{spec.berkasLabel}</th> : null}
            {spec.selesaiLabel ? (
              <th style={{ width: '80px' }}>{spec.selesaiLabel}</th>
            ) : null}
            <th style={{ width: '140px' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={columnCount}
                style={{
                  textAlign: 'center',
                  padding: '1rem',
                  color: '#64748b',
                }}
              >
                Belum ada data.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const terlambat =
                spec.selesaiLabel !== undefined &&
                spec.tanggalWajib === true &&
                !item.selesai &&
                item.tanggal !== null &&
                sisaHari(new Date(item.tanggal), today) < 0;
              return (
                <tr
                  key={item.id}
                  style={terlambat ? { background: '#fef2f2' } : undefined}
                >
                  {spec.tunggal ? null : <td>{idx + 1}</td>}
                  <td>
                    <strong>{item.nama}</strong>
                  </td>
                  {spec.tanggalLabel ? (
                    <td>
                      {item.tanggal ? formatDateShort(item.tanggal) : '—'}
                      {terlambat ? (
                        <div style={{ color: '#b91c1c', fontSize: '0.75rem' }}>
                          Lewat jatuh tempo
                        </div>
                      ) : null}
                    </td>
                  ) : null}
                  {spec.keteranganLabel ? (
                    <td>{item.keterangan || '—'}</td>
                  ) : null}
                  {spec.berkas === 'ttd' ? (
                    <td>
                      {item.berkas ? (
                        <img
                          src={item.berkas}
                          alt={`Tanda tangan ${item.nama}`}
                          style={{ height: '48px', background: '#fff' }}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                  {spec.berkas === 'file' ? (
                    <td>
                      {item.berkas ? (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <a
                            className="btn btn--secondary btn--sm"
                            href={item.berkas}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Lihat
                          </a>
                          <a
                            className="btn btn--secondary btn--sm"
                            href={item.berkas}
                            download={item.berkasNama ?? true}
                          >
                            Unduh
                          </a>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                  {spec.selesaiLabel ? (
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={item.selesai}
                        aria-label={`${spec.selesaiLabel}: ${item.nama}`}
                        onChange={() => void toggleSelesai(item)}
                      />
                    </td>
                  ) : null}
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => startEdit(item)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setDeleteTarget(item)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus Data"
        message={`Yakin hapus "${deleteTarget?.nama ?? ''}"?`}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}

/** Menu "Lisensi": berkas perizinan klinik per instansi, dari RT/RW sampai surat izin terpadu. */
export function LisensiPage() {
  const [kategori, setKategori] = useState<LisensiKategori>('rtrw');
  const [items, setItems] = useState<readonly LisensiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tab =
    LISENSI_TABS.find((t) => t.kategori === kategori) ?? LISENSI_TABS[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ items: LisensiItem[] }>(
        `/api/lisensi?kategori=${encodeURIComponent(kategori)}`,
      );
      setItems(res.items);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal memuat data lisensi'));
    } finally {
      setLoading(false);
    }
  }, [kategori]);

  useEffect(() => {
    setItems([]);
    void load();
  }, [load]);

  return (
    <div className="page-frame">
      <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem' }}>Lisensi</h2>
      <p
        style={{ margin: '0 0 0.8rem', fontSize: '0.85rem', color: '#64748b' }}
      >
        Berkas perizinan klinik per instansi: tanda tangan, surat, jadwal, dan
        tahapan sampai surat izin terbit.
      </p>

      <div
        className="filter-tabs"
        role="tablist"
        aria-label="Instansi perizinan"
        style={{ marginBottom: '1rem', flexWrap: 'wrap' }}
      >
        {LISENSI_TABS.map((t) => (
          <button
            key={t.kategori}
            type="button"
            role="tab"
            aria-selected={t.kategori === kategori}
            className={`filter-tab${t.kategori === kategori ? ' filter-tab--active' : ''}`}
            onClick={() => setKategori(t.kategori)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab ? (
        <>
          <h3 style={{ margin: '0 0 0.8rem', fontSize: '1.05rem' }}>
            {tab.judul}
          </h3>
          {error ? <p className="alert alert--error">{error}</p> : null}
          {loading && items.length === 0 ? (
            <p style={{ color: '#64748b' }}>Memuat...</p>
          ) : null}
          {tab.sections.map((spec) => (
            <LisensiSection
              key={`${tab.kategori}-${spec.jenis}`}
              kategori={tab.kategori}
              spec={spec}
              items={items.filter(
                (item) =>
                  item.kategori === tab.kategori && item.jenis === spec.jenis,
              )}
              onChanged={load}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
