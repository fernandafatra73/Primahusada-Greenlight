import { describe, expect, test } from 'vitest';
import {
  HAND_SIZE,
  PLAYER_COUNT,
  applyMove,
  applyPass,
  createDeck,
  dealRound,
  findStartingPlayer,
  handPips,
  isBlocked,
  leftEnd,
  legalMoves,
  rightEnd,
  roundResult,
  shuffle,
  tileKey,
  unseenTiles,
  type GameState,
  type Tile,
} from '../../apps/web/src/lib/gaplek.ts';

const t = (a: number, b: number): Tile => ({ a, b });

/** Keadaan permainan ringkas untuk tes, tanpa harus membagi kartu penuh. */
function state(partial: Partial<GameState>): GameState {
  return {
    hands: [[], [], [], []],
    placed: [],
    turn: 0,
    consecutivePasses: 0,
    ...partial,
  };
}

describe('createDeck', () => {
  test('has all 28 tiles of a double-six set, with no repeats', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(28);
    expect(new Set(deck.map(tileKey)).size).toBe(28);
  });

  test('includes both the lowest and the highest double', () => {
    const keys = createDeck().map(tileKey);
    expect(keys).toContain('0-0');
    expect(keys).toContain('6-6');
  });
});

describe('dealRound', () => {
  test('deals every tile out, seven to each of four players', () => {
    const game = dealRound(() => 0.5);
    expect(game.hands).toHaveLength(PLAYER_COUNT);
    for (const hand of game.hands) expect(hand).toHaveLength(HAND_SIZE);

    const all = game.hands.flat().map(tileKey);
    expect(new Set(all).size).toBe(28);
  });

  test('starts with whoever holds the double six', () => {
    const game = dealRound(() => 0.5);
    const starter = game.hands[game.turn] as readonly Tile[];
    expect(starter.some((tile) => tile.a === 6 && tile.b === 6)).toBe(true);
  });
});

describe('findStartingPlayer', () => {
  test('finds the holder of the double six', () => {
    expect(findStartingPlayer([[t(1, 2)], [t(6, 6)], [], []])).toBe(1);
  });

  test('falls back to the first player when nobody holds it', () => {
    expect(findStartingPlayer([[t(1, 2)], [t(3, 4)], [], []])).toBe(0);
  });
});

describe('legalMoves', () => {
  test('opening move must be the double six', () => {
    const game = state({ hands: [[t(3, 4), t(6, 6), t(0, 1)], [], [], []] });
    expect(legalMoves(game)).toEqual([{ tileIndex: 1, side: 'kanan' }]);
  });

  test('offers both ends when they differ', () => {
    const game = state({
      placed: [
        [2, 6],
        [6, 5],
      ],
      hands: [[t(2, 3), t(5, 1)], [], [], []],
    });
    expect(leftEnd(game)).toBe(2);
    expect(rightEnd(game)).toBe(5);

    expect(legalMoves(game)).toEqual([
      { tileIndex: 0, side: 'kiri' },
      { tileIndex: 1, side: 'kanan' },
    ]);
  });

  test('offers one side only when both ends are the same number', () => {
    const game = state({ placed: [[4, 4]], hands: [[t(4, 2)], [], [], []] });
    expect(legalMoves(game)).toEqual([{ tileIndex: 0, side: 'kanan' }]);
  });

  test('is empty when nothing in hand matches', () => {
    const game = state({ placed: [[1, 3]], hands: [[t(5, 6), t(0, 2)], [], [], []] });
    expect(legalMoves(game)).toEqual([]);
  });
});

