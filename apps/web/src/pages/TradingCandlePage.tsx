import { useState, type JSX } from 'react';
import type { AppViewId } from '../config/navigation.ts';
import { apiPost } from '../lib/api.ts';

const BLUE = '#1d4ed8';
const GREEN = '#16a34a';
const RED = '#dc2626';
const YELLOW = '#eab308';

const AI_TIMEFRAMES = [
  { id: '15', label: '15M' },
  { id: '30', label: '30M' },
  { id: '60', label: '1H' },
  { id: '240', label: '4H' },
  { id: 'D', label: '1D' },
] as const;

interface TradingAiPivot {
  readonly pivot: number;
  readonly r1: number;
  readonly r2: number;
  readonly r3: number;
  readonly s1: number;
  readonly s2: number;
  readonly s3: number;
  readonly signal: 'BELI' | 'JUAL' | 'NETRAL';
  readonly alasan: string;
}

interface TradingAiAnalisaResult {
  readonly timeframe: string;
  readonly timeframeLabel: string;
  readonly hargaSaatIni: number;
  readonly hargaUpdatedAt: string;
  readonly dataHarianTanggal: string;
  readonly pivot: TradingAiPivot;
  readonly bias: string;
  readonly polaCandleDiperhatikan: string;
  readonly entry: string;
  readonly stopLoss: string;
  readonly takeProfit: string;
  readonly confidence: number;
  readonly catatan: string;
}

function biasColor(bias: string): string {
  const upper = bias.toUpperCase();
  if (upper.includes('BULLISH')) return GREEN;
  if (upper.includes('BEARISH')) return RED;
  return YELLOW;
}

interface TopicButton {
  readonly id: AppViewId;
  readonly label: string;
  readonly icon: string;
}

const TOPIC_BUTTONS: readonly TopicButton[] = [
  { id: 'bullish-engulfing', label: 'Bullish Engulfing', icon: '🕯️' },
  { id: 'bearish-engulfing', label: 'Bearish Engulfing', icon: '🕯️' },
  { id: 'hammer', label: 'Hammer', icon: '🔨' },
  { id: 'shooting-star', label: 'Shooting Star', icon: '🌠' },
  { id: 'morning-star', label: 'Morning Star', icon: '🌅' },
  { id: 'evening-star', label: 'Evening Star', icon: '🌆' },
  { id: 'doji', label: 'Doji', icon: '➕' },
  { id: 'inside-bar', label: 'Inside Bar', icon: '📦' },
  { id: 'breakout', label: 'Breakout', icon: '🚀' },
  { id: 'support-resistance', label: 'Support/Resistance', icon: '📏' },
  { id: 'trend', label: 'Trend', icon: '📈' },
  { id: 'volume', label: 'Volume', icon: '📊' },
  { id: 'rsi', label: 'RSI', icon: '📉' },
  { id: 'macd', label: 'MACD', icon: '〰️' },
  { id: 'bollinger-band', label: 'Bollinger Band', icon: '🎯' },
];

const TIMEFRAMES = [
  { id: '15', label: '15 Menit' },
  { id: '30', label: '30 Menit' },
  { id: '60', label: '1 Jam' },
  { id: 'D', label: '1 Hari' },
  { id: 'W', label: '1 Minggu' },
] as const;

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

const CHART_PRICE_TOP = 4510;
const CHART_PRICE_BOTTOM = 4320;
const CHART_Y_TOP = 20;
const CHART_Y_BOTTOM = 460;

function priceToY(price: number): number {
  const ratio = (CHART_PRICE_TOP - price) / (CHART_PRICE_TOP - CHART_PRICE_BOTTOM);
  return CHART_Y_TOP + ratio * (CHART_Y_BOTTOM - CHART_Y_TOP);
}

interface ExampleCandle {
  readonly o: number;
  readonly c: number;
  readonly h?: number;
  readonly l?: number;
}

