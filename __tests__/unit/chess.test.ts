import { describe, expect, test } from 'vitest';
import {
  applyMove,
  gameStatus,
  generateMoves,
  initialPosition,
  isInCheck,
  moveToSan,
  movesFrom,
  parseFen,
  squareFromName,
  squareName,
  toFen,
  type Move,
  type Position,
} from '../../apps/web/src/lib/chess.ts';

/** Jumlah daun pohon langkah sampai kedalaman tertentu. Angka pembandingnya
 * sudah baku di dunia catur komputer, jadi satu saja meleset berarti ada
 * aturan yang salah (rokade, en passant, promosi, atau pin). */
function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = generateMoves(pos);
  if (depth === 1) return moves.length;
  let total = 0;
  for (const move of moves) total += perft(applyMove(pos, move), depth - 1);
  return total;
}

function play(pos: Position, from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): Position {
  const move = movesFrom(pos, squareFromName(from)).find(
    (m) => m.to === squareFromName(to) && (promotion ? m.promotion === promotion : !m.promotion),
  );
  if (!move) throw new Error(`Langkah ${from}${to} tidak sah`);
  return applyMove(pos, move);
}

describe('FEN', () => {
  test('round-trips the starting position', () => {
    expect(toFen(initialPosition())).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
  });

  test('maps square names to the a8-first index order', () => {
    expect(squareFromName('a8')).toBe(0);
    expect(squareFromName('h1')).toBe(63);
    expect(squareFromName('e1')).toBe(60);
    expect(squareName(4)).toBe('e8');
  });
});

describe('perft', () => {
  test('starting position matches known node counts', () => {
    const pos = initialPosition();
    expect(perft(pos, 1)).toBe(20);
    expect(perft(pos, 2)).toBe(400);
    expect(perft(pos, 3)).toBe(8902);
  });

  test('kiwipete position exercises castling, en passant and pins', () => {
    const pos = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(perft(pos, 1)).toBe(48);
    expect(perft(pos, 2)).toBe(2039);
  });

  test('promotion-heavy position matches known node counts', () => {
    const pos = parseFen('n1n5/PPPk4/8/8/8/8/4Kppp/5N1N b - - 0 1');
    expect(perft(pos, 1)).toBe(24);
    expect(perft(pos, 2)).toBe(496);
  });
});

describe('special rules', () => {
  test('en passant captures the pawn that just passed by', () => {
    let pos = initialPosition();
    pos = play(pos, 'e2', 'e4');
    pos = play(pos, 'a7', 'a6');
    pos = play(pos, 'e4', 'e5');
    pos = play(pos, 'd7', 'd5');

    expect(pos.epSquare).toBe(squareFromName('d6'));
    pos = play(pos, 'e5', 'd6');

    expect(pos.board[squareFromName('d6')]).toEqual({ color: 'w', type: 'p' });
    expect(pos.board[squareFromName('d5')]).toBeNull();
  });

  test('castling moves the rook alongside the king', () => {
    const pos = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const after = play(pos, 'e1', 'g1');

    expect(after.board[squareFromName('g1')]).toEqual({ color: 'w', type: 'k' });
    expect(after.board[squareFromName('f1')]).toEqual({ color: 'w', type: 'r' });
    expect(after.board[squareFromName('h1')]).toBeNull();
    expect(after.castling.wk).toBe(false);
    expect(after.castling.wq).toBe(false);
  });

  test('castling is blocked while the king would cross an attacked square', () => {
    // Benteng hitam di f8 mengawasi f1, kotak yang dilewati raja.
    const pos = parseFen('5r1k/8/8/8/8/8/8/4K2R w K - 0 1');
    const targets = movesFrom(pos, squareFromName('e1')).map((m) => squareName(m.to));
    expect(targets).not.toContain('g1');
  });

  test('promotion offers all four pieces and applies the chosen one', () => {
    const pos = parseFen('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
    const moves = movesFrom(pos, squareFromName('e7'));
    expect(moves.map((m) => m.promotion).sort()).toEqual(['b', 'n', 'q', 'r']);

    const after = play(pos, 'e7', 'e8', 'n');
    expect(after.board[squareFromName('e8')]).toEqual({ color: 'w', type: 'n' });
  });

  test('a pinned piece may not expose its own king', () => {
    // Kuda putih di e2 terpaku benteng hitam di e8 terhadap raja di e1.
    const pos = parseFen('4r3/8/8/8/8/8/4N3/4K3 w - - 0 1');
    expect(movesFrom(pos, squareFromName('e2'))).toEqual([]);
  });
});

describe('game status', () => {
  test("detects fool's mate as checkmate", () => {
    let pos = initialPosition();
    pos = play(pos, 'f2', 'f3');
    pos = play(pos, 'e7', 'e5');
    pos = play(pos, 'g2', 'g4');
    pos = play(pos, 'd8', 'h4');

    expect(isInCheck(pos)).toBe(true);
    expect(gameStatus(pos)).toBe('checkmate');
    expect(generateMoves(pos)).toEqual([]);
  });

  test('detects stalemate as a draw, not a loss', () => {
    const pos = parseFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(isInCheck(pos)).toBe(false);
    expect(gameStatus(pos)).toBe('stalemate');
  });

  test('detects king versus king as insufficient material', () => {
    expect(gameStatus(parseFen('7k/8/6K1/8/8/8/8/8 w - - 0 1'))).toBe('insufficient-material');
  });

  test('reports plain check while moves remain', () => {
    expect(gameStatus(parseFen('4r3/8/8/8/8/8/8/4K3 w - - 0 1'))).toBe('check');
  });
});

describe('moveToSan', () => {
  function san(pos: Position, from: string, to: string): string {
    const move = movesFrom(pos, squareFromName(from)).find((m) => m.to === squareFromName(to));
    return moveToSan(pos, move as Move);
  }

  test('writes quiet and capturing moves', () => {
    const pos = initialPosition();
    expect(san(pos, 'g1', 'f3')).toBe('Nf3');
    expect(san(pos, 'e2', 'e4')).toBe('e4');
  });

  test('marks pawn captures with the origin file', () => {
    const pos = parseFen('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
    expect(san(pos, 'e4', 'd5')).toBe('exd5');
  });

  test('disambiguates two rooks reaching the same square', () => {
    // Kedua benteng (a1 dan g1) sama-sama bisa ke d1, jadi kolom asal wajib
    // ditulis. Dengan raja di e1 jalur benteng h1 tertutup dan tidak ambigu.
    const pos = parseFen('4k3/8/8/8/8/8/8/R5RK w - - 0 1');
    expect(san(pos, 'a1', 'd1')).toBe('Rad1');

    const unblocked = parseFen('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(san(unblocked, 'a1', 'd1')).toBe('Rd1');
  });

  test('writes castling', () => {
    const pos = parseFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(san(pos, 'e1', 'g1')).toBe('O-O');
  });

  test('marks checkmate with a hash', () => {
    // Matt baris belakang: pion sendiri menutup jalan keluar raja hitam.
    const mate = parseFen('6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1');
    expect(san(mate, 'a1', 'a8')).toBe('Ra8#');
  });
});
