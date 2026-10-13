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
import { serializeDecimal } from '../lib/serialize.js';
import { KwitansiJenis } from '../generated/prisma/client.js';
import {
  isDokterUmum,
  isKategoriPilihan,
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

  /** Daftar pemeriksaan/item beserta harganya dari data master, untuk dipilih
   * saat menambah baris rincian. Dokter tidak punya tarif di data master,
   * jadi harganya 0 dan diisi manual. */
  app.get<{ Querystring: { kategori?: string } }>(
    '/api/kwitansi-rincian/pilihan',
    async (req, reply) => {
      const kategori = req.query.kategori;
      if (!isKategoriPilihan(kategori)) return badRequest(reply, 'kategori tidak valid');

      if (kategori === 'radiologi') {
        const rows = await prisma.hargaLayanan.findMany({
          include: { jenisPemeriksaan: true },
          orderBy: { jenisPemeriksaan: { nama: 'asc' } },
        });
        return { items: rows.map((r) => ({ nama: r.jenisPemeriksaan.nama, harga: (serializeDecimal(r.harga) ?? '0') })) };
      }

      if (kategori === 'laboratorium') {
        const paket = await prisma.paketLab.findMany({
          orderBy: { urutan: 'asc' },
          include: { items: { orderBy: { urutan: 'asc' } } },
        });
        const dilihat = new Set<string>();
        const items: { nama: string; harga: string }[] = [];
        for (const p of paket) {
          if (!dilihat.has(p.nama)) {
            dilihat.add(p.nama);
            items.push({ nama: p.nama, harga: (serializeDecimal(p.harga) ?? '0') });
          }
        }
        for (const p of paket) {
          for (const it of p.items) {
            if (Number(it.harga) > 0 && !dilihat.has(it.pemeriksaan)) {
              dilihat.add(it.pemeriksaan);
              items.push({ nama: it.pemeriksaan, harga: (serializeDecimal(it.harga) ?? '0') });
            }
          }
        }
        return { items };
      }

      if (kategori === 'farmasi') {
        const rows = await prisma.farmasiBhp.findMany({ orderBy: { nama: 'asc' } });
        return { items: rows.map((r) => ({ nama: r.nama, harga: serializeDecimal(r.hargaJual) ?? '0' })) };
      }

      const umum = kategori === 'dokter-umum';
      const dokter = await prisma.dokter.findMany({ orderBy: { nama: 'asc' } });
      const label = umum ? 'Dokter Umum' : 'Dokter Spesialis';
      const items = dokter
        .filter((d) => isDokterUmum(d.spesialisasi) === umum)
        .map((d) => ({
          nama: umum || !d.spesialisasi?.trim() ? `${label} - ${d.nama}` : `${label} ${d.spesialisasi.trim()} - ${d.nama}`,
          harga: '0',
        }));
      return { items: [{ nama: label, harga: '0' }, ...items] };
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
