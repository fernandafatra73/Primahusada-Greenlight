import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PROMOTION_CHOICES,
  applyMove,
  fileOf,
  gameStatus,
  generateMoves,
  initialPosition,
  isGameOver,
  moveToSan,
  opposite,
  rankOf,
  squareName,
  type Color,
  type GameStatus,
  type Move,
  type Piece,
  type PieceType,
  type Position,
  type Square,
} from '../lib/chess.ts';
import { DIFFICULTY_LABELS, chooseMove, type Difficulty } from '../lib/chessAi.ts';
import '../components/ui/ui.css';

const GLYPH: Record<PieceType, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

const LIGHT_SQUARE = '#eadfc8';
const DARK_SQUARE = '#b08968';
const LIGHT_LAST_MOVE = '#dbe7a0';
const DARK_LAST_MOVE = '#9db068';

const COLOR_LABEL: Record<Color, string> = { w: 'Putih', b: 'Hitam' };

const STATUS_TEXT: Record<GameStatus, string> = {
  playing: 'Permainan berjalan',
  check: 'Skak!',
  checkmate: 'Skakmat',
  stalemate: 'Remis — raja buntu (stalemate)',
  'insufficient-material': 'Remis — bidak tidak cukup untuk menang',
  'fifty-move': 'Remis — 50 langkah tanpa makan atau jalan pion',
};

interface GameSnapshot {
  readonly position: Position;
  /** Langkah yang menghasilkan posisi ini, untuk menyorot langkah terakhir. */
  readonly lastMove: Move | null;
  readonly san: string | null;
}

function initialSnapshot(): GameSnapshot {
  return { position: initialPosition(), lastMove: null, san: null };
}

/** Pasangan langkah putih–hitam per nomor giliran, untuk tabel riwayat. */
function toMovePairs(sans: readonly string[]): readonly (readonly [number, string, string])[] {
  const pairs: [number, string, string][] = [];
  for (let i = 0; i < sans.length; i += 2) {
    pairs.push([i / 2 + 1, sans[i] ?? '', sans[i + 1] ?? '']);
  }
  return pairs;
}

