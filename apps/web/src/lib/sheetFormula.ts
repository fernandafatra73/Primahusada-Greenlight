/**
 * Mesin rumus untuk lembar "Excel" Hasil Perbulan.
 *
 * Operator: + - * / ^ & % dan perbandingan (= <> < > <= >=), tanda kurung.
 * Operand: angka, "teks", TRUE/FALSE, sel (B2, $B$2), rentang (B2:M2) dan
 * referensi sheet lain (Sheet2!B2, 'Nama Sheet'!B2:C5).
 * Fungsi: SUM AVERAGE MIN MAX COUNT COUNTA ROUND ABS IF IFERROR AND OR NOT
 * SUMIF COUNTIF VLOOKUP CONCATENATE CONCAT TEXT LEN UPPER LOWER.
 */

export type SheetCells = Readonly<Record<string, string>>;
export type SheetError = '#REF!' | '#DIV/0!' | '#VALUE!' | '#NAME?' | '#ERR!' | '#CIRC!' | '#N/A';
export type SheetValue = number | string | boolean | SheetError;

const ERRORS: ReadonlySet<string> = new Set(['#REF!', '#DIV/0!', '#VALUE!', '#NAME?', '#ERR!', '#CIRC!', '#N/A']);

export function isSheetError(v: unknown): v is SheetError {
  return typeof v === 'string' && ERRORS.has(v);
}

export function columnLabel(index: number): string {
  let n = index + 1;
  let label = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export function columnIndex(label: string): number {
  let n = 0;
  for (const ch of label) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function cellKey(col: number, row: number): string {
  return `${columnLabel(col)}${row + 1}`;
}

/** Memecah alamat "B12" menjadi kolom dan baris berbasis 0; null bila bukan alamat sel. */
export function parseCellKey(key: string): { readonly col: number; readonly row: number } | null {
  const m = /^([A-Z]{1,3})([1-9]\d{0,4})$/.exec(key);
  return m ? { col: columnIndex(m[1]!), row: Number(m[2]) - 1 } : null;
}

// ---------------------------------------------------------------- tokenizer

type Token =
  | { readonly t: 'num'; readonly v: number }
  | { readonly t: 'str'; readonly v: string }
  | { readonly t: 'bool'; readonly v: boolean }
  | { readonly t: 'err'; readonly v: SheetError }
  | {
      readonly t: 'ref';
      readonly sheet: string | null;
      readonly c1: number;
      readonly r1: number;
      readonly c2: number | null;
      readonly r2: number | null;
    }
  | { readonly t: 'func'; readonly v: string }
  | { readonly t: 'op'; readonly v: string };

const TOKEN_RE = new RegExp(
  [
    String.raw`\s*(?:`,
    String.raw`(#REF!|#N/A|#DIV/0!|#VALUE!|#NAME\?)`, // 1 error literal
    String.raw`|"((?:[^"]|"")*)"`, // 2 string
    String.raw`|(\d+(?:\.\d+)?|\.\d+)`, // 3 number
    String.raw`|((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_]*)!)?\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?(?![A-Za-z0-9_(])`, // 4-8 ref
    String.raw`|([A-Za-z_][A-Za-z0-9_.]*)(?=\()`, // 9 function
    String.raw`|(TRUE|FALSE)(?![A-Za-z0-9_(])`, // 10 boolean
    String.raw`|(<>|<=|>=|[-+*/^&%=<>(),;])`, // 11 operator
    String.raw`)`,
  ].join(''),
  'y',
);

function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  const re = new RegExp(TOKEN_RE.source, 'y');
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) return null;
    pos = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ t: 'err', v: m[1] as SheetError });
    else if (m[2] !== undefined) tokens.push({ t: 'str', v: m[2].replace(/""/g, '"') });
    else if (m[3] !== undefined) tokens.push({ t: 'num', v: Number(m[3]) });
    else if (m[5] !== undefined) {
      const awalan = m[4];
      tokens.push({
        t: 'ref',
        sheet: awalan === undefined ? null : bukaKutip(awalan.slice(0, -1)),
        c1: columnIndex(m[5]),
        r1: Number(m[6]) - 1,
        c2: m[7] === undefined ? null : columnIndex(m[7]),
        r2: m[8] === undefined ? null : Number(m[8]) - 1,
      });
    } else if (m[9] !== undefined) tokens.push({ t: 'func', v: m[9].toUpperCase() });
    else if (m[10] !== undefined) tokens.push({ t: 'bool', v: m[10] === 'TRUE' });
    else if (m[11] !== undefined) tokens.push({ t: 'op', v: m[11] });
  }
  return tokens;
}

