import { describe, expect, test } from 'vitest';
import type { GameState, Tile } from '../../apps/web/src/lib/gaplek.ts';
import {
  MIN_PLACED_FOR_ANALYSIS,
  analysePosition,
  boardInsight,
  chooseMove,
} from '../../apps/web/src/lib/gaplekAi.ts';

const t = (a: number, b: number): Tile => ({ a, b });

function state(partial: Partial<GameState>): GameState {
  return { hands: [[], [], [], []], placed: [], turn: 0, consecutivePasses: 0, ...partial };
}

describe('analysePosition', () => {
  test('holds back until enough tiles are on the table', () => {
    const game = state({ placed: [[6, 6]], hands: [[t(6, 3)], [], [], []] });
    const analysis = analysePosition(game);

    expect(analysis.available).toBe(false);
    expect(analysis.note).toContain(String(MIN_PLACED_FOR_ANALYSIS));
    expect(analysis.ranked).toEqual([]);
  });

  test('ranks the moves once two tiles are down', () => {
    const game = state({
      placed: [
        [6, 6],
        [6, 3],
      ],
      hands: [[t(3, 5), t(6, 2)], [], [], []],
    });
    const analysis = analysePosition(game);

    expect(analysis.available).toBe(true);
    expect(analysis.ranked.length).toBeGreaterThan(1);
    for (const entry of analysis.ranked) expect(entry.reasons.length).toBeGreaterThan(0);
  });

  test('is sorted best first', () => {
    const game = state({
      placed: [
        [6, 6],
        [6, 3],
      ],
      hands: [[t(3, 5), t(6, 2), t(3, 1)], [], [], []],
    });
    const scores = analysePosition(game).ranked.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  test('puts the move that empties the hand on top', () => {
    const game = state({
      placed: [
        [6, 6],
        [6, 3],
      ],
      hands: [[t(3, 5)], [], [], []],
    });
    const best = analysePosition(game).ranked[0];

    expect(best?.reasons.join(' ')).toContain('habis');
    expect(best?.score).toBeGreaterThan(500);
  });

  test('says so when the player has to pass', () => {
    const game = state({
      placed: [
        [6, 6],
        [6, 3],
      ],
      hands: [[t(0, 1), t(2, 4)], [], [], []],
    });
    const analysis = analysePosition(game);

    expect(analysis.available).toBe(false);
    expect(analysis.note).toContain('pas');
  });

  test('counts how many unseen tiles still fit the ends', () => {
    const game = state({
      placed: [
        [6, 6],
        [6, 3],
      ],
      hands: [[t(3, 5)], [], [], []],
    });
    const entry = analysePosition(game).ranked[0];

    expect(entry?.endsAfter).toEqual([6, 5]);
    expect(entry?.opponentOuts).toBeGreaterThanOrEqual(0);
  });
});

describe('chooseMove', () => {
  test('plays the tile that finishes the hand', () => {
    const game = state({
      placed: [
        [6, 6],
        [6, 3],
      ],
      hands: [[t(3, 5)], [], [], []],
    });
    expect(chooseMove(game)).toEqual({ tileIndex: 0, side: 'kanan' });
  });

  test('returns null when nothing can be played', () => {
    const game = state({ placed: [[1, 1]], hands: [[t(0, 2), t(3, 4)], [], [], []] });
    expect(chooseMove(game)).toBeNull();
  });

  test('opens with the double six', () => {
    const game = state({ hands: [[t(2, 3), t(6, 6)], [], [], []] });
    expect(chooseMove(game)).toEqual({ tileIndex: 1, side: 'kanan' });
  });
});

describe('boardInsight', () => {
  test('reports the open ends and what is still unaccounted for', () => {
    const game = state({
      placed: [
        [6, 6],
        [6, 3],
      ],
      hands: [[t(3, 5), t(0, 0)], [], [], []],
    });
    const insight = boardInsight(game, 0);

    expect(insight.ends).toEqual([6, 3]);
    expect(insight.myPips).toBe(8);
    // 28 kartu dikurangi 2 di papan dan 2 di tangan sendiri.
    expect(insight.unseenCount).toBe(24);
    expect(insight.unseenByPip).toHaveLength(7);
  });
});
