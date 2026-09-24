/** Aturan catur lengkap, tanpa dependensi luar.
 *
 * Papan disimpan sebagai array 64 kotak dengan indeks 0 = a8 dan 63 = h1,
 * urutan yang sama dengan notasi FEN sehingga pembacaan FEN jadi lurus.
 * Seluruh fungsi di sini murni: `applyMove` mengembalikan posisi baru dan
 * tidak pernah mengubah posisi yang diberikan. */

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
}

/** Indeks kotak 0–63, 0 = a8. */
export type Square = number;

export interface CastlingRights {
  readonly wk: boolean;
  readonly wq: boolean;
  readonly bk: boolean;
  readonly bq: boolean;
}

export interface Move {
  readonly from: Square;
  readonly to: Square;
  /** Bidak yang dipromosikan, diisi hanya saat pion mencapai baris terakhir. */
  readonly promotion?: PieceType;
  readonly captured?: PieceType;
  readonly isEnPassant?: boolean;
  /** 'k' = rokade pendek (sisi raja), 'q' = rokade panjang (sisi menteri). */
  readonly isCastle?: 'k' | 'q';
}

export interface Position {
  readonly board: readonly (Piece | null)[];
  readonly turn: Color;
  readonly castling: CastlingRights;
  /** Kotak lintasan pion yang baru maju dua langkah, target en passant. */
  readonly epSquare: Square | null;
  readonly halfmove: number;
  readonly fullmove: number;
}

export type GameStatus =
  | 'playing'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'insufficient-material'
  | 'fifty-move';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const PROMOTION_CHOICES: readonly PieceType[] = ['q', 'r', 'b', 'n'];

export function fileOf(sq: Square): number {
  return sq % 8;
}

/** 0 = baris 8 (sisi hitam), 7 = baris 1 (sisi putih). */
export function rankOf(sq: Square): number {
  return Math.floor(sq / 8);
}

export function squareAt(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return rank * 8 + file;
}

export function squareName(sq: Square): string {
  return `${'abcdefgh'[fileOf(sq)]}${8 - rankOf(sq)}`;
}

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

function pieceFromChar(ch: string): Piece {
  const type = ch.toLowerCase() as PieceType;
  return { color: ch === ch.toUpperCase() ? 'w' : 'b', type };
}

function charFromPiece(piece: Piece): string {
  return piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
}

export function parseFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  const [placement, turn, castling, ep, halfmove, fullmove] = parts;
  if (!placement || !turn) throw new Error(`FEN tidak valid: ${fen}`);

  const board: (Piece | null)[] = new Array<Piece | null>(64).fill(null);
  let sq = 0;
  for (const ch of placement) {
    if (ch === '/') continue;
    if (/\d/.test(ch)) {
      sq += Number(ch);
      continue;
    }
    board[sq] = pieceFromChar(ch);
    sq += 1;
  }

  const rights = castling ?? '-';
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling: {
      wk: rights.includes('K'),
      wq: rights.includes('Q'),
      bk: rights.includes('k'),
      bq: rights.includes('q'),
    },
    epSquare: ep && ep !== '-' ? squareFromName(ep) : null,
    halfmove: Number(halfmove ?? 0),
    fullmove: Number(fullmove ?? 1),
  };
}

export function squareFromName(name: string): Square {
  const file = 'abcdefgh'.indexOf(name[0] ?? '');
  const rank = 8 - Number(name[1]);
  const sq = squareAt(file, rank);
  if (sq === null) throw new Error(`Nama kotak tidak valid: ${name}`);
  return sq;
}

export function toFen(pos: Position): string {
  let placement = '';
  for (let rank = 0; rank < 8; rank++) {
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = pos.board[rank * 8 + file];
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty > 0) {
        placement += String(empty);
        empty = 0;
      }
      placement += charFromPiece(piece);
    }
    if (empty > 0) placement += String(empty);
    if (rank < 7) placement += '/';
  }

  const c = pos.castling;
  const rights = `${c.wk ? 'K' : ''}${c.wq ? 'Q' : ''}${c.bk ? 'k' : ''}${c.bq ? 'q' : ''}` || '-';
  const ep = pos.epSquare === null ? '-' : squareName(pos.epSquare);
  return `${placement} ${pos.turn} ${rights} ${ep} ${pos.halfmove} ${pos.fullmove}`;
}

