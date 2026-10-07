/** Menu "Lisensi": berkas perizinan klinik per instansi (RT/RW, Desa, Camat,
 * Puskesmas, Dinas, Film Badge, Bapeten, Perizinan Terpadu). */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { LisensiEntri } from '../generated/prisma/client.js';
import { deleteStoredImage, saveImageDataUrl } from '../lib/fileStorage.js';
import {
  isLisensiJenis,
  isSingleEntryJenis,
  LISENSI_KETERANGAN_MAX_LENGTH,
  LISENSI_NAMA_MAX_LENGTH,
  parseLisensiTanggal,
  validateLisensiBerkas,
} from '../lib/lisensi.js';
import { prisma } from '../lib/prisma.js';

const UPLOAD_SUBDIR = 'lisensi';

interface LisensiBody {
  kategori?: string;
  jenis?: string;
  nama?: string;
  keterangan?: string | null;
  tanggal?: string | null;
  /** Data URL baru, path lama (tidak berubah), atau `null` untuk menghapus berkas. */
  berkas?: string | null;
  berkasNama?: string | null;
  selesai?: boolean;
}

function badRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: message });
}

function serialize(item: LisensiEntri) {
  return {
    id: item.id,
    kategori: item.kategori,
    jenis: item.jenis,
    nama: item.nama,
    keterangan: item.keterangan,
    tanggal: item.tanggal ? item.tanggal.toISOString() : null,
    berkas: item.berkas,
    berkasNama: item.berkasNama,
    selesai: item.selesai,
    createdAt: item.createdAt.toISOString(),
  };
}

/** Validasi field yang sama untuk tambah & ubah; mengembalikan pesan error atau `null`.
 * `berkasLama` adalah path yang sudah tersimpan — mengirimnya kembali berarti tidak berubah. */
function validateCommon(
  b: LisensiBody,
  berkasLama: string | null,
): string | null {
  if (b.nama !== undefined && b.nama.trim().length > LISENSI_NAMA_MAX_LENGTH) {
    return `Nama maksimal ${LISENSI_NAMA_MAX_LENGTH} karakter`;
  }
  if (b.keterangan && b.keterangan.length > LISENSI_KETERANGAN_MAX_LENGTH) {
    return `Keterangan maksimal ${LISENSI_KETERANGAN_MAX_LENGTH} karakter`;
  }
  if (parseLisensiTanggal(b.tanggal) === undefined)
    return 'Tanggal tidak valid';
  if (b.berkas && b.berkas !== berkasLama)
    return validateLisensiBerkas(b.berkas);
  return null;
}

export async function registerLisensiRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{ Querystring: { kategori?: string } }>(
    '/api/lisensi',
    async (req) => {
      const kategori = req.query.kategori?.trim();
      const items = await prisma.lisensiEntri.findMany({
        where: kategori ? { kategori } : undefined,
        orderBy: [{ createdAt: 'asc' }],
      });
      return { items: items.map(serialize) };
    },
  );

  app.post<{ Body: LisensiBody }>('/api/lisensi', async (req, reply) => {
    const b = req.body;
    const kategori = b.kategori?.trim() ?? '';
    const jenis = b.jenis?.trim() ?? '';
    if (!isLisensiJenis(kategori, jenis))
      return badRequest(reply, 'Kategori/jenis lisensi tidak dikenal');
    const nama = b.nama?.trim();
    if (!nama) return badRequest(reply, 'Nama wajib diisi');
    const error = validateCommon(b, null);
    if (error) return badRequest(reply, error);

    if (isSingleEntryJenis(jenis)) {
      const existing = await prisma.lisensiEntri.count({
        where: { kategori, jenis },
      });
      if (existing > 0)
        return badRequest(
          reply,
          'Tanda tangan pejabat sudah ada; ubah yang lama',
        );
    }

    const item = await prisma.lisensiEntri.create({
      data: {
        kategori,
        jenis,
        nama,
        keterangan: b.keterangan?.trim() || null,
        tanggal: parseLisensiTanggal(b.tanggal) ?? null,
        berkas: b.berkas ? saveImageDataUrl(b.berkas, UPLOAD_SUBDIR) : null,
        berkasNama: b.berkas ? b.berkasNama?.trim() || null : null,
        selesai: b.selesai === true,
      },
    });
    return reply.status(201).send({ item: serialize(item) });
  });

  app.patch<{ Params: { id: string }; Body: LisensiBody }>(
    '/api/lisensi/:id',
    async (req, reply) => {
      const existing = await prisma.lisensiEntri.findUnique({
        where: { id: req.params.id },
      });
      if (!existing)
        return reply
          .status(404)
          .send({ error: 'Data lisensi tidak ditemukan' });
      const b = req.body;
      if (b.nama !== undefined && !b.nama.trim())
        return badRequest(reply, 'Nama wajib diisi');
      const error = validateCommon(b, existing.berkas);
      if (error) return badRequest(reply, error);

      let berkas = existing.berkas;
      let berkasNama = existing.berkasNama;
      if (b.berkas !== undefined && b.berkas !== existing.berkas) {
        berkas = b.berkas ? saveImageDataUrl(b.berkas, UPLOAD_SUBDIR) : null;
        berkasNama = b.berkas ? b.berkasNama?.trim() || null : null;
      }

      const item = await prisma.lisensiEntri.update({
        where: { id: existing.id },
        data: {
          nama: b.nama?.trim() ?? existing.nama,
          keterangan:
            b.keterangan !== undefined
              ? b.keterangan?.trim() || null
              : existing.keterangan,
          tanggal:
            b.tanggal !== undefined
              ? (parseLisensiTanggal(b.tanggal) ?? null)
              : existing.tanggal,
          berkas,
          berkasNama,
          selesai: b.selesai ?? existing.selesai,
        },
      });
      // Hapus file lama hanya setelah record baru tersimpan, supaya tidak ada path yang menggantung.
      if (berkas !== existing.berkas) deleteStoredImage(existing.berkas);
      return { item: serialize(item) };
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/lisensi/:id',
    async (req, reply) => {
      const existing = await prisma.lisensiEntri.findUnique({
        where: { id: req.params.id },
      });
      if (!existing)
        return reply
          .status(404)
          .send({ error: 'Data lisensi tidak ditemukan' });
      await prisma.lisensiEntri.delete({ where: { id: existing.id } });
      deleteStoredImage(existing.berkas);
      return { ok: true };
    },
  );
}
