/** Masa aktivasi aplikasi — isi tombol "Expired" di Mega Data dan menu Aktivasi > Perpanjang. */

import type { FastifyInstance } from 'fastify';
import type { AktivasiAplikasi, KodeAktivasi } from '../generated/prisma/client.js';
import {
  buatKodeAktivasi,
  formatTanggal,
  parseAktivasiBody,
  tambahBulan,
  tanggalKode,
  type AktivasiAplikasiBody,
} from '../lib/aktivasiAplikasi.js';
import { prisma } from '../lib/prisma.js';

const AKTIVASI_ID = 'default';
// Tabrakan kode acak hampir mustahil (32^8), tapi tetap dicoba ulang daripada gagal.
const PERCOBAAN_BUAT_KODE = 3;

interface AktivasiAplikasiDto {
  readonly tanggalAktivasi: string;
  readonly lamaBulan: number;
  /** Hari pertama aplikasi terkunci (YYYY-MM-DD). */
  readonly berakhir: string;
}

interface KodeAktivasiDto {
  readonly id: string;
  readonly kode: string;
  readonly createdAt: string;
  readonly dipakaiPada: string | null;
}

function serialize(item: AktivasiAplikasi): AktivasiAplikasiDto {
  return {
    tanggalAktivasi: formatTanggal(item.tanggalAktivasi),
    lamaBulan: item.lamaBulan,
    berakhir: formatTanggal(tambahBulan(item.tanggalAktivasi, item.lamaBulan)),
  };
}

function serializeKode(item: KodeAktivasi): KodeAktivasiDto {
  return {
    id: item.id,
    kode: item.kode,
    createdAt: item.createdAt.toISOString(),
    dipakaiPada: item.dipakaiPada?.toISOString() ?? null,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002';
}

export async function registerAktivasiAplikasiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/aktivasi-aplikasi', async () => {
    const item = await prisma.aktivasiAplikasi.findUnique({ where: { id: AKTIVASI_ID } });
    return { aktivasi: item ? serialize(item) : null };
  });

  app.post<{ Body: AktivasiAplikasiBody }>('/api/aktivasi-aplikasi', async (req, reply) => {
    const parsed = parseAktivasiBody(req.body ?? {});
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    const { kode, ...data } = parsed.data;

    const item = await prisma.$transaction(async (tx) => {
      // Klaim kode secara atomik: hanya berhasil bila kode ada dan belum pernah dipakai.
      const klaim = await tx.kodeAktivasi.updateMany({
        where: { kode, dipakaiPada: null },
        data: { dipakaiPada: new Date() },
      });
      if (klaim.count === 0) return null;
      return tx.aktivasiAplikasi.upsert({
        where: { id: AKTIVASI_ID },
        create: { id: AKTIVASI_ID, ...data },
        update: data,
      });
    });
    if (!item) return reply.status(400).send({ error: 'Kode aktivasi salah atau sudah dipakai' });
    return { aktivasi: serialize(item) };
  });

  app.get('/api/kode-aktivasi', async () => {
    const items = await prisma.kodeAktivasi.findMany({ orderBy: [{ tanggal: 'desc' }, { urutan: 'desc' }] });
    return { items: items.map(serializeKode) };
  });

  app.post('/api/kode-aktivasi', async (_req, reply) => {
    const tanggal = tanggalKode(new Date());
    for (let percobaan = 1; ; percobaan += 1) {
      const terakhir = await prisma.kodeAktivasi.findFirst({ where: { tanggal }, orderBy: { urutan: 'desc' } });
      const urutan = (terakhir?.urutan ?? 0) + 1;
      try {
        const item = await prisma.kodeAktivasi.create({
          data: { kode: buatKodeAktivasi(tanggal, urutan), tanggal, urutan },
        });
        return reply.status(201).send({ item: serializeKode(item) });
      } catch (err: unknown) {
        if (!isUniqueViolation(err) || percobaan >= PERCOBAAN_BUAT_KODE) {
          throw new Error('Gagal membuat kode aktivasi', { cause: err });
        }
      }
    }
  });

  app.delete<{ Params: { id: string } }>('/api/kode-aktivasi/:id', async (req, reply) => {
    const existing = await prisma.kodeAktivasi.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Kode aktivasi tidak ditemukan' });
    await prisma.kodeAktivasi.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