export function initialPosition(): Position {
  return parseFen(INITIAL_FEN);
}

const KNIGHT_DELTAS: readonly (readonly [number, number])[] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const BISHOP_DELTAS: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const ROOK_DELTAS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const KING_DELTAS: readonly (readonly [number, number])[] = [...BISHOP_DELTAS, ...ROOK_DELTAS];

function slidingDeltas(type: PieceType): readonly (readonly [number, number])[] {
  if (type === 'b') return BISHOP_DELTAS;
  if (type === 'r') return ROOK_DELTAS;
  return KING_DELTAS;
}

/** Arah maju pion: putih menuju baris 8 (indeks baris mengecil). */
function pawnDir(color: Color): number {
  return color === 'w' ? -1 : 1;
}

function startRank(color: Color): number {
  return color === 'w' ? 6 : 1;
}

function promotionRank(color: Color): number {
  return color === 'w' ? 0 : 7;
}

/** Apakah `sq` diserang oleh salah satu bidak `by`. Dipakai untuk deteksi
 * skak dan untuk melarang rokade melewati kotak yang diserang. */
export function isSquareAttacked(
  board: readonly (Piece | null)[],
  sq: Square,
  by: Color,
): boolean {
  const file = fileOf(sq);
  const rank = rankOf(sq);

  // Pion menyerang menyerong ke arah majunya, jadi dilihat terbalik dari sq.
  const pawnRank = rank + pawnDir(by) * -1;
  for (const df of [-1, 1]) {
    const target = squareAt(file + df, pawnRank);
    if (target === null) continue;
    const piece = board[target];
    if (piece && piece.color === by && piece.type === 'p') return true;
  }

  for (const [df, dr] of KNIGHT_DELTAS) {
    const target = squareAt(file + df, rank + dr);
    if (target === null) continue;
    const piece = board[target];
    if (piece && piece.color === by && piece.type === 'n') return true;
  }

  for (const [df, dr] of KING_DELTAS) {
    const target = squareAt(file + df, rank + dr);
    if (target === null) continue;
    const piece = board[target];
    if (piece && piece.color === by && piece.type === 'k') return true;
  }

  for (const [df, dr] of BISHOP_DELTAS) {
    if (scanRay(board, file, rank, df, dr, by, 'b')) return true;
  }
  for (const [df, dr] of ROOK_DELTAS) {
    if (scanRay(board, file, rank, df, dr, by, 'r')) return true;
  }
  return false;
}

/** Menelusuri satu arah sampai bertemu bidak; true bila bidak itu milik `by`
 * dan bertipe `type` atau menteri (yang menyerang ke segala arah). */
function scanRay(
  board: readonly (Piece | null)[],
  file: number,
  rank: number,
  df: number,
  dr: number,
  by: Color,
  type: PieceType,
): boolean {
  let f = file + df;
  let r = rank + dr;
  for (;;) {
    const target = squareAt(f, r);
    if (target === null) return false;
    const piece = board[target];
    if (piece) {
      return piece.color === by && (piece.type === type || piece.type === 'q');
    }
    f += df;
    r += dr;
  }
}

export function findKing(board: readonly (Piece | null)[], color: Color): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece && piece.color === color && piece.type === 'k') return sq;
  }
  return null;
}

export function isInCheck(pos: Position, color: Color = pos.turn): boolean {
  const king = findKing(pos.board, color);
  if (king === null) return false;
  return isSquareAttacked(pos.board, king, opposite(color));
}

