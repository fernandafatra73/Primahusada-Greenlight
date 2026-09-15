import { useMemo } from 'react';
import {
  detectFvg,
  detectPolaCandle,
  detectSinyalPembalikan,
  INFO_POLA,
  levelTerdekat,
  rsi,
  sma,
  swingLevels,
  type JenisPola,
  type OhlcCandle,
  type SinyalPembalikan,
} from '../../lib/indikatorTrading.ts';

const WIDTH = 1000;
const MAIN_TOP = 10;
const MAIN_HEIGHT = 380;
const RSI_TOP = MAIN_TOP + MAIN_HEIGHT + 30;
const RSI_HEIGHT = 110;
const HEIGHT = RSI_TOP + RSI_HEIGHT + 24;
const PLOT_LEFT = 8;
const PLOT_RIGHT = WIDTH - 70;
/** Jumlah candle yang digambar; data lebih panjang dipakai untuk pemanasan MA 50 & RSI. */
const VISIBLE = 120;

const GREEN = '#16a34a';
const RED = '#dc2626';
const MA_COLOR = '#f59e0b';
const RSI_COLOR = '#7c3aed';

interface Props {
  readonly candles: ReadonlyArray<OhlcCandle>;
  /** Candle terakhir masih berjalan: tidak dipakai untuk sinyal supaya tidak repaint. */
  readonly lastCandleRunning: boolean;
}

export interface SinyalTerakhir extends SinyalPembalikan {
  /** Waktu buka candle konfirmasi; dipakai juga sebagai kunci unik untuk notifikasi sinyal baru. */
  readonly waktu: number;
}

export interface PolaTerbaru {
  readonly jenis: JenisPola;
  readonly waktu: number;
  readonly harga: number;
}

export interface XauIndikatorSummary {
  readonly hargaTerakhir: number | null;
  readonly ma50: number | null;
  readonly rsi14: number | null;
  readonly fvgAktif: number;
  readonly support: number | null;
  readonly resistance: number | null;
  readonly sinyalTerakhir: SinyalTerakhir | null;
  /** Pola candle terbaru, paling baru di depan. */
  readonly polaTerbaru: ReadonlyArray<PolaTerbaru>;
}

/** Dihitung terpisah supaya halaman bisa menampilkan ringkasan tanpa menggambar ulang grafik. */
export function hitungIndikator(candles: ReadonlyArray<OhlcCandle>, lastCandleRunning: boolean) {
  const closedCount = lastCandleRunning ? candles.length - 1 : candles.length;
  const closes = candles.map((c) => c.close);
  const ma50 = sma(closes, 50);
  const rsi14 = rsi(closes, 14);
  const fvg = detectFvg(candles);
  const pola = detectPolaCandle(candles, closedCount);
  const sinyal = detectSinyalPembalikan(candles, closedCount);
  const last = candles.length - 1;
  const hargaTerakhir = last >= 0 ? candles[last]!.close : null;
  const sr = hargaTerakhir === null ? { supports: [], resistances: [] } : levelTerdekat(swingLevels(candles), hargaTerakhir, 1);
  const s = sinyal[sinyal.length - 1];
  const summary: XauIndikatorSummary = {
    hargaTerakhir,
    ma50: last >= 0 ? (ma50[last] ?? null) : null,
    rsi14: last >= 0 ? (rsi14[last] ?? null) : null,
    fvgAktif: fvg.filter((g) => g.filledIndex === null).length,
    support: sr.supports[0]?.harga ?? null,
    resistance: sr.resistances[0]?.harga ?? null,
    sinyalTerakhir: s ? { ...s, waktu: candles[s.index]!.openTime } : null,
    polaTerbaru: pola
      .slice(-6)
      .reverse()
      .map((p) => ({ jenis: p.jenis, waktu: candles[p.index]!.openTime, harga: candles[p.index]!.close })),
  };
  return { ma50, rsi14, fvg, pola, sinyal, sr, summary };
}

