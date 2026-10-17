/**
 * Mesin rumus kecil untuk grid "Excel" Hasil Perbulan.
 * Mendukung angka, + - * / ^, tanda kurung, referensi sel (B2), rentang (B2:M2) dan
 * fungsi SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS.
 */

export type SheetCells = Readonly<Record<string, string>>;
export type SheetError = '#REF!' | '#DIV/0!' | '#VALUE!' | '#NAME?' | '#ERR!' | '#CIRC!';
export type SheetValue = number | string | SheetError;

const ERRORS: ReadonlySet<string> = new Set(['#REF!', '#DIV/0!', '#VALUE!', '#NAME?', '#ERR!', '#CIRC!']);

export function isSheetError(v: SheetValue): v is SheetError {
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

interface CellRef {
  readonly col: number;
  readonly row: number;
}

function parseRef(text: string): CellRef | null {
  const m = /^([A-Z]{1,3})(\d{1,5})$/.exec(text);
  if (!m) return null;
  return { col: columnIndex(m[1]!), row: Number(m[2]) - 1 };
}

type Token =
  | { readonly t: 'num'; readonly v: number }
  | { readonly t: 'ref'; readonly v: string }
  | { readonly t: 'range'; readonly v: string }
  | { readonly t: 'name'; readonly v: string }
  | { readonly t: 'op'; readonly v: string };

const TOKEN_RE =
  /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Z]{1,3}\d{1,5}:[A-Z]{1,3}\d{1,5})|([A-Z]{1,3}\d{1,5})(?![A-Za-z(])|([A-Za-z]+)(?=\()|([-+*/^(),]))/y;

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
    if (m[1] !== undefined) tokens.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) tokens.push({ t: 'range', v: m[2] });
    else if (m[3] !== undefined) tokens.push({ t: 'ref', v: m[3] });
    else if (m[4] !== undefined) tokens.push({ t: 'name', v: m[4].toUpperCase() });
    else if (m[5] !== undefined) tokens.push({ t: 'op', v: m[5] });
  }
  return tokens;
}

type RangeItem = number | SheetError;
/** Argumen fungsi: angka tunggal, error, atau daftar nilai dari sebuah rentang. */
type Arg = number | SheetError | readonly RangeItem[];

class FormulaError extends Error {
  constructor(readonly code: SheetError) {
    super(code);
  }
}

