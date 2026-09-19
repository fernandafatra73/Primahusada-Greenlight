import type { FastifyInstance, FastifyReply } from 'fastify';
import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '../lib/prisma.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';
import { generateContentWithFallback } from './analisaFotoAi.js';

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.status(400).send({ error: message });
}

const ALLOWED_IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type AllowedImageMediaType = (typeof ALLOWED_IMAGE_MEDIA_TYPES)[number];

function parseImageDataUrl(
  dataUrl: string,
): { readonly mediaType: AllowedImageMediaType; readonly data: string } | null {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  const [, mediaType, data] = match;
  if (!ALLOWED_IMAGE_MEDIA_TYPES.includes(mediaType as AllowedImageMediaType)) return null;
  return { mediaType: mediaType as AllowedImageMediaType, data: data! };
}

export interface LabParameter {
  readonly pemeriksaan: string;
  readonly hasil: string;
  readonly nilaiRujukan?: string;
  readonly satuan?: string;
}

export const MAX_PARAMETERS = 50;

export function sanitizeParameters(value: unknown): LabParameter[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (p): p is LabParameter =>
        Boolean(p) &&
        typeof p === 'object' &&
        typeof (p as { pemeriksaan?: unknown }).pemeriksaan === 'string' &&
        (p as { pemeriksaan: string }).pemeriksaan.trim().length > 0 &&
        typeof (p as { hasil?: unknown }).hasil === 'string',
    )
    .slice(0, MAX_PARAMETERS)
    .map((p) => ({
      pemeriksaan: p.pemeriksaan.trim(),
      hasil: p.hasil.trim(),
      nilaiRujukan: typeof p.nilaiRujukan === 'string' ? p.nilaiRujukan.trim() : undefined,
      satuan: typeof p.satuan === 'string' ? p.satuan.trim() : undefined,
    }));
}

/// Format daftar parameter jadi teks yang dikirim ke Gemini. Dipisah dari
/// pemanggilan Gemini-nya sendiri supaya bisa dites tanpa API key/network.
export function formatParametersForPrompt(kategori: string, parameters: readonly LabParameter[]): string {
  const lines = parameters.map((p, index) => {
    const rujukan = p.nilaiRujukan ? `, nilai rujukan: ${p.nilaiRujukan}` : '';
    const satuan = p.satuan ? ` ${p.satuan}` : '';
    return `${index + 1}. ${p.pemeriksaan}: ${p.hasil}${satuan}${rujukan}`;
  });
  return [`Kategori pemeriksaan: ${kategori}`, 'Data hasil pemeriksaan:', ...lines].join('\n');
}

const ANALISA_LAB_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    namaPenyakit: {
      type: Type.STRING,
      description:
        'Perkiraan nama penyakit/kondisi yang paling sesuai dengan pola hasil lab ini (mis. "Anemia", "Demam Tifoid", "Dislipidemia"). Isi "Tidak dapat ditentukan" kalau semua nilai normal atau tidak ada pola yang jelas.',
    },
    kesan: {
      type: Type.STRING,
      description:
        'Kesimpulan singkat: sebutkan parameter yang di luar nilai rujukan (tinggi/rendah) dan interpretasi klinisnya, dalam Bahasa Indonesia.',
    },
  },
  required: ['namaPenyakit', 'kesan'],
};

const ANALISA_LAB_SYSTEM_PROMPT = `Anda adalah asisten AI yang membantu petugas laboratorium & dokter di sebuah klinik menginterpretasi hasil pemeriksaan laboratorium (Hematologi, Kimia Darah, atau Widal) untuk membuat DRAFT AWAL kesimpulan, bukan diagnosis final.

Aturan:
- Hasil Anda akan selalu ditampilkan ke pengguna dengan label eksplisit sebagai "draft AI yang wajib ditinjau ulang oleh petugas lab/dokter" — Anda tidak perlu menambahkan disclaimer itu sendiri di dalam teks, cukup fokus pada isi kesan & nama penyakit.
- Bandingkan tiap nilai hasil dengan nilai rujukan (normal range) yang diberikan; sebutkan parameter mana yang di luar batas normal (tinggi/rendah) dan apa artinya secara klinis.
- Untuk Widal: titer yang meningkat pada satu atau lebih antigen Salmonella (O/H) mengindikasikan kemungkinan demam tifoid — sebutkan itu di kesan kalau relevan, tapi tetap tegaskan ini draft, bukan diagnosis final.
- Kalau semua nilai dalam batas normal, katakan itu secara jujur — jangan mengarang kelainan yang tidak ada.
- Jangan berikan rekomendasi pengobatan, dosis obat, atau resep.
- Tulis dalam Bahasa Indonesia, ringkas, dan gunakan istilah medis yang wajar dipakai tenaga laboratorium Indonesia.
- Jawab HANYA sesuai skema JSON yang diberikan.`;

