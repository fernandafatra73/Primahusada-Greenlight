/** Daftar penanggung jawab (PJ) Laboratorium — isi tombol "PJ" di halaman Laboratorium. */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { LabPenanggungJawab } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { serializeDecimal } from '../lib/serialize.js';

interface PjBody {
  nama?: string;
  tanggal?: string;
  jumlah?: number;
  admin?: string;
}

function badRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: message });
}

function parseTanggal(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serialize(item: LabPenanggungJawab) {
  return {
    id: item.id,
    nama: item.nama,
    tanggal: item.tanggal.toISOString(),
    jumlah: serializeDecimal(item.jumlah),
    admin: item.admin,
  };
}

export async function registerLabPenanggungJawabRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/lab-penanggung-jawab', async () => {
    const items = await prisma.labPenanggungJawab.findMany({ orderBy: [{ tanggal: 'asc' }, { createdAt: 'asc' }] });
    return { items: items.map(serialize) };
  });

  app.post<{ Body: PjBody }>('/api/lab-penanggung-jawab', async (req, reply) => {
    const nama = req.body.nama?.trim();
    if (!nama) return badRequest(reply, 'Nama penanggung jawab wajib diisi');
    const tanggal = parseTanggal(req.body.tanggal);
    if (!tanggal) return badRequest(reply, 'Tanggal tidak valid');
    const jumlah = Number(req.body.jumlah ?? 0);
    if (!Number.isFinite(jumlah) || jumlah < 0) return badRequest(reply, 'Jumlah tidak valid');

    const item = await prisma.labPenanggungJawab.create({
      data: { nama, tanggal, jumlah, admin: req.body.admin?.trim() || null },
    });
    return reply.status(201).send({ item: serialize(item) });
  });

  app.patch<{ Params: { id: string }; Body: PjBody }>('/api/lab-penanggung-jawab/:id', async (req, reply) => {
    const existing = await prisma.labPenanggungJawab.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data PJ tidak ditemukan' });

    const b = req.body;
    if (b.nama !== undefined && !b.nama.trim()) return badRequest(reply, 'Nama penanggung jawab wajib diisi');
    let tanggal = existing.tanggal;
    if (b.tanggal !== undefined) {
      const parsed = parseTanggal(b.tanggal);
      if (!parsed) return badRequest(reply, 'Tanggal tidak valid');
      tanggal = parsed;
    }
    if (b.jumlah !== undefined && (!Number.isFinite(Number(b.jumlah)) || Number(b.jumlah) < 0)) {
      return badRequest(reply, 'Jumlah tidak valid');
    }

    const item = await prisma.labPenanggungJawab.update({
      where: { id: req.params.id },
      data: {
        nama: b.nama?.trim() ?? existing.nama,
        tanggal,
        jumlah: b.jumlah !== undefined ? Number(b.jumlah) : existing.jumlah,
        admin: b.admin !== undefined ? b.admin.trim() || null : existing.admin,
      },
    });
    return { item: serialize(item) };
  });

  app.delete<{ Params: { id: string } }>('/api/lab-penanggung-jawab/:id', async (req, reply) => {
    const existing = await prisma.labPenanggungJawab.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data PJ tidak ditemukan' });
    await prisma.labPenanggungJawab.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
