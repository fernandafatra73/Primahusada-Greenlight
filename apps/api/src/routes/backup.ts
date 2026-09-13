import { copyFileSync, createReadStream, existsSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

const IMPORT_BODY_LIMIT = 512 * 1024 * 1024;
const SQLITE_MAGIC = 'SQLite format 3\0';

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? 'file:dev.db';
  const raw = url.replace(/^file:/, '');
  return resolve(process.cwd(), raw);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function registerBackupRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/backup/export', async (_req, reply) => {
    const dbPath = resolveDbPath();
    if (!existsSync(dbPath)) {
      return reply.status(404).send({ error: 'File database tidak ditemukan' });
    }

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch {
      // Bukan mode WAL atau adapter tidak mendukung raw pragma — lanjutkan saja,
      // file .db yang ada tetap valid untuk kondisi non-WAL.
    }

    const filename = `primahusada-backup-${timestamp()}.db`;
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Length', String(statSync(dbPath).size));
    reply.type('application/octet-stream');
    return reply.send(createReadStream(dbPath));
  });

  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: IMPORT_BODY_LIMIT },
    (_req, body, done) => done(null, body),
  );

  app.post(
    '/api/backup/import',
    { bodyLimit: IMPORT_BODY_LIMIT },
    async (req, reply) => {
      const body = req.body as Buffer | undefined;
      if (!body || body.length < SQLITE_MAGIC.length) {
        return reply.status(400).send({ error: 'File yang diunggah kosong atau tidak valid' });
      }
      const header = body.subarray(0, SQLITE_MAGIC.length).toString('utf8');
      if (header !== SQLITE_MAGIC) {
        return reply.status(400).send({ error: 'File yang diunggah bukan database SQLite yang valid' });
      }

      const dbPath = resolveDbPath();
      const dir = dirname(dbPath);
      const stamp = timestamp();

      if (existsSync(dbPath)) {
        copyFileSync(dbPath, join(dir, `backup-sebelum-import-${stamp}.db`));
      }
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${dbPath}${suffix}`;
        if (existsSync(sidecar)) unlinkSync(sidecar);
      }

      writeFileSync(dbPath, body);

      return {
        ok: true,
        message: 'Import berhasil. Tutup dan buka kembali aplikasi agar database baru dimuat.',
      };
    },
  );
}