export function sanitizeParameterNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .slice(0, MAX_PARAMETERS)
    .map((v) => v.trim());
}

const RIBUAN_PARAMETER_PATTERN = /leukosit|trombosit|\bwbc\b|\bplt\b/i;

export function formatHasilRibuan(pemeriksaan: string, hasil: string): string {
  if (!RIBUAN_PARAMETER_PATTERN.test(pemeriksaan)) return hasil;
  const digitsOnly = hasil.trim().replace(/\./g, '');
  if (!/^\d{4,}$/.test(digitsOnly)) return hasil;
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const READ_FOTO_RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      pemeriksaan: {
        type: Type.STRING,
        description: 'Nama parameter, harus persis salah satu dari daftar yang diberikan.',
      },
      hasil: {
        type: Type.STRING,
        description:
          'Nilai hasil untuk parameter itu, disalin persis seperti tertulis di foto (angka/rasio/tanda +-/negatif-positif saja, TANPA nama parameter atau satuan). String kosong "" kalau parameter itu tidak ditemukan/tidak terbaca di foto.',
      },
    },
    required: ['pemeriksaan', 'hasil'],
  },
};

const READ_FOTO_SYSTEM_PROMPT = `Anda adalah asisten AI yang membaca foto hasil pemeriksaan laboratorium (mis. print out alat analyzer, kertas hasil manual, atau foto tulisan tangan) dan mengekstrak nilai hasilnya.

Aturan:
- Anda akan diberi daftar nama parameter yang harus dicari nilainya di foto.
- Untuk tiap nama parameter di daftar, cari baris/bagian foto yang menyebut parameter itu (nama di foto boleh beda singkatan/kapitalisasi/urutan kata asal maksudnya sama, mis. "Hb"/"RGB" untuk Hemoglobin, "WBC" untuk Leukosit, "PLT" untuk Trombosit, "RBC" untuk Eritrosit, "Ht"/"HCT" untuk Hematokrit) dan isi "hasil" HANYA dengan angka/nilainya saja (mis. "8500"), JANGAN sertakan nama parameter, singkatannya, atau satuannya di dalam "hasil".
- Kalau parameter itu tidak ditemukan atau tidak terbaca jelas di foto, isi "hasil" dengan string kosong "" — JANGAN mengarang nilai yang tidak ada di foto.
- Khusus Leukosit (WBC) dan Trombosit (PLT): sebagian alat analyzer mencetak nilainya dalam notasi ribuan (satuan "10^3/uL", "x10^3/uL", "10^9/L", atau "K/uL", biasanya angka desimal kecil seperti "8.5" atau "210"). Kalau Anda melihat notasi ribuan seperti itu, KALIKAN 1000 dulu supaya sesuai dengan nilai rujukan yang dalam satuan penuh (mis. nilai rujukan "4.000-10.000/uL" berarti hasilnya harus dalam ribuan penuh seperti "8500", bukan "8.5"). Kalau di foto nilainya SUDAH tertulis dalam angka penuh (mis. "8500"), JANGAN dikalikan lagi.
- Khusus kategori Diffcount (Eosinofil, Basofil, Staff, Netrofil Segmen, Limposit, Monosit): alat analyzer 3-part differential biasanya HANYA mencetak 3 nilai persentase gabungan — LYM% (limfosit), MID%/MXD% (sel ukuran sedang: gabungan monosit+eosinofil+basofil) dan GRA% (granulosit: gabungan neutrofil segmen+neutrofil batang/staff+eosinofil+basofil). Alat jenis ini TIDAK BISA membedakan Staff (neutrofil batang/imatur) dari Netrofil Segmen (neutrofil matang) — keduanya sama-sama tercampur di dalam GRA%. Kalau daftar parameter berisi nama-nama Diffcount ini, petakan dari foto sebagai berikut:
  - "Netrofil Segmen" → ambil dari GRA% (persentase granulosit).
  - "Limposit" → ambil dari LYM% (persentase limfosit).
  - "Monosit" → ambil dari MID% atau MXD% (persentase sel ukuran sedang).
  - "Staff" → ambil dari MID# atau MXD# (jumlah ABSOLUT sel ukuran sedang, bukan persen) — isi otomatis dengan angka ini seperti parameter lainnya.
  - "Eosinofil" dan "Basofil" → isi string kosong "" (alat 3-part tidak bisa memisahkan kedua nilai ini secara tersendiri, JANGAN mengarang angka 0 atau angka lain). Biarkan petugas lab mengisi keduanya secara manual berdasarkan pemeriksaan hapusan darah, lalu menyesuaikan Netrofil Segmen supaya totalnya tetap 100%.
- Kembalikan HANYA parameter-parameter yang ada di daftar yang diberikan, dengan nama "pemeriksaan" persis sama seperti di daftar (bukan nama/singkatan yang tertulis di foto).
- Jawab HANYA sesuai skema JSON yang diberikan.`;

