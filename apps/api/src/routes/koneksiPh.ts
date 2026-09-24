/** Menu "Koneksi Ke PH": memakai AnyDesk yang sudah terpasang di komputer ini
 * untuk menyambung ke komputer klinik lain.
 *
 * Aplikasi ini tidak membuat saluran jarak jauh sendiri — ia hanya memanggil
 * AnyDesk, jadi permintaan sambungan tetap harus disetujui orang di komputer
 * tujuan sebagaimana perilaku bawaan AnyDesk.
 *
 * Endpoint di sini menjalankan program di mesin server, sehingga dijaga ketat:
 * berkas yang dijalankan hanya AnyDesk dari daftar lokasi tetap, argumennya
 * dilewatkan sebagai array (tanpa shell), dan alamat tujuan wajib lolos
 * `normalizeAnydeskAddress` lebih dulu. */

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  findAnydeskExecutable,
  formatAnydeskId,
  normalizeAnydeskAddress,
  parseAnydeskIdOutput,
} from '../lib/anydesk.js';

const execFileAsync = promisify(execFile);

const GET_ID_TIMEOUT_MS = 8000;

function badRequest(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: message });
}

/** ID komputer ini menurut AnyDesk. Dibaca tiap kali diminta karena AnyDesk
 * baru punya ID setelah layanannya hidup. */
async function readOwnId(exePath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(exePath, ['--get-id'], {
      timeout: GET_ID_TIMEOUT_MS,
      windowsHide: true,
    });
    return parseAnydeskIdOutput(stdout);
  } catch {
    return null;
  }
}

export async function registerKoneksiPhRoutes(app: FastifyInstance): Promise<void> {
  /** Keadaan AnyDesk di komputer ini: terpasang atau belum, dan ID-nya. */
  app.get('/api/koneksi-ph/status', async () => {
    const exePath = findAnydeskExecutable();
    if (!exePath) {
      return {
        terpasang: false,
        id: null,
        idTampil: null,
        pesan:
          'AnyDesk belum terpasang di komputer ini. Pasang AnyDesk lebih dulu, lalu buka kembali menu ini.',
      };
    }

    const id = await readOwnId(exePath);
    return {
      terpasang: true,
      id,
      idTampil: id ? formatAnydeskId(id) : null,
      pesan: id
        ? null
        : 'AnyDesk terpasang tetapi ID belum terbaca. Pastikan aplikasi AnyDesk sedang berjalan.',
    };
  });

  /** Membuka sesi ke komputer tujuan. Yang dijalankan hanya AnyDesk dengan satu
   * argumen alamat yang sudah divalidasi. */
  app.post<{ Body: { alamat?: string } }>('/api/koneksi-ph/sambung', async (req, reply) => {
    const alamat = normalizeAnydeskAddress(req.body?.alamat ?? '');
    if (!alamat) {
      return badRequest(
        reply,
        'Alamat AnyDesk tidak valid. Isi nomor ID (mis. 123 456 789) atau alias yang berakhiran @ad.',
      );
    }

    const exePath = findAnydeskExecutable();
    if (!exePath) {
      return badRequest(reply, 'AnyDesk belum terpasang di komputer ini.');
    }

    // Dilepas berdiri sendiri supaya jendela AnyDesk tetap hidup walau proses
    // server ini nanti berhenti.
    const child = spawn(exePath, [alamat], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();

    return {
      alamat,
      alamatTampil: formatAnydeskId(alamat),
      pesan:
        'Permintaan sambungan dikirim. Sesi baru mulai setelah orang di komputer tujuan menekan Terima di AnyDesk.',
    };
  });

  app.get('/api/komputer-klinik', async () => {
    const items = await prisma.komputerKlinik.findMany({ orderBy: { nama: 'asc' } });
    return { items };
  });

  app.post<{
    Body: { nama: string; anydeskId: string; lokasi?: string; catatan?: string };
  }>('/api/komputer-klinik', async (req, reply) => {
    if (!req.body.nama?.trim()) return badRequest(reply, 'nama wajib diisi');
    const anydeskId = normalizeAnydeskAddress(req.body.anydeskId ?? '');
    if (!anydeskId) return badRequest(reply, 'ID AnyDesk tidak valid');

    const item = await prisma.komputerKlinik.create({
      data: {
        nama: req.body.nama.trim(),
        anydeskId,
        lokasi: req.body.lokasi?.trim() || null,
        catatan: req.body.catatan?.trim() || null,
      },
    });
    return reply.status(201).send({ item });
  });

  app.patch<{
    Params: { id: string };
    Body: { nama?: string; anydeskId?: string; lokasi?: string; catatan?: string };
  }>('/api/komputer-klinik/:id', async (req, reply) => {
    const existing = await prisma.komputerKlinik.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Komputer tidak ditemukan' });

    let anydeskId = existing.anydeskId;
    if (req.body.anydeskId !== undefined) {
      const normalized = normalizeAnydeskAddress(req.body.anydeskId);
      if (!normalized) return badRequest(reply, 'ID AnyDesk tidak valid');
      anydeskId = normalized;
    }

    const item = await prisma.komputerKlinik.update({
      where: { id: req.params.id },
      data: {
        nama: req.body.nama?.trim() || existing.nama,
        anydeskId,
        lokasi: req.body.lokasi === undefined ? existing.lokasi : req.body.lokasi.trim() || null,
        catatan: req.body.catatan === undefined ? existing.catatan : req.body.catatan.trim() || null,
      },
    });
    return { item };
  });

  app.delete<{ Params: { id: string } }>('/api/komputer-klinik/:id', async (req, reply) => {
    const existing = await prisma.komputerKlinik.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Komputer tidak ditemukan' });
    await prisma.komputerKlinik.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