export function CaturPage() {
  const [history, setHistory] = useState<readonly GameSnapshot[]>([initialSnapshot()]);
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [difficulty, setDifficulty] = useState<Difficulty>('sedang');
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [thinking, setThinking] = useState(false);

  const current = history[history.length - 1] ?? initialSnapshot();
  const position = current.position;
  const status = useMemo(() => gameStatus(position), [position]);
  const over = isGameOver(status);
  const legalMoves = useMemo(() => generateMoves(position), [position]);

  const sans = useMemo(
    () => history.map((h) => h.san).filter((s): s is string => s !== null),
    [history],
  );

  const playerTurn = position.turn === playerColor;

  const pushMove = useCallback((move: Move) => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      return [
        ...prev,
        {
          position: applyMove(last.position, move),
          lastMove: move,
          san: moveToSan(last.position, move),
        },
      ];
    });
    setSelected(null);
  }, []);

  // Giliran komputer dijalankan lewat timer supaya papan sempat tergambar
  // ulang dulu; pencarian langkah memblokir thread selama beberapa ratus ms.
  const thinkingRef = useRef(false);
  useEffect(() => {
    if (over || playerTurn || thinkingRef.current) return;
    thinkingRef.current = true;
    setThinking(true);

    const timer = setTimeout(() => {
      const move = chooseMove(position, difficulty);
      if (move) pushMove(move);
      thinkingRef.current = false;
      setThinking(false);
    }, 120);

    return () => {
      clearTimeout(timer);
      thinkingRef.current = false;
      setThinking(false);
    };
  }, [position, playerTurn, over, difficulty, pushMove]);

  const movesForSelected = useMemo(
    () => (selected === null ? [] : legalMoves.filter((m) => m.from === selected)),
    [legalMoves, selected],
  );

  function handleSquareClick(sq: Square) {
    if (over || thinking || !playerTurn) return;

    const target = movesForSelected.filter((m) => m.to === sq);
    if (target.length > 0) {
      if (target.some((m) => m.promotion)) {
        setPendingPromotion({ from: selected as Square, to: sq });
        return;
      }
      pushMove(target[0] as Move);
      return;
    }

    const piece = position.board[sq];
    setSelected(piece && piece.color === position.turn ? sq : null);
  }

  function completePromotion(type: PieceType) {
    if (!pendingPromotion) return;
    const move = legalMoves.find(
      (m) =>
        m.from === pendingPromotion.from && m.to === pendingPromotion.to && m.promotion === type,
    );
    setPendingPromotion(null);
    if (move) pushMove(move);
  }

  function newGame(color: Color = playerColor) {
    setHistory([initialSnapshot()]);
    setSelected(null);
    setPendingPromotion(null);
    setPlayerColor(color);
  }

  /** Mundur dua langkah (langkah komputer dan langkah sendiri) supaya giliran
   * kembali ke pemain. */
  function undo() {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      const back = prev.length > 2 && prev[prev.length - 1]?.position.turn === playerColor ? 2 : 1;
      return prev.slice(0, Math.max(1, prev.length - back));
    });
    setSelected(null);
  }

  const flipped = playerColor === 'b';
  const squares = useMemo(() => {
    const order = Array.from({ length: 64 }, (_, i) => i);
    return flipped ? order.reverse() : order;
  }, [flipped]);

  const targetSquares = new Set(movesForSelected.map((m) => m.to));
  const captured = useMemo(() => capturedTally(position), [position]);

  const winner = status === 'checkmate' ? opposite(position.turn) : null;
  const statusLine = over
    ? winner
      ? `Skakmat — ${COLOR_LABEL[winner]} menang`
      : STATUS_TEXT[status]
    : thinking
      ? 'Komputer sedang berpikir…'
      : `Giliran ${COLOR_LABEL[position.turn]}${status === 'check' ? ' — Skak!' : ''}`;

  return (
    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, min(9vw, 62px))',
            gridTemplateRows: 'repeat(8, min(9vw, 62px))',
            border: '3px solid #6f4e37',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
          }}
        >
          {squares.map((sq) => (
            <SquareCell
              key={sq}
              square={sq}
              piece={position.board[sq] ?? null}
              selected={selected === sq}
              isTarget={targetSquares.has(sq)}
              isLastMove={current.lastMove?.from === sq || current.lastMove?.to === sq}
              onClick={() => handleSquareClick(sq)}
            />
          ))}
        </div>

        <p
          style={{
            margin: '0.6rem 0 0',
            fontWeight: 700,
            color: over ? '#b91c1c' : 'inherit',
          }}
          aria-live="polite"
        >
          {statusLine}
        </p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
          Anda bermain {COLOR_LABEL[playerColor]} · Lawan {DIFFICULTY_LABELS[difficulty]}
          {captured.advantage !== 0 &&
            ` · Selisih materi ${captured.advantage > 0 ? '+' : ''}${captured.advantage}`}
        </p>
      </div>

      <div style={{ minWidth: '15rem', flex: '1 1 15rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => newGame()}>
            ♟️ Permainan Baru
          </button>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={undo}
            disabled={history.length <= 1 || thinking}
          >
            ↩️ Batalkan Langkah
          </button>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => newGame(opposite(playerColor))}
          >
            🔄 Main sebagai {COLOR_LABEL[opposite(playerColor)]}
          </button>
        </div>

        <div className="form-field" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="catur-level">Tingkat Kesulitan</label>
          <select
            id="catur-level"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((level) => (
              <option key={level} value={level}>
                {DIFFICULTY_LABELS[level]}
              </option>
            ))}
          </select>
          <p className="form-hint">
            Makin tinggi tingkatnya, makin dalam komputer menghitung dan makin lama berpikir.
          </p>
        </div>

        <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>Riwayat Langkah</h3>
        {sans.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Belum ada langkah. Klik bidak Anda untuk melihat langkah yang boleh dijalankan.
          </p>
        ) : (
          <div style={{ maxHeight: '18rem', overflowY: 'auto' }}>
            <table className="table table--compact">
              <thead>
                <tr>
                  <th style={{ width: '3rem' }}>#</th>
                  <th>Putih</th>
                  <th>Hitam</th>
                </tr>
              </thead>
              <tbody>
                {toMovePairs(sans).map(([no, white, black]) => (
                  <tr key={no}>
                    <td>{no}</td>
                    <td>{white}</td>
                    <td>{black}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingPromotion && (
        <div
          role="dialog"
          aria-label="Pilih bidak promosi"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div style={{ background: '#fff', padding: '1rem 1.25rem', borderRadius: '10px' }}>
            <p style={{ marginTop: 0, fontWeight: 700 }}>Pion promosi menjadi:</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {PROMOTION_CHOICES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => completePromotion(type)}
                  style={{ fontSize: '1.8rem', lineHeight: 1, padding: '0.3rem 0.6rem' }}
                >
                  {GLYPH[type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SquareCellProps {
  readonly square: Square;
  readonly piece: Piece | null;
  readonly selected: boolean;
  readonly isTarget: boolean;
  readonly isLastMove: boolean;
  readonly onClick: () => void;
}

function SquareCell({ square, piece, selected, isTarget, isLastMove, onClick }: SquareCellProps) {
  const isLight = (fileOf(square) + rankOf(square)) % 2 === 0;
  const background = selected
    ? '#f2c14e'
    : isLastMove
      ? isLight
        ? LIGHT_LAST_MOVE
        : DARK_LAST_MOVE
      : isLight
        ? LIGHT_SQUARE
        : DARK_SQUARE;

  return (
    <button
      type="button"
      onClick={onClick}
      title={squareName(square)}
      style={{
        background,
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'min(6.5vw, 44px)',
        lineHeight: 1,
        color: piece?.color === 'w' ? '#fffdf7' : '#1b1b1b',
        textShadow: piece?.color === 'w' ? '0 0 2px #000, 0 1px 2px rgba(0,0,0,0.6)' : 'none',
      }}
    >
      {piece ? GLYPH[piece.type] : ''}
      {isTarget && (
        <span
          style={{
            position: 'absolute',
            width: piece ? '86%' : '30%',
            height: piece ? '86%' : '30%',
            borderRadius: '50%',
            background: piece ? 'transparent' : 'rgba(20,83,45,0.45)',
            border: piece ? '4px solid rgba(20,83,45,0.55)' : 'none',
            pointerEvents: 'none',
          }}
        />
      )}
    </button>
  );
}

const MATERIAL_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Selisih materi putih dikurangi hitam, dihitung dari bidak yang masih ada. */
function capturedTally(pos: Position): { advantage: number } {
  let advantage = 0;
  for (const piece of pos.board) {
    if (!piece) continue;
    advantage += piece.color === 'w' ? MATERIAL_VALUE[piece.type] : -MATERIAL_VALUE[piece.type];
  }
  return { advantage };
}
