import { useCallback, useEffect, useMemo, useState } from 'react';
import { hitungIndikator, XauIndikatorChart } from '../components/trading/XauIndikatorChart.tsx';
import { apiGet } from '../lib/api.ts';
import type { OhlcCandle } from '../lib/indikatorTrading.ts';
import '../components/ui/ui.css';

const EXNESS_WEBTRADING_URL =
  'https://my.extrade.global/webtrading/?utm_source=mc&utm_medium=email&partner_id=12058011&utm_campaign=Weekly_Recap_XAUUSD_ACT_Chart_20260828';

/** id = interval API grafik, tv = interval TradingView yang setara. */
const INTERVAL_OPTIONS: ReadonlyArray<{ readonly id: string; readonly tv: string; readonly label: string }> = [
  { id: '1m', tv: '1', label: '1 Menit' },
  { id: '5m', tv: '5', label: '5 Menit' },
  { id: '15m', tv: '15', label: '15 Menit' },
  { id: '30m', tv: '30', label: '30 Menit' },
  { id: '1h', tv: '60', label: '1 Jam' },
];

const REFRESH_MS = 60_000;

interface ChartCandlesResponse {
  readonly symbol: string;
  readonly interval: string;
  readonly intervalMinutes: number;
  readonly candles: ReadonlyArray<OhlcCandle>;
}

/** Widget TradingView dengan RSI & MA 50 bawaan, sebagai pembanding grafik indikator di atas. */
function tradingViewSrc(interval: string): string {
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
    studies: [
      { id: 'MASimple@tv-basicstudies', inputs: { length: 50 } },
      { id: 'RSI@tv-basicstudies', inputs: { length: 14 } },
    ],
  };
  return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=id#${encodeURIComponent(JSON.stringify(config))}`;
}

function formatJam(ms: number): string {
  return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

const statStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: '0.45rem 0.75rem',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  background: 'var(--color-bg-surface)',
  minWidth: 110,
};

/** Terminal web Exness menolak ditampilkan di iframe (X-Frame-Options: SAMEORIGIN),
 * jadi halaman ini menampilkan grafik XAU/USD sendiri lengkap dengan RSI 14,
 * MA 50, FVG, dan sinyal pembalikan arah, plus tombol membuka terminal Exness. */