describe('applyMove', () => {
  test('appends on the right, turning the tile to match the end', () => {
    const game = state({ placed: [[1, 3]], hands: [[t(5, 3)], [], [], []] });
    const next = applyMove(game, { tileIndex: 0, side: 'kanan' });

    expect(next.placed).toEqual([
      [1, 3],
      [3, 5],
    ]);
    expect(rightEnd(next)).toBe(5);
    expect(next.hands[0]).toEqual([]);
    expect(next.turn).toBe(1);
  });

  test('prepends on the left, turning the tile to match the end', () => {
    const game = state({ placed: [[1, 3]], hands: [[t(1, 6)], [], [], []] });
    const next = applyMove(game, { tileIndex: 0, side: 'kiri' });

    expect(next.placed).toEqual([
      [6, 1],
      [1, 3],
    ]);
    expect(leftEnd(next)).toBe(6);
  });

  test('does not change the state it was given', () => {
    const game = state({ placed: [[1, 3]], hands: [[t(5, 3)], [], [], []] });
    applyMove(game, { tileIndex: 0, side: 'kanan' });

    expect(game.placed).toEqual([[1, 3]]);
    expect(game.hands[0]).toHaveLength(1);
  });

  test('clears the pass counter', () => {
    const game = state({ placed: [[1, 3]], hands: [[t(5, 3)], [], [], []], consecutivePasses: 3 });
    expect(applyMove(game, { tileIndex: 0, side: 'kanan' }).consecutivePasses).toBe(0);
  });
});

describe('passing and blocking', () => {
  test('four passes in a row means the game is blocked', () => {
    let game = state({ placed: [[1, 1]] });
    for (let i = 0; i < 3; i++) game = applyPass(game);
    expect(isBlocked(game)).toBe(false);

    game = applyPass(game);
    expect(isBlocked(game)).toBe(true);
    expect(game.turn).toBe(0);
  });
});

describe('roundResult', () => {
  test('is null while the round is still running', () => {
    const game = state({ hands: [[t(1, 1)], [t(2, 2)], [t(3, 3)], [t(4, 4)]] });
    expect(roundResult(game)).toBeNull();
  });

  test('an empty hand wins and scores the pips left with everyone else', () => {
    const game = state({ hands: [[], [t(2, 2)], [t(3, 3)], [t(6, 1)]] });
    const result = roundResult(game);

    expect(result?.winner).toBe(0);
    expect(result?.ending).toBe('habis');
    expect(result?.points).toBe(4 + 6 + 7);
  });

  test('when blocked, the smallest pip count wins', () => {
    const game = state({
      hands: [[t(6, 6)], [t(0, 1)], [t(5, 5)], [t(3, 3)]],
      consecutivePasses: 4,
    });
    const result = roundResult(game);

    expect(result?.winner).toBe(1);
    expect(result?.ending).toBe('buntu');
    expect(result?.points).toBe(12 + 10 + 6);
  });

  test('finishing the hand beats the blocked rule', () => {
    const game = state({ hands: [[], [t(0, 1)], [t(5, 5)], [t(3, 3)]], consecutivePasses: 4 });
    expect(roundResult(game)?.ending).toBe('habis');
    expect(roundResult(game)?.winner).toBe(0);
  });
});

describe('handPips', () => {
  test('adds up both halves of every tile', () => {
    expect(handPips([t(6, 6), t(0, 1), t(3, 4)])).toBe(12 + 1 + 7);
  });

  test('an empty hand is worth nothing', () => {
    expect(handPips([])).toBe(0);
  });
});

describe('unseenTiles', () => {
  test('excludes our own hand and everything already on the table', () => {
    const game = state({ placed: [[6, 6], [6, 2]], hands: [[t(0, 0), t(1, 1)], [], [], []] });
    const unseen = unseenTiles(game, 0);

    expect(unseen).toHaveLength(28 - 2 - 2);
    const keys = unseen.map(tileKey);
    expect(keys).not.toContain('6-6');
    expect(keys).not.toContain('2-6');
    expect(keys).not.toContain('0-0');
  });
});

describe('shuffle', () => {
  test('keeps every item, changing only the order', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck, () => 0.42);

    expect(shuffled).toHaveLength(deck.length);
    expect(new Set(shuffled.map(tileKey))).toEqual(new Set(deck.map(tileKey)));
  });

  test('leaves the original array untouched', () => {
    const deck = createDeck();
    const first = deck[0] as Tile;
    shuffle(deck, () => 0.9);
    expect(deck[0]).toBe(first);
  });
});
