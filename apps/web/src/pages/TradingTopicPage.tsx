import type { JSX } from 'react';

const BLUE = '#1d4ed8';
const GREEN = '#16a34a';
const RED = '#dc2626';
const YELLOW = '#eab308';
const GRAY = '#94a3b8';
const PURPLE = '#7c3aed';
const ORANGE = '#f97316';

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

function Arrow({ x1, y1, x2, y2, color, dashed }: {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: string;
  readonly dashed?: boolean;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 10;
  const hx1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const hy1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const hx2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const hy2 = y2 - headLen * Math.sin(angle + Math.PI / 6);
  return (
    <g stroke={color} fill={color}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2.5} strokeDasharray={dashed ? '5 4' : undefined} />
      <polygon points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`} />
    </g>
  );
}

function DiagramFrame({ children }: { readonly children: JSX.Element }) {
  return (
    <svg viewBox="0 0 200 140" width="100%" height={220} style={{ maxWidth: 360, display: 'block', margin: '0 auto' }}>
      {children}
    </svg>
  );
}

function BullishEngulfingDiagram() {
  return (
    <DiagramFrame>
      <>
        <CandleShape x={70} top={55} bottom={78} wickTop={50} wickBottom={83} color={RED} />
        <CandleShape x={115} top={30} bottom={100} wickTop={25} wickBottom={105} color={GREEN} />
        <Arrow x1={155} y1={112} x2={155} y2={75} color={GREEN} />
      </>
    </DiagramFrame>
  );
}

function BearishEngulfingDiagram() {
  return (
    <DiagramFrame>
      <>
        <CandleShape x={70} top={30} bottom={53} wickTop={25} wickBottom={58} color={GREEN} />
        <CandleShape x={115} top={20} bottom={90} wickTop={15} wickBottom={95} color={RED} />
        <Arrow x1={155} y1={28} x2={155} y2={65} color={RED} />
      </>
    </DiagramFrame>
  );
}

function HammerDiagram() {
  return (
    <DiagramFrame>
      <>
        <CandleShape x={40} top={25} bottom={45} wickTop={20} wickBottom={50} color={RED} />
        <CandleShape x={75} top={45} bottom={62} wickTop={40} wickBottom={67} color={RED} />
        <CandleShape x={120} top={62} bottom={78} wickTop={57} wickBottom={122} color={GREEN} />
        <Arrow x1={165} y1={110} x2={165} y2={70} color={GREEN} />
      </>
    </DiagramFrame>
  );
}

function ShootingStarDiagram() {
  return (
    <DiagramFrame>
      <>
        <CandleShape x={40} top={95} bottom={115} wickTop={90} wickBottom={120} color={GREEN} />
        <CandleShape x={75} top={78} bottom={95} wickTop={73} wickBottom={100} color={GREEN} />
        <CandleShape x={120} top={62} bottom={78} wickTop={18} wickBottom={83} color={RED} />
        <Arrow x1={165} y1={30} x2={165} y2={68} color={RED} />
      </>
    </DiagramFrame>
  );
}

function MorningStarDiagram() {
  return (
    <DiagramFrame>
      <>
        <CandleShape x={40} top={25} bottom={85} wickTop={20} wickBottom={90} color={RED} />
        <CandleShape x={90} top={88} bottom={95} wickTop={82} wickBottom={102} color={GRAY} />
        <CandleShape x={140} top={35} bottom={90} wickTop={28} wickBottom={95} color={GREEN} />
        <Arrow x1={175} y1={118} x2={175} y2={80} color={GREEN} />
      </>
    </DiagramFrame>
  );
}

function EveningStarDiagram() {
  return (
    <DiagramFrame>
      <>
        <CandleShape x={40} top={25} bottom={85} wickTop={20} wickBottom={90} color={GREEN} />
        <CandleShape x={90} top={22} bottom={30} wickTop={16} wickBottom={36} color={GRAY} />
        <CandleShape x={140} top={30} bottom={90} wickTop={25} wickBottom={95} color={RED} />
        <Arrow x1={175} y1={22} x2={175} y2={60} color={RED} />
      </>
    </DiagramFrame>
  );
}

function DojiDiagram() {
  return (
    <DiagramFrame>
      <>
        <CandleShape x={100} top={68} bottom={72} wickTop={30} wickBottom={110} color={GRAY} />
        <text x={100} y={125} fill={GRAY} fontSize={11} textAnchor="middle">
          Open ≈ Close
        </text>
      </>
    </DiagramFrame>
  );
}

function InsideBarDiagram() {
  return (
    <DiagramFrame>
      <>
        <line x1={10} y1={30} x2={190} y2={30} stroke={YELLOW} strokeWidth={1.5} strokeDasharray="4 4" />
        <line x1={10} y1={110} x2={190} y2={110} stroke={YELLOW} strokeWidth={1.5} strokeDasharray="4 4" />
        <CandleShape x={70} top={40} bottom={95} wickTop={30} wickBottom={110} color={RED} />
        <CandleShape x={130} top={55} bottom={80} wickTop={48} wickBottom={90} color={GREEN} />
        <text x={70} y={125} fill={GRAY} fontSize={10} textAnchor="middle">
          Mother Bar
        </text>
        <text x={130} y={125} fill={GRAY} fontSize={10} textAnchor="middle">
          Inside Bar
        </text>
      </>
    </DiagramFrame>
  );
}

function BreakoutDiagram() {
  return (
    <DiagramFrame>
      <>
        <line x1={10} y1={55} x2={190} y2={55} stroke={YELLOW} strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={185} y={48} fill={YELLOW} fontSize={10} textAnchor="end">
          Resistance
        </text>
        <CandleShape x={40} top={60} bottom={75} wickTop={55} wickBottom={80} color={GREEN} />
        <CandleShape x={75} top={53} bottom={68} wickTop={48} wickBottom={73} color={GREEN} />
        <CandleShape x={115} top={20} bottom={58} wickTop={15} wickBottom={62} color={GREEN} />
        <Arrow x1={155} y1={112} x2={155} y2={30} color={GREEN} dashed />
      </>
    </DiagramFrame>
  );
}

function SupportResistanceDiagram() {
  return (
    <DiagramFrame>
      <>
        <line x1={10} y1={25} x2={190} y2={25} stroke={RED} strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={12} y={19} fill={RED} fontSize={10}>
          Resistance
        </text>
        <line x1={10} y1={112} x2={190} y2={112} stroke={GREEN} strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={12} y={128} fill={GREEN} fontSize={10}>
          Support
        </text>
        <polyline
          points="10,70 35,108 65,28 95,108 125,28 155,108 185,60"
          fill="none"
          stroke={BLUE}
          strokeWidth={2}
        />
      </>
    </DiagramFrame>
  );
}

function TrendDiagram() {
  return (
    <DiagramFrame>
      <>
        <polyline
          points="10,122 40,92 55,102 90,62 105,74 140,38 155,50 188,16"
          fill="none"
          stroke={GREEN}
          strokeWidth={2.5}
        />
        <text x={100} y={135} fill={GRAY} fontSize={10} textAnchor="middle">
          Higher High &amp; Higher Low (Uptrend)
        </text>
      </>
    </DiagramFrame>
  );
}

function VolumeDiagram() {
  const candles = [
    { o: 40, c: 55, up: true },
    { o: 55, c: 45, up: false },
    { o: 45, c: 62, up: true },
    { o: 62, c: 70, up: true },
    { o: 70, c: 58, up: false },
    { o: 58, c: 75, up: true },
  ];
  return (
    <DiagramFrame>
      <>
        {candles.map((c, i) => {
          const x = 25 + i * 30;
          const top = 60 - Math.max(c.o, c.c) * 0.25;
          const bottom = 60 - Math.min(c.o, c.c) * 0.25;
          const color = c.up ? GREEN : RED;
          return <CandleShape key={i} x={x} top={top} bottom={bottom} wickTop={top - 5} wickBottom={bottom + 5} color={color} />;
        })}
        {candles.map((c, i) => {
          const x = 25 + i * 30;
          const height = 20 + Math.abs(c.c - c.o) * 1.4;
          const color = c.up ? GREEN : RED;
          return <rect key={i} x={x - 8} y={130 - height} width={16} height={height} fill={color} opacity={0.6} />;
        })}
        <line x1={10} y1={100} x2={190} y2={100} stroke={GRAY} strokeWidth={1} strokeDasharray="3 3" />
        <text x={10} y={112} fill={GRAY} fontSize={9}>
          Volume
        </text>
      </>
    </DiagramFrame>
  );
}

function RsiDiagram() {
  return (
    <DiagramFrame>
      <>
        <rect x={10} y={20} width={180} height={30} fill={RED} opacity={0.12} />
        <rect x={10} y={90} width={180} height={30} fill={GREEN} opacity={0.12} />
        <line x1={10} y1={50} x2={190} y2={50} stroke={RED} strokeWidth={1} strokeDasharray="4 4" />
        <text x={185} y={46} fill={RED} fontSize={10} textAnchor="end">
          70 (overbought)
        </text>
        <line x1={10} y1={90} x2={190} y2={90} stroke={GREEN} strokeWidth={1} strokeDasharray="4 4" />
        <text x={185} y={104} fill={GREEN} fontSize={10} textAnchor="end">
          30 (oversold)
        </text>
        <polyline
          points="10,70 35,35 60,55 85,95 110,60 135,30 160,75 185,50"
          fill="none"
          stroke={BLUE}
          strokeWidth={2}
        />
      </>
    </DiagramFrame>
  );
}

function MacdDiagram() {
  const bars = [8, 14, 20, 12, -6, -16, -22, -10, 6, 15];
  return (
    <DiagramFrame>
      <>
        <line x1={10} y1={70} x2={190} y2={70} stroke={GRAY} strokeWidth={1} />
        {bars.map((v, i) => {
          const x = 20 + i * 17;
          const height = Math.abs(v) * 1.6;
          const y = v >= 0 ? 70 - height : 70;
          return <rect key={i} x={x - 6} y={y} width={12} height={height} fill={v >= 0 ? GREEN : RED} opacity={0.55} />;
        })}
        <polyline points="10,55 30,40 55,35 80,50 105,65 130,72 155,50 190,30" fill="none" stroke={BLUE} strokeWidth={2} />
        <polyline points="10,62 30,52 55,42 80,42 105,58 130,68 155,62 190,42" fill="none" stroke={ORANGE} strokeWidth={2} />
        <text x={10} y={12} fill={BLUE} fontSize={10}>
          MACD
        </text>
        <text x={55} y={12} fill={ORANGE} fontSize={10}>
          Signal
        </text>
      </>
    </DiagramFrame>
  );
}

function BollingerBandDiagram() {
  return (
    <DiagramFrame>
      <>
        <path d="M10,30 C60,15 140,15 190,35" fill="none" stroke={PURPLE} strokeWidth={1.5} strokeDasharray="4 4" />
        <path d="M10,70 C60,65 140,65 190,72" fill="none" stroke={BLUE} strokeWidth={1.5} />
        <path d="M10,110 C60,118 140,118 190,108" fill="none" stroke={PURPLE} strokeWidth={1.5} strokeDasharray="4 4" />
        <CandleShape x={45} top={55} bottom={70} wickTop={48} wickBottom={78} color={GREEN} />
        <CandleShape x={90} top={40} bottom={55} wickTop={30} wickBottom={62} color={GREEN} />
        <CandleShape x={135} top={65} bottom={85} wickTop={58} wickBottom={92} color={RED} />
        <text x={12} y={24} fill={PURPLE} fontSize={9}>
          Upper Band
        </text>
        <text x={12} y={128} fill={PURPLE} fontSize={9}>
          Lower Band
        </text>
      </>
    </DiagramFrame>
  );
}

interface TopicContent {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly tip: string;
  readonly Diagram: () => JSX.Element;
}

const TOPIC_CONTENT: Readonly<Record<string, TopicContent>> = {
  'bullish-engulfing': {
    icon: '🕯️',
    title: 'Bullish Engulfing',
    description:
      'Candle hijau besar menutup penuh seluruh badan candle merah sebelumnya — pembeli mengambil alih kendali dari penjual.',
    tip: 'Konfirmasi: candle berikutnya menembus high candle hijau.',
    Diagram: BullishEngulfingDiagram,
  },
  'bearish-engulfing': {
    icon: '🕯️',
    title: 'Bearish Engulfing',
    description:
      'Candle merah besar menutup penuh seluruh badan candle hijau sebelumnya — penjual mengambil alih kendali dari pembeli.',
    tip: 'Konfirmasi: candle berikutnya menembus low candle merah.',
    Diagram: BearishEngulfingDiagram,
  },
  hammer: {
    icon: '🔨',
    title: 'Hammer',
    description:
      'Badan kecil di atas, ekor bawah panjang (minimal 2x badan). Muncul setelah downtrend — buyer menolak harga lebih rendah.',
    tip: 'Konfirmasi: candle berikutnya menembus high hammer.',
    Diagram: HammerDiagram,
  },
  'shooting-star': {
    icon: '🌠',
    title: 'Shooting Star',
    description:
      'Badan kecil di bawah, ekor atas panjang. Muncul setelah uptrend — seller menolak harga lebih tinggi.',
    tip: 'Konfirmasi: candle berikutnya menembus low shooting star.',
    Diagram: ShootingStarDiagram,
  },
  'morning-star': {
    icon: '🌅',
    title: 'Morning Star',
    description:
      'Pola 3 candle: merah besar, doji/kecil di bawah, lalu hijau kuat naik minimal 1/2 candle merah pertama. Sinyal reversal bullish.',
    tip: 'Konfirmasi: candle ke-3 menembus high candle ke-2.',
    Diagram: MorningStarDiagram,
  },
  'evening-star': {
    icon: '🌆',
    title: 'Evening Star',
    description:
      'Pola 3 candle: hijau besar, doji/kecil di atas, lalu merah kuat turun minimal 1/2 candle hijau pertama. Sinyal reversal bearish.',
    tip: 'Konfirmasi: candle ke-3 menembus low candle ke-2.',
    Diagram: EveningStarDiagram,
  },
  doji: {
    icon: '➕',
    title: 'Doji',
    description:
      'Open dan close hampir sama sehingga badan candle sangat kecil/tanpa badan. Menandakan keraguan pasar antara buyer dan seller.',
    tip: 'Doji di area support/resistance lebih bermakna sebagai sinyal reversal.',
    Diagram: DojiDiagram,
  },
  'inside-bar': {
    icon: '📦',
    title: 'Inside Bar',
    description:
      'Candle kedua sepenuhnya berada di dalam range high-low candle sebelumnya (mother bar). Menandakan konsolidasi/penyempitan volatilitas.',
    tip: 'Breakout dari range inside bar sering jadi sinyal entry.',
    Diagram: InsideBarDiagram,
  },
  breakout: {
    icon: '🚀',
    title: 'Breakout',
    description:
      'Harga menembus level support/resistance dengan candle kuat dan volume tinggi, mengonfirmasi kelanjutan arah baru.',
    tip: 'Waspada false breakout — tunggu candle close di luar level sebelum entry.',
    Diagram: BreakoutDiagram,
  },
  'support-resistance': {
    icon: '📏',
    title: 'Support/Resistance',
    description:
      'Support = area harga cenderung berhenti turun & memantul naik. Resistance = area harga cenderung berhenti naik & memantul turun.',
    tip: 'Level yang tersentuh berulang kali menjadi lebih signifikan.',
    Diagram: SupportResistanceDiagram,
  },
  trend: {
    icon: '📈',
    title: 'Trend',
    description:
      'Uptrend: higher high & higher low berturut-turut. Downtrend: lower high & lower low berturut-turut. Sideways: harga bergerak mendatar.',
    tip: '"The trend is your friend" — trading searah trend umumnya lebih aman.',
    Diagram: TrendDiagram,
  },
  volume: {
    icon: '📊',
    title: 'Volume',
    description:
      'Jumlah transaksi pada suatu periode. Volume tinggi saat breakout/pergerakan besar mengonfirmasi kekuatan pergerakan tersebut.',
    tip: 'Pergerakan harga tanpa didukung volume rawan berbalik arah (false move).',
    Diagram: VolumeDiagram,
  },
  rsi: {
    icon: '📉',
    title: 'RSI (Relative Strength Index)',
    description:
      'Osilator momentum skala 0–100. RSI di atas 70 menandakan overbought (jenuh beli), RSI di bawah 30 menandakan oversold (jenuh jual).',
    tip: 'Divergence RSI vs harga bisa jadi sinyal awal pembalikan arah.',
    Diagram: RsiDiagram,
  },
  macd: {
    icon: '〰️',
    title: 'MACD',
    description:
      'Terdiri dari garis MACD, garis Signal, dan histogram. Sinyal beli saat garis MACD memotong Signal ke atas, sinyal jual saat memotong ke bawah.',
    tip: 'Histogram yang mengecil menandakan momentum melemah.',
    Diagram: MacdDiagram,
  },
  'bollinger-band': {
    icon: '🎯',
    title: 'Bollinger Band',
    description:
      'Terdiri dari middle band (SMA), upper band, dan lower band (± standar deviasi). Band menyempit = volatilitas rendah, band melebar = volatilitas tinggi.',
    tip: 'Harga menyentuh band atas/bawah bukan otomatis sinyal jual/beli — perhatikan konteks trend.',
    Diagram: BollingerBandDiagram,
  },
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${BLUE}`,
  borderRadius: 'var(--radius-card)',
  background: '#0f172a',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
  maxWidth: 560,
};

const cardTitlebarStyle: React.CSSProperties = {
  padding: '0.75rem 1.25rem',
  background: `linear-gradient(90deg, ${BLUE}, #3b82f6)`,
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '1rem',
};

interface TradingTopicPageProps {
  readonly topicId: string;
  readonly onClose: () => void;
}

/** Halaman contoh untuk satu topik candlestick/indikator — diagram SVG + penjelasan singkat. */
export function TradingTopicPage({ topicId, onClose }: TradingTopicPageProps) {
  const content = TOPIC_CONTENT[topicId];
  if (!content) {
    return (
      <div>
        <h2 style={{ margin: 0 }}>Topik tidak ditemukan</h2>
      </div>
    );
  }

  const { icon, title, description, tip, Diagram } = content;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 1.25rem' }}>
        <h2 style={{ margin: 0 }}>
          {icon} {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          style={{
            border: `1px solid ${RED}`,
            borderRadius: '6px',
            background: 'transparent',
            color: RED,
            fontWeight: 700,
            fontSize: '0.8rem',
            padding: '0.4rem 0.85rem',
            cursor: 'pointer',
          }}
        >
          ✕ Tutup
        </button>
      </div>
      <div style={cardStyle}>
        <div style={cardTitlebarStyle}>{title.toUpperCase()}</div>
        <div style={{ padding: '1.25rem' }}>
          <p style={{ margin: '0 0 1rem', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>{description}</p>
          <Diagram />
          <div
            style={{
              marginTop: '1rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: `1px solid ${YELLOW}`,
            }}
          >
            <div style={{ color: YELLOW, fontWeight: 700, fontSize: '0.72rem', marginBottom: '0.2rem' }}>
              💡 CATATAN
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '0.78rem', lineHeight: 1.5 }}>{tip}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