/** Data candle contoh (bukan data live) — meniru pergerakan pada gambar
 * referensi: konsolidasi flat, impuls turun kuat menembus SMA 20, lalu
 * konsolidasi pendek mendekati area support. */
const EXAMPLE_CANDLES: readonly ExampleCandle[] = [
  { o: 4465, c: 4468 },
  { o: 4468, c: 4463 },
  { o: 4463, c: 4470 },
  { o: 4470, c: 4465 },
  { o: 4465, c: 4469 },
  { o: 4469, c: 4464 },
  { o: 4464, c: 4468 },
  { o: 4468, c: 4466 },
  { o: 4466, c: 4469 },
  { o: 4469, c: 4372, h: 4471, l: 4360 },
  { o: 4372, c: 4390 },
  { o: 4390, c: 4378 },
  { o: 4378, c: 4395 },
  { o: 4395, c: 4382 },
  { o: 4382, c: 4392 },
  { o: 4392, c: 4386 },
  { o: 4386, c: 4394 },
  { o: 4394, c: 4383 },
  { o: 4383, c: 4391 },
  { o: 4391, c: 4385 },
  { o: 4385, c: 4396 },
  { o: 4396, c: 4388 },
  { o: 4388, c: 4393 },
  { o: 4393, c: 4384 },
  { o: 4384, c: 4390 },
  { o: 4390, c: 4397 },
  { o: 4397, c: 4389 },
  { o: 4389, c: 4395 },
  { o: 4395, c: 4392 },
  { o: 4392, c: 4398 },
];

const EXAMPLE_CHART_WIDTH = 1200;
const CANDLE_X_START = 40;
const CANDLE_X_STEP = (EXAMPLE_CHART_WIDTH - 2 * CANDLE_X_START) / (EXAMPLE_CANDLES.length - 1);

const RESISTANCE_ZONE = { top: 4438, bottom: 4431 };
const SUPPORT_ZONE = { top: 4364, bottom: 4356 };
const SMA20_PRICE = 4381;

