/** Lawan komputer dan analisa langkah untuk permainan Gaplek.
 *
 * Analisa sengaja dibuat bisa dijelaskan: setiap langkah diberi nilai dari
 * beberapa pertimbangan yang masing-masing punya alasan dalam bahasa manusia,
 * bukan satu angka gelap dari mesin. */

import {
  MAX_PIP,
  applyMove,
  countUnseenWith,
  handPips,
  legalMoves,
  openEnds,
  tilePips,
  unseenTiles,
  type GameState,
  type Move,
  type Tile,
} from './gaplek.ts';

/** Papan baru dianggap belum layak dianalisa; analisa disajikan setelah
 * sedikitnya dua kartu terpasang, saat kedua ujung sudah terbentuk. */
export const MIN_PLACED_FOR_ANALYSIS = 2;

export interface MoveAnalysis {
  readonly move: Move;
  readonly tile: Tile;
  readonly score: number;
  /** Alasan singkat, sudah berbahasa Indonesia dan siap ditampilkan. */
  readonly reasons: readonly string[];
  /** Ujung papan setelah langkah ini dijalankan. */
  readonly endsAfter: readonly number[];
  /** Berapa kartu tak terlihat yang masih bisa menyambung ujung-ujung itu. */
  readonly opponentOuts: number;
  /** Berapa kartu kita sendiri yang masih menyambung setelah langkah ini. */
  readonly ownFollowUps: number;
}

function tileLabel(tile: Tile): string {
  return `${tile.a}|${tile.b}`;
}

/** Banyaknya kartu di tangan yang masih bisa menyambung salah satu ujung. */
function followUps(hand: readonly Tile[], ends: readonly number[]): number {
  return hand.filter((t) => ends.some((e) => t.a === e || t.b === e)).length;
}

/** Menilai satu langkah dari sudut pandang `player`.
 *
 * Empat pertimbangan, dari yang paling berpengaruh:
 * membuang mata besar lebih dulu, menjaga agar kita sendiri tetap punya
 * sambungan, mempersempit sambungan lawan, dan menahan kartu balak terlalu
 * lama karena balak paling sulit dibuang di akhir. */
export function analyseMove(state: GameState, move: Move): MoveAnalysis {
  const player = state.turn;
  const hand = state.hands[player] ?? [];
  const tile = hand[move.tileIndex] as Tile;

  const next = applyMove(state, move);
  const endsAfter = openEnds(next);
  const handAfter = next.hands[player] ?? [];

  const opponentOuts = endsAfter.reduce(
    (sum, end) => sum + countUnseenWith(next, player, end),
    0,
  );
  const ownFollowUps = followUps(handAfter, endsAfter);

  const reasons: string[] = [];
  let score = 0;

  const pips = tilePips(tile);
  score += pips * 2;
  if (pips >= 9) reasons.push(`Membuang kartu bermata besar (${pips}) selagi masih bisa.`);

  score += ownFollowUps * 8;
  if (ownFollowUps === 0 && handAfter.length > 0) {
    reasons.push('Setelah ini Anda tidak punya sambungan sendiri — berisiko kena pas.');
    score -= 25;
  } else if (ownFollowUps >= 2) {
    reasons.push(`Anda masih punya ${ownFollowUps} kartu penyambung sesudahnya.`);
  }

  score -= opponentOuts * 2;
  if (opponentOuts <= 4) {
    reasons.push(`Ujung papan jadi sempit — tinggal ${opponentOuts} kartu lawan yang cocok.`);
  }

  if (tile.a === tile.b) {
    score += 6;
    reasons.push('Balak dibuang lebih awal, karena balak paling sulit keluar di akhir.');
  }

  if (handAfter.length === 0) {
    score += 1000;
    reasons.push('Kartu Anda habis — ronde ini langsung menang.');
  }

  if (reasons.length === 0) reasons.push('Langkah aman, tidak banyak mengubah keadaan papan.');

  return { move, tile, score, reasons, endsAfter, opponentOuts, ownFollowUps };
}

export interface Analysis {
  readonly available: boolean;
  /** Alasan analisa belum bisa disajikan, bila `available` false. */
  readonly note: string;
  readonly ranked: readonly MoveAnalysis[];
}

/** Analisa seluruh langkah pemain yang sedang giliran, terbaik lebih dulu. */
export function analysePosition(state: GameState): Analysis {
  if (state.placed.length < MIN_PLACED_FOR_ANALYSIS) {
    return {
      available: false,
      note: `Analisa muncul setelah ${MIN_PLACED_FOR_ANALYSIS} kartu terpasang di papan.`,
      ranked: [],
    };
  }

  const moves = legalMoves(state);
  if (moves.length === 0) {
    return { available: false, note: 'Tidak ada kartu yang cocok — Anda harus pas.', ranked: [] };
  }

  const ranked = moves.map((move) => analyseMove(state, move)).sort((a, b) => b.score - a.score);
  return { available: true, note: '', ranked };
}

/** Ringkasan keadaan papan untuk ditampilkan di panel analisa. */
export interface BoardInsight {
  readonly ends: readonly number[];
  /** Untuk tiap angka 0–6, berapa kartu tak terlihat yang memuatnya. */
  readonly unseenByPip: readonly number[];
  readonly unseenCount: number;
  readonly myPips: number;
}

export function boardInsight(state: GameState, player: number): BoardInsight {
  const unseen = unseenTiles(state, player);
  const unseenByPip: number[] = [];
  for (let pip = 0; pip <= MAX_PIP; pip++) {
    unseenByPip.push(unseen.filter((t) => t.a === pip || t.b === pip).length);
  }
  return {
    ends: openEnds(state),
    unseenByPip,
    unseenCount: unseen.length,
    myPips: handPips(state.hands[player] ?? []),
  };
}

/** Langkah pilihan komputer. Memakai penilaian yang sama dengan analisa,
 * jadi lawan bermain dengan pertimbangan yang bisa dijelaskan juga. */
export function chooseMove(state: GameState): Move | null {
  const moves = legalMoves(state);
  if (moves.length === 0) return null;

  let best = analyseMove(state, moves[0] as Move);
  for (const move of moves.slice(1)) {
    const candidate = analyseMove(state, move);
    if (candidate.score > best.score) best = candidate;
  }
  return best.move;
}

export { tileLabel };