function bukaKutip(nama: string): string {
  return nama.startsWith("'") ? nama.slice(1, -1).replace(/''/g, "'") : nama;
}

// ------------------------------------------------------------------- parser

type Node =
  | { readonly k: 'num'; readonly v: number }
  | { readonly k: 'str'; readonly v: string }
  | { readonly k: 'bool'; readonly v: boolean }
  | { readonly k: 'err'; readonly v: SheetError }
  | { readonly k: 'ref'; readonly sheet: string | null; readonly c: number; readonly r: number }
  | {
      readonly k: 'range';
      readonly sheet: string | null;
      readonly c1: number;
      readonly r1: number;
      readonly c2: number;
      readonly r2: number;
    }
  | { readonly k: 'neg'; readonly e: Node }
  | { readonly k: 'pct'; readonly e: Node }
  | { readonly k: 'bin'; readonly op: string; readonly l: Node; readonly r: Node }
  | { readonly k: 'call'; readonly name: string; readonly args: readonly Node[] };

class ParseError extends Error {}

class Parser {
  private i = 0;
  constructor(private readonly tokens: readonly Token[]) {}

  atEnd(): boolean {
    return this.i >= this.tokens.length;
  }

  private isOp(...ops: string[]): boolean {
    const t = this.tokens[this.i];
    return t?.t === 'op' && ops.includes(t.v);
  }

  private takeOp(): string {
    return (this.tokens[this.i++] as { readonly v: string }).v;
  }

  parseExpression(): Node {
    let left = this.parseConcat();
    while (this.isOp('=', '<>', '<', '>', '<=', '>=')) {
      left = { k: 'bin', op: this.takeOp(), l: left, r: this.parseConcat() };
    }
    return left;
  }

  private parseConcat(): Node {
    let left = this.parseAdd();
    while (this.isOp('&')) left = { k: 'bin', op: this.takeOp(), l: left, r: this.parseAdd() };
    return left;
  }

  private parseAdd(): Node {
    let left = this.parseMul();
    while (this.isOp('+', '-')) left = { k: 'bin', op: this.takeOp(), l: left, r: this.parseMul() };
    return left;
  }

  private parseMul(): Node {
    let left = this.parsePower();
    while (this.isOp('*', '/')) left = { k: 'bin', op: this.takeOp(), l: left, r: this.parsePower() };
    return left;
  }

  private parsePower(): Node {
    let left = this.parseUnary();
    while (this.isOp('^')) left = { k: 'bin', op: this.takeOp(), l: left, r: this.parseUnary() };
    return left;
  }

  private parseUnary(): Node {
    if (this.isOp('-')) {
      this.i++;
      return { k: 'neg', e: this.parseUnary() };
    }
    if (this.isOp('+')) {
      this.i++;
      return this.parseUnary();
    }
    let node = this.parsePrimary();
    while (this.isOp('%')) {
      this.i++;
      node = { k: 'pct', e: node };
    }
    return node;
  }

  private parsePrimary(): Node {
    const tok = this.tokens[this.i++];
    if (!tok) throw new ParseError();
    switch (tok.t) {
      case 'num':
        return { k: 'num', v: tok.v };
      case 'str':
        return { k: 'str', v: tok.v };
      case 'bool':
        return { k: 'bool', v: tok.v };
      case 'err':
        return { k: 'err', v: tok.v };
      case 'ref':
        return tok.c2 === null || tok.r2 === null
          ? { k: 'ref', sheet: tok.sheet, c: tok.c1, r: tok.r1 }
          : { k: 'range', sheet: tok.sheet, c1: tok.c1, r1: tok.r1, c2: tok.c2, r2: tok.r2 };
      case 'func':
        return this.parseCall(tok.v);
      case 'op': {
        if (tok.v !== '(') throw new ParseError();
        const inner = this.parseExpression();
        if (!this.isOp(')')) throw new ParseError();
        this.i++;
        return inner;
      }
    }
  }

