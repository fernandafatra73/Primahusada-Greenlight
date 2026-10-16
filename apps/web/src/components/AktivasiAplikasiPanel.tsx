import { useState, type CSSProperties, type FormEvent } from 'react';
import { useAktivasiAplikasi } from '../context/AktivasiAplikasiContext.tsx';
import { apiPost } from '../lib/api.ts';
import {
  PILIHAN_LAMA_AKTIVASI,
  formatTanggalPanjang,
  labelLamaAktivasi,
  tanggalHariIni,
  type AktivasiAplikasi,
  type StatusAktivasi,
} from '../lib/aktivasiAplikasi.ts';
import { DaftarKodeAktivasi } from './DaftarKodeAktivasi.tsx';
import './ui/ui.css';

const NOMOR_PEMILIK = '0857-1932-5557';

const KOTAK: CSSProperties = {
  padding: '1rem 1.2rem',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  background: '#fff',
};

function teksStatus(status: StatusAktivasi): { readonly teks: string; readonly warna: string } {
  switch (status.jenis) {
    case 'aktif':
      return { teks: `Aktif — sisa ${status.sisaHari} hari`, warna: '#15803d' };
    case 'berakhir':
      return { teks: 'Masa aktivasi sudah berakhir', warna: '#b91c1c' };
    case 'belum':
      return { teks: 'Belum diaktifkan', warna: '#b91c1c' };
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

function BarisInfo({ label, nilai }: { readonly label: string; readonly nilai: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.2rem 0' }}>
      <span style={{ width: '11rem', color: '#475569' }}>{label}</span>
      <strong>{nilai}</strong>
    </div>
  );
}

interface AktivasiAplikasiPanelProps {
  /** Tampilkan daftar kode aktivasi (tambah/salin/hapus). Hanya untuk Mega Data > Expired, bukan
   * menu Aktivasi yang tetap bisa dibuka saat aplikasi terkunci. */
  readonly tampilkanDaftarKode?: boolean;
}

/** Status, cara memperpanjang, dan form aktivasi aplikasi (tanggal + lama + kode). */
export function AktivasiAplikasiPanel({ tampilkanDaftarKode = false }: AktivasiAplikasiPanelProps) {
  const { aktivasi, status, setAktivasi } = useAktivasiAplikasi();
  const [versiKode, setVersiKode] = useState(0);
  const [tanggal, setTanggal] = useState(() => tanggalHariIni());
  const [lamaBulan, setLamaBulan] = useState(12);
  const [kode, setKode] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  async function simpan(event: FormEvent) {
    event.preventDefault();
    setMenyimpan(true);
    setError(null);
    setSukses(null);
    try {
      const res = await apiPost<{ aktivasi: AktivasiAplikasi }>('/api/aktivasi-aplikasi', {
        tanggalAktivasi: tanggal,
        lamaBulan,
        kode,
      });
      setAktivasi(res.aktivasi);
      setVersiKode((v) => v + 1);
      setKode('');
      setSukses(`Aktivasi tersimpan, berlaku sampai ${formatTanggalPanjang(res.aktivasi.berakhir)}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan aktivasi');
    } finally {
      setMenyimpan(false);
    }
  }

  const { teks, warna } = teksStatus(status);

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: '760px' }}>
      <section style={KOTAK}>
        <h3 style={{ margin: '0 0 0.6rem' }}>Status Aktivasi</h3>
        <BarisInfo label="Tanggal aktivasi" nilai={aktivasi ? formatTanggalPanjang(aktivasi.tanggalAktivasi) : '-'} />
        <BarisInfo label="Lama aktivasi" nilai={aktivasi ? labelLamaAktivasi(aktivasi.lamaBulan) : '-'} />
        <BarisInfo label="Berakhir pada" nilai={aktivasi ? formatTanggalPanjang(aktivasi.berakhir) : '-'} />
        <div style={{ marginTop: '0.5rem', fontWeight: 700, color: warna }}>{teks}</div>
      </section>

      <section style={KOTAK}>
        <h3 style={{ margin: '0 0 0.6rem' }}>Cara Memperpanjang Aktivasi</h3>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
          <li>
            Hubungi pemilik aplikasi lewat WhatsApp <strong>{NOMOR_PEMILIK}</strong> untuk mendapatkan kode
            aktivasi.
          </li>
          <li>
            Buka <strong>Mega Data &gt; Expired</strong>, atau saat masa aktivasi sudah berakhir buka menu{' '}
            <strong>Aktivasi &gt; Perpanjang Aktivasi</strong>.
          </li>
          <li>Pilih tanggal aktivasi dan lama aktivasi.</li>
          <li>
            Masukkan kode aktivasi (mis. <code>20261017-001-K7QF-9XMB</code>), lalu klik{' '}
            <strong>Simpan Aktivasi</strong>. Satu kode hanya berlaku untuk satu kali aktivasi.
          </li>
          <li>Semua menu aplikasi aktif kembali sampai tanggal berakhir yang baru.</li>
        </ol>
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
          Setelah masa aktivasi berakhir, aplikasi tetap berjalan, tetapi hanya menu Aktivasi yang bisa dibuka.
        </p>
      </section>

      <form style={{ ...KOTAK, display: 'grid', gap: '0.7rem' }} onSubmit={(e) => void simpan(e)}>
        <h3 style={{ margin: 0 }}>Aktivasi / Perpanjang</h3>
        <div className="form-field">
          <label htmlFor="aktivasi-tanggal">Tanggal aktivasi</label>
          <input
            id="aktivasi-tanggal"
            type="date"
            required
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="aktivasi-lama">Lama aktivasi</label>
          <select id="aktivasi-lama" value={lamaBulan} onChange={(e) => setLamaBulan(Number(e.target.value))}>
            {PILIHAN_LAMA_AKTIVASI.map((p) => (
              <option key={p.bulan} value={p.bulan}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="aktivasi-kode">Kode aktivasi</label>
          <input
            id="aktivasi-kode"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="YYYYMMDD-001-XXXX-XXXX"
            required
            value={kode}
            onChange={(e) => {
              setKode(e.target.value);
              setError(null);
            }}
          />
        </div>
        {error && <div className="alert alert--error">{error}</div>}
        {sukses && <div className="alert alert--success">{sukses}</div>}
        <div>
          <button type="submit" className="btn btn--primary" disabled={menyimpan}>
            {menyimpan ? 'Menyimpan…' : 'Simpan Aktivasi'}
          </button>
        </div>
      </form>

      {tampilkanDaftarKode && <DaftarKodeAktivasi gaya={KOTAK} versi={versiKode} />}
    </div>
  );
}
