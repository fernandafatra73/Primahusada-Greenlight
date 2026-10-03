import { createHash, randomBytes } from 'node:crypto';
import { Type, type FunctionDeclaration } from '@google/genai';
import { ModelName } from '../generated/prisma/internal/prismaNamespace.js';
import { prisma } from './prisma.js';

/// Alat baca-saja (read-only) yang dipakai Fernanda-Fatra73 untuk menjawab
/// pertanyaan Admin/CEO tentang data klinik. Gemini hanya boleh memanggil
/// alat ini — tidak pernah menulis SQL sendiri — dan setiap hasil disaring
/// dulu di sini: identitas pasien disamarkan, kredensial tidak pernah keluar.

export type ColumnKind = 'text' | 'number' | 'date' | 'boolean';
export type TableColumns = ReadonlyMap<string, ColumnKind>;

/// Tabel yang tidak boleh dibaca AI sama sekali: Staff memuat hash password,
/// DaftarAkun menyimpan password Gmail/otentikator, KomputerKlinik menyimpan
/// ID akses remote AnyDesk.
const BLOCKED_TABLES: ReadonlySet<string> = new Set(['Staff', 'DaftarAkun', 'KomputerKlinik']);

/// Kolom identitas pasien yang selalu disamarkan, di tabel mana pun muncul.
const MASKED_EVERYWHERE: readonly string[] = ['namaPasien', 'tempatTanggalLahir', 'alamatPasien'];

/// Kolom identitas pasien yang namanya generik (nama, alamat, ...) sehingga
/// hanya disamarkan di tabel pasien — bukan di tabel dokter/karyawan.
const MASKED_BY_TABLE: Readonly<Record<string, readonly string[]>> = {
  Pasien: ['nama', 'tanggalLahir', 'noTelepon', 'alamat'],
  PasienDuplikat: ['nama', 'tanggalLahir', 'noTelepon', 'alamat'],
  PendaftaranUmum: ['alamat', 'telpon'],
  Usg: ['alamat'],
  Rad2: ['nama', 'alamat'],
  Transfer: ['namaTransferan'],
  SuratKeteranganSehat: ['pekerjaan'],
};

/// Kolom yang dipakai sebagai nama pasien → diganti "Pasien-<kode>" (konsisten
/// untuk nama yang sama) supaya AI tetap bisa mengenali pasien yang sama.
const NAME_COLUMNS: ReadonlySet<string> = new Set(['nama', 'namaPasien', 'namaTransferan']);

const MAX_ROWS = 50;
const DEFAULT_ROWS = 20;
const MAX_FILTERS = 5;
const MAX_TEXT_LENGTH = 400;
const MAX_GROUPS = 50;

// Garam acak per proses: kode samaran konsisten selama server hidup, tapi tidak
// bisa ditebak dengan mencoba-coba nama.
const MASK_SALT = randomBytes(16).toString('hex');

const TABLE_NAMES: readonly string[] = Object.values(ModelName).filter((name) => !BLOCKED_TABLES.has(name));

export function isReadableTable(name: string): boolean {
  return TABLE_NAMES.includes(name);
}

export function isMaskedColumn(table: string, column: string): boolean {
  return MASKED_EVERYWHERE.includes(column) || (MASKED_BY_TABLE[table]?.includes(column) ?? false);
}

export function maskValue(column: string, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return value;
  if (NAME_COLUMNS.has(column) || MASKED_EVERYWHERE.includes(column)) {
    const code = createHash('sha256').update(`${MASK_SALT}:${String(value)}`).digest('hex').slice(0, 6);
    return column === 'tempatTanggalLahir' || column === 'alamatPasien' ? '[disamarkan]' : `Pasien-${code}`;
  }
  return '[disamarkan]';
}

function isDecimalLike(value: object): value is { toNumber(): number } {
  return 'toNumber' in value && typeof (value as { toNumber: unknown }).toNumber === 'function';
}

