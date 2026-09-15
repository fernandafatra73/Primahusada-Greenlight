import { useState } from 'react';
import '../components/ui/ui.css';

const EXNESS_WEBTRADING_URL =
  'https://my.extrade.global/webtrading/?utm_source=mc&utm_medium=email&partner_id=12058011&utm_campaign=Weekly_Recap_XAUUSD_ACT_Chart_20260828';

const INTERVAL_OPTIONS: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
  { id: '1', label: '1 Menit' },
  { id: '5', label: '5 Menit' },
  { id: '15', label: '15 Menit' },
  { id: '30', label: '30 Menit' },
  { id: '60', label: '1 Jam' },
  { id: '240', label: '4 Jam' },
  { id: 'D', label: 'Harian' },
];

function chartSrc(interval: string): string {
  const config = {
    autosize: true,
    symbol: 'OANDA:XAUUSD',
    interval,
    timezone: 'Asia/Jakarta',
    theme: 'light',
    style: '1',
    locale: 'id',
    toolbar_bg: '#f8fafc',
    withdateranges: true,
    hide_side_toolbar: false,
  };
  return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=id#${encodeURIComponent(JSON.stringify(config))}`;
}

/** Terminal web Exness menolak ditampilkan di iframe (X-Frame-Options: SAMEORIGIN),
 * jadi halaman ini menampilkan grafik XAU/USD live dari TradingView sebagai
 * alternatif, plus tombol untuk membuka terminal Exness di jendela sendiri. */
export function AlternatifExnessPage() {
  const [interval, setInterval_] = useState('5');

  function bukaExness() {
    const width = Math.min(1400, window.screen.availWidth);
    const height = Math.min(900, window.screen.availHeight);
    // Tanpa flag "noopener" di features: dengan flag itu window.open selalu mengembalikan null.
    const popup = window.open(EXNESS_WEBTRADING_URL, 'exness-webtrading', `width=${width},height=${height}`);
    if (popup) {
      popup.opener = null;
    } else {
      // Popup diblokir browser — buka sebagai tab biasa.
      window.open(EXNESS_WEBTRADING_URL, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className="page-frame page-frame--pink">
      <h2 style={{ margin: '0 0 0.35rem' }}>Alternatif Exness</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)' }}>
        Grafik XAU/USD live sebagai alternatif terminal Exness. Terminal Exness sendiri tidak bisa ditampilkan di
        dalam aplikasi, jadi untuk order buka lewat tombol <strong>Buka Terminal Exness</strong>.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <select aria-label="Timeframe" value={interval} onChange={(e) => setInterval_(e.target.value)}>
          {INTERVAL_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--primary" onClick={bukaExness}>
          💹 Buka Terminal Exness
        </button>
      </div>

      <div
        style={{
          height: '75vh',
          minHeight: 420,
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <iframe
          key={interval}
          title="Grafik XAU/USD (alternatif Exness)"
          src={chartSrc(interval)}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    </div>
  );
}
