import { useEffect, useMemo, useRef, useState } from 'react';
import { ChessBoard } from './ChessBoard.tsx';
import { applyMove, findMoveBySan, initialPosition, type Move, type Position } from '../lib/chess.ts';
import { FAMOUS_GAMES, type FamousGame } from '../lib/chessGames.ts';
import '../components/ui/ui.css';

interface Ply {
  readonly position: Position;
  readonly move: Move | null;
  readonly san: string | null;
}

/** Menjalankan seluruh partai sekali di muka supaya maju-mundur langkah
 * tinggal memilih posisi yang sudah jadi. */
function replay(game: FamousGame): readonly Ply[] {
  const plies: Ply[] = [{ position: initialPosition(), move: null, san: null }];
  let pos = initialPosition();

  for (const san of game.moves) {
    const move = findMoveBySan(pos, san);
    if (!move) break;
    pos = applyMove(pos, move);
    plies.push({ position: pos, move, san });
  }
  return plies;
}

const SPEEDS: readonly { readonly label: string; readonly ms: number }[] = [
  { label: 'Lambat', ms: 2000 },
  { label: 'Sedang', ms: 1100 },
  { label: 'Cepat', ms: 500 },
];

const RESULT_LABEL: Record<string, string> = {
  '1-0': 'Putih menang',
  '0-1': 'Hitam menang',
  '1/2-1/2': 'Remis',
};

export function CaturTonton() {
  const [gameId, setGameId] = useState<string>(FAMOUS_GAMES[0]?.id ?? '');
  const [ply, setPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(SPEEDS[1]?.ms ?? 1100);

  const game = useMemo(
    () => FAMOUS_GAMES.find((g) => g.id === gameId) ?? (FAMOUS_GAMES[0] as FamousGame),
    [gameId],
  );
  const plies = useMemo(() => replay(game), [game]);
  const atEnd = ply >= plies.length - 1;

  useEffect(() => {
    setPly(0);
    setPlaying(false);
  }, [gameId]);

  useEffect(() => {
    if (!playing || atEnd) return;
    const timer = setTimeout(() => setPly((p) => Math.min(p + 1, plies.length - 1)), speedMs);
    return () => clearTimeout(timer);
  }, [playing, atEnd, ply, speedMs, plies.length]);

  useEffect(() => {
    if (atEnd) setPlaying(false);
  }, [atEnd]);

  const currentPly = plies[ply] ?? plies[0];

  return (
    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.4rem 0.6rem',
            marginBottom: '0.4rem',
            borderRadius: '6px',
            background: '#f1f5f9',
            border: '1px solid var(--color-border)',
            fontWeight: 600,
          }}
        >
          <span>⚫ {game.black}</span>
        </div>

        <ChessBoard position={currentPly?.position ?? initialPosition()} lastMove={currentPly?.move ?? null} />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.4rem 0.6rem',
            marginTop: '0.4rem',
            borderRadius: '6px',
            background: '#f1f5f9',
            border: '1px solid var(--color-border)',
            fontWeight: 600,
          }}
        >
          <span>⚪ {game.white}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
          <button type="button" className="btn btn--sm btn--secondary" onClick={() => setPly(0)} disabled={ply === 0}>
            ⏮️ Awal
          </button>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => setPly((p) => Math.max(0, p - 1))}
            disabled={ply === 0}
          >
            ◀️ Mundur
          </button>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => setPlaying((p) => !p)}
            disabled={atEnd}
          >
            {playing ? '⏸️ Jeda' : '▶️ Putar'}
          </button>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => setPly((p) => Math.min(plies.length - 1, p + 1))}
            disabled={atEnd}
          >
            ▶️ Maju
          </button>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => setPly(plies.length - 1)}
            disabled={atEnd}
          >
            ⏭️ Akhir
          </button>
        </div>

        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
          Langkah {ply} dari {plies.length - 1}
          {currentPly?.san ? ` · terakhir: ${currentPly.san}` : ''}
          {atEnd && ` · ${RESULT_LABEL[game.result] ?? game.result}`}
        </p>
      </div>

      <div style={{ minWidth: '17rem', flex: '1 1 17rem' }}>
        <div className="form-field" style={{ marginBottom: '0.6rem' }}>
          <label htmlFor="tonton-partai">Pertandingan ({FAMOUS_GAMES.length})</label>
          <select id="tonton-partai" value={gameId} onChange={(e) => setGameId(e.target.value)}>
            {FAMOUS_GAMES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.year} — {g.white} vs {g.black}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="tonton-kecepatan">Kecepatan Putar</label>
          <select
            id="tonton-kecepatan"
            value={speedMs}
            onChange={(e) => setSpeedMs(Number(e.target.value))}
          >
            {SPEEDS.map((s) => (
              <option key={s.ms} value={s.ms}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            padding: '0.6rem 0.75rem',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid var(--color-border)',
            marginBottom: '0.75rem',
            fontSize: '0.85rem',
            lineHeight: 1.6,
          }}
        >
          <strong>
            {game.white} – {game.black}
          </strong>
          <br />
          {game.event}
          {game.site ? `, ${game.site}` : ''} ({game.year})
          <br />
          Hasil: {RESULT_LABEL[game.result] ?? game.result} · {game.moves.length} langkah
        </div>

        <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>Daftar Langkah</h3>
        <div style={{ maxHeight: '18rem', overflowY: 'auto' }}>
          <table className="table table--compact">
            <tbody>
              {Array.from({ length: Math.ceil(game.moves.length / 2) }, (_, row) => {
                const whitePly = row * 2 + 1;
                const blackPly = row * 2 + 2;
                return (
                  <tr key={row}>
                    <td style={{ width: '2.5rem', color: '#64748b' }}>{row + 1}.</td>
                    <MoveCell san={game.moves[row * 2]} plyIndex={whitePly} current={ply} onSelect={setPly} />
                    <MoveCell san={game.moves[row * 2 + 1]} plyIndex={blackPly} current={ply} onSelect={setPly} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface MoveCellProps {
  readonly san: string | undefined;
  readonly plyIndex: number;
  readonly current: number;
  readonly onSelect: (ply: number) => void;
}

function MoveCell({ san, plyIndex, current, onSelect }: MoveCellProps) {
  const active = current === plyIndex;
  const ref = useRef<HTMLButtonElement | null>(null);

  // Saat langkah berjalan otomatis, daftar ikut bergulir supaya langkah yang
  // sedang ditampilkan selalu terlihat.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!san) return <td />;
  return (
    <td>
      <button
        ref={ref}
        type="button"
        onClick={() => onSelect(plyIndex)}
        style={{
          background: active ? '#fde68a' : 'transparent',
          border: 'none',
          borderRadius: '4px',
          padding: '0.1rem 0.35rem',
          cursor: 'pointer',
          fontWeight: active ? 700 : 400,
          fontFamily: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {san}
      </button>
    </td>
  );
}
