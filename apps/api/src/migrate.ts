// Runtime migration runner untuk aplikasi desktop (dipanggil oleh apps/desktop/electron/main.cjs
// sebelum server dinyalakan). Database SQLite milik user hanya dibuat sekali dari template.db,
// jadi setiap kali versi baru menambah migrasi Prisma, migrasi itu perlu diterapkan ke database
// user yang sudah ada — tanpa ini, update .exe akan membuat query gagal (kolom/tabel belum ada).
//
// Tidak membundel CLI/engine Prisma (berat, rawan gagal jalan dari dalam .exe yang di-package).
// Sebagai gantinya, file migration.sql yang sama dieksekusi langsung lewat @libsql/client, dan
// dicatat ke tabel _prisma_migrations dengan format yang sama seperti `prisma migrate deploy`.
import 'dotenv/config';
import { createClient } from '@libsql/client';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function splitStatements(sql: string): readonly string[] {
  return sql
    .split(';')
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((statement) => statement.length > 0);
}

function backupDatabaseFile(databaseUrl: string): void {
  const dbPath = databaseUrl.replace(/^file:/, '');
  if (!existsSync(dbPath)) return;

  const backupPath = `${dbPath}.backup-${Date.now()}`;
  copyFileSync(dbPath, backupPath);
  console.log(`[migrate] Backup database dibuat: ${backupPath}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL tidak diset');

  const migrationsDir = process.env.MIGRATIONS_DIR ?? join(__dirname, '..', 'prisma', 'migrations');
  if (!existsSync(migrationsDir)) {
    console.log(`[migrate] Folder migrasi tidak ditemukan (${migrationsDir}), lewati.`);
    return;
  }

  const migrationNames = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const client = createClient({ url: databaseUrl });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                    TEXT PRIMARY KEY NOT NULL,
      "checksum"              TEXT NOT NULL,
      "finished_at"           DATETIME,
      "migration_name"        TEXT NOT NULL,
      "logs"                  TEXT,
      "rolled_back_at"        DATETIME,
      "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const applied = await client.execute(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
  );
  const appliedNames = new Set(applied.rows.map((row) => String(row.migration_name)));

  const pending = migrationNames.filter((name) => !appliedNames.has(name));
  if (pending.length === 0) {
    console.log('[migrate] Database sudah sesuai skema terbaru, tidak ada migrasi tertunda.');
    return;
  }

  console.log(`[migrate] ${pending.length} migrasi tertunda: ${pending.join(', ')}`);
  backupDatabaseFile(databaseUrl);

  for (const name of pending) {
    const sqlPath = join(migrationsDir, name, 'migration.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    const statements = splitStatements(sqlContent);

    console.log(`[migrate] Menerapkan ${name} (${statements.length} statement)...`);
    for (const statement of statements) {
      await client.execute(statement);
    }

    const now = Date.now();
    await client.execute({
      sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        createHash('sha256').update(sqlContent).digest('hex'),
        now,
        name,
        now,
        statements.length,
      ],
    });
  }

  console.log('[migrate] Semua migrasi tertunda berhasil diterapkan.');
}

await main();
