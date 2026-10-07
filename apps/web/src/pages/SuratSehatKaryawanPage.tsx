import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  TahunSelect,
  TtdTersimpanSelect,
  useDaftarKaryawan,
} from '../components/LisensiKaryawanShared.tsx';
import { SignaturePad } from '../components/SignaturePad.tsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { SharingPdfPreviewModal } from '../components/ui/SharingPdfPreviewModal.tsx';
import { handleFormFieldNavKeyDown } from '../lib/formFieldNav.ts';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { formatDateShort } from '../lib/format.ts';
import { fromDateInput, toDateInput } from '../lib/lisensi.ts';
import { KESIMPULAN_LABEL, pilihanTahun } from '../lib/lisensiKaryawan.ts';
import { generateSuratSehatKaryawanBlob } from '../pdf/printLisensiKaryawan.tsx';

interface SuratSehatItem {
  readonly id: string;
  readonly tahun: number;
  readonly nomorSurat: string | null;
  readonly nama: string;
  readonly jabatan: string | null;
  readonly tempatTanggalLahir: string | null;
  readonly jenisKelamin: string | null;
  readonly alamat: string | null;
  readonly tanggalPeriksa: string;
  readonly tinggiBadan: string | null;
  readonly beratBadan: string | null;
  readonly tekananDarah: string | null;
  readonly nadi: string | null;
  readonly butaWarna: string | null;
  readonly kesimpulan: string;
  readonly keperluan: string | null;
  readonly catatan: string | null;
  readonly namaDokter: string;
  readonly sipDokter: string | null;
  readonly ttdDokter: string | null;
}

/** Isian teks form; nama field sama dengan kolom API. */
const TEKS_FIELDS = [
  'nomorSurat',
  'nama',
  'jabatan',
  'tempatTanggalLahir',
  'jenisKelamin',
  'alamat',
  'tinggiBadan',
  'beratBadan',
  'tekananDarah',
  'nadi',
  'butaWarna',
  'kesimpulan',
  'keperluan',
  'catatan',
  'namaDokter',
  'sipDokter',
] as const;

type TeksField = (typeof TEKS_FIELDS)[number];

type SuratForm = Readonly<Record<TeksField, string>> & {
  readonly tanggalPeriksa: string;
  /** Data URL baru, path tersimpan, atau null. */
  readonly ttdDokter: string | null;
};

function todayInput(): string {
  return toDateInput(new Date().toISOString());
}

function formKosong(): SuratForm {
  return {
    nomorSurat: '',
    nama: '',
    jabatan: '',
    tempatTanggalLahir: '',
    jenisKelamin: 'Laki-laki',
    alamat: '',
    tinggiBadan: '',
    beratBadan: '',
    tekananDarah: '',
    nadi: '',
    butaWarna: 'Tidak',
    kesimpulan: 'SEHAT',
    keperluan: 'Perizinan klinik',
    catatan: '',
    namaDokter: '',
    sipDokter: '',
    tanggalPeriksa: todayInput(),
    ttdDokter: null,
  };
}

