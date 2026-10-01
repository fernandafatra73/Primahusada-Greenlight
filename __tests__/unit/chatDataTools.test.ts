import { describe, expect, test } from 'vitest';
import {
  buildWhere,
  isMaskedColumn,
  isReadableTable,
  kindFromSqlType,
  maskValue,
  runDataTool,
  sanitizeRow,
  type ColumnKind,
} from '../../apps/api/src/lib/chatDataTools.ts';
import { canAccessClinicData } from '../../apps/api/src/routes/chat.ts';

const pasienColumns = new Map<string, ColumnKind>([
  ['nama', 'text'],
  ['totalHarga', 'number'],
  ['createdAt', 'date'],
  ['paymentStatus', 'text'],
  ['sharingLocked', 'boolean'],
]);

describe('table access', () => {
  test('credential tables are not readable', () => {
    expect(isReadableTable('Staff')).toBe(false);
    expect(isReadableTable('DaftarAkun')).toBe(false);
    expect(isReadableTable('KomputerKlinik')).toBe(false);
    expect(isReadableTable('Pasien')).toBe(true);
  });

  test('runDataTool refuses a blocked table and an unknown tool without throwing', async () => {
    expect(await runDataTool('ambil_data', { tabel: 'Staff' })).toMatchObject({ error: expect.stringContaining('tidak tersedia') });
    expect(await runDataTool('drop_table', {})).toMatchObject({ error: expect.stringContaining('tidak dikenal') });
  });

  test('canAccessClinicData rejects a missing staff id without touching the database', async () => {
    expect(await canAccessClinicData(undefined)).toBe(false);
    expect(await canAccessClinicData('')).toBe(false);
  });
});

describe('patient identity masking', () => {
  test('patient identity columns are masked only where they identify a patient', () => {
    expect(isMaskedColumn('Pasien', 'nama')).toBe(true);
    expect(isMaskedColumn('Pasien', 'tanggalLahir')).toBe(true);
    expect(isMaskedColumn('Usg', 'namaPasien')).toBe(true);
    expect(isMaskedColumn('Dokter', 'nama')).toBe(false);
    expect(isMaskedColumn('Pasien', 'totalHarga')).toBe(false);
  });

  test('the same name always gets the same code, different names differ', () => {
    const a = maskValue('nama', 'Budi Santoso');
    expect(a).toMatch(/^Pasien-[0-9a-f]{6}$/);
    expect(maskValue('nama', 'Budi Santoso')).toBe(a);
    expect(maskValue('nama', 'Siti Aminah')).not.toBe(a);
  });

  test('sanitizeRow hides identity, keeps other fields, and shortens images and long text', () => {
    const row = sanitizeRow('Pasien', {
      nama: 'Budi Santoso',
      alamat: 'Jl. Mawar 1',
      noTelepon: '0812',
      tanggalLahir: new Date('1990-01-02T00:00:00Z'),
      totalHarga: { toNumber: () => 150000 },
      foto: 'data:image/png;base64,AAAA',
      kesan: 'x'.repeat(1000),
    });
    expect(JSON.stringify(row)).not.toContain('Budi');
    expect(JSON.stringify(row)).not.toContain('Mawar');
    expect(JSON.stringify(row)).not.toContain('0812');
    expect(JSON.stringify(row)).not.toContain('1990');
    expect(row.totalHarga).toBe(150000);
    expect(row.foto).toBe('[gambar]');
    expect(String(row.kesan).length).toBeLessThan(1000);
  });

  test('null values stay null', () => {
    expect(sanitizeRow('Pasien', { nama: null }).nama).toBeNull();
  });
});

describe('buildWhere', () => {
  test('builds typed conditions and merges range filters on one column', () => {
    const where = buildWhere('Pasien', pasienColumns, [
      { kolom: 'totalHarga', op: 'lebih_sama', nilai: '1000' },
      { kolom: 'totalHarga', op: 'kurang_dari', nilai: '5000' },
      { kolom: 'createdAt', op: 'lebih_dari', nilai: '2026-09-01' },
      { kolom: 'sharingLocked', op: 'sama', nilai: 'ya' },
    ]);
    expect(where).toEqual({
      totalHarga: { gte: 1000, lt: 5000 },
      createdAt: { gt: new Date('2026-09-01') },
      sharingLocked: { equals: true },
    });
  });

  test('no filters gives an empty where', () => {
    expect(buildWhere('Pasien', pasienColumns, undefined)).toEqual({});
  });

  test('rejects unknown columns, masked columns, bad operators and bad values', () => {
    const f = (item: unknown) => () => buildWhere('Pasien', pasienColumns, [item]);
    expect(f({ kolom: 'passwordHash', op: 'sama', nilai: 'x' })).toThrow('tidak ada');
    expect(f({ kolom: 'nama', op: 'mengandung', nilai: 'Budi' })).toThrow('disamarkan');
    expect(f({ kolom: 'totalHarga', op: 'DROP', nilai: '1' })).toThrow('Operator');
    expect(f({ kolom: 'totalHarga', op: 'mengandung', nilai: '1' })).toThrow('hanya untuk kolom teks');
    expect(f({ kolom: 'totalHarga', op: 'sama', nilai: 'abc' })).toThrow('bukan angka');
    expect(f({ kolom: 'createdAt', op: 'sama', nilai: 'kemarin' })).toThrow('tanggal');
  });

  test('rejects more than five filters', () => {
    const many = Array.from({ length: 6 }, () => ({ kolom: 'totalHarga', op: 'sama', nilai: '1' }));
    expect(() => buildWhere('Pasien', pasienColumns, many)).toThrow('Maksimal');
  });
});

describe('kindFromSqlType', () => {
  test.each([
    ['TEXT', 'text'],
    ['INTEGER', 'number'],
    ['DECIMAL', 'number'],
    ['REAL', 'number'],
    ['DATETIME', 'date'],
    ['BOOLEAN', 'boolean'],
  ])('%s -> %s', (sqlType, kind) => {
    expect(kindFromSqlType(sqlType)).toBe(kind);
  });
});