function pushPawnMoves(moves: Move[], pos: Position, from: Square, color: Color): void {
  const board = pos.board;
  const file = fileOf(from);
  const rank = rankOf(from);
  const dir = pawnDir(color);

  const oneAhead = squareAt(file, rank + dir);
  if (oneAhead !== null && !board[oneAhead]) {
    addPawnMove(moves, from, oneAhead, color);
    if (rank === startRank(color)) {
      const twoAhead = squareAt(file, rank + dir * 2);
      if (twoAhead !== null && !board[twoAhead]) {
        moves.push({ from, to: twoAhead });
      }
    }
  }

  for (const df of [-1, 1]) {
    const target = squareAt(file + df, rank + dir);
    if (target === null) continue;
    const victim = board[target];
    if (victim && victim.color !== color) {
      addPawnMove(moves, from, target, color, victim.type);
    } else if (!victim && pos.epSquare === target) {
      moves.push({ from, to: target, captured: 'p', isEnPassant: true });
    }
  }
}

function addPawnMove(
  moves: Move[],
  from: Square,
  to: Square,
  color: Color,
  captured?: PieceType,
): void {
  if (rankOf(to) === promotionRank(color)) {
    for (const promotion of PROMOTION_CHOICES) {
      moves.push({ from, to, promotion, captured });
    }
    return;
  }
  moves.push({ from, to, captured });
}

function pushCastlingMoves(moves: Move[], pos: Position, color: Color): void {
  const board = pos.board;
  const kingSq = color === 'w' ? 60 : 4;
  if (board[kingSq]?.type !== 'k' || board[kingSq]?.color !== color) return;
  const enemy = opposite(color);
  if (isSquareAttacked(board, kingSq, enemy)) return;

  const canShort = color === 'w' ? pos.castling.wk : pos.castling.bk;
  const canLong = color === 'w' ? pos.castling.wq : pos.castling.bq;

  if (canShort) {
    const [f1, f2] = [kingSq + 1, kingSq + 2];
    const rookSq = kingSq + 3;
    if (
      !board[f1] &&
      !board[f2] &&
      board[rookSq]?.type === 'r' &&
      board[rookSq]?.color === color &&
      !isSquareAttacked(board, f1, enemy) &&
      !isSquareAttacked(board, f2, enemy)
    ) {
      moves.push({ from: kingSq, to: f2, isCastle: 'k' });
    }
  }

  if (canLong) {
    const [d1, d2, b1] = [kingSq - 1, kingSq - 2, kingSq - 3];
    const rookSq = kingSq - 4;
    if (
      !board[d1] &&
      !board[d2] &&
      !board[b1] &&
      board[rookSq]?.type === 'r' &&
      board[rookSq]?.color === color &&
      !isSquareAttacked(board, d1, enemy) &&
      !isSquareAttacked(board, d2, enemy)
    ) {
      moves.push({ from: kingSq, to: d2, isCastle: 'q' });
    }
  }
}

/** Langkah pseudo-legal: belum menyaring yang membuat raja sendiri terancam. */
function generatePseudoMoves(pos: Position): Move[] {
  const moves: Move[] = [];
  const color = pos.turn;

  for (let from = 0; from < 64; from++) {
    const piece = pos.board[from];
    if (!piece || piece.color !== color) continue;

    if (piece.type === 'p') {
      pushPawnMoves(moves, pos, from, color);
      continue;
    }

    const file = fileOf(from);
    const rank = rankOf(from);

    if (piece.type === 'n' || piece.type === 'k') {
      const deltas = piece.type === 'n' ? KNIGHT_DELTAS : KING_DELTAS;
      for (const [df, dr] of deltas) {
        const to = squareAt(file + df, rank + dr);
        if (to === null) continue;
        const victim = pos.board[to];
        if (victim && victim.color === color) continue;
        moves.push({ from, to, captured: victim?.type });
      }
      continue;
    }

    for (const [df, dr] of slidingDeltas(piece.type)) {
      let f = file + df;
      let r = rank + dr;
      for (;;) {
        const to = squareAt(f, r);
        if (to === null) break;
        const victim = pos.board[to];
        if (victim && victim.color === color) break;
        moves.push({ from, to, captured: victim?.type });
        if (victim) break;
        f += df;
        r += dr;
      }
    }
  }

  pushCastlingMoves(moves, pos, color);
  return moves;
}

