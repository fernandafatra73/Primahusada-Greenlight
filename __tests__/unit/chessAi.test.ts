import { describe, expect, test } from 'vitest';
import { applyMove, gameStatus, parseFen, squareName } from '../../apps/web/src/lib/chess.ts';
import { chooseMove, evaluate, rankMoves } from '../../apps/web/src/lib/chessAi.ts';

/** Pilihan komputer dalam bentuk "e2e4" supaya mudah dibaca di harapan tes. */
function pick(fen: string, difficulty: 'mudah' | 'sedang' | 'sulit' | 'master' = 'sulit'): string {
  const pos = parseFen(fen);
  const move = chooseMove(pos, difficulty, () => 0);
  if (!move) throw new Error('Komputer tidak menemukan langkah');
  return `${squareName(move.from)}${squareName(move.to)}`;
}

describe('evaluate', () => {
  test('is symmetric — the same position is equal for whoever is to move', () => {
    const white = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const black = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
    expect(evaluate(white)).toBe(0);
    expect(evaluate(black)).toBe(0);
  });

  test('counts a missing queen against its owner', () => {
    const pos = parseFen('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(evaluate(pos)).toBeGreaterThan(800);
  });
});

describe('chooseMove', () => {
  test('plays mate in one when it is available', () => {
    expect(pick('6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1')).toBe('a1a8');
  });

  test('takes a hanging queen', () => {
    // Menteri hitam di d5 tidak dijaga dan bisa diambil gajah putih di g2.
    expect(pick('4k3/8/8/3q4/8/8/6B1/4K3 w - - 0 1')).toBe('g2d5');
  });

  test('escapes mate in one instead of ignoring the threat', () => {
    // Putih mengancam Ra8#; hitam harus membuka jalan keluar atau menahan.
    const pos = parseFen('6k1/5ppp/8/8/8/8/8/R3K3 b Q - 0 1');
    const move = chooseMove(pos, 'sulit', () => 0);
    expect(move).not.toBeNull();

    const after = applyMove(pos, move!);
    const white = chooseMove(after, 'sulit', () => 0);
    expect(white).not.toBeNull();
    expect(gameStatus(applyMove(after, white!))).not.toBe('checkmate');
  });

  test('returns null once the game is over', () => {
    expect(chooseMove(parseFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1'), 'mudah')).toBeNull();
  });
});

describe('rankMoves', () => {
  test('orders the winning capture ahead of a quiet move', () => {
    const ranked = rankMoves(parseFen('4k3/8/8/3q4/8/8/6B1/4K3 w - - 0 1'), 'sedang');
    expect(squareName(ranked[0]!.move.to)).toBe('d5');
    expect(ranked[0]!.score).toBeGreaterThan(ranked[ranked.length - 1]!.score);
  });
});
