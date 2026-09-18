import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  addActivationDuration,
  buildOwnerWaLink,
  formatRequestCode,
  OWNER_WA_NUMBER_LOCAL,
  verifyActivationCode,
} from '../lib/activation.js';
import { prisma } from '../lib/prisma.js';

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.status(400).send({ error: message });
}

/// Ambil (atau buat kalau belum ada) baris status lisensi tunggal ("default").
export async function getOrCreateLisensiAktivasi() {
  const existing = await prisma.lisensiAktivasi.findUnique({ where: { id: 'default' } });
  if (existing) return existing;
  return prisma.lisensiAktivasi.create({ data: { id: 'default' } });
}

export function isLisensiAktif(lisensi: { activatedAt: Date | null; expiresAt: Date | null }): boolean {
  return Boolean(lisensi.activatedAt && lisensi.expiresAt && lisensi.expiresAt.getTime() > Date.now());
}

function serializeStatus(lisensi: {
  installId: string;
  cycle: number;
  activatedAt: Date | null;
  expiresAt: Date | null;
}) {
  const requestCode = formatRequestCode(lisensi.installId, lisensi.cycle);
  return {
    activated: isLisensiAktif(lisensi),
    activatedAt: lisensi.activatedAt?.toISOString() ?? null,
    expiresAt: lisensi.expiresAt?.toISOString() ?? null,
    requestCode,
    ownerWaNumber: OWNER_WA_NUMBER_LOCAL,
    ownerWaLink: buildOwnerWaLink(requestCode),
  };
}

export async function registerActivationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/activation/status', async () => {
    const lisensi = await getOrCreateLisensiAktivasi();
    return serializeStatus(lisensi);
  });

  app.post<{ Body: { code?: string } }>('/api/activation/activate', async (req, reply) => {
    const code = req.body.code?.trim();
    if (!code) return badRequest(reply, 'Kode aktivasi wajib diisi');

    const lisensi = await getOrCreateLisensiAktivasi();
    const valid = verifyActivationCode(lisensi.installId, lisensi.cycle, code);
    if (!valid) return badRequest(reply, 'Kode aktivasi tidak valid');

    const now = new Date();
    const updated = await prisma.lisensiAktivasi.update({
      where: { id: 'default' },
      data: {
        activatedAt: now,
        expiresAt: addActivationDuration(now),
        // Naikkan cycle supaya kode yang baru dipakai ini tidak berlaku lagi
        // untuk permintaan aktivasi berikutnya (setelah lisensi ini kedaluwarsa).
        cycle: { increment: 1 },
      },
    });
    return serializeStatus(updated);
  });
}