  private parseCall(name: string): Node {
    if (!this.isOp('(')) throw new ParseError();
    this.i++;
    const args: Node[] = [];
    if (!this.isOp(')')) {
      args.push(this.parseExpression());
      while (this.isOp(',', ';')) {
        this.i++;
        args.push(this.parseExpression());
      }
    }
    if (!this.isOp(')')) throw new ParseError();
    this.i++;
    return { k: 'call', name, args };
  }
}

// ---------------------------------------------------------------- evaluator

class FormulaError extends Error {
  constructor(readonly code: SheetError) {
    super(code);
  }
}

/** Isi sebuah rentang; sel satu-satunya juga dibungkus agar fungsi memperlakukannya seragam. */
interface Matrix {
  readonly matrix: readonly (readonly SheetValue[])[];
}

type Evaled = SheetValue | Matrix;

function isMatrix(v: Evaled): v is Matrix {
  return typeof v === 'object';
}

export interface SheetInput {
  readonly name: string;
  readonly cells: SheetCells;
}

const UKURAN_RENTANG_MAKS = 200_000;

function parseNumberText(raw: string): number | null {
  if (raw.trim() === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function toNumber(v: SheetValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (isSheetError(v)) throw new FormulaError(v);
  if (v.trim() === '') return 0;
  const n = parseNumberText(v);
  if (n === null) throw new FormulaError('#VALUE!');
  return n;
}

function toText(v: SheetValue): string {
  if (isSheetError(v)) throw new FormulaError(v);
  return formatSheetValue(v);
}

function toBool(v: SheetValue): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (isSheetError(v)) throw new FormulaError(v);
  const u = v.toUpperCase();
  if (u === 'TRUE') return true;
  if (u === 'FALSE' || v === '') return false;
  throw new FormulaError('#VALUE!');
}

function urutanTipe(v: SheetValue): number {
  if (typeof v === 'number') return 0;
  if (typeof v === 'string') return 1;
  return 2;
}

function bandingkan(a: SheetValue, b: SheetValue): number {
  // Sel kosong ikut tipe pasangannya, seperti di Excel.
  const x = a === '' && typeof b === 'number' ? 0 : a;
  const y = b === '' && typeof a === 'number' ? 0 : b;
  const tx = urutanTipe(x);
  const ty = urutanTipe(y);
  if (tx !== ty) return tx - ty;
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  if (typeof x === 'string' && typeof y === 'string') {
    const lx = x.toLowerCase();
    const ly = y.toLowerCase();
    return lx < ly ? -1 : lx > ly ? 1 : 0;
  }
  return Number(x) - Number(y);
}

function polaWildcard(pola: string): RegExp {
  const escaped = pola.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

function cocokKriteria(sel: SheetValue, kriteria: SheetValue): boolean {
  let op = '=';
  let operand: SheetValue = kriteria;
  if (typeof kriteria === 'string') {
    const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(kriteria)!;
    op = m[1] ?? '=';
    const sisa = m[2]!;
    operand = parseNumberText(sisa) ?? sisa;
  }
  if (op === '=' || op === '<>') {
    let sama: boolean;
    if (typeof operand === 'number') sama = typeof sel === 'number' && sel === operand;
    else if (typeof operand === 'boolean') sama = sel === operand;
    else sama = polaWildcard(operand).test(typeof sel === 'string' ? sel : formatSheetValue(sel));
    return op === '=' ? sama : !sama;
  }
  if (typeof operand !== 'number' || typeof sel !== 'number') return false;
  if (op === '<') return sel < operand;
  if (op === '>') return sel > operand;
  if (op === '<=') return sel <= operand;
  return sel >= operand;
}

/** Pola angka sederhana untuk TEXT(): 0, 0.00, #,##0, #,##0.00, 0%, 0.0% dengan awalan/akhiran teks. */
export function formatPolaAngka(n: number, pola: string): string {
  const m = /^([^#0,.%]*)([#0,]*)(?:\.([#0]*))?(%?)([^#0,.%]*)$/.exec(pola);
  if (!m || (m[2] === '' && m[3] === undefined)) return pola;
  const desimal = (m[3] ?? '').length;
  const persen = m[4] === '%';
  const nilai = persen ? n * 100 : n;
  const angka = nilai.toLocaleString('id-ID', {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
    useGrouping: (m[2] ?? '').includes(','),
  });
  return `${m[1]}${angka}${persen ? '%' : ''}${m[5]}`;
}

export function evaluateWorkbook(sheets: readonly SheetInput[]): readonly Map<string, SheetValue>[] {
  const results = sheets.map(() => new Map<string, SheetValue>());
  const visiting = new Set<string>();
  const indexByName = new Map(sheets.map((s, i) => [s.name.toLowerCase(), i]));

  function sheetIndex(name: string | null, current: number): number {
    if (name === null) return current;
    const idx = indexByName.get(name.toLowerCase());
    if (idx === undefined) throw new FormulaError('#REF!');
    return idx;
  }

  function valueOf(sheet: number, key: string): SheetValue {
    const cache = results[sheet]!;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const token = `${sheet}|${key}`;
    if (visiting.has(token)) return '#CIRC!';
    visiting.add(token);
    let value: SheetValue;
    try {
      value = compute(sheets[sheet]!.cells[key] ?? '', sheet);
    } finally {
      visiting.delete(token);
    }
    cache.set(key, value);
    return value;
  }

  function compute(raw: string, sheet: number): SheetValue {
    if (!raw.startsWith('=')) return parseNumberText(raw) ?? raw;
    const tokens = tokenize(raw.slice(1));
    if (!tokens || tokens.length === 0) return '#ERR!';
    try {
      const parser = new Parser(tokens);
      const ast = parser.parseExpression();
      if (!parser.atEnd()) return '#ERR!';
      const out = evalNode(ast, sheet);
      if (isMatrix(out)) return '#VALUE!';
      // Rumus yang hanya menunjuk sel kosong menampilkan 0, seperti di Excel.
      if (ast.k === 'ref' && out === '') return 0;
      return typeof out === 'number' && !Number.isFinite(out) ? '#VALUE!' : out;
    } catch (err) {
      if (err instanceof ParseError) return '#ERR!';
      if (err instanceof FormulaError) return err.code;
      throw err;
    }
  }

  function rangeMatrix(node: Extract<Node, { k: 'range' }>, current: number): Matrix {
    const sheet = sheetIndex(node.sheet, current);
    const rowFrom = Math.min(node.r1, node.r2);
    const rowTo = Math.max(node.r1, node.r2);
    const colFrom = Math.min(node.c1, node.c2);
    const colTo = Math.max(node.c1, node.c2);
    if ((rowTo - rowFrom + 1) * (colTo - colFrom + 1) > UKURAN_RENTANG_MAKS) throw new FormulaError('#REF!');
    const matrix: SheetValue[][] = [];
    for (let r = rowFrom; r <= rowTo; r++) {
      const line: SheetValue[] = [];
      for (let c = colFrom; c <= colTo; c++) line.push(valueOf(sheet, cellKey(c, r)));
      matrix.push(line);
    }
    return { matrix };
  }

  /** Hasil sel tunggal yang berisi error melempar error tersebut (konteks skalar). */
  function scalarOf(v: Evaled): SheetValue {
    if (isMatrix(v)) {
      if (v.matrix.length === 1 && v.matrix[0]!.length === 1) return v.matrix[0]![0]!;
      throw new FormulaError('#VALUE!');
    }
    return v;
  }

  function evalScalar(node: Node, sheet: number): SheetValue {
    const v = scalarOf(evalNode(node, sheet));
    if (isSheetError(v)) throw new FormulaError(v);
    return v;
  }

  /** Argumen fungsi: sel dan rentang tetap berupa matriks agar fungsi bisa menyaring teks/error. */
  function evalArg(node: Node, sheet: number): Evaled {
    if (node.k === 'ref') {
      const target = sheetIndex(node.sheet, sheet);
      return { matrix: [[valueOf(target, cellKey(node.c, node.r))]] };
    }
    return evalNode(node, sheet);
  }

  function evalNode(node: Node, sheet: number): Evaled {
    switch (node.k) {
      case 'num':
      case 'str':
      case 'bool':
        return node.v;
      case 'err':
        throw new FormulaError(node.v);
      case 'ref': {
        const v = valueOf(sheetIndex(node.sheet, sheet), cellKey(node.c, node.r));
        if (isSheetError(v)) throw new FormulaError(v);
        return v;
      }
      case 'range':
        return rangeMatrix(node, sheet);
      case 'neg':
        return -toNumber(evalScalar(node.e, sheet));
      case 'pct':
        return toNumber(evalScalar(node.e, sheet)) / 100;
      case 'bin':
        return evalBinary(node.op, evalScalar(node.l, sheet), evalScalar(node.r, sheet));
      case 'call':
        return evalCall(node.name, node.args, sheet);
    }
  }

  function evalBinary(op: string, l: SheetValue, r: SheetValue): SheetValue {
    switch (op) {
      case '+': return toNumber(l) + toNumber(r);
      case '-': return toNumber(l) - toNumber(r);
      case '*': return toNumber(l) * toNumber(r);
      case '/': {
        const d = toNumber(r);
        if (d === 0) throw new FormulaError('#DIV/0!');
        return toNumber(l) / d;
      }
      case '^': return toNumber(l) ** toNumber(r);
      case '&': return toText(l) + toText(r);
      case '=': return bandingkan(l, r) === 0;
      case '<>': return bandingkan(l, r) !== 0;
      case '<': return bandingkan(l, r) < 0;
      case '>': return bandingkan(l, r) > 0;
      case '<=': return bandingkan(l, r) <= 0;
      case '>=': return bandingkan(l, r) >= 0;
      default: throw new FormulaError('#ERR!');
    }
  }

  /** Angka dari argumen: teks/boolean/sel kosong di dalam rentang diabaikan, error dilempar. */
  function angkaDari(args: readonly Evaled[]): number[] {
    const out: number[] = [];
    for (const a of args) {
      if (isMatrix(a)) {
        for (const line of a.matrix) {
          for (const v of line) {
            if (isSheetError(v)) throw new FormulaError(v);
            if (typeof v === 'number') out.push(v);
          }
        }
      } else {
        out.push(toNumber(a));
      }
    }
    return out;
  }

  function nilaiDari(args: readonly Evaled[]): SheetValue[] {
    const out: SheetValue[] = [];
    for (const a of args) {
      if (isMatrix(a)) for (const line of a.matrix) out.push(...line);
      else out.push(a);
    }
    return out;
  }

  function evalCall(name: string, argNodes: readonly Node[], sheet: number): Evaled {
    // IF dan IFERROR hanya menghitung cabang yang dipakai.
    if (name === 'IF') {
      if (argNodes.length < 2 || argNodes.length > 3) throw new FormulaError('#VALUE!');
      if (toBool(evalScalar(argNodes[0]!, sheet))) return evalScalar(argNodes[1]!, sheet);
      return argNodes[2] ? evalScalar(argNodes[2], sheet) : false;
    }
    if (name === 'IFERROR') {
      if (argNodes.length !== 2) throw new FormulaError('#VALUE!');
      try {
        return evalScalar(argNodes[0]!, sheet);
      } catch (err) {
        if (err instanceof FormulaError) return evalScalar(argNodes[1]!, sheet);
        throw err;
      }
    }

    const args = argNodes.map((n) => evalArg(n, sheet));
    const butuh = (min: number, max: number) => {
      if (args.length < min || args.length > max) throw new FormulaError('#VALUE!');
    };
    const skalar = (i: number): SheetValue => {
      const v = scalarOf(args[i]!);
      if (isSheetError(v)) throw new FormulaError(v);
      return v;
    };

    switch (name) {
      case 'SUM':
        return angkaDari(args).reduce((s, v) => s + v, 0);
      case 'AVERAGE': {
        const nums = angkaDari(args);
        if (nums.length === 0) throw new FormulaError('#DIV/0!');
        return nums.reduce((s, v) => s + v, 0) / nums.length;
      }
      case 'MIN': {
        const nums = angkaDari(args);
        return nums.length === 0 ? 0 : Math.min(...nums);
      }
      case 'MAX': {
        const nums = angkaDari(args);
        return nums.length === 0 ? 0 : Math.max(...nums);
      }
      case 'COUNT':
        return nilaiDari(args).filter((v) => typeof v === 'number').length;
      case 'COUNTA':
        return nilaiDari(args).filter((v) => v !== '').length;
      case 'ABS':
        butuh(1, 1);
        return Math.abs(toNumber(skalar(0)));
      case 'ROUND': {
        butuh(1, 2);
        const faktor = 10 ** (args.length === 2 ? toNumber(skalar(1)) : 0);
        return Math.round(toNumber(skalar(0)) * faktor) / faktor;
      }
      case 'AND':
      case 'OR': {
        const semua = nilaiDari(args).filter((v) => typeof v === 'boolean' || typeof v === 'number' || isSheetError(v));
        if (semua.length === 0) throw new FormulaError('#VALUE!');
        const bools = semua.map(toBool);
        return name === 'AND' ? bools.every(Boolean) : bools.some(Boolean);
      }
      case 'NOT':
        butuh(1, 1);
        return !toBool(skalar(0));
      case 'SUMIF':
      case 'COUNTIF': {
        const rentang = args[0];
        if (!rentang || !isMatrix(rentang)) throw new FormulaError('#VALUE!');
        const sumber = name === 'SUMIF' && args[2] ? args[2] : rentang;
        if (!isMatrix(sumber)) throw new FormulaError('#VALUE!');
        butuh(2, name === 'SUMIF' ? 3 : 2);
        const kriteria = skalar(1);
        let total = 0;
        rentang.matrix.forEach((line, r) =>
          line.forEach((sel, c) => {
            if (!cocokKriteria(sel, kriteria)) return;
            if (name === 'COUNTIF') total += 1;
            else {
              const nilai = sumber.matrix[r]?.[c];
              if (typeof nilai === 'number') total += nilai;
            }
          }),
        );
        return total;
      }
      case 'VLOOKUP': {
        butuh(3, 4);
        const tabel = args[1];
        if (!tabel || !isMatrix(tabel)) throw new FormulaError('#VALUE!');
        const kunci = skalar(0);
        const kolom = Math.trunc(toNumber(skalar(2)));
        if (kolom < 1 || kolom > (tabel.matrix[0]?.length ?? 0)) throw new FormulaError('#REF!');
        const tepat = args.length === 4 ? !toBool(skalar(3)) : false;
        let ketemu: readonly SheetValue[] | undefined;
        if (tepat) {
          ketemu = tabel.matrix.find((line) => bandingkan(line[0]!, kunci) === 0);
        } else {
          // Pencocokan perkiraan: baris terakhir yang kolom pertamanya <= kunci (tabel terurut naik).
          for (const line of tabel.matrix) {
            if (bandingkan(line[0]!, kunci) <= 0) ketemu = line;
            else break;
          }
        }
        if (!ketemu) throw new FormulaError('#N/A');
        const hasil = ketemu[kolom - 1]!;
        if (isSheetError(hasil)) throw new FormulaError(hasil);
        return hasil;
      }
      case 'CONCATENATE':
      case 'CONCAT':
        return nilaiDari(args).map(toText).join('');
      case 'TEXT': {
        butuh(2, 2);
        const v = skalar(0);
        const pola = toText(skalar(1));
        return typeof v === 'number' ? formatPolaAngka(v, pola) : toText(v);
      }
      case 'LEN':
        butuh(1, 1);
        return toText(skalar(0)).length;
      case 'UPPER':
        butuh(1, 1);
        return toText(skalar(0)).toUpperCase();
      case 'LOWER':
        butuh(1, 1);
        return toText(skalar(0)).toLowerCase();
      default:
        throw new FormulaError('#NAME?');
    }
  }

  sheets.forEach((s, i) => {
    for (const key of Object.keys(s.cells)) valueOf(i, key);
  });
  return results;
}

/** Evaluasi satu sheet saja (tanpa referensi ke sheet lain). */
export function evaluateSheet(cells: SheetCells): Map<string, SheetValue> {
  return evaluateWorkbook([{ name: 'Sheet1', cells }])[0]!;
}

/** Teks polos sebuah nilai sel (dipakai untuk salin ke clipboard dan CONCAT); sel kosong menjadi ''. */
export function formatSheetValue(v: SheetValue | undefined): string {
  if (v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  return v;
}
