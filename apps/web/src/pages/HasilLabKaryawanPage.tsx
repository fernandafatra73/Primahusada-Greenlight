import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  TahunSelect,
  useDaftarKaryawan,
} from '../components/LisensiKaryawanShared.tsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { SharingPdfPreviewModal } from '../components/ui/SharingPdfPreviewModal.tsx';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { formatDateShort } from '../lib/format.ts';
import { readFileAsDataUrl } from '../lib/fotoUpload.ts';
import {
  fromDateInput,
  toDateInput,
  validateLisensiFile,
} from '../lib/lisensi.ts';
import {
  barisHasilLabBaru,
  barisUntukJenis,
  JENIS_LAB_BAWAAN,
  kelompokPerJenis,
  pilihanTahun,
  type HasilLabBaris,
} from '../lib/lisensiKaryawan.ts';
import { generateHasilLabKaryawanBlob } from '../pdf/printLisensiKaryawan.tsx';

interface HasilLabItem {
  readonly id: string;
  readonly tahun: number;
  readonly nama: string;
  readonly jabatan: string | null;
  readonly tanggalPeriksa: string;
  readonly catatan: string | null;
  readonly berkas: string | null;
  readonly berkasNama: string | null;
  readonly items: ReadonlyArray<{
    readonly jenis: string;
    readonly parameter: string;
    readonly hasil: string;
    readonly satuan: string | null;
    readonly nilaiNormal: string | null;
  }>;
}

/** Baris di form; `key` stabil supaya input tidak tertukar saat baris dihapus. */
type BarisForm = HasilLabBaris & { readonly key: number };

interface LabForm {
  readonly nama: string;
  readonly jabatan: string;
  readonly tanggalPeriksa: string;
  readonly catatan: string;
  readonly berkas: string | null;
  readonly berkasNama: string | null;
}

