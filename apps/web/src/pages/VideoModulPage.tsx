import { MAIN_NAV_CATEGORIES } from '../config/navigation.ts';

/** Path video panduan per modul (id sama dengan id di navigation.ts). Kosong
 * dulu — isi nanti dengan menambahkan entri di sini, misal:
 * 'pendaftaran-umum': '/videos/pendaftaran-umum.mp4'
 * (taruh file videonya di apps/web/public/videos/). */
const MODULE_VIDEOS: Readonly<Record<string, string>> = {};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  background: 'var(--color-bg-surface)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
};

const placeholderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  height: '140px',
  background: 'var(--color-bg-page)',
  color: 'var(--color-text-muted)',
  fontSize: '0.8rem',
};

/** Katalog video panduan untuk setiap modul aplikasi, dikelompokkan sama
 * seperti kategori navigasi utama. Modul yang belum punya videonya
 * ditandai "Video belum tersedia" — tinggal diisi lewat MODULE_VIDEOS
 * di atas begitu file videonya sudah siap. */
export function VideoModulPage() {
  return (
    <div>
      <h2 style={{ margin: '0 0 0.35rem' }}>Video Modul</h2>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--color-text-muted)' }}>
        Panduan video untuk setiap modul aplikasi.
      </p>

      {MAIN_NAV_CATEGORIES.map((category) => (
        <div key={category.id} style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>{category.label}</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {category.items.map((item) => {
              const videoSrc = MODULE_VIDEOS[item.id];
              return (
                <div key={item.id} style={cardStyle}>
                  {videoSrc ? (
                    <video controls style={{ width: '100%', height: '140px', background: '#000' }} src={videoSrc} />
                  ) : (
                    <div style={placeholderStyle}>
                      <span style={{ fontSize: '1.6rem' }}>🎬</span>
                      <span>Video belum tersedia</span>
                    </div>
                  )}
                  <div style={{ padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