function AnalysisArrow({ x1, y1, x2, y2, color, dashed }: {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: string;
  readonly dashed?: boolean;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 12;
  const hx1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const hy1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const hx2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const hy2 = y2 - headLen * Math.sin(angle + Math.PI / 6);
  return (
    <g stroke={color} fill={color}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2.5} strokeDasharray={dashed ? '6 5' : undefined} />
      <polygon points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`} />
    </g>
  );
}

interface AnalysisNote {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly color: string;
  readonly left: string;
  readonly top: string;
  readonly width: string;
}

const ANALYSIS_NOTES: readonly AnalysisNote[] = [
  {
    id: 'impulse',
    title: '1. IMPULSE TURUN KUAT',
    text: 'Candle merah besar menembus Bollinger Middle Band & SMA 20 menandakan tekanan jual sangat kuat.',
    color: RED,
    left: '38%',
    top: '15%',
    width: '25%',
  },
  {
    id: 'support-area',
    title: '2. AREA SUPPORT',
    text: 'Harga sudah mendekati support kuat 4.356 – 4.364 (Bollinger Lower Band). Berpotensi terjadi reaksi beli / pantulan.',
    color: GREEN,
    left: '4%',
    top: '78%',
    width: '25%',
  },
  {
    id: 'konsolidasi',
    title: '3. KONSOLIDASI PENDEK',
    text: 'Setelah penurunan tajam, harga bergerak mendatar dengan range sempit. Menandakan pasar sedang menunggu kekuatan baru (rebound atau lanjut turun).',
    color: YELLOW,
    left: '32%',
    top: '78%',
    width: '25%',
  },
  {
    id: 'bullish-scenario',
    title: '4A. SKENARIO BULLISH (REBOUND)',
    text: 'Jika harga bertahan di atas 4.364 dan menembus 4.400, potensi naik menuju resistance 4.431 – 4.438 bahkan 4.450.',
    color: GREEN,
    left: '68%',
    top: '15%',
    width: '28%',
  },
  {
    id: 'bearish-scenario',
    title: '4B. SKENARIO BEARISH (LANJUT TURUN)',
    text: 'Jika harga gagal bertahan di 4.364 dan menembus ke bawah 4.356, potensi turun lanjut ke 4.330 – 4.320.',
    color: RED,
    left: '60%',
    top: '78%',
    width: '30%',
  },
];

interface SummaryColumn {
  readonly id: string;
  readonly title: string;
  readonly color: string;
  readonly items: readonly string[];
}

const SUMMARY_COLUMNS: readonly SummaryColumn[] = [
  {
    id: 'kesimpulan',
    title: 'KESIMPULAN ANALISA',
    color: '#38bdf8',
    items: [
      'Trend jangka pendek saat ini: BEARISH',
      'Setelah penurunan kuat, harga berada di area support penting.',
      'Ada peluang rebound teknikal, namun bias utama masih turun selama harga di bawah SMA 20 (4.381).',
    ],
  },
  {
    id: 'strategi-buy',
    title: 'STRATEGI BUY (SCALPING / REBOUND)',
    color: GREEN,
    items: [
      'Entry Buy: 4.364 – 4.370',
      'Target 1 (TP1): 4.398 – 4.400',
      'Target 2 (TP2): 4.431 – 4.438',
      'Stop Loss: 4.354 (di bawah support)',
      '*Gunakan manajemen risiko ketat.',
    ],
  },
  {
    id: 'strategi-sell',
    title: 'STRATEGI SELL (LANJUTAN)',
    color: RED,
    items: [
      'Sell jika candle 5m close di bawah 4.356',
      'Entry Sell: 4.353 – 4.356',
      'Target 1 (TP1): 4.330',
      'Target 2 (TP2): 4.320',
      'Stop Loss: 4.370',
    ],
  },
  {
    id: 'level-penting',
    title: 'LEVEL PENTING',
    color: YELLOW,
    items: [
      'Resistance Kuat: 4.431 – 4.438',
      'Resistance Berikutnya: 4.450 – 4.506',
      'Support Kuat: 4.356 – 4.364',
      'Support Berikutnya: 4.330 – 4.320',
    ],
  },
];

const FOKUS_ITEMS = [
  'Pantau reaksi harga di 4.364 dan 4.400.',
  'Perhatikan breakout dari range konsolidasi.',
  'Gunakan volume & momentum sebagai konfirmasi tambahan.',
];

interface CandlePattern {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly confirmation: string;
}

const CANDLE_PATTERNS: readonly CandlePattern[] = [
  {
    id: 'bullish-engulfing',
    title: '1. Bullish Engulfing',
    description: 'Candle hijau besar menutup penuh seluruh badan candle merah sebelumnya.',
    confirmation: 'Candle berikutnya menembus high candle hijau (Bullish Engulfing).',
  },
  {
    id: 'hammer',
    title: '2. Hammer / Pin Bar',
    description: 'Badan kecil di atas, ekor bawah panjang. Menandakan buyer menolak harga lebih rendah.',
    confirmation: 'Candle berikutnya menembus high hammer.',
  },
  {
    id: 'morning-star',
    title: '3. Morning Star',
    description:
      'Pola 3 candle: merah besar, doji/kecil di bawah, lalu hijau kuat yang naik minimal 1/2 dari candle merah pertama.',
    confirmation: 'Candle ke-3 menembus high candle ke-2 atau menutup > 50% dari candle ke-1.',
  },
];

function CandleShape({ x, top, bottom, wickTop, wickBottom, color }: {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
  readonly wickTop: number;
  readonly wickBottom: number;
  readonly color: string;
}) {
  return (
    <g>
      <line x1={x} y1={wickTop} x2={x} y2={wickBottom} stroke={color} strokeWidth={2} />
      <rect x={x - 9} y={top} width={18} height={Math.max(bottom - top, 4)} fill={color} rx={2} />
    </g>
  );
}

function ReversalArrow({ x, y }: { readonly x: number; readonly y: number }) {
  return (
    <g stroke={GREEN} fill={GREEN}>
      <line x1={x} y1={y} x2={x} y2={y - 28} strokeWidth={3} />
      <polygon points={`${x - 6},${y - 24} ${x + 6},${y - 24} ${x},${y - 34}`} />
    </g>
  );
}

function BullishEngulfingDiagram() {
  return (
    <svg viewBox="0 0 160 120" width="100%" height={120}>
      <CandleShape x={55} top={45} bottom={68} wickTop={40} wickBottom={73} color={RED} />
      <CandleShape x={95} top={25} bottom={90} wickTop={20} wickBottom={95} color={GREEN} />
      <ReversalArrow x={130} y={95} />
    </svg>
  );
}

function HammerDiagram() {
  return (
    <svg viewBox="0 0 160 120" width="100%" height={120}>
      <CandleShape x={70} top={30} bottom={46} wickTop={25} wickBottom={95} color={GREEN} />
      <ReversalArrow x={125} y={95} />
    </svg>
  );
}

function MorningStarDiagram() {
  return (
    <svg viewBox="0 0 160 120" width="100%" height={120}>
      <CandleShape x={30} top={20} bottom={68} wickTop={15} wickBottom={72} color={RED} />
      <CandleShape x={70} top={70} bottom={76} wickTop={64} wickBottom={82} color="#94a3b8" />
      <CandleShape x={110} top={28} bottom={72} wickTop={22} wickBottom={76} color={GREEN} />
      <ReversalArrow x={140} y={95} />
    </svg>
  );
}

const DIAGRAMS: Readonly<Record<string, () => JSX.Element>> = {
  'bullish-engulfing': BullishEngulfingDiagram,
  hammer: HammerDiagram,
  'morning-star': MorningStarDiagram,
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${BLUE}`,
  borderRadius: 'var(--radius-card)',
  background: '#0f172a',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
};

const cardTitlebarStyle: React.CSSProperties = {
  padding: '0.75rem 1.25rem',
  background: `linear-gradient(90deg, ${BLUE}, #3b82f6)`,
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '1rem',
  textAlign: 'center',
};

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
  padding: '1rem',
  borderRight: '1px solid rgba(148, 163, 184, 0.2)',
};

