import type { FastifyInstance } from 'fastify';
import { deleteStoredImage, saveImageDataUrl } from '../lib/fileStorage.js';
import { prisma } from '../lib/prisma.js';
import {
  isStrukturJabatan,
  isValidStrukturFoto,
  STRUKTUR_JABATAN,
  STRUKTUR_NAMA_MAX_LENGTH,
} from '../lib/strukturOrganisasi.js';

const UPLOAD_SUBDIR = 'struktur-organisasi';

export async function registerStrukturOrganisasiRoutes(app: FastifyInstance): Promise<void> {
  // Selalu mengembalikan semua posisi, termasuk yang belum pernah diisi.
  app.get('/api/struktur-organisasi', async () => {
    const rows = await prisma.strukturOrganisasi.findMany();
    const byJabatan = new Map(rows.map((r) => [r.jabatan, r]));
    return {
      items: STRUKTUR_JABATAN.map((jabatan) => ({
        jabatan,
        nama: byJabatan.get(jabatan)?.nama ?? '',
        foto: byJabatan.get(jabatan)?.foto ?? null,
      })),
    };
  });

  app.put<{ Params: { jabatan: string }; Body: { nama?: string; foto?: string } }>(
    '/api/struktur-organisasi/:jabatan',
    async (req, reply) => {
      const { jabatan } = req.params;
      if (!isStrukturJabatan(jabatan)) {
        return reply.status(404).send({ error: 'Posisi tidak ditemukan' });
      }
      const { nama, foto } = req.body ?? {};
      if (foto !== undefined && !isValidStrukturFoto(foto)) {
        return reply.status(400).send({ error: 'Foto harus berupa gambar' });
      }

      const existing = await prisma.strukturOrganisasi.findUnique({ where: { jabatan } });
      let fotoBaru = existing?.foto ?? null;
      if (foto !== undefined && foto !== (existing?.foto ?? '')) {
        fotoBaru = foto ? saveImageDataUrl(foto, UPLOAD_SUBDIR) : null;
        deleteStoredImage(existing?.foto);
      }
      const namaBaru =
        nama === undefined ? (existing?.nama ?? '') : nama.trim().slice(0, STRUKTUR_NAMA_MAX_LENGTH);

      const item = await prisma.strukturOrganisasi.upsert({
        where: { jabatan },
        create: { jabatan, nama: namaBaru, foto: fotoBaru },
        update: { nama: namaBaru, foto: fotoBaru },
      });
      return { item: { jabatan: item.jabatan, nama: item.nama, foto: item.foto } };
    },
  );
}
