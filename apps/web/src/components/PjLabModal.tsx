import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { formatDateShort, formatRupiah } from '../lib/format.ts';
import { generatePjLabReportBlob } from '../pdf/printPjLabReport.tsx';
import { ConfirmModal } from './ui/ConfirmModal.tsx';
import { Modal } from './ui/Modal.tsx';
import { SharingPdfPreviewModal } from './ui/SharingPdfPreviewModal.tsx';

interface PjItem {
  readonly id: string;
  readonly nama: string;
  readonly tanggal: string;
  readonly jumlah: string;
  readonly admin: string | null;
}

interface PjForm {
  readonly nama: string;
  readonly tanggal: string;
  readonly jumlah: string;
  readonly admin: string;
}

interface PjLabModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO → `YYYY-MM-DD` waktu lokal, untuk `<input type="date">`. */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` → ISO pada tengah hari waktu lokal, supaya tanggalnya tidak bergeser oleh zona waktu. */
function fromDateInput(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12).toISOString();
}

const EMPTY_FORM: PjForm = { nama: '', tanggal: '', jumlah: '0', admin: '' };

/** Nama admin yang paling sering muncul — dipakai sebagai nama di kolom tanda tangan. */
function mostCommonAdmin(items: readonly PjItem[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const nama = item.admin?.trim();
    if (nama) counts.set(nama, (counts.get(nama) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [nama, count] of counts) {
    if (count > bestCount) {
      best = nama;
      bestCount = count;
    }
  }
  return best;
}

/** Tombol "PJ" di halaman Laboratorium: daftar penanggung jawab, dicetak dengan kop surat. */
export function PjLabModal({ open, onClose }: PjLabModalProps) {
  const [items, setItems] = useState<readonly PjItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PjForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PjItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [adminTtd, setAdminTtd] = useState('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ items: PjItem[] }>('/api/lab-penanggung-jawab');
      setItems(res.items);
      setAdminTtd((current) => current || mostCommonAdmin(res.items));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data PJ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_FORM, tanggal: todayInput() });
    setEditingId(null);
    void load();
  }, [open, load]);

  const totalJumlah = useMemo(() => items.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0), [items]);

  function startEdit(item: PjItem): void {
    setEditingId(item.id);
    setForm({
      nama: item.nama,
      tanggal: toDateInput(item.tanggal),
      jumlah: item.jumlah,
      admin: item.admin ?? '',
    });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, tanggal: todayInput() });
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      nama: form.nama,
      tanggal: fromDateInput(form.tanggal),
      jumlah: Number(form.jumlah) || 0,
      admin: form.admin,
    };
    try {
      if (editingId) {
        await apiPatch(`/api/lab-penanggung-jawab/${editingId}`, body);
      } else {
        await apiPost('/api/lab-penanggung-jawab', body);
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data PJ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/lab-penanggung-jawab/${deleteTarget.id}`);
      if (editingId === deleteTarget.id) cancelEdit();
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data PJ');
    } finally {
      setDeleting(false);
    }
  }

  async function handlePreview(): Promise<void> {
    setPreviewing(true);
    setError(null);
    try {
      const blob = await generatePjLabReportBlob({
        tanggalCetak: formatDateShort(new Date().toISOString()),
        items: items.map((item, idx) => ({
          no: idx + 1,
          nama: item.nama,
          tanggal: formatDateShort(item.tanggal),
          jumlahFormatted: formatRupiah(item.jumlah),
        })),
        totalJumlahFormatted: formatRupiah(totalJumlah),
        adminNama: adminTtd.trim(),
      });
      setPreviewBlob(blob);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF PJ');
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <>
      <Modal open={open} title="PJ — Penanggung Jawab Laboratorium" onClose={onClose} size="xl">
        <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
          <div className="form-field">
            <label htmlFor="pj-nama">Nama Penanggung Jawab *</label>
            <input
              id="pj-nama"
              required
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pj-tanggal">Tanggal *</label>
            <input
              id="pj-tanggal"
              type="date"
              required
              value={form.tanggal}
              onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pj-jumlah">Jumlah (Rp) *</label>
            <input
              id="pj-jumlah"
              type="number"
              min="0"
              step="1"
              required
              value={form.jumlah}
              onChange={(e) => setForm((f) => ({ ...f, jumlah: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pj-admin">Admin</label>
            <input
              id="pj-admin"
              value={form.admin}
              onChange={(e) => setForm((f) => ({ ...f, admin: e.target.value }))}
            />
          </div>
          <div className="form-field form-field--full" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem' }}>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : '+ Tambah PJ'}
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
              <th>Nama Penanggung Jawab</th>
              <th style={{ width: '120px' }}>Tanggal</th>
              <th style={{ textAlign: 'right', width: '150px' }}>Jumlah</th>
              <th>Admin</th>
              <th style={{ width: '140px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                  {loading ? 'Memuat...' : 'Belum ada data penanggung jawab.'}
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{item.nama}</strong>
                  </td>
                  <td>{formatDateShort(item.tanggal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(item.jumlah)}</td>
                  <td>{item.admin || '—'}</td>
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
              ))
            )}
          </tbody>
          {items.length > 0 ? (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                  Total
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(totalJumlah)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          ) : null}
        </table>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ minWidth: '240px' }}>
            <label htmlFor="pj-admin-ttd">Admin (tanda tangan)</label>
            <input id="pj-admin-ttd" value={adminTtd} onChange={(e) => setAdminTtd(e.target.value)} />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handlePreview()}
            disabled={previewing || loading}
          >
            🖨️ {previewing ? 'Membuat PDF...' : 'Cetak dengan Kop Surat'}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus Data PJ"
        message={`Yakin hapus penanggung jawab "${deleteTarget?.nama ?? ''}"?`}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />

      <SharingPdfPreviewModal
        open={previewBlob !== null}
        blob={previewBlob}
        filename="Daftar_PJ_Laboratorium.pdf"
        title="Pratinjau Daftar PJ Laboratorium"
        onClose={() => setPreviewBlob(null)}
      />
    </>
  );
}
