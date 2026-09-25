import { HADITH_COLLECTIONS } from '../lib/hadithApi.ts';
import { useHadithReader } from '../context/HadithReaderContext.tsx';

/** Penanda mengambang saat hadits sedang dibacakan beruntun — dipasang
 * sekali di App.tsx di luar halaman Kisah, supaya pembacaan terus jalan
 * walau penggunanya pindah tab/menu lain, dan baru berhenti kalau tombol
 * "Stop" ditekan. Lihat KaraokePlayerWidget untuk pola yang sama. */
export function HadithReaderWidget() {
  const { collection, current, isSpeaking, loading, stop } = useHadithReader();

  if (!isSpeaking && !loading) return null;

  const kitabLabel = HADITH_COLLECTIONS.find((c) => c.id === collection)?.label ?? collection;

  return (
    <div
      style={{
        position: 'fixed',
        left: '1rem',
        bottom: '1rem',
        width: '320px',
        maxWidth: 'calc(100vw - 2rem)',
        background: '#0f172a',
        color: '#fff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        zIndex: 70,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.6rem 0.85rem',
          background: '#1e293b',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
          🔊 {kitabLabel} {current ? `— No. ${current.number}` : ''}
        </div>
        <button type="button" className="btn btn--sm btn--danger" onClick={stop} title="Berhenti membaca">
          ⏹️ Stop
        </button>
      </div>
      <div style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
        {loading && !current ? 'Memuat…' : 'Sedang dibacakan, lanjut otomatis ke nomor berikutnya…'}
      </div>
    </div>
  );
}
