/** Lembar "Excel" Hasil Perbulan: sel (nilai/rumus) yang disimpan per tahun dan modul. */

import type { FastifyInstance } from 'fastify';
import { bacaLembarTersimpan, parseLembarCells } from '../lib/lembarExcel.js';
import { prisma } from '../lib/prisma.js';

type Modul = 'RADIOLOGI' | 'LABORATORIUM';

function bacaModul(value: unknown): Modul {
  return value === 'LABORATORIUM' ? 'LABORATORIUM' : 'RADIOLOGI';
}

function bacaTahun(value: unknown): number | null {
  const year = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isInteger(year) && year >= 1900 && year <= 3000 ? year : null;
}

export async function registerLembarExcelRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { year?: string; modul?: string } }>('/api/laporan/lembar-excel', async (req, reply) => {
    const year = bacaTahun(req.query.year);
    if (year === null) return reply.status(400).send({ error: 'Tahun tidak valid' });
    const modul = bacaModul(req.query.modul);
    const row = await prisma.lembarExcelBulanan.findUnique({ where: { year_modul: { year, modul } } });
    // cells null = belum pernah disimpan; klien membangun lembar awal dari data 12 bulan.
    return { cells: row ? bacaLembarTersimpan(row.data) : null };
  });

  app.put<{ Body: { year?: unknown; modul?: unknown; cells?: unknown } }>(
    '/api/laporan/lembar-excel',
    async (req, reply) => {
      const year = bacaTahun(req.body?.year);
      if (year === null) return reply.status(400).send({ error: 'Tahun tidak valid' });
      const modul = bacaModul(req.body?.modul);
      const parsed = parseLembarCells(req.body?.cells);
      if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
      const data = JSON.stringify(parsed.data);
      await prisma.lembarExcelBulanan.upsert({
        where: { year_modul: { year, modul } },
        create: { year, modul, data },
        update: { data },
      });
      return { ok: true };
    },
  );

  /** Hapus lembar tersimpan sehingga dibangun ulang dari data 12 bulan. */
  app.delete<{ Querystring: { year?: string; modul?: string } }>('/api/laporan/lembar-excel', async (req, reply) => {
    const year = bacaTahun(req.query.year);
    if (year === null) return reply.status(400).send({ error: 'Tahun tidak valid' });
    await prisma.lembarExcelBulanan.deleteMany({ where: { year, modul: bacaModul(req.query.modul) } });
    return { ok: true };
  });
}