function parseNumberText(raw: string): number | null {
  if (raw.trim() === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function isList(a: Arg): a is readonly RangeItem[] {
  return Array.isArray(a);
}

function scalar(a: Arg): number {
  if (isList(a)) throw new FormulaError('#VALUE!');
  if (typeof a === 'string') throw new FormulaError(a);
  return a;
}

function flatten(args: readonly Arg[]): number[] {
  const out: number[] = [];
  for (const a of args) {
    const items: readonly RangeItem[] = isList(a) ? a : [a];
    for (const v of items) {
      if (typeof v === 'string') throw new FormulaError(v);
      out.push(v);
    }
  }
  return out;
}

function applyFunction(name: string, args: readonly Arg[]): number {
  const nums = flatten(args);
  switch (name) {
    case 'SUM':
      return nums.reduce((s, v) => s + v, 0);
    case 'AVERAGE':
      if (nums.length === 0) throw new FormulaError('#DIV/0!');
      return nums.reduce((s, v) => s + v, 0) / nums.length;
    case 'MIN':
      return nums.length === 0 ? 0 : Math.min(...nums);
    case 'MAX':
      return nums.length === 0 ? 0 : Math.max(...nums);
    case 'COUNT':
      return nums.length;
    case 'ABS':
      if (nums.length !== 1) throw new FormulaError('#VALUE!');
      return Math.abs(nums[0]!);
    case 'ROUND': {
      if (nums.length < 1 || nums.length > 2) throw new FormulaError('#VALUE!');
      const factor = 10 ** (nums[1] ?? 0);
      return Math.round(nums[0]! * factor) / factor;
    }
    default:
      throw new FormulaError('#NAME?');
  }
}

export function evaluateSheet(cells: SheetCells): Map<string, SheetValue> {
  const results = new Map<string, SheetValue>();
  const visiting = new Set<string>();

  function valueOf(key: string): SheetValue {
    const cached = results.get(key);
    if (cached !== undefined) return cached;
    if (visiting.has(key)) return '#CIRC!';
    visiting.add(key);
    let value: SheetValue;
    try {
      value = compute(cells[key] ?? '');
    } finally {
      visiting.delete(key);
    }
    results.set(key, value);
    return value;
  }

  function numericCell(key: string): number | SheetError {
    const v = valueOf(key);
    if (typeof v === 'number') return v;
    if (isSheetError(v)) return v;
    if (v === '') return 0;
    return '#VALUE!';
  }

  function rangeValues(text: string): readonly RangeItem[] {
    const [a, b] = text.split(':') as [string, string];
    const from = parseRef(a);
    const to = parseRef(b);
    if (!from || !to) throw new FormulaError('#REF!');
    const out: RangeItem[] = [];
    for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row++) {
      for (let col = Math.min(from.col, to.col); col <= Math.max(from.col, to.col); col++) {
        const v = valueOf(cellKey(col, row));
        // Teks dan sel kosong diabaikan di dalam rentang, seperti di Excel.
        if (typeof v === 'number' || isSheetError(v)) out.push(v);
      }
    }
    return out;
  }

  class Parser {
    private i = 0;
    constructor(private readonly tokens: readonly Token[]) {}

    atEnd(): boolean {
      return this.i >= this.tokens.length;
    }

    private isOp(v: string): boolean {
      const t = this.tokens[this.i];
      return t?.t === 'op' && t.v === v;
    }

    private nextOp(): string {
      return (this.tokens[this.i++] as { readonly v: string }).v;
    }

    parseExpression(): number {
      let left = scalar(this.parseTerm());
      while (this.isOp('+') || this.isOp('-')) {
        const op = this.nextOp();
        const right = scalar(this.parseTerm());
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    private parseTerm(): Arg {
      let left = this.parsePower();
      while (this.isOp('*') || this.isOp('/')) {
        const op = this.nextOp();
        const l = scalar(left);
        const r = scalar(this.parsePower());
        if (op === '/' && r === 0) throw new FormulaError('#DIV/0!');
        left = op === '*' ? l * r : l / r;
      }
      return left;
    }

    private parsePower(): Arg {
      const base = this.parseUnary();
      if (this.isOp('^')) {
        this.i++;
        return scalar(base) ** scalar(this.parsePower());
      }
      return base;
    }

    private parseUnary(): Arg {
      if (this.isOp('-')) {
        this.i++;
        return -scalar(this.parseUnary());
      }
      if (this.isOp('+')) {
        this.i++;
        return this.parseUnary();
      }
      return this.parsePrimary();
    }

    private parsePrimary(): Arg {
      const tok = this.tokens[this.i++];
      if (!tok) throw new FormulaError('#ERR!');
      if (tok.t === 'num') return tok.v;
      if (tok.t === 'ref') return numericCell(tok.v);
      if (tok.t === 'range') return rangeValues(tok.v);
      if (tok.t === 'name') return this.parseCall(tok.v);
      if (tok.v === '(') {
        const inner = this.parseExpression();
        if (!this.isOp(')')) throw new FormulaError('#ERR!');
        this.i++;
        return inner;
      }
      throw new FormulaError('#ERR!');
    }

    private parseCall(name: string): Arg {
      if (!this.isOp('(')) throw new FormulaError('#ERR!');
      this.i++;
      const args: Arg[] = [];
      if (!this.isOp(')')) {
        args.push(this.parseExpression2());
        while (this.isOp(',')) {
          this.i++;
          args.push(this.parseExpression2());
        }
      }
      if (!this.isOp(')')) throw new FormulaError('#ERR!');
      this.i++;
      return applyFunction(name, args);
    }

    /** Argumen fungsi boleh berupa rentang utuh (B2:M2) atau ekspresi biasa. */
    private parseExpression2(): Arg {
      const t = this.tokens[this.i];
      const after = this.tokens[this.i + 1];
      if (t?.t === 'range' && after?.t === 'op' && (after.v === ',' || after.v === ')')) {
        this.i++;
        return rangeValues(t.v);
      }
      return this.parseExpression();
    }
  }

  function compute(raw: string): SheetValue {
    if (!raw.startsWith('=')) return parseNumberText(raw) ?? raw;
    const tokens = tokenize(raw.slice(1));
    if (!tokens || tokens.length === 0) return '#ERR!';
    try {
      const parser = new Parser(tokens);
      const out = parser.parseExpression();
      if (!parser.atEnd()) return '#ERR!';
      return Number.isFinite(out) ? out : '#VALUE!';
    } catch (err) {
      if (err instanceof FormulaError) return err.code;
      throw err;
    }
  }

  for (const key of Object.keys(cells)) valueOf(key);
  return results;
}

/** Teks tampilan sebuah nilai sel; sel kosong menjadi string kosong. */
export function formatSheetValue(v: SheetValue | undefined): string {
  if (v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  return v;
}
