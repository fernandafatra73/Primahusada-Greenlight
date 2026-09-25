/** Rincian kwitansi yang bisa disunting sebelum dicetak.
 *
 * Dipakai bersama oleh kwitansi pendaftaran umum, radiologi, laboratorium,
 * dan farmasi. Barisnya dikunci ke pasangan (jenis, nomor) — nomor kwitansi
 * yang tercetak di kertas — sehingga kwitansi yang sudah keluar bisa dicetak
 * ulang persis sama.
 *
 * Selama sebuah nomor belum pernah disunting, ia tidak punya baris sama
 * sekali dan halaman memakai rincian bawaannya. Baris baru dibuat lewat
 * `inisialisasi`, yang menyalin rincian bawaan itu sekali saja. */

import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { KwitansiJenis } from '../generated/prisma/client.js';
import {
  normalizeNamaRincian,
  parseHarga,
  validasiRincian,
} from '../lib/kwitansiRincian.js';

const JENIS_SAH = new Set<string>(Object.values(KwitansiJenis));

function badRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: message });
}

function parseJenis(nilai: unknown): KwitansiJenis | null {
  return typeof nilai === 'string' && JENIS_SAH.has(nilai) ? (nilai as KwitansiJenis) : null;
}

export async function registerKwitansiRincianRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { jenis?: string; nomor?: string } }>(
    '/api/kwitansi-rincian',
    async (req, reply) => {
      const jenis = parseJenis(req.query.jenis);
      const nomor = req.query.nomor?.trim();
      if (!jenis) return badRequest(reply, 'jenis kwitansi tidak valid');
      if (!nomor) return badRequest(reply, 'nomor kwitansi wajib diisi');

      const items = await prisma.kwitansiRincian.findMany({
        where: { jenis, nomor },
        orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
      });
      return { items };
    },
  );

  /** Menyalin rincian bawaan jadi baris tersimpan, sekali saja. Kalau nomor
   * ini sudah punya baris, yang ada dikembalikan tanpa diubah — supaya
   * suntingan yang sudah dilakukan tidak tertimpa saat pratinjau dibuka lagi. */
  app.post<{
    Body: { jenis?: string; nomor?: string; bawaan?: { nama: string; harga: unknown }[] };
  }>('/api/kwitansi-rincian/inisialisasi', async (req, reply) => {
    const jenis = parseJenis(req.body?.jenis);
    const nomor = req.body?.nomor?.trim();
    if (!jenis) return badRequest(reply, 'jenis kwitansi tidak valid');
    if (!nomor) return badRequest(reply, 'nomor kwitansi wajib diisi');

    const sudahAda = await prisma.kwitansiRincian.findMany({
      where: { jenis, nomor },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
    });
    if (sudahAda.length > 0) return { items: sudahAda, dibuat: false };

    const bawaan = req.body?.bawaan ?? [];
    for (const [urutan, baris] of bawaan.entries()) {
      const nama = normalizeNamaRincian(String(baris.nama ?? ''));
      const harga = parseHarga(baris.harga);
      if (nama === null || harga === null) continue;
      await prisma.kwitansiRincian.create({ data: { jenis, nomor, nama, harga, urutan } });
    }

    const items = await prisma.kwitansiRincian.findMany({
      where: { jenis, nomor },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
    });
    return { items, dibuat: true };
  });

  app.post<{ Body: { jenis?: string; nomor?: string; nama?: string; harga?: unknown } }>(
    '/api/kwitansi-rincian',
    async (req, reply) => {
      const jenis = parseJenis(req.body?.jenis);
      const nomor = req.body?.nomor?.trim();
      if (!jenis) return badRequest(reply, 'jenis kwitansi tidak valid');
      if (!nomor) return badRequest(reply, 'nomor kwitansi wajib diisi');

      const pesan = validasiRincian(req.body?.nama, req.body?.harga);
      if (pesan) return badRequest(reply, pesan);

      const terakhir = await prisma.kwitansiRincian.findFirst({
        where: { jenis, nomor },
        orderBy: { urutan: 'desc' },
      });

      const item = await prisma.kwitansiRincian.create({
        data: {
          jenis,
          nomor,
          nama: normalizeNamaRincian(req.body.nama as string) as string,
          harga: parseHarga(req.body.harga) as number,
          urutan: (terakhir?.urutan ?? -1) + 1,
        },
      });
      return reply.status(201).send({ item });
    },
  );

  app.patch<{ Params: { id: string }; Body: { nama?: string; harga?: unknown } }>(
    '/api/kwitansi-rincian/:id',
    async (req, reply) => {
      const existing = await prisma.kwitansiRincian.findUnique({ where: { id: req.params.id } });
      if (!existing) return reply.status(404).send({ error: 'Rincian tidak ditemukan' });

      let nama = existing.nama;
      if (req.body.nama !== undefined) {
        const bersih = normalizeNamaRincian(req.body.nama);
        if (bersih === null) return badRequest(reply, 'Nama rincian wajib diisi');
        nama = bersih;
      }

      let harga = existing.harga;
      if (req.body.harga !== undefined) {
        const angka = parseHarga(req.body.harga);
        if (angka === null) return badRequest(reply, 'Harga tidak valid — isi angka tidak negatif');
        harga = angka as unknown as typeof existing.harga;
      }

      const item = await prisma.kwitansiRincian.update({
        where: { id: req.params.id },
        data: { nama, harga },
      });
      return { item };
    },
  );

  app.delete<{ Params: { id: string } }>('/api/kwitansi-rincian/:id', async (req, reply) => {
    const existing = await prisma.kwitansiRincian.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Rincian tidak ditemukan' });
    await prisma.kwitansiRincian.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
