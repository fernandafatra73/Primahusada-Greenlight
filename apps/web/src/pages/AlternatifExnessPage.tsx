import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  hitungIndikator,
  XauIndikatorChart,
  type SinyalTerakhir,
} from '../components/trading/XauIndikatorChart.tsx';
import { apiGet } from '../lib/api.ts';
import { INFO_POLA, type OhlcCandle } from '../lib/indikatorTrading.ts';
import { withIndonesianVoice } from '../lib/speechVoice.ts';
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
  /** "binance" normalnya; "yahoo" bila Binance gagal dan API memakai cadangan futures COMEX. */
  readonly sumber: 'binance' | 'yahoo';
  readonly interval: string;
  readonly intervalMinutes: number;
  readonly candles: ReadonlyArray<OhlcCandle>;
}

/** Widget TradingView dengan RSI & MA 50 bawaan, sebagai pembanding grafik indikator di atas. */
function tradingViewSrc(interval: string): string {
  const config = {
    autosize: true,
    // Sama dengan sumber grafik indikator: harga emas Binance (PAXG/USDT).
    symbol: 'BINANCE:PAXGUSDT',
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

function speakSinyal(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  withIndonesianVoice((voice) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voice?.lang ?? 'id-ID';
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  });
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

  // Peringatan otomatis saat refresh menemukan sinyal BUY/SELL baru. Sinyal yang
  // sudah ada saat halaman/timeframe pertama dimuat tidak diumumkan.
  const [alertBaru, setAlertBaru] = useState<SinyalTerakhir | null>(null);
  const [suaraAktif, setSuaraAktif] = useState(true);
  const [izinNotifikasi, setIzinNotifikasi] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const sinyalDikenalRef = useRef<{ interval: string; key: string | null } | null>(null);

  useEffect(() => {
    if (candles.length === 0 || !data) return;
    const s = summary.sinyalTerakhir;
    const key = s ? `${s.arah}-${s.waktu}` : null;
    const dikenal = sinyalDikenalRef.current;
    sinyalDikenalRef.current = { interval, key };
    if (!dikenal || dikenal.interval !== interval || !s || key === dikenal.key) return;
    // Hanya sinyal segar (konfirmasi dalam 3 candle terakhir) yang diumumkan.
    if (Date.now() - s.waktu > 3 * data.intervalMinutes * 60_000) return;

    setAlertBaru(s);
    const beli = s.arah === 'BELI';
    const judul = beli ? 'SAATNYA BELI (BUY) XAU/USD' : 'SAATNYA JUAL (SELL) XAU/USD';
    const isi = `Konfirmasi ${s.pola} di ${beli ? 'support' : 'resistance'} ${s.level.toFixed(2)} · ${formatJam(s.waktu)}`;
    if (suaraAktif) {
      speakSinyal(beli ? 'Sinyal baru. Saatnya beli emas.' : 'Sinyal baru. Saatnya jual emas.');
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(judul, { body: isi, tag: 'sinyal-xauusd' });
    }
  }, [summary.sinyalTerakhir, candles.length, data, interval, suaraAktif]);

  async function mintaIzinNotifikasi() {
    if (typeof Notification === 'undefined') return;
    setIzinNotifikasi(await Notification.requestPermission());
  }

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
    <div className="page-frame page-frame--claude">
      <h2 style={{ margin: '0 0 0.35rem' }}>Alternatif Exness</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)' }}>
        Grafik XAU/USD dengan RSI 14, MA 50, FVG (Fair Value Gap), dan sinyal pembalikan arah. Harga mengikuti Binance
        (PAXG/USDT, token emas 1 troy ounce). Untuk order, buka terminal Exness.
      </p>
      {data?.sumber === 'yahoo' && (
        <p className="alert alert--error">
          ⚠️ Data Binance sedang tidak bisa diambil — sementara memakai futures emas COMEX (GC=F), harganya bisa selisih
          puluhan dolar dari Binance.
        </p>
      )}

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
        <button
          type="button"
          className="btn btn--ghost"
          style={{ border: '1px solid var(--color-border)' }}
          onClick={() => setSuaraAktif((v) => !v)}
        >
          {suaraAktif ? '🔊 Suara sinyal: ON' : '🔇 Suara sinyal: OFF'}
        </button>
        {izinNotifikasi === 'default' && (
          <button
            type="button"
            className="btn btn--ghost"
            style={{ border: '1px solid var(--color-border)' }}
            onClick={() => void mintaIzinNotifikasi()}
          >
            🔔 Aktifkan Notifikasi
          </button>
        )}
        {izinNotifikasi === 'granted' && <small style={{ color: '#16a34a' }}>🔔 Notifikasi aktif</small>}
        {updatedAt !== null && (
          <small style={{ color: 'var(--color-text-muted)' }}>
            Update {formatJam(updatedAt)} · cek sinyal otomatis tiap 1 menit
          </small>
        )}
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      {alertBaru && (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            borderRadius: '8px',
            background: alertBaru.arah === 'BELI' ? '#16a34a' : '#dc2626',
            color: '#fff',
          }}
        >
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              🚨 SINYAL BARU: {alertBaru.arah === 'BELI' ? 'SAATNYA BELI (BUY)' : 'SAATNYA JUAL (SELL)'}
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              {alertBaru.emoji} {alertBaru.pola} di {alertBaru.arah === 'BELI' ? 'support' : 'resistance'}{' '}
              {alertBaru.level.toFixed(2)} + candle konfirmasi · {formatJam(alertBaru.waktu)}. Tetap pakai stop loss.
            </div>
          </div>
          <button
            type="button"
            className="btn btn--sm"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.6)' }}
            onClick={() => setAlertBaru(null)}
          >
            Tutup
          </button>
        </div>
      )}

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
        <div style={statStyle}>
          <small style={{ color: '#0f766e', fontWeight: 700 }}>Support</small>
          <strong>{summary.support?.toFixed(2) ?? '–'}</strong>
          <small style={{ color: '#b91c1c', fontWeight: 700 }}>Resistance</small>
          <strong>{summary.resistance?.toFixed(2) ?? '–'}</strong>
        </div>
        <div
          style={{
            ...statStyle,
            flex: '1 1 220px',
            background: sinyal ? (sinyal.arah === 'BELI' ? '#16a34a' : '#dc2626') : 'var(--color-bg-surface)',
            color: sinyal ? '#fff' : undefined,
          }}
        >
          <small style={{ opacity: 0.9 }}>Sinyal BUY/SELL terakhir (sudah terkonfirmasi)</small>
          <strong style={{ fontSize: '1.05rem' }}>
            {sinyal ? (sinyal.arah === 'BELI' ? '🟢 SAATNYA BELI (BUY)' : '🔴 SAATNYA JUAL (SELL)') : 'Belum ada sinyal — tunggu'}
          </strong>
          {sinyal && (
            <small>
              {sinyal.emoji} {sinyal.pola} di {sinyal.arah === 'BELI' ? 'support' : 'resistance'} {sinyal.level.toFixed(2)} ·
              konfirmasi {formatJam(sinyal.waktu)}
            </small>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden', background: 'var(--color-bg-surface)' }}>
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
        <span><span style={{ color: '#0f766e', fontWeight: 800 }}>╌</span> Support</span>
        <span><span style={{ color: '#b91c1c', fontWeight: 800 }}>╌</span> Resistance</span>
        <span style={{ color: '#16a34a', fontWeight: 700 }}>▲ BELI</span>
        <span style={{ color: '#dc2626', fontWeight: 700 }}>▼ JUAL</span>
        <span style={{ color: 'var(--color-text-muted)' }}>Emoji di candle = pola candle (arahkan kursor untuk nama pola).</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem 1rem', background: 'var(--color-bg-surface)' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>🕯️ Pola candle terbaru</h3>
          {summary.polaTerbaru.length === 0 ? (
            <small style={{ color: 'var(--color-text-muted)' }}>Belum ada pola terdeteksi.</small>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {summary.polaTerbaru.map((p) => {
                const info = INFO_POLA[p.jenis];
                return (
                  <li key={`${p.jenis}-${p.waktu}`} title={info.keterangan}>
                    <strong>
                      {info.emoji} {info.nama}
                    </strong>{' '}
                    <span style={{ color: info.arah === 'BUY' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>— {info.peluang}</span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {formatJam(p.waktu)} · close {p.harga.toFixed(2)} · {info.keterangan}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem 1rem', background: 'var(--color-bg-surface)' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>⭐ Rumus sinyal otomatis</h3>
          <p style={{ margin: '0 0 0.4rem' }}>
            <strong style={{ color: '#16a34a' }}>BUY</strong> = Support + rejection bawah (🟢 Bullish Engulfing / 🔨 Hammer / 🌅
            Morning Star) + candle berikutnya bullish sebagai konfirmasi.
          </p>
          <p style={{ margin: '0 0 0.4rem' }}>
            <strong style={{ color: '#dc2626' }}>SELL</strong> = Resistance + rejection atas (🔴 Bearish Engulfing / 🌠 Shooting Star /
            🌆 Evening Star) + candle berikutnya bearish sebagai konfirmasi.
          </p>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem' }}>
            🟩/🟥 Marubozu dan 💂 Three White Soldiers / 🐦‍⬛ Three Black Crows ditandai sebagai momentum kuat — jangan langsung kejar
            harga, tunggu retracement.
          </p>
          <small style={{ color: 'var(--color-text-muted)' }}>
            Support/resistance = swing low/high terakhir. Sinyal dicek otomatis setiap refresh (1 menit) memakai candle yang sudah
            tertutup. Hanya alat bantu — tetap pakai stop loss.
          </small>
        </div>
      </div>

      <h3 style={{ margin: '0 0 0.5rem' }}>Grafik TradingView (RSI & MA 50)</h3>
      <div
        style={{
          height: '60vh',
          minHeight: 380,
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          overflow: 'hidden',
          background: 'var(--color-bg-surface)',
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
