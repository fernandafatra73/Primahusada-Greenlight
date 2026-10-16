import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { Modal } from '../components/ui/Modal.tsx';
import { apiDelete, apiGet, apiPatch } from '../lib/api.ts';
import {
  formatDurasi,
  keInputDatetimeLocal,
  pecahWaktuLogin,
  type LoginLogItem,
} from '../lib/loginLog.ts';
import { LoginLogReportDocument } from '../pdf/LoginLogReportDocument.tsx';
import { loadLogoDataUrl } from '../pdf/loadLogoDataUrl.ts';
import '../components/ui/ui.css';

/** Mega Data > Tabel-login: riwayat login beserta foto webcam otomatis. */
export function TabelLoginPage() {
  const [items, setItems] = useState<readonly LoginLogItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState('');
  const [editItem, setEditItem] = useState<LoginLogItem | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editWaktu, setEditWaktu] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [cetakItems, setCetakItems] = useState<readonly LoginLogItem[] | null>(null);
  const [fotoBesar, setFotoBesar] = useState<LoginLogItem | null>(null);

  const muat = useCallback(async () => {
    try {
      const res = await apiGet<{ items: LoginLogItem[] }>('/api/login-log');
      setItems(res.items);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat tabel login');
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
    void loadLogoDataUrl().then(setLogoSrc).catch(() => setLogoSrc(''));
  }, [muat]);

  function bukaEdit(item: LoginLogItem) {
    setEditItem(item);
    setEditNama(item.nama);
    setEditWaktu(keInputDatetimeLocal(item.loginAt));
  }

  async function simpanEdit(event: FormEvent) {
    event.preventDefault();
    if (!editItem) return;
    setMenyimpan(true);
    try {
      const res = await apiPatch<{ item: LoginLogItem }>(`/api/login-log/${editItem.id}`, {
        nama: editNama,
        // datetime-local tidak membawa zona waktu; new Date() membacanya sebagai waktu lokal.
        loginAt: new Date(editWaktu).toISOString(),
      });
      setItems((prev) => prev.map((it) => (it.id === res.item.id ? res.item : it)));
      setEditItem(null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapus(item: LoginLogItem) {
    if (!window.confirm(`Hapus data login ${item.nama}?`)) return;
    try {
      await apiDelete(`/api/login-log/${item.id}`);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data login');
    }
  }

  async function unduhPdf(daftar: readonly LoginLogItem[]) {
    try {
      const blob = await pdf(<LoginLogReportDocument items={daftar} logoSrc={logoSrc} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Tabel_Login.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <h2 style={{ margin: 0 }}>Tabel Login</h2>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setCetakItems(items)}
          disabled={items.length === 0}
        >
          🖨️ Cetak Semua
        </button>
      </div>
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: '#475569' }}>
        Setiap login tercatat otomatis beserta foto dari webcam komputer. Durasi buka dihitung sampai logout, atau sampai
        aplikasi terakhir terlihat terbuka.
      </p>
      {error && (
        <div className="alert alert--error" style={{ marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      {memuat ? (
        <p style={{ color: '#64748b' }}>Memuat…</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#64748b' }}>Belum ada data login.</p>
      ) : (
        <table className="table table--compact" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '3rem' }}>No</th>
              <th>Nama Login</th>
              <th>Jam</th>
              <th>Tanggal</th>
              <th>Bulan</th>
              <th>Tahun</th>
              <th>Durasi Buka</th>
              <th>Foto</th>
              <th style={{ width: '12rem' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const w = pecahWaktuLogin(item.loginAt);
              return (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{item.nama}</strong>
                    {item.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.email}</div>}
                  </td>
                  <td>{w.jam}</td>
                  <td>{w.tanggal}</td>
                  <td>{w.bulan}</td>
                  <td>{w.tahun}</td>
                  <td>
                    {formatDurasi(item.durasiDetik)}
                    {!item.logoutAt && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>tanpa logout</div>}
                  </td>
                  <td>
                    {item.foto ? (
                      <button
                        type="button"
                        onClick={() => setFotoBesar(item)}
                        title="Lihat foto"
                        style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}
                      >
                        <img
                          src={item.foto}
                          alt={`Foto login ${item.nama}`}
                          style={{ width: 64, height: 48, objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--sm btn--secondary" onClick={() => bukaEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn--sm btn--secondary" onClick={() => setCetakItems([item])}>
                        Cetak
                      </button>
                      <button type="button" className="btn btn--sm btn--danger" onClick={() => void hapus(item)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editItem && (
        <Modal title="Edit Data Login" open={true} onClose={() => setEditItem(null)}>
          <form onSubmit={(e) => void simpanEdit(e)} style={{ display: 'grid', gap: '0.7rem' }}>
            <div className="form-field">
              <label htmlFor="login-log-nama">Nama login</label>
              <input id="login-log-nama" required value={editNama} onChange={(e) => setEditNama(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="login-log-waktu">Waktu login</label>
              <input
                id="login-log-waktu"
                type="datetime-local"
                required
                value={editWaktu}
                onChange={(e) => setEditWaktu(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setEditItem(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn--primary" disabled={menyimpan}>
                {menyimpan ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {cetakItems && (
        <Modal title="Cetak Tabel Login" open={true} onClose={() => setCetakItems(null)} size="xl">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <button type="button" className="btn btn--primary" onClick={() => void unduhPdf(cetakItems)}>
              ⬇️ Unduh / Cetak PDF
            </button>
          </div>
          <div style={{ width: '100%', height: 'calc(100vh - 14rem)', minHeight: '500px' }}>
            <PDFViewer width="100%" height="100%" className="pdf-viewer">
              <LoginLogReportDocument items={cetakItems} logoSrc={logoSrc} />
            </PDFViewer>
          </div>
        </Modal>
      )}

      {fotoBesar?.foto && (
        <Modal title={`Foto Login — ${fotoBesar.nama}`} open={true} onClose={() => setFotoBesar(null)} size="lg">
          <img src={fotoBesar.foto} alt={`Foto login ${fotoBesar.nama}`} style={{ width: '100%', display: 'block' }} />
        </Modal>
      )}
    </div>
  );
}