const chartCardStyle: React.CSSProperties = {
  border: `1px solid ${BLUE}`,
  borderRadius: 'var(--radius-card)',
  background: '#ffffff',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
  marginBottom: '1.25rem',
};

const chartCardTitlebarStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  background: `linear-gradient(90deg, ${BLUE}, #3b82f6)`,
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.9rem',
};

const noteBoxStyle = (color: string): React.CSSProperties => ({
  position: 'absolute',
  padding: '0.5rem 0.65rem',
  borderRadius: '6px',
  background: 'rgba(15, 23, 42, 0.92)',
  border: `1.5px solid ${color}`,
  fontSize: '0.68rem',
  lineHeight: 1.4,
  color: '#e2e8f0',
});

const summaryColumnStyle: React.CSSProperties = {
  padding: '1rem',
  borderRight: '1px solid rgba(148, 163, 184, 0.2)',
};

/** Halaman Trading Candle — grafik live XAU/USD & panduan pola candlestick bullish reversal. */
interface TradingCandlePageProps {
  readonly onNavigate: (view: AppViewId) => void;
}

export function TradingCandlePage({ onNavigate }: TradingCandlePageProps) {
  const [interval, setInterval_] = useState<string>('5');

  const [aiTimeframe, setAiTimeframe] = useState<string>('15');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<TradingAiAnalisaResult | null>(null);
  const [showAiResult, setShowAiResult] = useState(false);

  async function handleGenerateAi() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await apiPost<TradingAiAnalisaResult>('/api/trading-ai-analisa', { timeframe: aiTimeframe });
      setAiResult(res);
      setShowAiResult(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Gagal memuat analisa AI');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 0.35rem' }}>🕯️ Trading Candle</h2>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--color-text-muted)' }}>
        Panduan membaca pola candlestick untuk analisa XAU/USD.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        {TOPIC_BUTTONS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onNavigate(topic.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              background: 'var(--color-bg-surface)',
              boxShadow: 'var(--shadow-card)',
              fontWeight: 600,
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1.75rem' }}>{topic.icon}</span>
            <span style={{ fontSize: '0.85rem', textAlign: 'center' }}>{topic.label}</span>
          </button>
        ))}
      </div>

      <div style={chartCardStyle}>
        <div style={chartCardTitlebarStyle}>📈 Grafik Candlestick XAU/USD</div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setInterval_(tf.id)}
                style={{
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  border: `1px solid ${interval === tf.id ? YELLOW : 'var(--color-border)'}`,
                  background: interval === tf.id ? YELLOW : 'transparent',
                  color: interval === tf.id ? '#1a1a1a' : 'var(--color-text)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div
            style={{
              height: 480,
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <iframe
              key={interval}
              title="Grafik Candlestick XAU/USD"
              src={chartSrc(interval)}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
        <div style={cardTitlebarStyle}>
          {showAiResult && aiResult
            ? `🤖 ANALISA AI XAU/USD — TIMEFRAME ${aiResult.timeframeLabel} (LIVE)`
            : '📊 CONTOH ANALISA XAU/USD — TIMEFRAME 5 MENIT (ILUSTRASI)'}
        </div>
        <div style={{ padding: '1rem' }}>
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '0.85rem',
              padding: '0.6rem',
              borderRadius: '8px',
              background: 'rgba(148, 163, 184, 0.08)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '0.2rem' }}>🤖 Ai Analisa:</span>
            {AI_TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setAiTimeframe(tf.id)}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '999px',
                  border: `1px solid ${aiTimeframe === tf.id ? YELLOW : 'rgba(148, 163, 184, 0.4)'}`,
                  background: aiTimeframe === tf.id ? YELLOW : 'transparent',
                  color: aiTimeframe === tf.id ? '#1a1a1a' : '#e2e8f0',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {tf.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void handleGenerateAi()}
              disabled={aiLoading}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: '999px',
                border: `1px solid ${BLUE}`,
                background: BLUE,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: aiLoading ? 'default' : 'pointer',
                opacity: aiLoading ? 0.7 : 1,
              }}
            >
              {aiLoading ? '⏳ Menganalisa…' : '🤖 Ai Analisa'}
            </button>
            {aiResult && (
              <button
                type="button"
                onClick={() => setShowAiResult((v) => !v)}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  background: 'transparent',
                  color: '#e2e8f0',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {showAiResult ? '📊 Lihat Contoh Ilustrasi' : '🤖 Lihat Hasil AI'}
              </button>
            )}
          </div>

          {aiError && (
            <div
              style={{
                marginBottom: '0.85rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                background: 'rgba(220, 38, 38, 0.15)',
                border: `1px solid ${RED}`,
                color: '#fca5a5',
                fontSize: '0.78rem',
              }}
            >
              {aiError}
            </div>
          )}

          {showAiResult && aiResult ? (
            <div>
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                Estimasi AI berbasis harga spot live &amp; pivot point harian (data tanggal {aiResult.dataHarianTanggal}) — BUKAN
                data candle intraday asli maupun sinyal trading real. Selalu gunakan manajemen risiko.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '0.85rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${biasColor(aiResult.bias)}`,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: biasColor(aiResult.bias) }}>
                  {aiResult.bias || 'NETRAL'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Harga saat ini: ${aiResult.hargaSaatIni.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', marginLeft: 'auto' }}>
                  Confidence: <strong style={{ color: YELLOW }}>{aiResult.confidence}%</strong>
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'rgba(148, 163, 184, 0.06)',
                  }}
                >
                  <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.72rem', marginBottom: '0.4rem' }}>
                    LEVEL PIVOT HARIAN
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.75rem', lineHeight: 1.7 }}>
                    <div>Resistance: R1 {aiResult.pivot.r1.toFixed(2)} · R2 {aiResult.pivot.r2.toFixed(2)} · R3{' '}
                      {aiResult.pivot.r3.toFixed(2)}</div>
                    <div>Pivot: {aiResult.pivot.pivot.toFixed(2)}</div>
                    <div>Support: S1 {aiResult.pivot.s1.toFixed(2)} · S2 {aiResult.pivot.s2.toFixed(2)} · S3{' '}
                      {aiResult.pivot.s3.toFixed(2)}</div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'rgba(148, 163, 184, 0.06)',
                  }}
                >
                  <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.72rem', marginBottom: '0.4rem' }}>
                    POLA CANDLE DIPERHATIKAN
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.75rem', lineHeight: 1.6 }}>
                    {aiResult.polaCandleDiperhatikan}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${BLUE}`,
                    background: 'rgba(29, 78, 216, 0.12)',
                  }}
                >
                  <div style={{ color: '#93c5fd', fontWeight: 700, fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                    ENTRY
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 700 }}>{aiResult.entry}</div>
                </div>
                <div
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${RED}`,
                    background: 'rgba(220, 38, 38, 0.12)',
                  }}
                >
                  <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                    STOP LOSS
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 700 }}>{aiResult.stopLoss}</div>
                </div>
                <div
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${GREEN}`,
                    background: 'rgba(22, 163, 74, 0.12)',
                  }}
                >
                  <div style={{ color: '#86efac', fontWeight: 700, fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                    TAKE PROFIT
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 700 }}>{aiResult.takeProfit}</div>
                </div>
              </div>

              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: `1px solid ${YELLOW}`,
                }}
              >
                <div style={{ color: YELLOW, fontWeight: 700, fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                  💡 CATATAN
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '0.78rem', lineHeight: 1.5 }}>{aiResult.catatan}</div>
              </div>
            </div>
          ) : (
          <>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', color: '#94a3b8' }}>
            Contoh statis untuk latihan membaca chart — bukan data live maupun sinyal trading.
          </p>
          <div style={{ position: 'relative', width: '100%', height: 480, background: '#0b1220', borderRadius: '8px', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${EXAMPLE_CHART_WIDTH} 480`} width="100%" height="100%" preserveAspectRatio="none">
              <rect
                x={0}
                y={priceToY(RESISTANCE_ZONE.top)}
                width={EXAMPLE_CHART_WIDTH}
                height={priceToY(RESISTANCE_ZONE.bottom) - priceToY(RESISTANCE_ZONE.top)}
                fill={YELLOW}
                opacity={0.12}
              />
              <rect
                x={0}
                y={priceToY(SUPPORT_ZONE.top)}
                width={EXAMPLE_CHART_WIDTH}
                height={priceToY(SUPPORT_ZONE.bottom) - priceToY(SUPPORT_ZONE.top)}
                fill={GREEN}
                opacity={0.12}
              />
              <line
                x1={0}
                y1={priceToY(SMA20_PRICE)}
                x2={EXAMPLE_CHART_WIDTH}
                y2={priceToY(SMA20_PRICE)}
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <text x={EXAMPLE_CHART_WIDTH - 190} y={priceToY(SMA20_PRICE) - 8} fill="#38bdf8" fontSize={13} fontWeight={700}>
                SMA 20 (4.381)
              </text>
              <text x={EXAMPLE_CHART_WIDTH - 250} y={priceToY(RESISTANCE_ZONE.top) - 8} fill={YELLOW} fontSize={13} fontWeight={700}>
                RESISTANCE TERDEKAT 4.431 – 4.438
              </text>
              <text x={EXAMPLE_CHART_WIDTH - 250} y={priceToY(SUPPORT_ZONE.top) - 8} fill={GREEN} fontSize={13} fontWeight={700}>
                SUPPORT KUAT 4.356 – 4.364
              </text>

              {EXAMPLE_CANDLES.map((candle, index) => {
                const x = CANDLE_X_START + index * CANDLE_X_STEP;
                const high = candle.h ?? Math.max(candle.o, candle.c) + 3;
                const low = candle.l ?? Math.min(candle.o, candle.c) - 3;
                const color = candle.c >= candle.o ? GREEN : RED;
                return (
                  <CandleShape
                    key={index}
                    x={x}
                    top={priceToY(Math.max(candle.o, candle.c))}
                    bottom={priceToY(Math.min(candle.o, candle.c))}
                    wickTop={priceToY(high)}
                    wickBottom={priceToY(low)}
                    color={color}
                  />
                );
              })}

              <AnalysisArrow
                x1={330}
                y1={95}
                x2={CANDLE_X_START + 9 * CANDLE_X_STEP}
                y2={priceToY(4469) + 10}
                color={RED}
              />
              <AnalysisArrow
                x1={340}
                y1={398}
                x2={430}
                y2={priceToY(SUPPORT_ZONE.bottom) + 4}
                color={GREEN}
              />
              <AnalysisArrow
                x1={EXAMPLE_CHART_WIDTH * 0.72}
                y1={130}
                x2={EXAMPLE_CHART_WIDTH * 0.92}
                y2={priceToY(RESISTANCE_ZONE.bottom) - 10}
                color={GREEN}
                dashed
              />
            </svg>

            {ANALYSIS_NOTES.map((note) => (
              <div key={note.id} style={{ ...noteBoxStyle(note.color), left: note.left, top: note.top, width: note.width }}>
                <div style={{ color: note.color, fontWeight: 800, marginBottom: '0.2rem' }}>{note.title}</div>
                <div>{note.text}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              marginTop: '1rem',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '8px',
            }}
          >
            {SUMMARY_COLUMNS.map((col, index) => (
              <div
                key={col.id}
                style={{
                  ...summaryColumnStyle,
                  borderRight: index === SUMMARY_COLUMNS.length - 1 ? 'none' : summaryColumnStyle.borderRight,
                }}
              >
                <div style={{ color: col.color, fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                  {col.title}
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#cbd5e1', fontSize: '0.72rem', lineHeight: 1.6 }}>
                  {col.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              marginTop: '0.75rem',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '8px',
            }}
          >
            <div style={{ padding: '1rem', borderRight: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <div style={{ color: YELLOW, fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                💡 CATATAN PENTING
              </div>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.72rem', lineHeight: 1.6 }}>
                Tunggu konfirmasi breakout atau rejection di level kunci sebelum entry. Selalu gunakan Stop Loss untuk
                melindungi modal.
              </p>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ color: '#fb923c', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                🎯 FOKUS
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#cbd5e1', fontSize: '0.72rem', lineHeight: 1.6 }}>
                {FOKUS_ITEMS.map((item) => (
                  <li key={item}>✅ {item}</li>
                ))}
              </ul>
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={cardTitlebarStyle}>CONTOH POLA CANDLESTICK BULLISH REVERSAL</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {CANDLE_PATTERNS.map((pattern, index) => {
            const Diagram = DIAGRAMS[pattern.id];
            return (
              <div
                key={pattern.id}
                style={{
                  ...columnStyle,
                  borderRight: index === CANDLE_PATTERNS.length - 1 ? 'none' : columnStyle.borderRight,
                }}
              >
                <div style={{ color: YELLOW, fontWeight: 800, fontSize: '0.85rem' }}>{pattern.title}</div>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {pattern.description}
                </p>
                {Diagram && <Diagram />}
                <div
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(22, 163, 74, 0.15)',
                    border: `1px solid ${GREEN}`,
                  }}
                >
                  <div style={{ color: GREEN, fontWeight: 700, fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                    KONFIRMASI BUY
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.75rem', lineHeight: 1.4 }}>{pattern.confirmation}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            color: '#facc15',
            fontSize: '0.75rem',
          }}
        >
          💡 CATATAN PENTING: Gunakan pola ini di area support / demand zone untuk hasil lebih akurat. Selalu tunggu
          konfirmasi candle berikutnya sebelum entry.
        </div>
      </div>
    </div>
  );
}