export async function registerAnalisaLabAiRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { page?: string; limit?: string; q?: string } }>('/api/analisa-lab-ai', async (req) => {
    const { page, limit, skip } = parsePagination(req.query);
    const q = req.query.q?.trim();
    const where = q ? { namaPasien: { contains: q } } : {};
    const [total, items] = await Promise.all([
      prisma.analisaLabAi.count({ where }),
      prisma.analisaLabAi.findMany({
        where,
        orderBy: { tanggal: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        parameterData: JSON.parse(item.parameterData) as LabParameter[],
        tanggal: item.tanggal.toISOString(),
      })),
      pagination: buildPaginationMeta(total, page, limit),
    };
  });

  app.post<{
    Body: {
      namaPasien?: string;
      kategori?: string;
      parameterData?: unknown;
      namaPenyakit?: string;
      kesan?: string;
      isDraftAi?: boolean;
      petugasLabNama?: string;
      tanggal?: string;
    };
  }>('/api/analisa-lab-ai', async (req, reply) => {
    const b = req.body;
    const parameters = sanitizeParameters(b.parameterData);
    if (!b.namaPasien?.trim() || !b.kategori?.trim() || parameters.length === 0) {
      return badRequest(reply, 'namaPasien, kategori, dan parameterData wajib diisi');
    }
    const item = await prisma.analisaLabAi.create({
      data: {
        namaPasien: b.namaPasien.trim(),
        kategori: b.kategori.trim(),
        parameterData: JSON.stringify(parameters),
        namaPenyakit: b.namaPenyakit?.trim() || null,
        kesan: b.kesan?.trim() || null,
        isDraftAi: b.isDraftAi ?? false,
        petugasLabNama: b.petugasLabNama?.trim() || null,
        tanggal: b.tanggal ? new Date(b.tanggal) : new Date(),
      },
    });
    return reply.status(201).send({
      item: { ...item, parameterData: parameters, tanggal: item.tanggal.toISOString() },
    });
  });

  app.patch<{
    Params: { id: string };
    Body: {
      namaPasien?: string;
      kategori?: string;
      parameterData?: unknown;
      namaPenyakit?: string;
      kesan?: string;
      isDraftAi?: boolean;
      petugasLabNama?: string;
      tanggal?: string;
    };
  }>('/api/analisa-lab-ai/:id', async (req, reply) => {
    const existing = await prisma.analisaLabAi.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data analisa lab AI tidak ditemukan' });
    const b = req.body;
    const parameters = b.parameterData !== undefined ? sanitizeParameters(b.parameterData) : null;
    const item = await prisma.analisaLabAi.update({
      where: { id: req.params.id },
      data: {
        namaPasien: b.namaPasien?.trim() ?? existing.namaPasien,
        kategori: b.kategori?.trim() ?? existing.kategori,
        parameterData: parameters ? JSON.stringify(parameters) : existing.parameterData,
        namaPenyakit: b.namaPenyakit !== undefined ? b.namaPenyakit?.trim() || null : existing.namaPenyakit,
        kesan: b.kesan !== undefined ? b.kesan?.trim() || null : existing.kesan,
        isDraftAi: b.isDraftAi ?? existing.isDraftAi,
        petugasLabNama:
          b.petugasLabNama !== undefined ? b.petugasLabNama?.trim() || null : existing.petugasLabNama,
        tanggal: b.tanggal ? new Date(b.tanggal) : existing.tanggal,
      },
    });
    return {
      item: {
        ...item,
        parameterData: JSON.parse(item.parameterData) as LabParameter[],
        tanggal: item.tanggal.toISOString(),
      },
    };
  });

  app.delete<{ Params: { id: string } }>('/api/analisa-lab-ai/:id', async (req) => {
    await prisma.analisaLabAi.delete({ where: { id: req.params.id } });
    return { ok: true };
  });

  app.post<{
    Body: { namaPasien?: string; kategori?: string; parameterData?: unknown };
  }>('/api/analisa-lab-ai/analyze', async (req, reply) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reply.status(503).send({
        error: 'Fitur analisa AI belum dikonfigurasi. Admin perlu mengatur GEMINI_API_KEY di server.',
      });
    }

    const kategori = req.body.kategori?.trim();
    if (!kategori) return badRequest(reply, 'kategori wajib diisi');
    const parameters = sanitizeParameters(req.body.parameterData);
    if (parameters.length === 0) return badRequest(reply, 'parameterData wajib diisi');

    const namaPasien = req.body.namaPasien?.trim();
    const promptText = [
      namaPasien ? `Nama pasien: ${namaPasien}` : null,
      formatParametersForPrompt(kategori, parameters),
      'Interpretasikan hasil pemeriksaan laboratorium di atas dan berikan draft nama penyakit/kondisi serta kesan sesuai skema JSON.',
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n\n');

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await generateContentWithFallback(client, {
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: {
          systemInstruction: ANALISA_LAB_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: ANALISA_LAB_RESPONSE_SCHEMA,
          httpOptions: { timeout: 45_000 },
        },
      });

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
        return reply.status(502).send({
          error: 'AI menolak menganalisa data ini. Silakan isi kesan & nama penyakit secara manual.',
        });
      }

      const text = response.text;
      if (!text) {
        return reply.status(502).send({ error: 'AI tidak mengembalikan hasil analisa yang valid.' });
      }

      let parsed: { namaPenyakit?: unknown; kesan?: unknown };
      try {
        parsed = JSON.parse(text) as { namaPenyakit?: unknown; kesan?: unknown };
      } catch {
        return reply.status(502).send({ error: 'AI mengembalikan format hasil yang tidak valid.' });
      }

      return {
        namaPenyakit: typeof parsed.namaPenyakit === 'string' ? parsed.namaPenyakit : '',
        kesan: typeof parsed.kesan === 'string' ? parsed.kesan : '',
      };
    } catch (err) {
      req.log.error(err, 'Gagal memanggil AI untuk analisa lab');
      return reply.status(502).send({
        error: err instanceof Error ? `Gagal menghubungi layanan AI: ${err.message}` : 'Gagal menghubungi layanan AI',
      });
    }
  });

  app.post<{
    Body: { fotoDataUrl?: string; parameterNames?: unknown };
  }>('/api/analisa-lab-ai/read-foto', async (req, reply) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reply.status(503).send({
        error: 'Fitur analisa AI belum dikonfigurasi. Admin perlu mengatur GEMINI_API_KEY di server.',
      });
    }

    const { fotoDataUrl } = req.body;
    if (!fotoDataUrl?.trim()) return badRequest(reply, 'fotoDataUrl wajib diisi');
    const parsedImage = parseImageDataUrl(fotoDataUrl);
    if (!parsedImage) {
      return badRequest(reply, 'Format foto tidak didukung. Gunakan JPEG, PNG, GIF, atau WEBP.');
    }
    const parameterNames = sanitizeParameterNames(req.body.parameterNames);
    if (parameterNames.length === 0) return badRequest(reply, 'parameterNames wajib diisi');

    const promptText = [
      'Daftar parameter yang harus dicari nilainya:',
      ...parameterNames.map((name, index) => `${index + 1}. ${name}`),
      'Baca foto di atas dan kembalikan nilai hasil untuk tiap parameter di daftar sesuai skema JSON.',
    ].join('\n');

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await generateContentWithFallback(client, {
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType: parsedImage.mediaType, data: parsedImage.data } }, { text: promptText }],
          },
        ],
        config: {
          systemInstruction: READ_FOTO_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: READ_FOTO_RESPONSE_SCHEMA,
          httpOptions: { timeout: 45_000 },
        },
      });

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
        return reply.status(502).send({ error: 'AI menolak membaca foto ini. Silakan isi hasil secara manual.' });
      }

      const text = response.text;
      if (!text) return reply.status(502).send({ error: 'AI tidak mengembalikan hasil bacaan yang valid.' });

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return reply.status(502).send({ error: 'AI mengembalikan format hasil yang tidak valid.' });
      }

      const results = Array.isArray(parsed)
        ? parsed
            .filter(
              (p): p is { pemeriksaan: string; hasil: string } =>
                Boolean(p) &&
                typeof p === 'object' &&
                typeof (p as { pemeriksaan?: unknown }).pemeriksaan === 'string' &&
                typeof (p as { hasil?: unknown }).hasil === 'string',
            )
            .map((p) => ({ pemeriksaan: p.pemeriksaan, hasil: formatHasilRibuan(p.pemeriksaan, p.hasil) }))
        : [];

      return { results };
    } catch (err) {
      req.log.error(err, 'Gagal memanggil AI vision untuk membaca foto hasil lab');
      return reply.status(502).send({
        error: err instanceof Error ? `Gagal menghubungi layanan AI: ${err.message}` : 'Gagal menghubungi layanan AI',
      });
    }
  });
}
