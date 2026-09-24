import { describe, expect, test } from 'vitest';
import { applyMove, findMoveBySan, initialPosition } from '../../apps/web/src/lib/chess.ts';
import { FAMOUS_GAMES } from '../../apps/web/src/lib/chessGames.ts';

describe('FAMOUS_GAMES', () => {
  test('ships the full list with unique ids', () => {
    expect(FAMOUS_GAMES).toHaveLength(200);
    expect(new Set(FAMOUS_GAMES.map((g) => g.id)).size).toBe(FAMOUS_GAMES.length);
  });

  test('every game carries the details the list needs', () => {
    const incomplete = FAMOUS_GAMES.filter(
      (g) => !g.white || !g.black || !/^\d{4}$/.test(g.year) || g.moves.length < 20,
    ).map((g) => g.id);
    expect(incomplete).toEqual([]);
  });

  // Penjaga utama berkas data ini: satu langkah yang salah salin membuat
  // partainya mustahil dijalankan, dan tes ini yang menangkapnya.
  test.each(FAMOUS_GAMES.map((g) => [`${g.year} ${g.white}-${g.black}`, g] as const))(
    'replays %s to the end without an illegal move',
    (_label, game) => {
      let pos = initialPosition();
      for (const [i, san] of game.moves.entries()) {
        const move = findMoveBySan(pos, san);
        if (!move) {
          throw new Error(`${game.id}: langkah ke-${i + 1} "${san}" tidak sah`);
        }
        pos = applyMove(pos, move);
      }
      expect(pos.fullmove).toBeGreaterThan(1);
    },
  );
});
