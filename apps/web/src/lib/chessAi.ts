/** Lawan komputer untuk halaman Catur.
 *
 * Negamax dengan pemangkasan alpha-beta, ditambah pencarian lanjutan khusus
 * langkah makan (quiescence) supaya komputer tidak berhenti menghitung tepat
 * di tengah rentetan tukar bidak dan salah menilai posisi. */

import {
  applyMove,
  generateMoves,
  isInCheck,
  opposite,
  type Move,
  type Piece,
  type PieceType,
  type Position,
} from './chess.ts';

export type Difficulty = 'mudah' | 'sedang' | 'sulit' | 'master';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  mudah: 'Mudah',
  sedang: 'Sedang',
  sulit: 'Sulit',
  master: 'Master',
};

const SEARCH_DEPTH: Record<Difficulty, number> = {
  mudah: 1,
  sedang: 2,
  sulit: 3,
  master: 4,
};

/** Seberapa besar langkah non-terbaik masih boleh dipilih, dalam seperseratus
 * pion. Level mudah sengaja dibuat longgar supaya bisa dikalahkan. */
const BLUNDER_WINDOW: Record<Difficulty, number> = {
  mudah: 150,
  sedang: 40,
  sulit: 0,
  master: 0,
};

const PIECE_VALUE: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Tabel posisi ditulis dari sudut pandang putih dengan indeks 0 = a8, sama
// seperti papan di chess.ts. Untuk hitam kotaknya dicerminkan (sq ^ 56).
const PAWN_TABLE: readonly number[] = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE: readonly number[] = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE: readonly number[] = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE: readonly number[] = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_TABLE: readonly number[] = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_TABLE: readonly number[] = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const TABLES: Record<PieceType, readonly number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_TABLE,
};

const MATE_SCORE = 100_000;

function pieceScore(piece: Piece, sq: number): number {
  const table = TABLES[piece.type];
  const index = piece.color === 'w' ? sq : sq ^ 56;
  return PIECE_VALUE[piece.type] + (table[index] ?? 0);
}

/** Nilai posisi dari sudut pandang pihak yang sedang jalan. */
export function evaluate(pos: Position): number {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const piece = pos.board[sq];
    if (!piece) continue;
    score += piece.color === pos.turn ? pieceScore(piece, sq) : -pieceScore(piece, sq);
  }
  return score;
}

/** Langkah makan yang menjanjikan didahulukan supaya alpha-beta memangkas
 * lebih banyak cabang. Korban besar ditangkap bidak kecil dinilai paling baik. */
function orderMoves(moves: readonly Move[], pos: Position): Move[] {
  return [...moves].sort((a, b) => moveScore(b, pos) - moveScore(a, pos));
}

function moveScore(move: Move, pos: Position): number {
  let score = 0;
  if (move.captured) {
    const attacker = pos.board[move.from];
    score += 10 * PIECE_VALUE[move.captured] - (attacker ? PIECE_VALUE[attacker.type] : 0);
  }
  if (move.promotion) score += PIECE_VALUE[move.promotion];
  return score;
}

/** Lanjutkan menghitung selama masih ada langkah makan, supaya penilaian tidak
 * diambil di tengah rentetan tukar bidak. */
function quiesce(pos: Position, alpha: number, beta: number, depth: number): number {
  const standPat = evaluate(pos);
  if (depth === 0 || standPat >= beta) return standPat;

  let best = Math.max(alpha, standPat);
  const captures = generateMoves(pos).filter((m) => m.captured !== undefined);

  for (const move of orderMoves(captures, pos)) {
    const score = -quiesce(applyMove(pos, move), -beta, -best, depth - 1);
    if (score >= beta) return score;
    if (score > best) best = score;
  }
  return best;
}

function negamax(pos: Position, depth: number, alpha: number, beta: number): number {
  const moves = generateMoves(pos);

  if (moves.length === 0) {
    // Skakmat dinilai makin buruk bila terjadi makin cepat, supaya komputer
    // memilih jalan matt terpendek dan bukan menundanya.
    return isInCheck(pos) ? -MATE_SCORE - depth : 0;
  }
  if (depth === 0) return quiesce(pos, alpha, beta, 4);

  let best = alpha;
  for (const move of orderMoves(moves, pos)) {
    const score = -negamax(applyMove(pos, move), depth - 1, -beta, -best);
    if (score >= beta) return score;
    if (score > best) best = score;
  }
  return best;
}

export interface ScoredMove {
  readonly move: Move;
  readonly score: number;
}

/** Menilai semua langkah yang sah, terbaik lebih dulu. */
export function rankMoves(pos: Position, difficulty: Difficulty): ScoredMove[] {
  const depth = SEARCH_DEPTH[difficulty];
  const scored = generateMoves(pos).map((move) => ({
    move,
    score: -negamax(applyMove(pos, move), depth - 1, -Infinity, Infinity),
  }));
  return scored.sort((a, b) => b.score - a.score);
}

/** Langkah pilihan komputer, atau null bila permainan sudah selesai.
 *
 * `random` bisa diisi untuk membuat hasilnya bisa diulang di tes. */
export function chooseMove(
  pos: Position,
  difficulty: Difficulty,
  random: () => number = Math.random,
): Move | null {
  const ranked = rankMoves(pos, difficulty);
  if (ranked.length === 0) return null;

  const best = ranked[0];
  if (!best) return null;

  // Di level rendah komputer boleh memilih langkah yang sedikit lebih lemah,
  // supaya permainannya tidak selalu sama dan tidak terasa mustahil dikalahkan.
  const window = BLUNDER_WINDOW[difficulty];
  const acceptable = ranked.filter((entry) => best.score - entry.score <= window);
  const pick = acceptable[Math.floor(random() * acceptable.length)] ?? best;
  return pick.move;
}

/** Nama pihak yang menang saat skakmat, dilihat dari posisi akhir. */
export function winnerOf(pos: Position): 'w' | 'b' {
  return opposite(pos.turn);
}
