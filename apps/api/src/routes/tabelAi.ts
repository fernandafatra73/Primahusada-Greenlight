/** Arsip hasil pembacaan AI — isi tombol "Tabel AI" di halaman Pasien.
 *
 * Diisi dari modal AI Foto dan AI Banding 2. Fotonya dikirim sebagai data URL
 * lalu disimpan sebagai berkas, supaya baris tabel tetap ringan dan cadangan
 * database tidak membengkak. */

import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { saveImageDataUrl } from '../lib/fileStorage.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';

function badRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: message });
}

export async function registerTabelAiRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { page?: string; limit?: string; q?: string } }>(
    '/api/tabel-ai',
    async (req) => {
      const { page, limit, skip } = parsePagination(req.query);
      const q = req.query.q?.trim();
      const where = q
        ? {
            OR: [
              { namaPenyakit: { contains: q } },
              { hasilAnalisa: { contains: q } },
              { namaPasien: { contains: q } },
            ],
          }
        : {};

      const [total, items] = await Promise.all([
        prisma.tabelAi.count({ where }),
        prisma.tabelAi.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      ]);
      return { items, pagination: buildPaginationMeta(total, page, limit) };
    },
  );

  app.post<{
    Body: {
      namaPenyakit?: string;
      foto?: string;
      hasilAnalisa?: string;
      asal?: string;
      namaPasien?: string;
    };
  }>('/api/tabel-ai', async (req, reply) => {
    if (!req.body.foto?.trim()) return badRequest(reply, 'foto wajib diisi');
    if (!req.body.hasilAnalisa?.trim()) return badRequest(reply, 'hasil analisa wajib diisi');

    const item = await prisma.tabelAi.create({
      data: {
        namaPenyakit: req.body.namaPenyakit?.trim() || null,
        foto: saveImageDataUrl(req.body.foto, 'tabel-ai'),
        hasilAnalisa: req.body.hasilAnalisa.trim(),
        asal: req.body.asal?.trim() || null,
        namaPasien: req.body.namaPasien?.trim() || null,
      },
    });
    return reply.status(201).send({ item });
  });

  app.patch<{
    Params: { id: string };
    Body: { namaPenyakit?: string; hasilAnalisa?: string; namaPasien?: string };
  }>('/api/tabel-ai/:id', async (req, reply) => {
    const existing = await prisma.tabelAi.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data tidak ditemukan' });

    if (req.body.hasilAnalisa !== undefined && !req.body.hasilAnalisa.trim()) {
      return badRequest(reply, 'hasil analisa tidak boleh kosong');
    }

    const item = await prisma.tabelAi.update({
      where: { id: req.params.id },
      data: {
        namaPenyakit:
          req.body.namaPenyakit !== undefined
            ? req.body.namaPenyakit.trim() || null
            : existing.namaPenyakit,
        hasilAnalisa: req.body.hasilAnalisa?.trim() ?? existing.hasilAnalisa,
        namaPasien:
          req.body.namaPasien !== undefined
            ? req.body.namaPasien.trim() || null
            : existing.namaPasien,
      },
    });
    return { item };
  });

  app.delete<{ Params: { id: string } }>('/api/tabel-ai/:id', async (req, reply) => {
    const existing = await prisma.tabelAi.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data tidak ditemukan' });
    await prisma.tabelAi.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}

/** Arsip foto pasien beserta analisanya — isi tabel di modal Edit³.
 *
 * Terpisah dari Tabel AI karena melekat pada satu pasien: daftarnya selalu
 * disaring per `pasienId`, sehingga modal seorang pasien hanya menampilkan
 * arsip miliknya sendiri. */
export async function registerFotoPasienAnalisaRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { pasienId?: string } }>('/api/foto-pasien-analisa', async (req, reply) => {
    const pasienId = req.query.pasienId?.trim();
    if (!pasienId) return badRequest(reply, 'pasienId wajib diisi');

    const items = await prisma.fotoPasienAnalisa.findMany({
      where: { pasienId },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  });

  app.post<{
    Body: { pasienId?: string; namaPasien?: string; foto?: string; analisa?: string };
  }>('/api/foto-pasien-analisa', async (req, reply) => {
    if (!req.body.pasienId?.trim()) return badRequest(reply, 'pasienId wajib diisi');
    if (!req.body.foto?.trim()) return badRequest(reply, 'foto wajib diisi');
    if (!req.body.analisa?.trim()) return badRequest(reply, 'analisa wajib diisi');

    const item = await prisma.fotoPasienAnalisa.create({
      data: {
        pasienId: req.body.pasienId.trim(),
        namaPasien: req.body.namaPasien?.trim() || '-',
        foto: saveImageDataUrl(req.body.foto, 'foto-pasien-analisa'),
        analisa: req.body.analisa.trim(),
      },
    });
    return reply.status(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: { analisa?: string } }>(
    '/api/foto-pasien-analisa/:id',
    async (req, reply) => {
      const existing = await prisma.fotoPasienAnalisa.findUnique({ where: { id: req.params.id } });
      if (!existing) return reply.status(404).send({ error: 'Data tidak ditemukan' });
      if (req.body.analisa !== undefined && !req.body.analisa.trim()) {
        return badRequest(reply, 'analisa tidak boleh kosong');
      }

      const item = await prisma.fotoPasienAnalisa.update({
        where: { id: req.params.id },
        data: { analisa: req.body.analisa?.trim() ?? existing.analisa },
      });
      return { item };
    },
  );

  app.delete<{ Params: { id: string } }>('/api/foto-pasien-analisa/:id', async (req, reply) => {
    const existing = await prisma.fotoPasienAnalisa.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data tidak ditemukan' });
    await prisma.fotoPasienAnalisa.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
