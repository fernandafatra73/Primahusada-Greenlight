import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { apiDelete, apiGet, apiPost } from '../lib/api.ts';
import './ui/ui.css';

interface KodeAktivasi {
  readonly id: string;
  readonly kode: string;
  readonly createdAt: string;
  readonly dipakaiPada: string | null;
}

interface DaftarKodeAktivasiProps {
  readonly gaya: CSSProperties;
  /** Naik setiap aktivasi berhasil, supaya status "Dipakai" ikut diperbarui. */
  readonly versi: number;
}

async function salinTeks(teks: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(teks);
    return;
  }
  // Fallback untuk konteks tanpa Clipboard API (mis. dibuka lewat http di jaringan lokal).
  const area = document.createElement('textarea');
  area.value = teks;
  document.body.appendChild(area);
  area.select();
  const berhasil = document.execCommand('copy');
  area.remove();
  if (!berhasil) throw new Error('Browser menolak menyalin');
}

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Daftar kode aktivasi sekali pakai: tambah, salin, hapus. */
export function DaftarKodeAktivasi({ gaya, versi }: DaftarKodeAktivasiProps) {
  const [items, setItems] = useState<readonly KodeAktivasi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disalin, setDisalin] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      const res = await apiGet<{ items: KodeAktivasi[] }>('/api/kode-aktivasi');
      setItems(res.items);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kode aktivasi');
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat, versi]);

  async function tambah() {
    setSibuk(true);
    try {
      const res = await apiPost<{ item: KodeAktivasi }>('/api/kode-aktivasi', {});
      setItems((prev) => [res.item, ...prev]);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kode aktivasi');
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(item: KodeAktivasi) {
    if (!window.confirm(`Hapus kode ${item.kode}?`)) return;
    setSibuk(true);
    try {
      await apiDelete(`/api/kode-aktivasi/${item.id}`);
      setItems((prev) => prev.filter((k) => k.id !== item.id));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kode aktivasi');
    } finally {
      setSibuk(false);
    }
  }

  async function salin(item: KodeAktivasi) {
    try {
      await salinTeks(item.kode);
      setDisalin(item.id);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyalin kode');
    }
  }

  return (
    <section style={gaya}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <h3 style={{ margin: 0 }}>Kode Aktivasi</h3>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => void tambah()} disabled={sibuk}>
          + Tambah Kode
        </button>
      </div>
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: '#475569' }}>
        Format: tahun-bulan-tanggal, nomor urut hari itu, lalu 8 karakter acak yang tidak bisa ditebak. Setiap kode
        hanya bisa dipakai sekali.
      </p>
      {error && (
        <div className="alert alert--error" style={{ marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}
      {memuat ? (
        <p style={{ margin: 0, color: '#64748b' }}>Memuat kode…</p>
      ) : items.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b' }}>Belum ada kode. Klik &quot;+ Tambah Kode&quot;.</p>
      ) : (
        <table className="table table--compact" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Dibuat</th>
              <th>Status</th>
              <th style={{ width: '10rem' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td style={{ fontFamily: 'Consolas, monospace', fontWeight: 700, letterSpacing: '0.04em' }}>
                  {item.kode}
                </td>
                <td>{formatWaktu(item.createdAt)}</td>
                <td style={{ color: item.dipakaiPada ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                  {item.dipakaiPada ? `Dipakai ${formatWaktu(item.dipakaiPada)}` : 'Belum dipakai'}
                </td>
                <td style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn--sm btn--secondary"
                    onClick={() => void salin(item)}
                    disabled={item.dipakaiPada !== null}
                  >
                    {disalin === item.id ? 'Tersalin' : 'Salin'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => void hapus(item)}
                    disabled={sibuk}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
