import { useState } from 'react';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { getWeton, getZodiacSign, type Weton, type ZodiacSign } from '../lib/jivana.ts';
import '../components/ui/ui.css';

function todayValue(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function JivanaPage() {
  const [tanggal, setTanggal] = useState(todayValue);
  const [hasil, setHasil] = useState<{ weton: Weton; zodiak: ZodiacSign } | null>(null);

  function hitung() {
    if (!tanggal) return;
    // new Date('YYYY-MM-DD') di JS diparse sebagai UTC tengah malam — pakai
    // konstruktor Y/M/D lokal supaya tidak mundur satu hari di zona WIB dst.
    const [y, m, d] = tanggal.split('-').map(Number);
    const date = new Date(y!, m! - 1, d!);
    setHasil({ weton: getWeton(date), zodiak: getZodiacSign(date) });
  }

  return (
    <ListPageShell
      title="Jivana — Ramalan Kehidupan"
      subtitle="Berdasarkan weton (ilmu Jawa) dan zodiak (astrologi Barat) dari tanggal lahir"
    >
      <div style={{ padding: '1rem', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ margin: 0 }}>
            <label htmlFor="jivana-tanggal">Tanggal Lahir</label>
            <input
              id="jivana-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn--primary" onClick={hitung}>
            🔮 Lihat Ramalan
          </button>
        </div>

        {hasil && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Weton */}
            <div style={{ background: '#0f172a', color: '#fff', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                Menurut Ilmu Jawa (Primbon)
              </div>
              <h3 style={{ margin: '0 0 0.5rem' }}>
                Weton: {hasil.weton.hari} {hasil.weton.pasaran}
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
                Neptu {hasil.weton.hari} ({hasil.weton.neptuHari}) + Neptu {hasil.weton.pasaran} ({hasil.weton.neptuPasaran}) ={' '}
                <strong>{hasil.weton.neptuTotal}</strong>
              </div>
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Sifat hari {hasil.weton.hari}:</strong> {hasil.weton.sifatHari}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Sifat pasaran {hasil.weton.pasaran}:</strong> {hasil.weton.sifatPasaran}
              </p>
            </div>

            {/* Zodiak */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Menurut Zodiak (Astrologi Barat)
              </div>
              <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a' }}>
                {hasil.zodiak.simbol} {hasil.zodiak.nama} ({hasil.zodiak.namaIndonesia})
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>{hasil.zodiak.periode}</div>
              <p style={{ margin: 0, color: '#334155' }}>{hasil.zodiak.sifat}</p>
            </div>

            {/* Catatan ilmiah */}
            <div
              style={{
                background: '#fef9c3',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                fontSize: '0.85rem',
                color: '#713f12',
              }}
            >
              <strong>📚 Catatan dari ilmu pengetahuan modern:</strong> Sains belum menemukan bukti bahwa tanggal
              lahir secara langsung menentukan kepribadian seseorang — baik lewat weton maupun zodiak. Kepribadian
              nyatanya dibentuk oleh banyak faktor: genetik, pola asuh, lingkungan, dan pengalaman hidup. Isi
              halaman ini disajikan sebagai referensi budaya/hiburan, bukan fakta ilmiah maupun dasar mengambil
              keputusan penting.
            </div>
          </div>
        )}
      </div>
    </ListPageShell>
  );
}
