/** Menu Lisensi > Surat Sehat dan Lisensi > Hasil Lab: pemeriksaan kesehatan
 * tahunan karyawan klinik, diarsipkan per tahun. */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type {
  LisensiHasilLab,
  LisensiHasilLabItem,
  LisensiSuratSehat,
} from '../generated/prisma/client.js';
import { deleteStoredImage, saveImageDataUrl } from '../lib/fileStorage.js';
import { validateLisensiBerkas } from '../lib/lisensi.js';
import {
  parseHasilLabBody,
  parseSuratSehatBody,
} from '../lib/lisensiKaryawan.js';
import { prisma } from '../lib/prisma.js';

const UPLOAD_SUBDIR = 'lisensi';

type Body = Readonly<Record<string, unknown>>;

function badRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: message });
}

/** `?tahun=2026` → 2026; kosong/tidak valid → undefined (semua tahun). */
function parseTahunQuery(value: string | undefined): number | undefined {
  const tahun = Number(value);
  return Number.isInteger(tahun) && tahun > 1900 && tahun < 3000
    ? tahun
    : undefined;
}

/**
 * Tentukan berkas yang disimpan: `undefined` di body = tidak berubah, `null`/'' = dihapus,
 * path lama = tidak berubah, data URL = file baru. Mengembalikan pesan error untuk nilai lain.
 */
function resolveBerkas(
  value: unknown,
  lama: string | null,
):
  | { readonly berkas: string | null; readonly berubah: boolean }
  | { readonly error: string } {
  if (value === undefined || value === lama)
    return { berkas: lama, berubah: false };
  if (value === null || value === '')
    return { berkas: null, berubah: lama !== null };
  if (typeof value !== 'string') return { error: 'Berkas tidak valid' };
  const error = validateLisensiBerkas(value);
  if (error) return { error };
  return { berkas: saveImageDataUrl(value, UPLOAD_SUBDIR), berubah: true };
}

