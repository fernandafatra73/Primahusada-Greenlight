/** Hitungan biaya kontrakan per bulan — isi tombol "Hitungan" di navbar (sebelah Lisensi). */

import type { FastifyInstance } from 'fastify';
import type { HitunganKontrakan } from '../generated/prisma/client.js';
import { parseHitunganKontrakanBody, type HitunganKontrakanBody } from '../lib/hitunganKontrakan.js';
import { prisma } from '../lib/prisma.js';
import { serializeDecimal, toNumber } from '../lib/serialize.js';

interface HitunganKontrakanDto {
  readonly id: string;
  readonly bulan: number;
  readonly tahun: number;
  readonly sewa: string | null;
  readonly listrik: string | null;
  readonly air: string | null;
  readonly pinjam: string | null;
}

function serialize(item: HitunganKontrakan): HitunganKontrakanDto {
  return {
    id: item.id,
    bulan: item.bulan,
    tahun: item.tahun,
    sewa: serializeDecimal(item.sewa),
    listrik: serializeDecimal(item.listrik),
    air: serializeDecimal(item.air),
    pinjam: serializeDecimal(item.pinjam),
  };
}

export async function registerHitunganKontrakanRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/hitungan-kontrakan', async () => {
    const items = await prisma.hitunganKontrakan.findMany({
      orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }, { createdAt: 'asc' }],
    });
    return { items: items.map(serialize) };
  });

  app.post<{ Body: HitunganKontrakanBody }>('/api/hitungan-kontrakan', async (req, reply) => {
    const parsed = parseHitunganKontrakanBody(req.body ?? {});
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    const item = await prisma.hitunganKontrakan.create({ data: parsed.data });
    return reply.status(201).send({ item: serialize(item) });
  });

  app.patch<{ Params: { id: string }; Body: HitunganKontrakanBody }>(
    '/api/hitungan-kontrakan/:id',
    async (req, reply) => {
      const existing = await prisma.hitunganKontrakan.findUnique({ where: { id: req.params.id } });
      if (!existing) return reply.status(404).send({ error: 'Data hitungan tidak ditemukan' });

      const parsed = parseHitunganKontrakanBody(req.body ?? {}, {
        bulan: existing.bulan,
        tahun: existing.tahun,
        sewa: toNumber(existing.sewa),
        listrik: toNumber(existing.listrik),
        air: toNumber(existing.air),
        pinjam: toNumber(existing.pinjam),
      });
      if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

      const item = await prisma.hitunganKontrakan.update({ where: { id: req.params.id }, data: parsed.data });
      return { item: serialize(item) };
    },
  );

  app.delete<{ Params: { id: string } }>('/api/hitungan-kontrakan/:id', async (req, reply) => {
    const existing = await prisma.hitunganKontrakan.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data hitungan tidak ditemukan' });
    await prisma.hitunganKontrakan.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
