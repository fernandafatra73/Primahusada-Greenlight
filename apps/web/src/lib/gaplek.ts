/** Aturan permainan Gaplek (domino balak enam), tanpa dependensi luar.
 *
 * Empat pemain, 28 kartu dibagi habis 7 kartu per orang. Pemegang balak enam
 * (6|6) jalan pertama. Kartu disambung di salah satu ujung rantai bila
 * angkanya cocok; yang tidak punya sambungan harus pas (lewat). Ronde selesai
 * saat ada yang kartunya habis, atau saat keempat pemain pas berturut-turut
 * (mati/buntu).
 *
 * Seluruh fungsi di sini murni — `applyMove` mengembalikan keadaan baru dan
 * tidak mengubah keadaan yang diberikan. */

export const PLAYER_COUNT = 4;
export const HAND_SIZE = 7;
export const MAX_PIP = 6;

export interface Tile {
  readonly a: number;
  readonly b: number;
}

/** Kartu yang sudah terpasang, diarahkan sehingga nilai kedua menyambung ke
 * kartu berikutnya. */
export type PlacedTile = readonly [number, number];

export type Side = 'kiri' | 'kanan';

export interface Move {
  /** Posisi kartu di tangan pemain yang sedang jalan. */
  readonly tileIndex: number;
  readonly side: Side;
}

export interface GameState {
  readonly hands: readonly (readonly Tile[])[];
  readonly placed: readonly PlacedTile[];
  readonly turn: number;
  /** Jumlah pas berturut-turut; empat berarti permainan buntu. */
  readonly consecutivePasses: number;
}

export function tileKey(tile: Tile): string {
  return `${tile.a}-${tile.b}`;
}

export function tilePips(tile: Tile): number {
  return tile.a + tile.b;
}

export function isDouble(tile: Tile): boolean {
  return tile.a === tile.b;
}

export function handPips(hand: readonly Tile[]): number {
  return hand.reduce((sum, tile) => sum + tilePips(tile), 0);
}

/** 28 kartu domino balak enam, dari 0|0 sampai 6|6. */
export function createDeck(): Tile[] {
  const deck: Tile[] = [];
  for (let a = 0; a <= MAX_PIP; a++) {
    for (let b = a; b <= MAX_PIP; b++) deck.push({ a, b });
  }
  return deck;
}

/** Pengocokan Fisher–Yates. `random` bisa diisi agar hasilnya bisa diulang
 * di tes. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** Pemegang balak enam jalan pertama; bila kartu itu tidak terbagi (tidak
 * mungkin pada pembagian penuh) dipakai pemain pertama. */
export function findStartingPlayer(hands: readonly (readonly Tile[])[]): number {
  const index = hands.findIndex((hand) => hand.some((t) => t.a === MAX_PIP && t.b === MAX_PIP));
  return index === -1 ? 0 : index;
}

export function dealRound(random: () => number = Math.random): GameState {
  const deck = shuffle(createDeck(), random);
  const hands: Tile[][] = [];
  for (let p = 0; p < PLAYER_COUNT; p++) {
    hands.push(deck.slice(p * HAND_SIZE, (p + 1) * HAND_SIZE));
  }
  return {
    hands,
    placed: [],
    turn: findStartingPlayer(hands),
    consecutivePasses: 0,
  };
}

export function leftEnd(state: GameState): number | null {
  return state.placed[0]?.[0] ?? null;
}

export function rightEnd(state: GameState): number | null {
  const last = state.placed[state.placed.length - 1];
  return last ? last[1] : null;
}

export function openEnds(state: GameState): readonly number[] {
  const l = leftEnd(state);
  const r = rightEnd(state);
  return l === null || r === null ? [] : [l, r];
}

function matches(tile: Tile, end: number): boolean {
  return tile.a === end || tile.b === end;
}

/** Langkah yang boleh dijalankan pemain yang sedang giliran.
 *
 * Pada langkah pembuka hanya balak enam yang boleh dipasang, sesuai aturan
 * gaplek. Setelah itu kartu boleh masuk di ujung mana pun yang cocok; bila
 * kedua ujung bernilai sama, sisi kanan saja yang ditawarkan supaya tidak ada
 * dua pilihan yang hasilnya persis sama. */
export function legalMoves(state: GameState): Move[] {
  const hand = state.hands[state.turn] ?? [];

  if (state.placed.length === 0) {
    const index = hand.findIndex((t) => t.a === MAX_PIP && t.b === MAX_PIP);
    if (index !== -1) return [{ tileIndex: index, side: 'kanan' }];
    return hand.map((_, tileIndex) => ({ tileIndex, side: 'kanan' as Side }));
  }

  const l = leftEnd(state) as number;
  const r = rightEnd(state) as number;
  const moves: Move[] = [];

  for (const [tileIndex, tile] of hand.entries()) {
    if (matches(tile, r)) moves.push({ tileIndex, side: 'kanan' });
    if (l !== r && matches(tile, l)) moves.push({ tileIndex, side: 'kiri' });
  }
  return moves;
}