export function AlternatifExnessPage() {
  const [interval, setInterval_] = useState('5m');
  const [data, setData] = useState<ChartCandlesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const tvInterval = INTERVAL_OPTIONS.find((o) => o.id === interval)?.tv ?? '5';

  const load = useCallback(async (selected: string, signal?: { cancelled: boolean }) => {
    setLoading(true);
    try {
      const res = await apiGet<ChartCandlesResponse>(`/api/chart-candles/xauusd?interval=${encodeURIComponent(selected)}`);
      if (signal?.cancelled) return;
      setData(res);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (err) {
      if (signal?.cancelled) return;
      setError(err instanceof Error ? err.message : 'Gagal memuat data grafik');
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void load(interval, signal);
    const timer = window.setInterval(() => void load(interval, signal), REFRESH_MS);
    return () => {
      signal.cancelled = true;
      window.clearInterval(timer);
    };
  }, [interval, load]);

  const candles = useMemo(() => (data?.interval === interval ? data.candles : []), [data, interval]);
  const lastCandleRunning = useMemo(() => {
    const last = candles[candles.length - 1];
    return Boolean(last && data && last.openTime + data.intervalMinutes * 60_000 > Date.now());
  }, [candles, data]);
  const summary = useMemo(() => hitungIndikator(candles, lastCandleRunning).summary, [candles, lastCandleRunning]);

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

  const sinyal = summary.sinyalTerakhir;
  const trenMa =
    summary.hargaTerakhir !== null && summary.ma50 !== null
      ? summary.hargaTerakhir >= summary.ma50
        ? { label: 'di atas MA 50', color: '#16a34a' }
        : { label: 'di bawah MA 50', color: '#dc2626' }
      : null;

  return (
    <div className="page-frame page-frame--pink">
      <h2 style={{ margin: '0 0 0.35rem' }}>Alternatif Exness</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)' }}>
        Grafik XAU/USD dengan RSI 14, MA 50, FVG (Fair Value Gap), dan sinyal pembalikan arah. Data dari futures emas
        COMEX (GC=F) — selisih beberapa dolar dengan harga spot Exness. Untuk order, buka terminal Exness.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <select aria-label="Timeframe" value={interval} onChange={(e) => setInterval_(e.target.value)}>
          {INTERVAL_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ border: '1px solid var(--color-border)' }}
          disabled={loading}
          onClick={() => void load(interval)}
        >
          {loading ? '⏳ Memuat...' : '🔄 Refresh'}
        </button>
        <button type="button" className="btn btn--primary" onClick={bukaExness}>
          💹 Buka Terminal Exness
        </button>
        {updatedAt !== null && (
          <small style={{ color: 'var(--color-text-muted)' }}>Update {formatJam(updatedAt)} · otomatis tiap 1 menit</small>
        )}
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={statStyle}>
          <small style={{ color: 'var(--color-text-muted)' }}>Harga</small>
          <strong>{summary.hargaTerakhir?.toFixed(2) ?? '–'}</strong>
        </div>
        <div style={statStyle}>
          <small style={{ color: '#f59e0b', fontWeight: 700 }}>MA 50</small>
          <strong>{summary.ma50?.toFixed(2) ?? '–'}</strong>
          {trenMa && <small style={{ color: trenMa.color, fontWeight: 700 }}>Harga {trenMa.label}</small>}
        </div>
        <div style={statStyle}>
          <small style={{ color: '#7c3aed', fontWeight: 700 }}>RSI 14</small>
          <strong>{summary.rsi14?.toFixed(1) ?? '–'}</strong>
          {summary.rsi14 !== null && (
            <small style={{ color: 'var(--color-text-muted)' }}>
              {summary.rsi14 >= 70 ? 'Overbought' : summary.rsi14 <= 30 ? 'Oversold' : 'Netral'}
            </small>
          )}
        </div>
        <div style={statStyle}>
          <small style={{ color: 'var(--color-text-muted)' }}>FVG aktif</small>
          <strong>{summary.fvgAktif}</strong>
        </div>
        <div
          style={{
            ...statStyle,
            flex: '1 1 220px',
            background: sinyal ? (sinyal.arah === 'BELI' ? '#16a34a' : '#dc2626') : 'var(--color-bg-surface)',
            color: sinyal ? '#fff' : undefined,
          }}
        >
          <small style={{ opacity: 0.9 }}>Sinyal pembalikan arah terakhir</small>
          <strong style={{ fontSize: '1.05rem' }}>
            {sinyal ? (sinyal.arah === 'BELI' ? '🟢 SAATNYA BELI (BUY)' : '🔴 SAATNYA JUAL (SELL)') : 'Belum ada sinyal'}
          </strong>
          {sinyal && (
            <small>
              {sinyal.pola} · {formatJam(sinyal.waktu)}
            </small>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
        {candles.length > 0 ? (
          <XauIndikatorChart candles={candles} lastCandleRunning={lastCandleRunning} />
        ) : (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {loading ? 'Memuat grafik...' : 'Data grafik belum tersedia.'}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', margin: '0.5rem 0 1.25rem', fontSize: '0.8rem' }}>
        <span><span style={{ color: '#f59e0b', fontWeight: 800 }}>━</span> MA 50</span>
        <span><span style={{ color: '#7c3aed', fontWeight: 800 }}>━</span> RSI 14 (garis 70/30)</span>
        <span><span style={{ color: '#16a34a' }}>▮</span> FVG bullish</span>
        <span><span style={{ color: '#dc2626' }}>▮</span> FVG bearish (hanya yang belum terisi)</span>
        <span style={{ color: '#16a34a', fontWeight: 700 }}>▲ BELI</span>
        <span style={{ color: '#dc2626', fontWeight: 700 }}>▼ JUAL</span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Sinyal = engulfing/hammer/shooting star di swing low/high 10 candle + konfirmasi RSI. Hanya estimasi.
        </span>
      </div>

      <h3 style={{ margin: '0 0 0.5rem' }}>Grafik TradingView (RSI & MA 50)</h3>
      <div
        style={{
          height: '60vh',
          minHeight: 380,
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <iframe
          key={tvInterval}
          title="Grafik TradingView XAU/USD dengan RSI dan MA 50"
          src={tradingViewSrc(tvInterval)}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    </div>
  );
}
