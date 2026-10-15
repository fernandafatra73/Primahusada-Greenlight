import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { handleFormFieldNavKeyDown } from '../lib/formFieldNav.ts';
import { formatRupiah } from '../lib/format.ts';
import { jumlahKontrakan, NAMA_BULAN, namaBulan, rekapTahunan } from '../lib/hitunganKontrakan.ts';

interface KontrakanItem {
  readonly id: string;
  readonly bulan: number;
  readonly tahun: number;
  readonly sewa: string;
  readonly listrik: string;
  readonly air: string;
  readonly pinjam: string;
}

interface KontrakanForm {
  readonly bulan: string;
  readonly tahun: string;
  readonly sewa: string;
  readonly listrik: string;
  readonly air: string;
  readonly pinjam: string;
}

const NOMINAL_FIELDS = [
  ['sewa', 'Sewa Kontrakan (Rp)'],
  ['listrik', 'Listrik (Rp)'],
  ['air', 'Air (Rp)'],
  ['pinjam', 'Pinjam (Rp)'],
] as const;

function emptyForm(): KontrakanForm {
  const now = new Date();
  return {
    bulan: String(now.getMonth() + 1),
    tahun: String(now.getFullYear()),
    sewa: '0',
    listrik: '0',
    air: '0',
    pinjam: '0',
  };
}

/** Tombol "Hitungan" di navbar (sebelah Lisensi): biaya kontrakan per bulan. */
export function HitunganPage() {
  const [items, setItems] = useState<readonly KontrakanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<KontrakanForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KontrakanItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ items: KontrakanItem[] }>('/api/hitungan-kontrakan');
      setItems(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data hitungan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rekap = useMemo(() => rekapTahunan(items), [items]);

  function startEdit(item: KontrakanItem): void {
    setEditingId(item.id);
    setForm({
      bulan: String(item.bulan),
      tahun: String(item.tahun),
      sewa: item.sewa,
      listrik: item.listrik,
      air: item.air,
      pinjam: item.pinjam,
    });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      bulan: Number(form.bulan),
      tahun: Number(form.tahun),
      sewa: Number(form.sewa) || 0,
      listrik: Number(form.listrik) || 0,
      air: Number(form.air) || 0,
      pinjam: Number(form.pinjam) || 0,
    };
    try {
      if (editingId) {
        await apiPatch(`/api/hitungan-kontrakan/${editingId}`, body);
      } else {
        await apiPost('/api/hitungan-kontrakan', body);
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data hitungan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/hitungan-kontrakan/${deleteTarget.id}`);
      if (editingId === deleteTarget.id) cancelEdit();
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data hitungan');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-frame">
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Hitungan — Kontrakan</h2>

      <form onKeyDown={handleFormFieldNavKeyDown} onSubmit={(e) => void handleSubmit(e)} className="form-grid">
        <div className="form-field">
          <label htmlFor="hitungan-bulan">Bulan *</label>
          <select
            id="hitungan-bulan"
            required
            value={form.bulan}
            onChange={(e) => setForm((f) => ({ ...f, bulan: e.target.value }))}
          >
            {NAMA_BULAN.map((nama, idx) => (
              <option key={nama} value={String(idx + 1)}>
                {nama}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="hitungan-tahun">Tahun *</label>
          <input
            id="hitungan-tahun"
            type="number"
            min="2000"
            max="2100"
            step="1"
            required
            value={form.tahun}
            onChange={(e) => setForm((f) => ({ ...f, tahun: e.target.value }))}
          />
        </div>
        {NOMINAL_FIELDS.map(([key, label]) => (
          <div className="form-field" key={key}>
            <label htmlFor={`hitungan-${key}`}>{label}</label>
            <input
              id={`hitungan-${key}`}
              type="number"
              min="0"
              step="1"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="form-field">
          <label>Jumlah</label>
          <div style={{ padding: '0.45rem 0', fontWeight: 700 }}>{formatRupiah(jumlahKontrakan(form))}</div>
        </div>
        <div className="form-field form-grid--full" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem' }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : '+ Tambah'}
          </button>
          {editingId ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={cancelEdit}>
              Batal Ubah
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="alert alert--error">{error}</p> : null}

      <table className="data-table" style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th style={{ width: '50px' }}>No</th>
            <th>Bulan</th>
            <th style={{ width: '80px' }}>Tahun</th>
            <th style={{ textAlign: 'right' }}>Sewa</th>
            <th style={{ textAlign: 'right' }}>Listrik</th>
            <th style={{ textAlign: 'right' }}>Air</th>
            <th style={{ textAlign: 'right' }}>Pinjam</th>
            <th style={{ textAlign: 'right' }}>Jumlah</th>
            <th style={{ width: '140px' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                {loading ? 'Memuat...' : 'Belum ada data hitungan kontrakan.'}
              </td>
            </tr>
          ) : (
            rekap.map(({ tahun, items: itemsTahun, total }) => (
              <Fragment key={tahun}>
                {itemsTahun.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{namaBulan(item.bulan)}</td>
                    <td>{item.tahun}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(item.sewa)}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(item.listrik)}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(item.air)}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(item.pinjam)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(jumlahKontrakan(item))}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => startEdit(item)}>
                          Ubah
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeleteTarget(item)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#e0f2fe', fontWeight: 700 }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>
                    Total Tahun {tahun}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatRupiah(total.sewa)}</td>
                  <td style={{ textAlign: 'right' }}>{formatRupiah(total.listrik)}</td>
                  <td style={{ textAlign: 'right' }}>{formatRupiah(total.air)}</td>
                  <td style={{ textAlign: 'right' }}>{formatRupiah(total.pinjam)}</td>
                  <td style={{ textAlign: 'right' }}>{formatRupiah(total.jumlah)}</td>
                  <td />
                </tr>
              </Fragment>
            ))
          )}
        </tbody>
      </table>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus Data Hitungan"
        message={`Yakin hapus hitungan kontrakan ${deleteTarget ? `${namaBulan(deleteTarget.bulan)} ${deleteTarget.tahun}` : ''}?`}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