/** Seluruh langkah sah untuk pihak yang sedang jalan. */
export function generateMoves(pos: Position): Move[] {
  const color = pos.turn;
  return generatePseudoMoves(pos).filter((move) => {
    const next = applyMove(pos, move);
    return !isInCheck(next, color);
  });
}

export function movesFrom(pos: Position, from: Square): Move[] {
  return generateMoves(pos).filter((move) => move.from === from);
}

function withoutRightsFor(rights: CastlingRights, sq: Square): CastlingRights {
  switch (sq) {
    case 63:
      return { ...rights, wk: false };
    case 56:
      return { ...rights, wq: false };
    case 7:
      return { ...rights, bk: false };
    case 0:
      return { ...rights, bq: false };
    default:
      return rights;
  }
}

export function applyMove(pos: Position, move: Move): Position {
  const board = [...pos.board];
  const piece = board[move.from];
  if (!piece) throw new Error(`Tidak ada bidak di ${squareName(move.from)}`);

  const color = piece.color;
  board[move.from] = null;
  board[move.to] = move.promotion ? { color, type: move.promotion } : piece;

  if (move.isEnPassant) {
    // Pion yang ditangkap ada di kotak sebaris dengan pion penangkap.
    const capturedSq = squareAt(fileOf(move.to), rankOf(move.from));
    if (capturedSq !== null) board[capturedSq] = null;
  }

  if (move.isCastle) {
    const rookFrom = move.isCastle === 'k' ? move.to + 1 : move.to - 2;
    const rookTo = move.isCastle === 'k' ? move.to - 1 : move.to + 1;
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }

  let castling = pos.castling;
  if (piece.type === 'k') {
    castling =
      color === 'w'
        ? { ...castling, wk: false, wq: false }
        : { ...castling, bk: false, bq: false };
  }
  castling = withoutRightsFor(castling, move.from);
  castling = withoutRightsFor(castling, move.to);

  const isDoublePawnPush =
    piece.type === 'p' && Math.abs(rankOf(move.to) - rankOf(move.from)) === 2;
  const epSquare = isDoublePawnPush
    ? squareAt(fileOf(move.from), (rankOf(move.from) + rankOf(move.to)) / 2)
    : null;

  const resetsClock = piece.type === 'p' || move.captured !== undefined;

  return {
    board,
    turn: opposite(color),
    castling,
    epSquare,
    halfmove: resetsClock ? 0 : pos.halfmove + 1,
    fullmove: color === 'b' ? pos.fullmove + 1 : pos.fullmove,
  };
}

/** Sisa materi yang tidak mungkin lagi menghasilkan skakmat. */
function hasInsufficientMaterial(board: readonly (Piece | null)[]): boolean {
  const minor: Piece[] = [];
  for (const piece of board) {
    if (!piece || piece.type === 'k') continue;
    if (piece.type === 'p' || piece.type === 'r' || piece.type === 'q') return false;
    minor.push(piece);
  }
  // Raja lawan raja, atau raja dengan satu gajah/kuda.
  return minor.length <= 1;
}

export function gameStatus(pos: Position): GameStatus {
  const hasMoves = generateMoves(pos).length > 0;
  const inCheck = isInCheck(pos);

  if (!hasMoves) return inCheck ? 'checkmate' : 'stalemate';
  if (hasInsufficientMaterial(pos.board)) return 'insufficient-material';
  if (pos.halfmove >= 100) return 'fifty-move';
  return inCheck ? 'check' : 'playing';
}

export function isGameOver(status: GameStatus): boolean {
  return status === 'checkmate' || status === 'stalemate' || status === 'insufficient-material' || status === 'fifty-move';
}

const SAN_LETTER: Record<PieceType, string> = { p: '', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };

/** Notasi aljabar pendek (mis. "Nf3", "exd5", "O-O", "Qxh7#") untuk daftar
 * riwayat langkah. Dihitung dari posisi SEBELUM langkah dijalankan. */
