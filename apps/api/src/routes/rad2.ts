import type { FastifyInstance, FastifyReply } from 'fastify';
import { Decimal } from '../generated/prisma/internal/prismaNamespace.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { parseRad2Input } from '../lib/rad2.js';
import { serializeDecimal } from '../lib/serialize.js';

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.status(400).send({ error: message });
}

function serializeRad2(r: {
  id: string;
  nama: string;
  umur: number;
  alamat: string | null;
  tanggal: Date;
  pemeriksaan: string;
  pengirim: string;
  klinis: string | null;
  kesan: string | null;
  radiologi: string | null;
  harga: Decimal;
  sharing: Decimal;
}) {
  return {
    id: r.id,
    nama: r.nama,
    umur: r.umur,
    alamat: r.alamat,
    tanggal: r.tanggal.toISOString(),
    pemeriksaan: r.pemeriksaan,
    pengirim: r.pengirim,
    klinis: r.klinis,
    kesan: r.kesan,
    radiologi: r.radiologi,
    harga: serializeDecimal(r.harga),
    sharing: serializeDecimal(r.sharing),
  };
}

export async function registerRad2Routes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { page?: string; limit?: string; q?: string } }>('/api/rad2', async (req) => {
    const { page, limit, skip } = parsePagination(req.query);
    const q = req.query.q?.trim();
    const where = q
      ? {
          OR: [
            { nama: { contains: q } },
            { pemeriksaan: { contains: q } },
            { pengirim: { contains: q } },
            { radiologi: { contains: q } },
          ],
        }
      : {};
    const [total, items, agg] = await Promise.all([
      prisma.rad2.count({ where }),
      prisma.rad2.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.rad2.aggregate({ where, _sum: { harga: true, sharing: true } }),
    ]);
    return {
      items: items.map(serializeRad2),
      pagination: buildPaginationMeta(total, page, limit),
      // Total dihitung dari seluruh data yang cocok dengan pencarian, bukan hanya halaman ini.
      totalHarga: (agg._sum.harga ?? new Decimal(0)).toString(),
      totalSharing: (agg._sum.sharing ?? new Decimal(0)).toString(),
    };
  });

  app.post<{ Body: unknown }>('/api/rad2', async (req, reply) => {
    const parsed = parseRad2Input(req.body);
    if (!parsed.ok) return badRequest(reply, parsed.error);
    const item = await prisma.rad2.create({ data: parsed.data });
    return reply.status(201).send({ item: serializeRad2(item) });
  });

  app.patch<{ Params: { id: string }; Body: unknown }>('/api/rad2/:id', async (req, reply) => {
    const parsed = parseRad2Input(req.body);
    if (!parsed.ok) return badRequest(reply, parsed.error);
    const existing = await prisma.rad2.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data Rad2 tidak ditemukan' });
    const item = await prisma.rad2.update({ where: { id: req.params.id }, data: parsed.data });
    return { item: serializeRad2(item) };
  });

  app.delete<{ Params: { id: string } }>('/api/rad2/:id', async (req, reply) => {
    const existing = await prisma.rad2.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data Rad2 tidak ditemukan' });
    await prisma.rad2.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
