import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { deleteStoredImage, UPLOADS_DIR } from '../lib/fileStorage.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import {
  buatNamaBerkasTersimpan,
  isSimpanDataKategori,
  kategoriDariNamaBerkas,
  SIMPAN_DATA_KETERANGAN_MAX_LENGTH,
  SIMPAN_DATA_MAX_BYTES,
  SIMPAN_DATA_NAMA_MAX_LENGTH,
  SIMPAN_DATA_SUBDIR,
} from '../lib/simpanData.js';

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.status(400).send({ error: message });
}

interface SimpanDataDto {
  id: string;
  nama: string;
  kategori: string;
  keterangan: string | null;
  berkas: string;
  berkasNama: string;
  ukuran: number;
  createdAt: string;
}

function serialize(item: {
  id: string;
  nama: string;
  kategori: string;
  keterangan: string | null;
  berkas: string;
  berkasNama: string;
  ukuran: number;
  createdAt: Date;
}): SimpanDataDto {
  return {
    id: item.id,
    nama: item.nama,
    kategori: item.kategori,
    keterangan: item.keterangan,
    berkas: item.berkas,
    berkasNama: item.berkasNama,
    ukuran: item.ukuran,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function registerSimpanDataRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { page?: string; limit?: string; q?: string; kategori?: string } }>(
    '/api/simpan-data',
    async (req) => {
      const { page, limit, skip } = parsePagination(req.query);
      const q = req.query.q?.trim();
      const kategori = isSimpanDataKategori(req.query.kategori) ? req.query.kategori : undefined;
      const where = {
        ...(kategori ? { kategori } : {}),
        ...(q
          ? {
              OR: [
                { nama: { contains: q } },
                { berkasNama: { contains: q } },
                { keterangan: { contains: q } },
              ],
            }
          : {}),
      };
      const [total, items] = await Promise.all([
        prisma.simpanData.count({ where }),
        prisma.simpanData.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      ]);
      return { items: items.map(serialize), pagination: buildPaginationMeta(total, page, limit) };
    },
  );

  // Isi berkas dikirim mentah (application/octet-stream) agar tidak membengkak
  // seperti base64; metadata lewat query string. Parser octet-stream sudah
  // didaftarkan di routes/backup.ts.
  app.post<{
    Querystring: { nama?: string; berkasNama?: string; kategori?: string; keterangan?: string };
  }>('/api/simpan-data', { bodyLimit: SIMPAN_DATA_MAX_BYTES }, async (req, reply) => {
    const body = req.body as Buffer | undefined;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return badRequest(reply, 'Berkas kosong atau tidak valid');
    }
    const berkasNama = req.query.berkasNama?.trim();
    if (!berkasNama) return badRequest(reply, 'berkasNama wajib diisi');
    const nama = (req.query.nama?.trim() || berkasNama).slice(0, SIMPAN_DATA_NAMA_MAX_LENGTH);
    const kategori = isSimpanDataKategori(req.query.kategori)
      ? req.query.kategori
      : kategoriDariNamaBerkas(berkasNama);
    const keterangan =
      req.query.keterangan?.trim().slice(0, SIMPAN_DATA_KETERANGAN_MAX_LENGTH) || null;

    const dir = join(UPLOADS_DIR, SIMPAN_DATA_SUBDIR);
    mkdirSync(dir, { recursive: true });
    const tersimpan = buatNamaBerkasTersimpan(berkasNama);
    writeFileSync(join(dir, tersimpan), body);

    const item = await prisma.simpanData.create({
      data: {
        nama,
        kategori,
        keterangan,
        berkas: `/uploads/${SIMPAN_DATA_SUBDIR}/${tersimpan}`,
        berkasNama,
        ukuran: body.length,
      },
    });
    return reply.status(201).send({ item: serialize(item) });
  });

  app.delete<{ Params: { id: string } }>('/api/simpan-data/:id', async (req, reply) => {
    const existing = await prisma.simpanData.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data tidak ditemukan' });
    await prisma.simpanData.delete({ where: { id: existing.id } });
    deleteStoredImage(existing.berkas);
    return { ok: true };
  });
}