function formatJam(ms: number): string {
  return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

/** Grafik candlestick XAU/USD dengan MA 50, zona FVG, panah sinyal pembalikan, dan panel RSI 14. */
export function XauIndikatorChart({ candles, lastCandleRunning }: Props) {
  const { ma50, rsi14, fvg, pola, sinyal, sr } = useMemo(
    () => hitungIndikator(candles, lastCandleRunning),
    [candles, lastCandleRunning],
  );

  const start = Math.max(0, candles.length - VISIBLE);
  const visible = candles.slice(start);
  if (visible.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Belum ada data.</div>;
  }

  const step = (PLOT_RIGHT - PLOT_LEFT) / visible.length;
  const bodyWidth = Math.max(1.5, step * 0.62);
  const xOf = (index: number): number => PLOT_LEFT + (index - start) * step + step / 2;

  const visibleMa = ma50.slice(start).filter((v): v is number => v !== null);
  const lows = visible.map((c) => c.low);
  const highs = visible.map((c) => c.high);
  let min = Math.min(...lows, ...visibleMa);
  let max = Math.max(...highs, ...visibleMa);
  const pad = (max - min) * 0.08 || 1;
  min -= pad;
  max += pad;
  const yOf = (price: number): number => MAIN_TOP + ((max - price) / (max - min)) * MAIN_HEIGHT;
  const yRsi = (value: number): number => RSI_TOP + ((100 - value) / 100) * RSI_HEIGHT;

  const priceTicks = Array.from({ length: 6 }, (_, i) => min + ((max - min) * i) / 5);
  const timeTicks = visible
    .map((c, i) => ({ i: i + start, t: c.openTime }))
    .filter((_, i) => i % Math.ceil(visible.length / 6) === 0);

  const maPath = ma50
    .map((v, i) => (i >= start && v !== null ? `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}` : null))
    .filter((p): p is string => p !== null);
  const rsiPath = rsi14
    .map((v, i) => (i >= start && v !== null ? `${xOf(i).toFixed(1)},${yRsi(v).toFixed(1)}` : null))
    .filter((p): p is string => p !== null);

  const last = candles[candles.length - 1]!;
  const lastRsi = rsi14[candles.length - 1];

  // Urutan tumpukan emoji pola per candle & sisi (BUY bawah, SELL atas).
  const stackCount = new Map<string, number>();
  const stackOrder = new Map<string, number>();
  for (const p of pola) {
    const side = `${p.index}-${INFO_POLA[p.jenis].arah}`;
    const n = stackCount.get(side) ?? 0;
    stackOrder.set(`${side}-${p.jenis}`, n);
    stackCount.set(side, n + 1);
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Grafik XAU/USD dengan RSI 14, MA 50, FVG, dan sinyal pembalikan arah"
      style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--color-bg-surface, #fff)', fontFamily: 'inherit' }}
    >
      {/* Grid & skala harga */}
      {priceTicks.map((p) => (
        <g key={`p-${p}`}>
          <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={yOf(p)} y2={yOf(p)} stroke="#eef0f3" />
          <text x={PLOT_RIGHT + 6} y={yOf(p) + 4} fontSize="11" fill="#64748b">
            {p.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Zona FVG yang masih terbuka, diperpanjang sampai kanan. FVG yang sudah
          terisi tidak digambar supaya grafik tidak penuh zona lama. */}
      {fvg
        .filter((g) => g.filledIndex === null)
        .map((g) => {
          const x1 = xOf(Math.max(g.startIndex, start)) - step / 2;
          const bullish = g.arah === 'BULLISH';
          const color = bullish ? GREEN : RED;
          return (
            <g key={`fvg-${g.arah}-${g.startIndex}`}>
              <rect
                x={x1}
                y={yOf(g.top)}
                width={Math.max(1, PLOT_RIGHT - x1)}
                height={Math.max(1, yOf(g.bottom) - yOf(g.top))}
                fill={color}
                fillOpacity={0.16}
                stroke={color}
                strokeOpacity={0.45}
              />
              <text x={x1 + 3} y={yOf(g.top) - 3} fontSize="10" fill={color} fontWeight={700}>
                FVG {bullish ? '↑' : '↓'}
              </text>
            </g>
          );
        })}

      {/* Support & resistance terdekat (swing low/high) */}
      {[...sr.supports, ...sr.resistances]
        .filter((l) => l.harga >= min && l.harga <= max)
        .map((l) => {
          const support = l.jenis === 'SUPPORT';
          const color = support ? '#0f766e' : '#b91c1c';
          return (
            <g key={`sr-${l.jenis}-${l.index}`}>
              <line
                x1={Math.max(PLOT_LEFT, xOf(Math.max(l.index, start)) - step / 2)}
                x2={PLOT_RIGHT}
                y1={yOf(l.harga)}
                y2={yOf(l.harga)}
                stroke={color}
                strokeWidth={1.2}
                strokeDasharray="8 4"
              />
              <text x={PLOT_RIGHT - 4} y={yOf(l.harga) + (support ? 12 : -4)} fontSize="10" textAnchor="end" fill={color} fontWeight={700}>
                {support ? 'Support' : 'Resistance'} {l.harga.toFixed(2)}
              </text>
            </g>
          );
        })}

      {/* Candle */}
      {visible.map((c, k) => {
        const i = k + start;
        const x = xOf(i);
        const naik = c.close >= c.open;
        const color = naik ? GREEN : RED;
        const top = yOf(Math.max(c.open, c.close));
        const bottom = yOf(Math.min(c.open, c.close));
        return (
          <g key={c.openTime}>
            <line x1={x} x2={x} y1={yOf(c.high)} y2={yOf(c.low)} stroke={color} strokeWidth={1} />
            <rect x={x - bodyWidth / 2} y={top} width={bodyWidth} height={Math.max(1, bottom - top)} fill={color} />
          </g>
        );
      })}

      {/* MA 50 */}
      {maPath.length > 1 && (
        <polyline points={maPath.join(' ')} fill="none" stroke={MA_COLOR} strokeWidth={2} />
      )}

      {/* Harga terakhir */}
      <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={yOf(last.close)} y2={yOf(last.close)} stroke="#2563eb" strokeDasharray="4 3" />
      <rect x={PLOT_RIGHT + 2} y={yOf(last.close) - 9} width={66} height={18} rx={3} fill="#2563eb" />
      <text x={PLOT_RIGHT + 35} y={yOf(last.close) + 4} fontSize="11" textAnchor="middle" fill="#fff" fontWeight={700}>
        {last.close.toFixed(2)}
      </text>

      {/* Penanda pola candle: pola BUY di bawah candle, pola SELL di atas; beberapa pola ditumpuk. */}
      {pola
        .filter((p) => p.index >= start)
        .map((p) => {
          const info = INFO_POLA[p.jenis];
          const c = candles[p.index]!;
          const buy = info.arah === 'BUY';
          const urutan = stackOrder.get(`${p.index}-${info.arah}-${p.jenis}`) ?? 0;
          const y = buy ? yOf(c.low) + 14 + urutan * 14 : yOf(c.high) - 5 - urutan * 14;
          return (
            <text key={`pola-${p.index}-${p.jenis}`} x={xOf(p.index)} y={y} fontSize="12" textAnchor="middle">
              <title>{`${info.emoji} ${info.nama} — ${info.peluang} (${formatJam(c.openTime)})`}</title>
              {info.emoji}
            </text>
          );
        })}

      {/* Sinyal BUY/SELL terkonfirmasi, digeser melewati penanda pola di candle yang sama */}
      {sinyal
        .filter((s) => s.index >= start)
        .map((s) => {
          const c = candles[s.index]!;
          const x = xOf(s.index);
          const beli = s.arah === 'BELI';
          const color = beli ? GREEN : RED;
          const geser = (stackCount.get(`${s.index}-${beli ? 'BUY' : 'SELL'}`) ?? 0) * 14;
          const tipY = beli ? yOf(c.low) + 4 + geser : yOf(c.high) - 4 - geser;
          const dir = beli ? 1 : -1;
          return (
            <g key={`s-${s.index}`}>
              <title>{`${beli ? 'SAATNYA BELI' : 'SAATNYA JUAL'} — konfirmasi ${s.emoji} ${s.pola} di ${beli ? 'support' : 'resistance'} ${s.level.toFixed(2)} (${formatJam(c.openTime)})`}</title>
              <path
                d={`M ${x} ${tipY} L ${x - 7} ${tipY + 10 * dir} L ${x - 2.5} ${tipY + 10 * dir} L ${x - 2.5} ${tipY + 22 * dir} L ${x + 2.5} ${tipY + 22 * dir} L ${x + 2.5} ${tipY + 10 * dir} L ${x + 7} ${tipY + 10 * dir} Z`}
                fill={color}
                stroke="#fff"
                strokeWidth={1}
              />
              <text x={x} y={tipY + 34 * dir + (beli ? 0 : 8)} fontSize="10" textAnchor="middle" fill={color} fontWeight={800}>
                {beli ? 'BELI' : 'JUAL'}
              </text>
            </g>
          );
        })}

      {/* Label waktu */}
      {timeTicks.map(({ i, t }) => (
        <text
          key={`t-${t}`}
          x={xOf(i)}
          y={MAIN_TOP + MAIN_HEIGHT + 18}
          fontSize="10"
          textAnchor={i === start ? 'start' : 'middle'}
          fill="#64748b"
        >
          {formatJam(t)}
        </text>
      ))}

      {/* Panel RSI 14 */}
      <rect x={PLOT_LEFT} y={yRsi(70)} width={PLOT_RIGHT - PLOT_LEFT} height={yRsi(30) - yRsi(70)} fill={RSI_COLOR} fillOpacity={0.06} />
      {[70, 50, 30].map((lvl) => (
        <g key={`r-${lvl}`}>
          <line
            x1={PLOT_LEFT}
            x2={PLOT_RIGHT}
            y1={yRsi(lvl)}
            y2={yRsi(lvl)}
            stroke={lvl === 50 ? '#e2e8f0' : '#cbd5e1'}
            strokeDasharray={lvl === 50 ? undefined : '4 3'}
          />
          <text x={PLOT_RIGHT + 6} y={yRsi(lvl) + 4} fontSize="10" fill="#64748b">
            {lvl}
          </text>
        </g>
      ))}
      {rsiPath.length > 1 && <polyline points={rsiPath.join(' ')} fill="none" stroke={RSI_COLOR} strokeWidth={1.6} />}
      <text x={PLOT_LEFT + 4} y={RSI_TOP - 6} fontSize="11" fill={RSI_COLOR} fontWeight={700}>
        RSI 14{typeof lastRsi === 'number' ? `: ${lastRsi.toFixed(1)}` : ''}
      </text>
    </svg>
  );
}