export function sanitizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    if (value.startsWith('data:')) return '[gambar]';
    return value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH)}…` : value;
  }
  if (typeof value === 'object' && value !== null && isDecimalLike(value)) return value.toNumber();
  return value;
}

export function sanitizeRow(table: string, row: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    out[column] = isMaskedColumn(table, column) ? maskValue(column, value) : sanitizeValue(value);
  }
  return out;
}

export function kindFromSqlType(sqlType: string): ColumnKind {
  const type = sqlType.toUpperCase();
  if (type.includes('INT') || type.includes('REAL') || type.includes('DECIMAL') || type.includes('DOUBLE')) {
    return 'number';
  }
  if (type.includes('DATE') || type.includes('TIME')) return 'date';
  if (type.includes('BOOL')) return 'boolean';
  return 'text';
}

const FILTER_OPERATORS = {
  sama: 'equals',
  mengandung: 'contains',
  lebih_dari: 'gt',
  lebih_sama: 'gte',
  kurang_dari: 'lt',
  kurang_sama: 'lte',
} as const;
type FilterOperator = keyof typeof FILTER_OPERATORS;

function isFilterOperator(value: string): value is FilterOperator {
  return Object.prototype.hasOwnProperty.call(FILTER_OPERATORS, value);
}

function coerceValue(kind: ColumnKind, raw: unknown): unknown {
  if (kind === 'number') {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) throw new Error(`Nilai "${String(raw)}" bukan angka`);
    return n;
  }
  if (kind === 'date') {
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime())) throw new Error(`Nilai "${String(raw)}" bukan tanggal valid (pakai format YYYY-MM-DD)`);
    return d;
  }
  if (kind === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    const text = String(raw).toLowerCase();
    if (['true', 'ya', '1'].includes(text)) return true;
    if (['false', 'tidak', '0'].includes(text)) return false;
    throw new Error(`Nilai "${String(raw)}" bukan true/false`);
  }
  return String(raw);
}

function requireColumn(table: string, columns: TableColumns, column: unknown): { name: string; kind: ColumnKind } {
  if (typeof column !== 'string' || !columns.has(column)) {
    throw new Error(`Kolom "${String(column)}" tidak ada di tabel ${table}`);
  }
  if (isMaskedColumn(table, column)) {
    throw new Error(`Kolom "${column}" berisi identitas pasien yang disamarkan, tidak bisa dipakai untuk filter/urut/kelompok`);
  }
  const kind = columns.get(column);
  if (kind === undefined) throw new Error(`Kolom "${column}" tidak ada di tabel ${table}`);
  return { name: column, kind };
}

/// Ubah daftar filter dari Gemini jadi `where` Prisma. Setiap kolom dan
/// operator divalidasi terhadap skema asli, jadi Gemini tidak bisa menyisipkan
/// apa pun di luar yang diizinkan.
export function buildWhere(table: string, columns: TableColumns, filters: unknown): Record<string, unknown> {
  if (filters === undefined || filters === null) return {};
  if (!Array.isArray(filters)) throw new Error('filter harus berupa daftar');
  if (filters.length > MAX_FILTERS) throw new Error(`Maksimal ${MAX_FILTERS} filter`);

  const where: Record<string, Record<string, unknown>> = {};
  for (const item of filters as unknown[]) {
    if (typeof item !== 'object' || item === null) throw new Error('Setiap filter harus berupa objek');
    const { kolom, op, nilai } = item as Record<string, unknown>;
    const { name, kind } = requireColumn(table, columns, kolom);
    if (typeof op !== 'string' || !isFilterOperator(op)) {
      throw new Error(`Operator "${String(op)}" tidak dikenal. Pilihan: ${Object.keys(FILTER_OPERATORS).join(', ')}`);
    }
    if (op === 'mengandung' && kind !== 'text') throw new Error('Operator "mengandung" hanya untuk kolom teks');
    where[name] = { ...where[name], [FILTER_OPERATORS[op]]: coerceValue(kind, nilai) };
  }
  return where;
}

function clampRows(value: unknown): number {
  const n = typeof value === 'number' ? Math.floor(value) : DEFAULT_ROWS;
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_ROWS, 1), MAX_ROWS);
}

interface ModelDelegate {
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    take: number;
  }): Promise<Record<string, unknown>[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
  aggregate(args: {
    where: Record<string, unknown>;
    _sum: Record<string, true>;
  }): Promise<{ _sum: Record<string, unknown> }>;
  groupBy(args: {
    by: string[];
    where: Record<string, unknown>;
    _count: true;
    _sum?: Record<string, true>;
  }): Promise<Record<string, unknown>[]>;
}

function isModelDelegate(value: unknown): value is ModelDelegate {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { findMany?: unknown }).findMany === 'function' &&
    typeof (value as { groupBy?: unknown }).groupBy === 'function'
  );
}

/// Delegate Prisma dicari lewat nama model (huruf pertama kecil). Nama tabel
/// sudah dicek terhadap daftar model asli sebelum sampai sini.
function delegateFor(table: string): ModelDelegate {
  const key = table.charAt(0).toLowerCase() + table.slice(1);
  const delegate: unknown = (prisma as unknown as Record<string, unknown>)[key];
  if (!isModelDelegate(delegate)) throw new Error(`Tabel ${table} tidak bisa dibaca`);
  return delegate;
}

const columnCache = new Map<string, TableColumns>();

async function loadColumns(table: string): Promise<TableColumns> {
  const cached = columnCache.get(table);
  if (cached) return cached;
  // `table` berasal dari daftar ModelName yang tetap (lihat isReadableTable),
  // bukan dari input Gemini, jadi aman dipakai sebagai identifier.
  const rows = await prisma.$queryRawUnsafe<{ name: string; type: string }[]>(`PRAGMA table_info("${table}")`);
  const columns = new Map<string, ColumnKind>(rows.map((row) => [row.name, kindFromSqlType(row.type)]));
  columnCache.set(table, columns);
  return columns;
}

async function resolveTable(raw: unknown): Promise<{ table: string; columns: TableColumns }> {
  if (typeof raw !== 'string' || !isReadableTable(raw)) {
    throw new Error(`Tabel "${String(raw)}" tidak tersedia. Panggil daftar_tabel untuk melihat tabel yang ada.`);
  }
  return { table: raw, columns: await loadColumns(raw) };
}

type ToolArgs = Readonly<Record<string, unknown>>;

async function daftarTabel(): Promise<unknown> {
  const tables = await Promise.all(
    TABLE_NAMES.map(async (table) => {
      const columns = await loadColumns(table);
      return {
        tabel: table,
        kolom: [...columns].map(([name, kind]) => `${name}:${kind}${isMaskedColumn(table, name) ? ' (disamarkan)' : ''}`),
      };
    }),
  );
  return { tabel: tables };
}

async function ambilData(args: ToolArgs): Promise<unknown> {
  const { table, columns } = await resolveTable(args.tabel);
  const where = buildWhere(table, columns, args.filter);
  const take = clampRows(args.batas);
  const orderBy: Record<string, 'asc' | 'desc'> | undefined =
    args.urut_kolom === undefined
      ? columns.has('createdAt')
        ? { createdAt: 'desc' }
        : undefined
      : { [requireColumn(table, columns, args.urut_kolom).name]: args.urut_arah === 'asc' ? 'asc' : 'desc' };

  const [rows, total] = await Promise.all([
    delegateFor(table).findMany({ where, orderBy, take }),
    delegateFor(table).count({ where }),
  ]);
  return { tabel: table, totalCocok: total, ditampilkan: rows.length, data: rows.map((row) => sanitizeRow(table, row)) };
}

async function hitungData(args: ToolArgs): Promise<unknown> {
  const { table, columns } = await resolveTable(args.tabel);
  const where = buildWhere(table, columns, args.filter);
  const delegate = delegateFor(table);

  let sumColumn: string | undefined;
  if (args.jumlahkan_kolom !== undefined) {
    const column = requireColumn(table, columns, args.jumlahkan_kolom);
    if (column.kind !== 'number') throw new Error(`Kolom "${column.name}" bukan angka, tidak bisa dijumlahkan`);
    sumColumn = column.name;
  }

  if (args.kelompok_kolom !== undefined) {
    const group = requireColumn(table, columns, args.kelompok_kolom);
    const groups = await delegate.groupBy({
      by: [group.name],
      where,
      _count: true,
      ...(sumColumn ? { _sum: { [sumColumn]: true as const } } : {}),
    });
    return {
      tabel: table,
      kelompokDari: group.name,
      kelompok: groups.slice(0, MAX_GROUPS).map((row) => ({
        nilai: sanitizeValue(row[group.name]),
        jumlahBaris: row._count,
        ...(sumColumn ? { total: sanitizeValue((row._sum as Record<string, unknown> | undefined)?.[sumColumn]) } : {}),
      })),
      kelompokTerpotong: groups.length > MAX_GROUPS,
    };
  }

  const jumlahBaris = await delegate.count({ where });
  if (!sumColumn) return { tabel: table, jumlahBaris };
  const aggregate = await delegate.aggregate({ where, _sum: { [sumColumn]: true } });
  return { tabel: table, jumlahBaris, total: sanitizeValue(aggregate._sum[sumColumn]), kolomDijumlahkan: sumColumn };
}

const FILTER_SCHEMA = {
  type: Type.ARRAY,
  description: `Syarat pencarian (maksimal ${MAX_FILTERS}); semua syarat harus terpenuhi.`,
  items: {
    type: Type.OBJECT,
    properties: {
      kolom: { type: Type.STRING, description: 'Nama kolom persis seperti di daftar_tabel.' },
      op: { type: Type.STRING, enum: Object.keys(FILTER_OPERATORS), description: 'Operator pembanding.' },
      nilai: { type: Type.STRING, description: 'Nilai pembanding. Tanggal pakai format YYYY-MM-DD.' },
    },
    required: ['kolom', 'op', 'nilai'],
  },
};

export const DATA_TOOL_DECLARATIONS: readonly FunctionDeclaration[] = [
  {
    name: 'daftar_tabel',
    description: 'Daftar semua tabel data klinik beserta nama dan tipe kolomnya. Panggil ini dulu kalau belum tahu nama tabel/kolom.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'ambil_data',
    description: `Ambil baris data dari satu tabel klinik (baca saja). Maksimal ${MAX_ROWS} baris per panggilan; identitas pasien disamarkan.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        tabel: { type: Type.STRING, description: 'Nama tabel persis seperti di daftar_tabel.' },
        filter: FILTER_SCHEMA,
        urut_kolom: { type: Type.STRING, description: 'Kolom untuk mengurutkan (default: terbaru dulu).' },
        urut_arah: { type: Type.STRING, enum: ['asc', 'desc'] },
        batas: { type: Type.NUMBER, description: `Jumlah baris (default ${DEFAULT_ROWS}, maksimal ${MAX_ROWS}).` },
      },
      required: ['tabel'],
    },
  },
  {
    name: 'hitung_data',
    description:
      'Hitung jumlah baris, jumlahkan satu kolom angka, atau kelompokkan per kolom. Pakai ini (bukan menghitung sendiri dari ambil_data) untuk pertanyaan jumlah/total/rekap.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tabel: { type: Type.STRING, description: 'Nama tabel persis seperti di daftar_tabel.' },
        filter: FILTER_SCHEMA,
        jumlahkan_kolom: { type: Type.STRING, description: 'Kolom angka yang dijumlahkan (mis. totalHarga).' },
        kelompok_kolom: { type: Type.STRING, description: 'Kelompokkan hasil per nilai kolom ini (mis. paymentStatus).' },
      },
      required: ['tabel'],
    },
  },
];

export function isDataToolName(name: string): boolean {
  return DATA_TOOL_DECLARATIONS.some((declaration) => declaration.name === name);
}

/// Jalankan satu alat data. Kesalahan (kolom salah, nilai tidak valid) dikembalikan
/// sebagai `{ error }` supaya Gemini bisa memperbaiki panggilannya sendiri,
/// bukan menggagalkan seluruh chat.
export async function runDataTool(name: string, args: ToolArgs): Promise<unknown> {
  try {
    switch (name) {
      case 'daftar_tabel':
        return await daftarTabel();
      case 'ambil_data':
        return await ambilData(args);
      case 'hitung_data':
        return await hitungData(args);
      default:
        return { error: `Alat "${name}" tidak dikenal` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Gagal membaca data' };
  }
}