function formDariItem(item: SuratSehatItem): SuratForm {
  const teks = Object.fromEntries(
    TEKS_FIELDS.map((key) => [key, item[key] ?? '']),
  ) as Record<TeksField, string>;
  return {
    ...teks,
    tanggalPeriksa: toDateInput(item.tanggalPeriksa),
    ttdDokter: item.ttdDokter,
  };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

interface FieldSpec {
  readonly key: TeksField;
  readonly label: string;
  readonly wajib?: boolean;
  readonly pilihan?: ReadonlyArray<{
    readonly value: string;
    readonly label: string;
  }>;
  readonly list?: string;
}

const FIELD_IDENTITAS: ReadonlyArray<FieldSpec> = [
  {
    key: 'nama',
    label: 'Nama Karyawan',
    wajib: true,
    list: 'surat-sehat-karyawan',
  },
  { key: 'jabatan', label: 'Jabatan / Pekerjaan' },
  { key: 'tempatTanggalLahir', label: 'Tempat, Tanggal Lahir' },
  {
    key: 'jenisKelamin',
    label: 'Jenis Kelamin',
    pilihan: [
      { value: 'Laki-laki', label: 'Laki-laki' },
      { value: 'Perempuan', label: 'Perempuan' },
    ],
  },
  { key: 'alamat', label: 'Alamat' },
  { key: 'nomorSurat', label: 'Nomor Surat' },
];

const FIELD_PEMERIKSAAN: ReadonlyArray<FieldSpec> = [
  { key: 'tinggiBadan', label: 'Tinggi Badan (cm)' },
  { key: 'beratBadan', label: 'Berat Badan (kg)' },
  { key: 'tekananDarah', label: 'Tekanan Darah (mmHg)' },
  { key: 'nadi', label: 'Nadi (x/menit)' },
  {
    key: 'butaWarna',
    label: 'Buta Warna',
    pilihan: [
      { value: 'Tidak', label: 'Tidak' },
      { value: 'Parsial', label: 'Parsial' },
      { value: 'Total', label: 'Total' },
    ],
  },
  {
    key: 'kesimpulan',
    label: 'Kesimpulan',
    wajib: true,
    pilihan: [
      { value: 'SEHAT', label: 'Sehat' },
      { value: 'TIDAK_SEHAT', label: 'Tidak Sehat' },
    ],
  },
  { key: 'keperluan', label: 'Keperluan' },
  { key: 'catatan', label: 'Catatan' },
];

const FIELD_DOKTER: ReadonlyArray<FieldSpec> = [
  { key: 'namaDokter', label: 'Nama Dokter', wajib: true },
  { key: 'sipDokter', label: 'No. SIP Dokter' },
];

/** Menu Lisensi > Surat Sehat: surat keterangan sehat tahunan karyawan, ditandatangani dokter. */
export function SuratSehatKaryawanPage() {
  const tahunIni = new Date().getFullYear();
  const [tahun, setTahun] = useState(tahunIni);
  const [tahunTersedia, setTahunTersedia] = useState<readonly number[]>([]);
  const [items, setItems] = useState<readonly SuratSehatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SuratForm>(formKosong);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [padKey, setPadKey] = useState(0);
  /** true = tanda tangan sedang digambar di kotak; false = memakai gambar yang sudah ada (tersimpan/dipilih). */
  const [ttdDariPad, setTtdDariPad] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SuratSehatItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cetakId, setCetakId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    readonly blob: Blob;
    readonly filename: string;
  } | null>(null);
  const karyawan = useDaftarKaryawan();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{
        items: SuratSehatItem[];
        tahunTersedia: number[];
      }>(`/api/lisensi-surat-sehat?tahun=${tahun}`);
      setItems(res.items);
      setTahunTersedia(res.tahunTersedia);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal memuat surat sehat'));
    } finally {
      setLoading(false);
    }
  }, [tahun]);

  useEffect(() => {
    void load();
  }, [load]);

  function bukaForm(item: SuratSehatItem | null): void {
    setEditingId(item?.id ?? null);
    // Surat baru meneruskan dokter terakhir supaya tidak diketik ulang untuk setiap karyawan.
    const terakhir = items[items.length - 1];
    setForm(
      item
        ? formDariItem(item)
        : {
            ...formKosong(),
            namaDokter: terakhir?.namaDokter ?? '',
            sipDokter: terakhir?.sipDokter ?? '',
          },
    );
    setFormError(null);
    setPadKey((k) => k + 1);
    setTtdDariPad(!item?.ttdDokter);
    setFormOpen(true);
  }

  function setField(key: TeksField, value: string): void {
    setForm((f) => {
      if (key !== 'nama') return { ...f, [key]: value };
      // Pilih nama dari daftar karyawan → jabatan ikut terisi bila masih kosong.
      const cocok = karyawan.find((k) => k.nama === value);
      return { ...f, nama: value, jabatan: f.jabatan || cocok?.jabatan || '' };
    });
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const body = {
      ...form,
      tanggalPeriksa: fromDateInput(form.tanggalPeriksa),
    };
    try {
      if (editingId)
        await apiPatch(`/api/lisensi-surat-sehat/${editingId}`, body);
      else await apiPost('/api/lisensi-surat-sehat', body);
      setFormOpen(false);
      // Pindah ke tahun surat yang baru disimpan supaya langsung terlihat di daftar.
      const tahunSurat = Number(form.tanggalPeriksa.slice(0, 4));
      if (tahunSurat && tahunSurat !== tahun) setTahun(tahunSurat);
      else await load();
    } catch (err: unknown) {
      setFormError(errorMessage(err, 'Gagal menyimpan surat sehat'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/lisensi-surat-sehat/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal menghapus surat sehat'));
    } finally {
      setDeleting(false);
    }
  }

  async function cetak(item: SuratSehatItem): Promise<void> {
    setCetakId(item.id);
    setError(null);
    try {
      const blob = await generateSuratSehatKaryawanBlob({
        ...item,
        tanggalPeriksa: formatDateShort(item.tanggalPeriksa),
        kesimpulanLabel: KESIMPULAN_LABEL[item.kesimpulan] ?? item.kesimpulan,
      });
      setPreview({
        blob,
        filename: `Surat_Sehat_${item.nama}_${item.tahun}.pdf`.replace(
          /[^\w.-]+/g,
          '_',
        ),
      });
    } catch (err: unknown) {
      setError(errorMessage(err, 'Gagal membuat PDF surat sehat'));
    } finally {
      setCetakId(null);
    }
  }

  function renderField(spec: FieldSpec) {
    const id = `surat-sehat-${spec.key}`;
    return (
      <div className="form-field" key={spec.key}>
        <label htmlFor={id}>
          {spec.label}
          {spec.wajib ? ' *' : ''}
        </label>
        {spec.pilihan ? (
          <select
            id={id}
            value={form[spec.key]}
            onChange={(e) => setField(spec.key, e.target.value)}
          >
            {spec.pilihan.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            required={spec.wajib}
            maxLength={spec.key === 'catatan' ? 1000 : 200}
            list={spec.list}
            value={form[spec.key]}
            onChange={(e) => setField(spec.key, e.target.value)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.05rem' }}>
        Surat Sehat Karyawan
      </h3>
      <p
        style={{ margin: '0 0 0.8rem', fontSize: '0.85rem', color: '#64748b' }}
      >
        Surat keterangan sehat tahunan karyawan untuk perizinan, ditandatangani
        dokter. Diarsipkan per tahun.
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
          id="surat-sehat-tahun"
          value={tahun}
          pilihan={pilihanTahun(tahunTersedia, tahunIni)}
          onChange={setTahun}
        />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => bukaForm(null)}
        >
          + Surat Sehat Baru
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
            <th style={{ width: '110px' }}>Kesimpulan</th>
            <th>Dokter</th>
            <th style={{ width: '90px' }}>TTD</th>
            <th style={{ width: '200px' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  textAlign: 'center',
                  padding: '1.2rem',
                  color: '#64748b',
                }}
              >
                {loading
                  ? 'Memuat...'
                  : `Belum ada surat sehat tahun ${tahun}.`}
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
                <td
                  style={{
                    color: item.kesimpulan === 'SEHAT' ? '#15803d' : '#b91c1c',
                    fontWeight: 600,
                  }}
                >
                  {KESIMPULAN_LABEL[item.kesimpulan] ?? item.kesimpulan}
                </td>
                <td>{item.namaDokter}</td>
                <td>
                  {item.ttdDokter ? (
                    <img
                      src={item.ttdDokter}
                      alt={`TTD ${item.namaDokter}`}
                      style={{ height: '32px', background: '#fff' }}
                    />
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

      <datalist id="surat-sehat-karyawan">
        {karyawan.map((k) => (
          <option key={k.nama} value={k.nama} />
        ))}
      </datalist>

      <Modal
        open={formOpen}
        title={editingId ? 'Edit Surat Sehat' : 'Surat Sehat Baru'}
        onClose={() => setFormOpen(false)}
        size="xl"
      >
        <form
          onKeyDown={handleFormFieldNavKeyDown}
          onSubmit={(e) => void handleSubmit(e)}>
          <h4 style={{ margin: '0 0 0.4rem' }}>Identitas Karyawan</h4>
          <div className="form-grid">{FIELD_IDENTITAS.map(renderField)}</div>

          <h4 style={{ margin: '1rem 0 0.4rem' }}>Hasil Pemeriksaan</h4>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="surat-sehat-tanggal">Tanggal Periksa *</label>
              <input
                id="surat-sehat-tanggal"
                type="date"
                required
                value={form.tanggalPeriksa}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tanggalPeriksa: e.target.value }))
                }
              />
            </div>
            {FIELD_PEMERIKSAAN.map(renderField)}
          </div>

          <h4 style={{ margin: '1rem 0 0.4rem' }}>Dokter Pemeriksa</h4>
          <div className="form-grid">
            {FIELD_DOKTER.map(renderField)}
            <div className="form-field form-field--full">
              <label>Tanda Tangan Dokter</label>
              {!ttdDariPad && form.ttdDokter ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <img
                    src={form.ttdDokter}
                    alt="Tanda tangan dokter"
                    style={{ height: '70px', background: '#fff' }}
                  />
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setForm((f) => ({ ...f, ttdDokter: null }));
                      setTtdDariPad(true);
                    }}
                  >
                    Gambar Ulang
                  </button>
                </div>
              ) : (
                <SignaturePad
                  key={padKey}
                  onChange={(dataUrl) =>
                    setForm((f) => ({ ...f, ttdDokter: dataUrl }))
                  }
                />
              )}
            </div>
            <TtdTersimpanSelect
              id="surat-sehat-ttd-tersimpan"
              onPilih={(dataUrl, nama) => {
                setForm((f) => ({
                  ...f,
                  ttdDokter: dataUrl,
                  namaDokter: f.namaDokter || nama,
                }));
                setTtdDariPad(false);
              }}
              onError={setFormError}
            />
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
        title="Hapus Surat Sehat"
        message={`Yakin hapus surat sehat "${deleteTarget?.nama ?? ''}" tahun ${deleteTarget?.tahun ?? ''}?`}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />

      <SharingPdfPreviewModal
        open={preview !== null}
        blob={preview?.blob ?? null}
        filename={preview?.filename ?? 'Surat_Sehat.pdf'}
        title="Pratinjau Surat Sehat"
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