const JENIS_LAIN = '__lain__';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** Menu Lisensi > Hasil Lab: hasil pemeriksaan laboratorium tahunan karyawan, diketik manual per parameter. */
export function HasilLabKaryawanPage() {
  const tahunIni = new Date().getFullYear();
  const [tahun, setTahun] = useState(tahunIni);
  const [tahunTersedia, setTahunTersedia] = useState<readonly number[]>([]);
  const [items, setItems] = useState<readonly HasilLabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LabForm>({
    nama: '',
    jabatan: '',
    tanggalPeriksa: '',
    catatan: '',
    berkas: null,
    berkasNama: null,
  });
  const [baris, setBaris] = useState<readonly BarisForm[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [jenisBaru, setJenisBaru] = useState('');
  const [jenisLain, setJenisLain] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<HasilLabItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cetakId, setCetakId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    readonly blob: Blob;
    readonly filename: string;
  } | null>(null);
  const nextKey = useRef(0);
  const karyawan = useDaftarKaryawan();

  const denganKey = (list: ReadonlyArray<HasilLabBaris>): BarisForm[] =>
    list.map((b) => ({ ...b, key: nextKey.current++ }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{
        items: HasilLabItem[];
        tahunTersedia: number[];
      }>(`/api/lisensi-hasil-lab?tahun=${tahun}`);
      setItems(res.items);
      setTahunTersedia(res.tahunTersedia);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal memuat hasil lab'));
    } finally {
      setLoading(false);
    }
  }, [tahun]);

  useEffect(() => {
    void load();
  }, [load]);

  function bukaForm(item: HasilLabItem | null): void {
    setEditingId(item?.id ?? null);
    setForm({
      nama: item?.nama ?? '',
      jabatan: item?.jabatan ?? '',
      tanggalPeriksa: item
        ? toDateInput(item.tanggalPeriksa)
        : toDateInput(new Date().toISOString()),
      catatan: item?.catatan ?? '',
      berkas: item?.berkas ?? null,
      berkasNama: item?.berkasNama ?? null,
    });
    setBaris(
      denganKey(
        item
          ? item.items.map((b) => ({
              ...b,
              satuan: b.satuan ?? '',
              nilaiNormal: b.nilaiNormal ?? '',
            }))
          : barisHasilLabBaru(),
      ),
    );
    setJenisBaru('');
    setJenisLain('');
    setFormError(null);
    setFormOpen(true);
  }

  function ubahBaris(
    key: number,
    field: keyof HasilLabBaris,
    value: string,
  ): void {
    setBaris((list) =>
      list.map((b) => (b.key === key ? { ...b, [field]: value } : b)),
    );
  }

  function tambahParameter(jenis: string): void {
    setBaris((list) => {
      // Sisipkan setelah baris terakhir jenis ini supaya tetap satu kelompok.
      const idx = list.map((b) => b.jenis).lastIndexOf(jenis);
      const baru: BarisForm = {
        jenis,
        parameter: '',
        hasil: '',
        satuan: '',
        nilaiNormal: '',
        key: nextKey.current++,
      };
      return [...list.slice(0, idx + 1), baru, ...list.slice(idx + 1)];
    });
  }

  function tambahJenis(): void {
    const jenis = (jenisBaru === JENIS_LAIN ? jenisLain : jenisBaru).trim();
    if (!jenis) return;
    if (baris.some((b) => b.jenis.toLowerCase() === jenis.toLowerCase())) {
      setFormError(`Jenis "${jenis}" sudah ada di form`);
      return;
    }
    setFormError(null);
    setBaris((list) => [...list, ...denganKey(barisUntukJenis(jenis))]);
    setJenisBaru('');
    setJenisLain('');
  }

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const invalid = validateLisensiFile(file);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFormError(null);
      setForm((f) => ({ ...f, berkas: dataUrl, berkasNama: file.name }));
    } catch (err: unknown) {
      setFormError(errorMessage(err, 'Gagal membaca file'));
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const body = {
      ...form,
      tanggalPeriksa: fromDateInput(form.tanggalPeriksa),
      items: baris.map((b) => ({
        jenis: b.jenis,
        parameter: b.parameter,
        hasil: b.hasil,
        satuan: b.satuan,
        nilaiNormal: b.nilaiNormal,
      })),
    };
    try {
      if (editingId)
        await apiPatch(`/api/lisensi-hasil-lab/${editingId}`, body);
      else await apiPost('/api/lisensi-hasil-lab', body);
      setFormOpen(false);
      const tahunHasil = Number(form.tanggalPeriksa.slice(0, 4));
      if (tahunHasil && tahunHasil !== tahun) setTahun(tahunHasil);
      else await load();
    } catch (err: unknown) {
      setFormError(errorMessage(err, 'Gagal menyimpan hasil lab'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/lisensi-hasil-lab/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal menghapus hasil lab'));
    } finally {
      setDeleting(false);
    }
  }

  async function cetak(item: HasilLabItem): Promise<void> {
    setCetakId(item.id);
    setError(null);
    try {
      const blob = await generateHasilLabKaryawanBlob({
        nama: item.nama,
        jabatan: item.jabatan,
        tanggalPeriksa: formatDateShort(item.tanggalPeriksa),
        catatan: item.catatan,
        kelompok: kelompokPerJenis(item.items),
      });
      setPreview({
        blob,
        filename: `Hasil_Lab_${item.nama}_${item.tahun}.pdf`.replace(
          /[^\w.-]+/g,
          '_',
        ),
      });
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal membuat PDF hasil lab'));
    } finally {
      setCetakId(null);
    }
  }

  const jenisDiForm = new Set(baris.map((b) => b.jenis.toLowerCase()));
  const jenisBawaanTersisa = JENIS_LAB_BAWAAN.filter(
    (j) => !jenisDiForm.has(j.jenis.toLowerCase()),
  );
  const terisi = baris.filter((b) => b.hasil.trim()).length;

  return (
    <div className="page-frame">
      <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem' }}>
        Hasil Lab Karyawan
      </h2>
      <p
        style={{ margin: '0 0 0.8rem', fontSize: '0.85rem', color: '#64748b' }}
      >
        Hasil pemeriksaan laboratorium tahunan karyawan (Hematologi, Diff Count,
        LED, Kimia Darah, Urinalisa, dan jenis lain). Diarsipkan per tahun.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.75rem',
          marginBottom: '0.8rem',
        }}
      >
        <TahunSelect
          id="hasil-lab-tahun"
          value={tahun}
          pilihan={pilihanTahun(tahunTersedia, tahunIni)}
          onChange={setTahun}
        />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => bukaForm(null)}
        >
          + Hasil Lab Baru
        </button>
      </div>

      {error ? <p className="alert alert--error">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '50px' }}>No</th>
            <th>Nama Karyawan</th>
            <th>Jabatan</th>
            <th style={{ width: '120px' }}>Tgl Periksa</th>
            <th>Pemeriksaan</th>
            <th style={{ width: '110px' }}>Scan</th>
            <th style={{ width: '200px' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                style={{
                  textAlign: 'center',
                  padding: '1.2rem',
                  color: '#64748b',
                }}
              >
                {loading ? 'Memuat...' : `Belum ada hasil lab tahun ${tahun}.`}
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                <td>
                  <strong>{item.nama}</strong>
                </td>
                <td>{item.jabatan || '—'}</td>
                <td>{formatDateShort(item.tanggalPeriksa)}</td>
                <td>
                  {kelompokPerJenis(item.items)
                    .map((k) => `${k.jenis} (${k.baris.length})`)
                    .join(', ') || '—'}
                </td>
                <td>
                  {item.berkas ? (
                    <a
                      className="btn btn--secondary btn--sm"
                      href={item.berkas}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lihat
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => bukaForm(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={cetakId !== null}
                      onClick={() => void cetak(item)}
                    >
                      {cetakId === item.id ? 'Menyiapkan...' : 'Cetak'}
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
            ))
          )}
        </tbody>
      </table>

      <datalist id="hasil-lab-karyawan">
        {karyawan.map((k) => (
          <option key={k.nama} value={k.nama} />
        ))}
      </datalist>

      <Modal
        open={formOpen}
        title={editingId ? 'Edit Hasil Lab' : 'Hasil Lab Baru'}
        onClose={() => setFormOpen(false)}
        size="xl"
      >
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="hasil-lab-nama">Nama Karyawan *</label>
              <input
                id="hasil-lab-nama"
                required
                maxLength={200}
                list="hasil-lab-karyawan"
                value={form.nama}
                onChange={(e) => {
                  const nama = e.target.value;
                  const cocok = karyawan.find((k) => k.nama === nama);
                  setForm((f) => ({
                    ...f,
                    nama,
                    jabatan: f.jabatan || cocok?.jabatan || '',
                  }));
                }}
              />
            </div>
            <div className="form-field">
              <label htmlFor="hasil-lab-jabatan">Jabatan / Pekerjaan</label>
              <input
                id="hasil-lab-jabatan"
                maxLength={200}
                value={form.jabatan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, jabatan: e.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="hasil-lab-tanggal">Tanggal Periksa *</label>
              <input
                id="hasil-lab-tanggal"
                type="date"
                required
                value={form.tanggalPeriksa}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tanggalPeriksa: e.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="hasil-lab-catatan">Catatan</label>
              <input
                id="hasil-lab-catatan"
                maxLength={1000}
                value={form.catatan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, catatan: e.target.value }))
                }
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="hasil-lab-berkas">
                Scan Hasil Lab Asli (opsional, PDF / gambar, maks. 10 MB)
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
                  id="hasil-lab-berkas"
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
          </div>

          <p
            style={{
              margin: '0.8rem 0 0.4rem',
              fontSize: '0.82rem',
              color: '#64748b',
            }}
          >
            Isi kolom Hasil untuk parameter yang diperiksa; parameter dengan
            hasil kosong tidak disimpan. Terisi: <strong>{terisi}</strong>.
          </p>

          {kelompokPerJenis(baris).map((k) => (
            <fieldset
              key={k.jenis}
              style={{
                border: '1px solid #cbd5e1',
                padding: '0.5rem 0.7rem',
                marginBottom: '0.8rem',
              }}
            >
              <legend style={{ fontWeight: 700 }}>{k.jenis}</legend>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pemeriksaan</th>
                    <th style={{ width: '140px' }}>Hasil</th>
                    <th style={{ width: '110px' }}>Satuan</th>
                    <th>Nilai Normal</th>
                    <th style={{ width: '60px' }} />
                  </tr>
                </thead>
                <tbody>
                  {k.baris.map((b) => (
                    <tr key={b.key}>
                      <td>
                        <input
                          aria-label={`Nama pemeriksaan ${k.jenis}`}
                          maxLength={200}
                          value={b.parameter}
                          onChange={(e) =>
                            ubahBaris(b.key, 'parameter', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Hasil ${b.parameter || k.jenis}`}
                          maxLength={200}
                          value={b.hasil}
                          onChange={(e) =>
                            ubahBaris(b.key, 'hasil', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Satuan ${b.parameter || k.jenis}`}
                          maxLength={200}
                          value={b.satuan}
                          onChange={(e) =>
                            ubahBaris(b.key, 'satuan', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Nilai normal ${b.parameter || k.jenis}`}
                          maxLength={200}
                          value={b.nilaiNormal}
                          onChange={(e) =>
                            ubahBaris(b.key, 'nilaiNormal', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          aria-label={`Hapus ${b.parameter || 'baris'}`}
                          onClick={() =>
                            setBaris((list) =>
                              list.filter((x) => x.key !== b.key),
                            )
                          }
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}
              >
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => tambahParameter(k.jenis)}
                >
                  + Parameter
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() =>
                    setBaris((list) => list.filter((x) => x.jenis !== k.jenis))
                  }
                >
                  Hapus Jenis {k.jenis}
                </button>
              </div>
            </fieldset>
          ))}

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div className="form-field" style={{ minWidth: '200px' }}>
              <label htmlFor="hasil-lab-jenis-baru">
                Tambah Jenis Pemeriksaan
              </label>
              <select
                id="hasil-lab-jenis-baru"
                value={jenisBaru}
                onChange={(e) => setJenisBaru(e.target.value)}
              >
                <option value="">— pilih —</option>
                {jenisBawaanTersisa.map((j) => (
                  <option key={j.jenis} value={j.jenis}>
                    {j.jenis}
                  </option>
                ))}
                <option value={JENIS_LAIN}>Jenis lain...</option>
              </select>
            </div>
            {jenisBaru === JENIS_LAIN ? (
              <div className="form-field" style={{ minWidth: '200px' }}>
                <label htmlFor="hasil-lab-jenis-lain">Nama Jenis</label>
                <input
                  id="hasil-lab-jenis-lain"
                  maxLength={200}
                  placeholder="mis. Serologi, HBsAg"
                  value={jenisLain}
                  onChange={(e) => setJenisLain(e.target.value)}
                />
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={tambahJenis}
            >
              + Tambah Jenis
            </button>
          </div>

          {formError ? <p className="alert alert--error">{formError}</p> : null}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setFormOpen(false)}
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus Hasil Lab"
        message={`Yakin hapus hasil lab "${deleteTarget?.nama ?? ''}" tahun ${deleteTarget?.tahun ?? ''}?`}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />

      <SharingPdfPreviewModal
        open={preview !== null}
        blob={preview?.blob ?? null}
        filename={preview?.filename ?? 'Hasil_Lab.pdf'}
        title="Pratinjau Hasil Lab"
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