export function canPlay(state: GameState): boolean {
  return legalMoves(state).length > 0;
}

function orientFor(tile: Tile, end: number, side: Side): PlacedTile {
  // Di kanan, nilai pertama harus sama dengan ujung kanan; di kiri, nilai
  // kedua harus sama dengan ujung kiri.
  if (side === 'kanan') {
    return tile.a === end ? [tile.a, tile.b] : [tile.b, tile.a];
  }
  return tile.b === end ? [tile.a, tile.b] : [tile.b, tile.a];
}

export function applyMove(state: GameState, move: Move): GameState {
  const hand = state.hands[state.turn];
  const tile = hand?.[move.tileIndex];
  if (!hand || !tile) throw new Error('Kartu tidak ada di tangan pemain ini');

  const nextHand = hand.filter((_, i) => i !== move.tileIndex);
  const hands = state.hands.map((h, i) => (i === state.turn ? nextHand : h));

  let placed: readonly PlacedTile[];
  if (state.placed.length === 0) {
    placed = [[tile.a, tile.b]];
  } else if (move.side === 'kanan') {
    placed = [...state.placed, orientFor(tile, rightEnd(state) as number, 'kanan')];
  } else {
    placed = [orientFor(tile, leftEnd(state) as number, 'kiri'), ...state.placed];
  }

  return {
    hands,
    placed,
    turn: (state.turn + 1) % PLAYER_COUNT,
    consecutivePasses: 0,
  };
}

export function applyPass(state: GameState): GameState {
  return {
    ...state,
    turn: (state.turn + 1) % PLAYER_COUNT,
    consecutivePasses: state.consecutivePasses + 1,
  };
}

/** Buntu: semua pemain berturut-turut tidak bisa jalan. */
export function isBlocked(state: GameState): boolean {
  return state.consecutivePasses >= PLAYER_COUNT;
}

export type RoundEnding = 'habis' | 'buntu';

export interface RoundResult {
  readonly winner: number;
  readonly ending: RoundEnding;
  /** Nilai yang didapat pemenang: jumlah mata kartu sisa di tangan lawan. */
  readonly points: number;
  readonly remainingPips: readonly number[];
}

/** Hasil ronde, atau null bila permainan masih berjalan.
 *
 * Kartu habis lebih dulu daripada buntu: kalau tangan seseorang kosong, ronde
 * selesai walau langkah terakhir juga membuat papan tak bisa disambung. Saat
 * buntu, yang menang adalah pemilik sisa mata terkecil; bila seri, pemain
 * dengan nomor urut terkecil di antara yang seri. */
export function roundResult(state: GameState): RoundResult | null {
  const remainingPips = state.hands.map((hand) => handPips(hand));
  const emptied = state.hands.findIndex((hand) => hand.length === 0);

  if (emptied !== -1) {
    return {
      winner: emptied,
      ending: 'habis',
      points: remainingPips.reduce((sum, pips, i) => (i === emptied ? sum : sum + pips), 0),
      remainingPips,
    };
  }

  if (!isBlocked(state)) return null;

  let winner = 0;
  for (let p = 1; p < PLAYER_COUNT; p++) {
    if ((remainingPips[p] as number) < (remainingPips[winner] as number)) winner = p;
  }
  return {
    winner,
    ending: 'buntu',
    points: remainingPips.reduce((sum, pips, i) => (i === winner ? sum : sum + pips), 0),
    remainingPips,
  };
}

/** Kartu yang belum terlihat oleh `player`: bukan di tangannya sendiri dan
 * belum terpasang di papan. Dipakai untuk menghitung peluang di analisa. */
export function unseenTiles(state: GameState, player: number): Tile[] {
  const seen = new Set<string>();
  for (const [a, b] of state.placed) seen.add(tileKey({ a: Math.min(a, b), b: Math.max(a, b) }));
  for (const tile of state.hands[player] ?? []) seen.add(tileKey(tile));
  return createDeck().filter((tile) => !seen.has(tileKey(tile)));
}

/** Berapa banyak kartu yang belum terlihat memuat angka `pip`. */
export function countUnseenWith(state: GameState, player: number, pip: number): number {
  return unseenTiles(state, player).filter((t) => t.a === pip || t.b === pip).length;
}
