/** Riwayat login — isi tombol "Tabel-login" di Mega Data. */

import type { FastifyInstance } from 'fastify';
import type { LoginLog } from '../generated/prisma/client.js';
import {
  durasiDetik,
  parseFotoLogin,
  parseLoginLogCreate,
  parseLoginLogEdit,
  type LoginLogCreateBody,
  type LoginLogEditBody,
} from '../lib/loginLog.js';
import { prisma } from '../lib/prisma.js';

const BATAS_DAFTAR = 500;

interface LoginLogDto {
  readonly id: string;
  readonly nama: string;
  readonly email: string;
  readonly loginAt: string;
  readonly logoutAt: string | null;
  readonly durasiDetik: number;
  readonly foto: string | null;
}

function serialize(item: LoginLog): LoginLogDto {
  return {
    id: item.id,
    nama: item.nama,
    email: item.email,
    loginAt: item.loginAt.toISOString(),
    logoutAt: item.logoutAt?.toISOString() ?? null,
    durasiDetik: durasiDetik(item.loginAt, item.terakhirAktif, item.logoutAt),
    foto: item.foto,
  };
}

const TIDAK_DITEMUKAN = { error: 'Data login tidak ditemukan' };

export async function registerLoginLogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/login-log', async () => {
    const items = await prisma.loginLog.findMany({ orderBy: { loginAt: 'desc' }, take: BATAS_DAFTAR });
    return { items: items.map(serialize) };
  });

  app.post<{ Body: LoginLogCreateBody }>('/api/login-log', async (req, reply) => {
    const parsed = parseLoginLogCreate(req.body ?? {});
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    const item = await prisma.loginLog.create({ data: parsed.data });
    return reply.status(201).send({ item: serialize(item) });
  });

  app.patch<{ Params: { id: string }; Body: LoginLogEditBody }>('/api/login-log/:id', async (req, reply) => {
    const parsed = parseLoginLogEdit(req.body ?? {});
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    const existing = await prisma.loginLog.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send(TIDAK_DITEMUKAN);
    const item = await prisma.loginLog.update({ where: { id: req.params.id }, data: parsed.data });
    return { item: serialize(item) };
  });

  app.put<{ Params: { id: string }; Body: { foto?: unknown } }>('/api/login-log/:id/foto', async (req, reply) => {
    const parsed = parseFotoLogin(req.body?.foto);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    const existing = await prisma.loginLog.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send(TIDAK_DITEMUKAN);
    await prisma.loginLog.update({ where: { id: req.params.id }, data: { foto: parsed.data } });
    return { ok: true };
  });

  // Tanda "masih dibuka" berkala dari frontend; selesai=true dikirim saat logout.
  app.post<{ Params: { id: string }; Body: { selesai?: unknown } }>(
    '/api/login-log/:id/aktif',
    async (req, reply) => {
      const existing = await prisma.loginLog.findUnique({ where: { id: req.params.id } });
      if (!existing) return reply.status(404).send(TIDAK_DITEMUKAN);
      // Sesi yang sudah logout tidak diperpanjang lagi oleh tab lain yang masih terbuka.
      if (existing.logoutAt) return { ok: true };
      const now = new Date();
      await prisma.loginLog.update({
        where: { id: req.params.id },
        data: req.body?.selesai === true ? { terakhirAktif: now, logoutAt: now } : { terakhirAktif: now },
      });
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string } }>('/api/login-log/:id', async (req, reply) => {
    const existing = await prisma.loginLog.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send(TIDAK_DITEMUKAN);
    await prisma.loginLog.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
