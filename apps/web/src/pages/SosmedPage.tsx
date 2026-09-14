import type { AppViewId } from '../config/navigation.ts';

interface SosmedLink {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly icon: string;
}

const SOSMED_LINKS: readonly SosmedLink[] = [
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/', icon: '▶️' },
  { id: 'snackvideo', label: 'SnackVideo', url: 'https://www.snackvideo.com/', icon: '🎬' },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/', icon: '🎵' },
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/', icon: '👍' },
  { id: 'shopee', label: 'Shopee', url: 'https://shopee.co.id/', icon: '🛍️' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/', icon: '📷' },
  { id: 'whatsapp-sosmed', label: 'WhatsApp', url: 'https://www.whatsapp.com/', icon: '💬' },
  { id: 'telegram-sosmed', label: 'Telegram', url: 'https://telegram.org/', icon: '✈️' },
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/', icon: '🤖' },
  { id: 'bloomberg', label: 'Bloomberg', url: 'https://www.bloomberg.com/', icon: '📰' },
  {
    id: 'exness',
    label: 'Exness',
    url: 'https://my.extrade.global/webtrading/?utm_source=mc&utm_medium=email&partner_id=12058011&utm_campaign=Weekly_Recap_XAUUSD_ACT_Chart_20260828',
    icon: '💹',
  },
  {
    id: 'binance',
    label: 'Binance',
    url: 'https://www.binance.bh/en/futures/PAXGUSDT',
    icon: '🟡',
  },
];

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '1.25rem 1rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  background: 'var(--color-bg-surface)',
  boxShadow: 'var(--shadow-card)',
  textDecoration: 'none',
  color: 'var(--color-text)',
  fontWeight: 600,
  cursor: 'pointer',
};

interface SosmedPageProps {
  readonly onNavigate: (view: AppViewId) => void;
}

/** Menggabungkan seluruh tautan Sosmed ke dalam satu halaman, menggantikan
 * dropdown navbar Sosmed yang sebelumnya membuka daftar tautan terpisah. */
export function SosmedPage({ onNavigate }: SosmedPageProps) {
  return (
    <div className="page-frame page-frame--pink">
      <h2 style={{ margin: '0 0 0.35rem' }}>Sosmed</h2>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--color-text-muted)' }}>
        Tautan cepat ke media sosial &amp; platform resmi klinik.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        <button type="button" onClick={() => onNavigate('trading')} style={cardStyle}>
          <span style={{ fontSize: '2rem' }}>🪙</span>
          <span>Trading XAU/USD</span>
        </button>
        <button type="button" onClick={() => onNavigate('trading-candle')} style={cardStyle}>
          <span style={{ fontSize: '2rem' }}>🕯️</span>
          <span>Trading Candle</span>
        </button>
        <button type="button" onClick={() => onNavigate('analisa-grafik')} style={cardStyle}>
          <span style={{ fontSize: '2rem' }}>📊</span>
          <span>Analisa Grafik</span>
        </button>
        <button type="button" onClick={() => onNavigate('video-modul')} style={cardStyle}>
          <span style={{ fontSize: '2rem' }}>🎬</span>
          <span>Video Modul</span>
        </button>
        <button type="button" onClick={() => onNavigate('daftar-akun')} style={cardStyle}>
          <span style={{ fontSize: '2rem' }}>🔐</span>
          <span>Daftar Akun</span>
        </button>
        <button type="button" onClick={() => onNavigate('global-warm')} style={cardStyle}>
          <span style={{ fontSize: '2rem' }}>🏦</span>
          <span>Global Warm</span>
        </button>
        {SOSMED_LINKS.map((link) => (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={cardStyle}>
            <span style={{ fontSize: '2rem' }}>{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