function serializeSuratSehat(item: LisensiSuratSehat) {
  return {
    ...item,
    tanggalPeriksa: item.tanggalPeriksa.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeHasilLab(
  item: LisensiHasilLab & { items: LisensiHasilLabItem[] },
) {
  return {
    ...item,
    tanggalPeriksa: item.tanggalPeriksa.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    items: item.items.map(
      ({ jenis, parameter, hasil, satuan, nilaiNormal }) => ({
        jenis,
        parameter,
        hasil,
        satuan,
        nilaiNormal,
      }),
    ),
  };
}

async function daftarTahun(
  model: 'suratSehat' | 'hasilLab',
): Promise<number[]> {
  const rows =
    model === 'suratSehat'
      ? await prisma.lisensiSuratSehat.findMany({
          distinct: ['tahun'],
          select: { tahun: true },
          orderBy: { tahun: 'desc' },
        })
      : await prisma.lisensiHasilLab.findMany({
          distinct: ['tahun'],
          select: { tahun: true },
          orderBy: { tahun: 'desc' },
        });
  return rows.map((row) => row.tahun);
}

export async function registerLisensiKaryawanRoutes(
  app: FastifyInstance,
): Promise<void> {
  // ---------- Surat Sehat ----------
  app.get<{ Querystring: { tahun?: string } }>(
    '/api/lisensi-surat-sehat',
    async (req) => {
      const tahun = parseTahunQuery(req.query.tahun);
      const items = await prisma.lisensiSuratSehat.findMany({
        where: tahun ? { tahun } : undefined,
        orderBy: [{ tanggalPeriksa: 'asc' }, { createdAt: 'asc' }],
      });
      return {
        items: items.map(serializeSuratSehat),
        tahunTersedia: await daftarTahun('suratSehat'),
      };
    },
  );

  app.post<{ Body: Body }>('/api/lisensi-surat-sehat', async (req, reply) => {
    const parsed = parseSuratSehatBody(req.body);
    if (!parsed.ok) return badRequest(reply, parsed.error);
    const ttd = resolveBerkas(req.body.ttdDokter, null);
    if ('error' in ttd) return badRequest(reply, ttd.error);
    const item = await prisma.lisensiSuratSehat.create({
      data: { ...parsed.data, ttdDokter: ttd.berkas },
    });
    return reply.status(201).send({ item: serializeSuratSehat(item) });
  });

  app.patch<{ Params: { id: string }; Body: Body }>(
    '/api/lisensi-surat-sehat/:id',
    async (req, reply) => {
      const existing = await prisma.lisensiSuratSehat.findUnique({
        where: { id: req.params.id },
      });
      if (!existing)
        return reply.status(404).send({ error: 'Surat sehat tidak ditemukan' });
      const parsed = parseSuratSehatBody(req.body);
      if (!parsed.ok) return badRequest(reply, parsed.error);
      const ttd = resolveBerkas(req.body.ttdDokter, existing.ttdDokter);
      if ('error' in ttd) return badRequest(reply, ttd.error);
      const item = await prisma.lisensiSuratSehat.update({
        where: { id: existing.id },
        data: { ...parsed.data, ttdDokter: ttd.berkas },
      });
      if (ttd.berubah) deleteStoredImage(existing.ttdDokter);
      return { item: serializeSuratSehat(item) };
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/lisensi-surat-sehat/:id',
    async (req, reply) => {
      const existing = await prisma.lisensiSuratSehat.findUnique({
        where: { id: req.params.id },
      });
      if (!existing)
        return reply.status(404).send({ error: 'Surat sehat tidak ditemukan' });
      await prisma.lisensiSuratSehat.delete({ where: { id: existing.id } });
      deleteStoredImage(existing.ttdDokter);
      return { ok: true };
    },
  );

  // ---------- Hasil Lab ----------
  const includeItems = { items: { orderBy: { urutan: 'asc' as const } } };

  app.get<{ Querystring: { tahun?: string } }>(
    '/api/lisensi-hasil-lab',
    async (req) => {
      const tahun = parseTahunQuery(req.query.tahun);
      const items = await prisma.lisensiHasilLab.findMany({
        where: tahun ? { tahun } : undefined,
        orderBy: [{ tanggalPeriksa: 'asc' }, { createdAt: 'asc' }],
        include: includeItems,
      });
      return {
        items: items.map(serializeHasilLab),
        tahunTersedia: await daftarTahun('hasilLab'),
      };
    },
  );

  app.post<{ Body: Body }>('/api/lisensi-hasil-lab', async (req, reply) => {
    const parsed = parseHasilLabBody(req.body);
    if (!parsed.ok) return badRequest(reply, parsed.error);
    const berkas = resolveBerkas(req.body.berkas, null);
    if ('error' in berkas) return badRequest(reply, berkas.error);
    const { items, ...data } = parsed.data;
    const item = await prisma.lisensiHasilLab.create({
      data: {
        ...data,
        berkas: berkas.berkas,
        berkasNama:
          berkas.berkas && typeof req.body.berkasNama === 'string'
            ? req.body.berkasNama.trim() || null
            : null,
        items: { create: [...items] },
      },
      include: includeItems,
    });
    return reply.status(201).send({ item: serializeHasilLab(item) });
  });

  app.patch<{ Params: { id: string }; Body: Body }>(
    '/api/lisensi-hasil-lab/:id',
    async (req, reply) => {
      const existing = await prisma.lisensiHasilLab.findUnique({
        where: { id: req.params.id },
      });
      if (!existing)
        return reply.status(404).send({ error: 'Hasil lab tidak ditemukan' });
      const parsed = parseHasilLabBody(req.body);
      if (!parsed.ok) return badRequest(reply, parsed.error);
      const berkas = resolveBerkas(req.body.berkas, existing.berkas);
      if ('error' in berkas) return badRequest(reply, berkas.error);
      const berkasNama = !berkas.berubah
        ? existing.berkasNama
        : berkas.berkas && typeof req.body.berkasNama === 'string'
          ? req.body.berkasNama.trim() || null
          : null;
      const { items, ...data } = parsed.data;
      // Daftar parameter diganti utuh: lebih sederhana daripada mencocokkan baris satu per satu.
      const [, item] = await prisma.$transaction([
        prisma.lisensiHasilLabItem.deleteMany({
          where: { hasilLabId: existing.id },
        }),
        prisma.lisensiHasilLab.update({
          where: { id: existing.id },
          data: {
            ...data,
            berkas: berkas.berkas,
            berkasNama,
            items: { create: [...items] },
          },
          include: includeItems,
        }),
      ]);
      if (berkas.berubah) deleteStoredImage(existing.berkas);
      return { item: serializeHasilLab(item) };
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/lisensi-hasil-lab/:id',
    async (req, reply) => {
      const existing = await prisma.lisensiHasilLab.findUnique({
        where: { id: req.params.id },
      });
      if (!existing)
        return reply.status(404).send({ error: 'Hasil lab tidak ditemukan' });
      await prisma.lisensiHasilLab.delete({ where: { id: existing.id } });
      deleteStoredImage(existing.berkas);
      return { ok: true };
    },
  );
}
