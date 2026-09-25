import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ConfirmModal } from './ui/ConfirmModal.tsx';
import { Modal } from './ui/Modal.tsx';
import { ModalFormFooter } from './ui/ModalFormFooter.tsx';
import { TableRowActions } from './ui/TableRowActions.tsx';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { readFileAsDataUrl, validateFotoFile } from '../lib/fotoUpload.ts';
import './ui/ui.css';

interface Karyawan {
  readonly id: string;
  readonly nk: string | null;
  readonly nama: string;
  readonly noHp: string | null;
  readonly alamat: string | null;
  readonly bagian: string | null;
  readonly foto: string | null;
  readonly keterangan: string | null;
  /** Jumlah hari hadir dan tidak hadir sepanjang tahun yang dipilih. */
  readonly hadir: number;
  readonly absen: number;
  readonly persentase: number;
}

interface DaftarKaryawanResponse {
  readonly tahun: number;
  readonly hariKerja: number;
  readonly items: readonly Karyawan[];
}

const emptyForm = {
  nk: '',
  nama: '',
  noHp: '',
  alamat: '',
  bagian: '',
  keterangan: '',
};

export function DaftarKaryawanSection() {
  const [tahun, setTahun] = useState(() => new Date().getFullYear());
  const [data, setData] = useState<DaftarKaryawanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [foto, setFoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Karyawan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiGet<DaftarKaryawanResponse>(`/api/admin-klinik/daftar-karyawan?tahun=${tahun}`));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar karyawan');
    } finally {
      setLoading(false);
    }
  }, [tahun]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function openAdd() {
    setForm(emptyForm);
    setFoto(null);
    setEditingId(null);
    setModalMode('add');
  }

  function openEdit(k: Karyawan) {
    setForm({
      nk: k.nk ?? '',
      nama: k.nama,
      noHp: k.noHp ?? '',
      alamat: k.alamat ?? '',
      bagian: k.bagian ?? '',
      keterangan: k.keterangan ?? '',
    });
    setFoto(null);
    setEditingId(k.id);
    setModalMode('edit');
  }

  async function pilihFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const pesan = validateFotoFile(file);
    if (pesan) {
      setError(pesan);
      return;
    }
    try {
      setFoto(await readFileAsDataUrl(file));
      setError(null);
    } catch {
      setError('Gagal membaca file foto');
    }
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    // Foto hanya dikirim kalau ada yang baru dipilih, supaya menyunting data
    // lain tidak menghapus foto yang sudah ada.
    const body = { ...form, ...(foto ? { foto } : {}) };
    try {
      if (modalMode === 'add') await apiPost('/api/admin-klinik', body);
      else if (editingId) await apiPatch(`/api/admin-klinik/${editingId}`, body);
      setModalMode(null);
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function konfirmasiHapus() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/admin-klinik/${deleting.id}`);
      setDeleting(null);
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  const tahunPilihan = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6rem',
          flexWrap: 'wrap',
          marginBottom: '0.6rem',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Daftar Karyawan</h3>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Hadir dan absen dihitung dari data absensi tahun {data?.tahun ?? tahun} — dari{' '}
            {data?.hariKerja ?? 0} hari kerja (Minggu tidak dihitung).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            aria-label="Tahun rekap"
            className="filter-control"
          >
            {tahunPilihan.map((t) => (
              <option key={t} value={t}>
                Tahun {t}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            + Tambah Karyawan
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '0.6rem' }}>
          {error}
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>NK</th>
            <th>Nama</th>
            <th>No Telp</th>
            <th>Alamat</th>
            <th>Bagian</th>
            <th>Foto</th>
            <th>Hadir</th>
            <th>Absen</th>
            <th>Keterangan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: '1.5rem' }}>
                Memuat…
              </td>
            </tr>
          ) : (data?.items.length ?? 0) === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: '1.5rem' }}>
                Belum ada karyawan.
              </td>
            </tr>
          ) : (
            data?.items.map((k) => (
              <tr key={k.id}>
                <td>{k.nk || '—'}</td>
                <td>
                  <strong>{k.nama}</strong>
                </td>
                <td>{k.noHp || '—'}</td>
                <td>{k.alamat || '—'}</td>
                <td>{k.bagian || '—'}</td>
                <td>
                  {k.foto ? (
                    <a href={k.foto} target="_blank" rel="noreferrer">
                      <img
                        src={k.foto}
                        alt={`Foto ${k.nama}`}
                        style={{
                          width: '40px',
                          height: '40px',
                          objectFit: 'cover',
                          borderRadius: '50%',
                          border: '1px solid var(--color-border)',
                          display: 'block',
                        }}
                      />
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ fontWeight: 700, color: '#166534' }}>{k.hadir}</td>
                <td style={{ fontWeight: 700, color: k.absen > 0 ? '#b91c1c' : 'inherit' }}>
                  {k.absen}
                </td>
                <td>{k.keterangan || '—'}</td>
                <td>
                  <TableRowActions
                    onEdit={() => openEdit(k)}
                    onDelete={() => setDeleting(k)}
                    editLabel="Ubah data karyawan"
                    deleteLabel="Hapus karyawan"
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Modal
        open={modalMode !== null}
        title={modalMode === 'add' ? 'Tambah Karyawan' : 'Ubah Karyawan'}
        onClose={() => setModalMode(null)}
        size="lg"
      >
        <form onSubmit={(e) => void simpan(e)} className="form-grid">
          <div className="form-field">
            <label htmlFor="kar-nk">NK</label>
            <input
              id="kar-nk"
              value={form.nk}
              onChange={(e) => setForm((f) => ({ ...f, nk: e.target.value }))}
              placeholder="Nomor karyawan"
            />
          </div>
          <div className="form-field">
            <label htmlFor="kar-nama">Nama *</label>
            <input
              id="kar-nama"
              required
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="kar-telp">No Telp</label>
            <input
              id="kar-telp"
              value={form.noHp}
              onChange={(e) => setForm((f) => ({ ...f, noHp: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="kar-bagian">Bagian</label>
            <input
              id="kar-bagian"
              value={form.bagian}
              onChange={(e) => setForm((f) => ({ ...f, bagian: e.target.value }))}
              placeholder="Contoh: Pendaftaran"
            />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="kar-alamat">Alamat</label>
            <input
              id="kar-alamat"
              value={form.alamat}
              onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
            />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="kar-keterangan">Keterangan</label>
            <input
              id="kar-keterangan"
              value={form.keterangan}
              onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
              placeholder="Opsional"
            />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="kar-foto">Foto</label>
            <input id="kar-foto" type="file" accept="image/*" onChange={(e) => void pilihFoto(e)} />
            {foto && (
              <img
                src={foto}
                alt="Pratinjau foto"
                style={{
                  width: '84px',
                  height: '84px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginTop: '0.4rem',
                  border: '1px solid var(--color-border)',
                }}
              />
            )}
            <p className="form-hint">
              {modalMode === 'edit' && !foto
                ? 'Biarkan kosong bila foto lama tidak diganti.'
                : 'JPEG, PNG, GIF, atau WEBP — maksimal 10 MB.'}
            </p>
          </div>
          <ModalFormFooter onCancel={() => setModalMode(null)} submitLabel="Simpan" loading={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={deleting !== null}
        title="Hapus karyawan"
        message={`Hapus "${deleting?.nama}" dari daftar karyawan?`}
        onClose={() => setDeleting(null)}
        onConfirm={() => void konfirmasiHapus()}
        loading={deleteLoading}
      />
    </div>
  );
}
