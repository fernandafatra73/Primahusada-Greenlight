import type { CSSProperties } from 'react';
import { fileOf, rankOf, squareName, type Move, type Piece, type PieceType, type Position, type Square } from '../lib/chess.ts';

export const PIECE_GLYPH: Record<PieceType, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

// Papan biru: kotak terang biru pucat, kotak gelap biru sedang, dengan
// bingkai biru tua. Sorotan langkah terakhir memakai kuning keemasan karena
// paling terbaca di atas biru.
const LIGHT_SQUARE = '#e6eef5';
const DARK_SQUARE = '#4a7ba7';
const LIGHT_LAST_MOVE = '#f3e08f';
const DARK_LAST_MOVE = '#c3a259';
const SELECTED = '#f2c14e';
const FRAME = '#1f3b57';
const FRAME_EDGE = '#132638';

interface ChessBoardProps {
  readonly position: Position;
  readonly flipped?: boolean;
  readonly selected?: Square | null;
  readonly targets?: ReadonlySet<Square>;
  readonly lastMove?: Move | null;
  readonly onSquareClick?: (sq: Square) => void;
  /** Ukuran maksimum satu kotak dalam piksel. */
  readonly maxSquarePx?: number;
}

/** Bidak digambar dengan lambang Unicode pejal untuk kedua warna, lalu
 * dibedakan lewat warna isi dan garis tepi. Garis tepi dipakai supaya bidak
 * putih tetap terbaca di kotak terang dan bidak hitam tetap terbaca di kotak
 * gelap — tanpa itu keduanya menyatu dengan papan. */
function pieceStyle(color: 'w' | 'b'): CSSProperties {
  if (color === 'w') {
    return {
      color: '#fcf7ec',
      WebkitTextStrokeWidth: '1.6px',
      WebkitTextStrokeColor: '#33220f',
      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))',
    };
  }
  return {
    color: '#15100b',
    WebkitTextStrokeWidth: '1.1px',
    WebkitTextStrokeColor: 'rgba(247,238,220,0.62)',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.35))',
  };
}

export function ChessBoard({
  position,
  flipped = false,
  selected = null,
  targets,
  lastMove = null,
  onSquareClick,
  maxSquarePx = 68,
}: ChessBoardProps) {
  const order = Array.from({ length: 64 }, (_, i) => i);
  const squares = flipped ? [...order].reverse() : order;

  return (
    <div
      style={{
        background: FRAME,
        padding: '18px',
        borderRadius: '6px',
        border: `2px solid ${FRAME_EDGE}`,
        boxShadow: '0 8px 22px rgba(0,0,0,0.25)',
        display: 'inline-block',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, min(8.6vw, ${maxSquarePx}px))`,
          gridTemplateRows: `repeat(8, min(8.6vw, ${maxSquarePx}px))`,
          boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.35)',
        }}
      >
        {squares.map((sq) => (
          <SquareCell
            key={sq}
            square={sq}
            piece={position.board[sq] ?? null}
            selected={selected === sq}
            isTarget={targets?.has(sq) ?? false}
            isLastMove={lastMove?.from === sq || lastMove?.to === sq}
            maxSquarePx={maxSquarePx}
            onClick={onSquareClick ? () => onSquareClick(sq) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface SquareCellProps {
  readonly square: Square;
  readonly piece: Piece | null;
  readonly selected: boolean;
  readonly isTarget: boolean;
  readonly isLastMove: boolean;
  readonly maxSquarePx: number;
  readonly onClick?: () => void;
}

function SquareCell({
  square,
  piece,
  selected,
  isTarget,
  isLastMove,
  maxSquarePx,
  onClick,
}: SquareCellProps) {
  const isLight = (fileOf(square) + rankOf(square)) % 2 === 0;
  const background = selected
    ? SELECTED
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
      disabled={!onClick}
      title={squareName(square)}
      style={{
        background,
        border: 'none',
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `min(7.4vw, ${Math.round(maxSquarePx * 0.86)}px)`,
        lineHeight: 1,
        ...(piece ? pieceStyle(piece.color) : {}),
      }}
    >
      {piece ? PIECE_GLYPH[piece.type] : ''}
      {isTarget && (
        <span
          style={{
            position: 'absolute',
            width: piece ? '86%' : '30%',
            height: piece ? '86%' : '30%',
            borderRadius: '50%',
            background: piece ? 'transparent' : 'rgba(20,83,45,0.4)',
            border: piece ? '4px solid rgba(20,83,45,0.5)' : 'none',
            pointerEvents: 'none',
          }}
        />
      )}
    </button>
  );
}
