import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import '../components/ui/ui.css';

interface KomputerKlinik {
  readonly id: string;
  readonly nama: string;
  readonly anydeskId: string;
  readonly lokasi: string | null;
  readonly catatan: string | null;
}

interface AksesMasuk {
  /** true = tiap sambungan masuk harus ditekan Terima di komputer ini. */
  readonly wajibSetujui: boolean;
  readonly pesan: string;
}

interface StatusKoneksi {
  readonly terpasang: boolean;
  readonly id: string | null;
  readonly idTampil: string | null;
  readonly pesan: string | null;
  readonly aksesMasuk: AksesMasuk | null;
}

const emptyForm = { nama: '', anydeskId: '', lokasi: '', catatan: '' };

/** Menampilkan ID dengan spasi tiap tiga angka, seperti tampilan AnyDesk. */
function formatId(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function KoneksiPhPage() {
  const [status, setStatus] = useState<StatusKoneksi | null>(null);
  const [items, setItems] = useState<readonly KomputerKlinik[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tujuan, setTujuan] = useState('');
  const [menyambung, setMenyambung] = useState(false);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [disalin, setDisalin] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        apiGet<StatusKoneksi>('/api/koneksi-ph/status'),
        apiGet<{ items: KomputerKlinik[] }>('/api/komputer-klinik'),
      ]);
      setStatus(s);
      setItems(list.items);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data koneksi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function sambung(alamat: string) {
    if (!alamat.trim()) return;
    setMenyambung(true);
    setError(null);
    setInfo(null);
    try {
      const res = await apiPost<{ pesan: string; alamatTampil: string }>(
        '/api/koneksi-ph/sambung',
        { alamat },
      );
      setInfo(`${res.alamatTampil} — ${res.pesan}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuka sesi');
    } finally {
      setMenyambung(false);
    }
  }

  async function salinId() {
    if (!status?.id) return;
    try {
      await navigator.clipboard.writeText(status.id);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2000);
    } catch {
      setError('Tidak bisa menyalin otomatis — silakan salin manual.');
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setModalMode('add');
  }

  function openEdit(item: KomputerKlinik) {
    setForm({
      nama: item.nama,
      anydeskId: item.anydeskId,
      lokasi: item.lokasi ?? '',
      catatan: item.catatan ?? '',
    });
    setEditingId(item.id);
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        await apiPost('/api/komputer-klinik', form);
      } else if (editingId) {
        await apiPatch(`/api/komputer-klinik/${editingId}`, form);
      }
      setModalMode(null);
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/komputer-klinik/${deleteTarget.id}`);
      setDeleteTarget(null);
      await muat();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="page-frame">
      <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem' }}>Koneksi Ke PH</h2>
      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
        Menyambung ke komputer klinik lain lewat AnyDesk. Sesi baru terbuka setelah orang di
        komputer tujuan menekan <strong>Terima</strong> — tidak bisa masuk diam-diam.
      </p>

      {status?.aksesMasuk && (
        <div
          style={{
            padding: '0.7rem 0.95rem',
            borderRadius: '10px',
            marginBottom: '0.9rem',
            background: status.aksesMasuk.wajibSetujui ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${status.aksesMasuk.wajibSetujui ? '#6ee7b7' : '#fca5a5'}`,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
            {status.aksesMasuk.wajibSetujui
              ? '🔒 Sambungan masuk ke komputer ini wajib disetujui'
              : '⚠️ Sambungan masuk ke komputer ini TIDAK wajib disetujui'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#334155' }}>{status.aksesMasuk.pesan}</div>
        </div>
      )}

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}
      {info && (
        <div
          style={{
            padding: '0.6rem 0.9rem',
            borderRadius: '8px',
            background: '#dcfce7',
            border: '1px solid #86efac',
            marginBottom: '0.75rem',
            fontSize: '0.88rem',
          }}
        >
          {info}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        <div
          style={{
            flex: '1 1 17rem',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
            ID komputer ini
          </div>
          {loading ? (
            <div style={{ color: '#64748b' }}>Memeriksa…</div>
          ) : status?.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '1.5rem', letterSpacing: '0.04em' }}>
                {status.idTampil}
              </strong>
              <button type="button" className="btn btn--sm btn--secondary" onClick={() => void salinId()}>
                {disalin ? '✅ Tersalin' : '📋 Salin'}
              </button>
            </div>
          ) : (
            <div style={{ color: '#b91c1c', fontSize: '0.88rem' }}>{status?.pesan}</div>
          )}
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            Berikan nomor ini kepada orang yang akan menyambung ke komputer Anda.
          </p>
        </div>

        <div
          style={{
            flex: '1 1 17rem',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="form-field" style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="koneksi-tujuan">Sambung ke ID</label>
            <input
              id="koneksi-tujuan"
              value={tujuan}
              onChange={(e) => setTujuan(e.target.value)}
              placeholder="123 456 789 atau nama@ad"
              disabled={!status?.terpasang}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void sambung(tujuan)}
            disabled={menyambung || !tujuan.trim() || !status?.terpasang}
          >
            {menyambung ? 'Membuka…' : '🖥️ Sambungkan'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Komputer Klinik Tersimpan</h3>
        <button type="button" className="btn btn--sm btn--primary" onClick={openAdd}>
          + Tambah Komputer
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>ID AnyDesk</th>
            <th>Lokasi</th>
            <th>Catatan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5}>
                Belum ada komputer tersimpan. Tambahkan supaya lain kali tinggal klik Sambung.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>{item.nama}</td>
                <td style={{ letterSpacing: '0.03em' }}>{formatId(item.anydeskId)}</td>
                <td>{item.lokasi || '—'}</td>
                <td>{item.catatan || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      onClick={() => void sambung(item.anydeskId)}
                      disabled={menyambung || !status?.terpasang}
                    >
                      Sambung
                    </button>
                    <TableRowActions
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleteTarget({ id: item.id, label: item.nama })}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Modal
        open={modalMode !== null}
        title={modalMode === 'add' ? 'Tambah Komputer' : 'Ubah Komputer'}
        onClose={() => setModalMode(null)}
      >
        <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
          <div className="form-field form-grid--full">
            <label htmlFor="komputer-nama">Nama *</label>
            <input
              id="komputer-nama"
              required
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              placeholder="Contoh: Ruang Pendaftaran"
            />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="komputer-anydesk">ID AnyDesk *</label>
            <input
              id="komputer-anydesk"
              required
              value={form.anydeskId}
              onChange={(e) => setForm((f) => ({ ...f, anydeskId: e.target.value }))}
              placeholder="123 456 789 atau nama@ad"
            />
            <p className="form-hint">Boleh diketik berspasi — spasinya dibuang otomatis.</p>
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="komputer-lokasi">Lokasi</label>
            <input
              id="komputer-lokasi"
              value={form.lokasi}
              onChange={(e) => setForm((f) => ({ ...f, lokasi: e.target.value }))}
              placeholder="Opsional"
            />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="komputer-catatan">Catatan</label>
            <input
              id="komputer-catatan"
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              placeholder="Opsional"
            />
          </div>
          <ModalFormFooter onCancel={() => setModalMode(null)} submitLabel="Simpan" loading={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus komputer"
        message={`Hapus "${deleteTarget?.label}" dari daftar?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleteLoading}
      />
    </div>
  );
}