export function moveToSan(pos: Position, move: Move): string {
  if (move.isCastle) {
    const base = move.isCastle === 'k' ? 'O-O' : 'O-O-O';
    return base + checkSuffix(pos, move);
  }

  const piece = pos.board[move.from];
  if (!piece) return `${squareName(move.from)}${squareName(move.to)}`;

  const isCapture = move.captured !== undefined;
  let san = SAN_LETTER[piece.type];

  if (piece.type === 'p') {
    if (isCapture) san += 'abcdefgh'[fileOf(move.from)];
  } else {
    san += disambiguate(pos, move, piece);
  }

  if (isCapture) san += 'x';
  san += squareName(move.to);
  if (move.promotion) san += `=${SAN_LETTER[move.promotion] || 'Q'}`;
  return san + checkSuffix(pos, move);
}

/** Menambahkan petunjuk kolom/baris bila lebih dari satu bidak sejenis bisa
 * menuju kotak yang sama. */
function disambiguate(pos: Position, move: Move, piece: Piece): string {
  const rivals = generateMoves(pos).filter(
    (m) =>
      m.to === move.to &&
      m.from !== move.from &&
      pos.board[m.from]?.type === piece.type &&
      pos.board[m.from]?.color === piece.color,
  );
  if (rivals.length === 0) return '';

  const sameFile = rivals.some((m) => fileOf(m.from) === fileOf(move.from));
  const sameRank = rivals.some((m) => rankOf(m.from) === rankOf(move.from));
  if (!sameFile) return 'abcdefgh'[fileOf(move.from)] ?? '';
  if (!sameRank) return String(8 - rankOf(move.from));
  return squareName(move.from);
}

const SAN_PATTERN = /^([KQRBN])?([a-h])?([1-8])?x?([a-h][1-8])(?:=([QRBN]))?$/;

/** Kebalikan `moveToSan`: mencari langkah sah yang cocok dengan notasi.
 *
 * Dicocokkan berdasarkan bagian-bagian notasi (bidak, kotak asal bila ditulis,
 * kotak tujuan, promosi) dan bukan lewat perbandingan teks, supaya notasi dari
 * sumber lain yang menulis kotak asal lebih lengkap atau lebih ringkas dari
 * keluaran `moveToSan` tetap terbaca. Mengembalikan null bila tidak ada yang
 * cocok — dipakai untuk memeriksa keabsahan rekaman partai. */
export function findMoveBySan(pos: Position, san: string): Move | null {
  const cleaned = san.trim().replace(/[!?]+$/, '').replace(/[+#]+$/, '');
  const legal = generateMoves(pos);

  const castle = cleaned.replace(/0/g, 'O');
  if (castle === 'O-O' || castle === 'O-O-O') {
    const side = castle === 'O-O' ? 'k' : 'q';
    return legal.find((m) => m.isCastle === side) ?? null;
  }

  const match = SAN_PATTERN.exec(cleaned);
  if (!match) return null;

  const [, letter, fromFile, fromRank, target, promotion] = match;
  const type = (letter ?? 'P').toLowerCase() as PieceType;
  const to = squareFromName(target as string);

  const candidates = legal.filter((move) => {
    if (move.to !== to) return false;
    if (pos.board[move.from]?.type !== type) return false;
    if (fromFile && 'abcdefgh'[fileOf(move.from)] !== fromFile) return false;
    if (fromRank && String(8 - rankOf(move.from)) !== fromRank) return false;
    if (promotion) return move.promotion === promotion.toLowerCase();
    // Tanpa keterangan promosi, promosi menteri dipakai sebagai bawaan.
    return move.promotion === undefined || move.promotion === 'q';
  });

  return candidates[0] ?? null;
}

function checkSuffix(pos: Position, move: Move): string {
  const next = applyMove(pos, move);
  if (!isInCheck(next)) return '';
  return generateMoves(next).length === 0 ? '#' : '+';
}
