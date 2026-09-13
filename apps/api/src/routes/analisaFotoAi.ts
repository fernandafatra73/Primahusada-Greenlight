import type { FastifyInstance, FastifyReply } from 'fastify';
import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '../lib/prisma.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';

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

const KESAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    namaPenyakit: {
      type: Type.STRING,
      description:
        'Kemungkinan nama penyakit/kondisi yang paling sesuai dengan temuan pada foto, dalam Bahasa Indonesia. Isi "Tidak dapat ditentukan" jika foto tidak cukup jelas/informatif.',
    },
    kesan: {
      type: Type.STRING,
      description:
        'Kesan (impression) naratif singkat berisi temuan yang tampak pada foto, dalam Bahasa Indonesia. Jika foto kurang jelas, sebutkan itu secara eksplisit alih-alih menebak.',
    },
  },
  required: ['namaPenyakit', 'kesan'],
};

/** Error 503/UNAVAILABLE dari Gemini biasanya cuma lonjakan permintaan
 * sesaat — layak dicoba ulang beberapa kali sebelum menyerah. */
function isRetryableGeminiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /"code"\s*:\s*503|UNAVAILABLE|high demand/i.test(message);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry(
  client: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
  maxAttempts = 3,
): ReturnType<GoogleGenAI['models']['generateContent']> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await client.models.generateContent(params);
    } catch (err) {
      if (attempt >= maxAttempts || !isRetryableGeminiError(err)) throw err;
      await delay(attempt * 1000);
    }
  }
  throw new Error('unreachable');
}

const AI_FOTO_SYSTEM_PROMPT = `Anda adalah asisten AI yang membantu radiolog/dokter di sebuah klinik membaca foto medis (foto anatomi, luka, kondisi kulit, atau foto rontgen) untuk membuat DRAFT AWAL, bukan diagnosis final.

Aturan:
- Hasil Anda akan selalu ditampilkan ke pengguna dengan label eksplisit sebagai "draft AI yang wajib ditinjau ulang oleh radiolog/dokter" — Anda tidak perlu menambahkan disclaimer itu sendiri di dalam teks, cukup fokus pada isi analisa.
- Jika gambar buram, tidak jelas, bukan foto medis, atau tidak cukup informasi untuk membuat kesimpulan yang masuk akal, katakan itu secara eksplisit (mis. "Foto tidak cukup jelas untuk dianalisa") alih-alih menebak-nebak.
- Jangan berikan rekomendasi pengobatan, dosis obat, atau resep.
- Tulis dalam Bahasa Indonesia, ringkas, dan gunakan istilah medis yang wajar dipakai radiolog Indonesia.
- Jawab HANYA sesuai skema JSON yang diberikan.`;

const TB_INDICATOR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    persen: { type: Type.NUMBER, description: 'Skor kemungkinan temuan ini, dalam persen (0-100).' },
    keterangan: { type: Type.STRING, description: 'Keterangan singkat temuan ini, dalam Bahasa Indonesia.' },
  },
  required: ['persen', 'keterangan'],
};

interface IndicatorSpec {
  readonly key: string;
  readonly label: string;
}

/** Daftar indikator yang dinilai AI berbeda-beda tergantung "model" (jenis
 * pemeriksaan) yang dipilih di dropdown — thorax pakai indikator TB seperti
 * semula, sedangkan USG Abdomen & Lumbo Sacral punya daftar organ/kondisi
 * sendiri. Model lain (genu, knee, dst.) belum punya set khusus, jadi jatuh
 * ke set thorax sebagai fallback lama. */
const CHEST_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'infiltrate', label: 'Infiltrate' },
  { key: 'consolidation', label: 'Consolidation' },
  { key: 'cavity', label: 'Cavity' },
  { key: 'effusion', label: 'Effusion' },
  { key: 'fibrotic', label: 'Fibrotic' },
  { key: 'calcification', label: 'Calcification' },
  { key: 'bronchopneumonia', label: 'Bronchopneumonia' },
  { key: 'bronchitis', label: 'Bronchitis' },
  { key: 'cardiomegali', label: 'Cardiomegali' },
  { key: 'pneumonia', label: 'Pneumonia' },
];

const USG_ABDOMEN_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'hepar', label: 'Hepar' },
  { key: 'kandung-empedu', label: 'Kandung Empedu' },
  { key: 'pankreas', label: 'Pankreas' },
  { key: 'limpa', label: 'Limpa' },
  { key: 'ginjal-kanan', label: 'Ginjal Kanan' },
  { key: 'ginjal-kiri', label: 'Ginjal Kiri' },
  { key: 'usus-buntu', label: 'Usus Buntu (Appendiks)' },
  { key: 'vesica-urinaria', label: 'Vesica Urinaria' },
];

const LUMBOSACRAL_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'spondiloarthrosis', label: 'Spondiloarthrosis' },
  { key: 'spondilolisthesis', label: 'Spondilolisthesis' },
  { key: 'penyempitan', label: 'Penyempitan Diskus/Kanalis' },
  { key: 'hnp', label: 'HNP (Hernia Nukleus Pulposus)' },
  { key: 'ischialgia', label: 'Ischialgia' },
  { key: 'fraktur', label: 'Fraktur' },
  { key: 'skoliosis', label: 'Skoliosis' },
  { key: 'lordosis', label: 'Lordosis' },
];

const CERVIKAL_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'spondylosis', label: 'Spondylosis Servikal' },
  { key: 'penyempitan-diskus', label: 'Penyempitan Diskus' },
  { key: 'listhesis', label: 'Listhesis' },
  { key: 'straightening', label: 'Straightening / Hilang Lordosis' },
  { key: 'fraktur', label: 'Fraktur' },
  { key: 'osteofit', label: 'Osteofit' },
  { key: 'foraminal-stenosis', label: 'Foraminal Stenosis' },
];

const CRANIUM_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'fraktur', label: 'Fraktur' },
  { key: 'lesi-litik', label: 'Lesi Litik' },
  { key: 'lesi-sklerotik', label: 'Lesi Sklerotik' },
  { key: 'kalsifikasi', label: 'Kalsifikasi Intrakranial' },
  { key: 'kelainan-sutura', label: 'Kelainan Sutura' },
  { key: 'erosi-tulang', label: 'Erosi Tulang' },
  { key: 'massa-jaringan-lunak', label: 'Massa Jaringan Lunak' },
];

const BNO_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'batu-ginjal', label: 'Batu Ginjal (Nephrolithiasis)' },
  { key: 'batu-ureter', label: 'Batu Ureter' },
  { key: 'batu-buli', label: 'Batu Buli (Vesikolithiasis)' },
  { key: 'kalsifikasi', label: 'Kalsifikasi Abnormal' },
  { key: 'dilatasi-usus', label: 'Dilatasi Usus (Obstruksi)' },
  { key: 'free-air', label: 'Free Air (Udara Bebas)' },
  { key: 'skoliosis', label: 'Skoliosis Vertebra Lumbal' },
];

const FEMUR_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'fraktur', label: 'Fraktur' },
  { key: 'dislokasi', label: 'Dislokasi Sendi Panggul' },
  { key: 'lesi-litik-sklerotik', label: 'Lesi Litik/Sklerotik' },
  { key: 'deformitas', label: 'Deformitas Angulasi' },
  { key: 'osteoarthritis', label: 'Osteoarthritis Panggul' },
];

const CRURIS_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'fraktur', label: 'Fraktur' },
  { key: 'dislokasi', label: 'Dislokasi' },
  { key: 'lesi-litik-sklerotik', label: 'Lesi Litik/Sklerotik' },
  { key: 'deformitas', label: 'Deformitas Angulasi' },
  { key: 'kalsifikasi-jaringan-lunak', label: 'Kalsifikasi Jaringan Lunak' },
];

const ANTHEBRACHI_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'fraktur', label: 'Fraktur' },
  { key: 'dislokasi', label: 'Dislokasi' },
  { key: 'lesi-litik-sklerotik', label: 'Lesi Litik/Sklerotik' },
  { key: 'deformitas', label: 'Deformitas Angulasi' },
  { key: 'kalsifikasi-jaringan-lunak', label: 'Kalsifikasi Jaringan Lunak' },
];

const GENU_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'osteoarthritis', label: 'Osteoarthritis' },
  { key: 'efusi-sendi', label: 'Efusi Sendi' },
  { key: 'penyempitan-celah-sendi', label: 'Penyempitan Celah Sendi' },
  { key: 'fraktur', label: 'Fraktur' },
  { key: 'dislokasi', label: 'Dislokasi/Subluksasi' },
  { key: 'osteofit', label: 'Osteofit' },
  { key: 'kalsifikasi', label: 'Kalsifikasi (Chondrocalcinosis)' },
];

const ANKLE_INDICATORS: readonly IndicatorSpec[] = [
  { key: 'fraktur', label: 'Fraktur' },
  { key: 'dislokasi', label: 'Dislokasi' },
  { key: 'efusi-sendi', label: 'Efusi Sendi' },
  { key: 'penyempitan-celah-sendi', label: 'Penyempitan Celah Sendi' },
  { key: 'osteofit', label: 'Osteofit' },
  { key: 'kalsifikasi', label: 'Kalsifikasi' },
  { key: 'benda-asing', label: 'Benda Asing' },
];

const MODEL_INDICATOR_SETS: Record<string, readonly IndicatorSpec[]> = {
  'usg-abdomen': USG_ABDOMEN_INDICATORS,
  lumbosacral: LUMBOSACRAL_INDICATORS,
  cervikal: CERVIKAL_INDICATORS,
  cranium: CRANIUM_INDICATORS,
  bno: BNO_INDICATORS,
  femur: FEMUR_INDICATORS,
  cruris: CRURIS_INDICATORS,
  anthebrachi: ANTHEBRACHI_INDICATORS,
  genu: GENU_INDICATORS,
  knee: GENU_INDICATORS,
  ankle: ANKLE_INDICATORS,
};

function getIndicatorSet(model: string | undefined): readonly IndicatorSpec[] {
  return (model && MODEL_INDICATOR_SETS[model]) || CHEST_INDICATORS;
}

function buildIndikatorSchema(indicators: readonly IndicatorSpec[]) {
  const properties: Record<string, typeof TB_INDICATOR_SCHEMA> = {};
  for (const ind of indicators) properties[ind.key] = TB_INDICATOR_SCHEMA;
  return {
    type: Type.OBJECT,
    properties,
    required: indicators.map((ind) => ind.key),
  };
}

const TB_AREA_TEMUAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    kondisi: {
      type: Type.STRING,
      description: 'Salah satu dari: "tbc", "pneumonia", "bronchopneumonia", atau "bronchitis".',
    },
    ymin: { type: Type.NUMBER, description: 'Batas atas kotak area kelainan, dinormalisasi 0-1000 dari tinggi foto.' },
    xmin: { type: Type.NUMBER, description: 'Batas kiri kotak area kelainan, dinormalisasi 0-1000 dari lebar foto.' },
    ymax: { type: Type.NUMBER, description: 'Batas bawah kotak area kelainan, dinormalisasi 0-1000 dari tinggi foto.' },
    xmax: { type: Type.NUMBER, description: 'Batas kanan kotak area kelainan, dinormalisasi 0-1000 dari lebar foto.' },
  },
  required: ['kondisi', 'ymin', 'xmin', 'ymax', 'xmax'],
};

function buildScreeningResponseSchema(indicators: readonly IndicatorSpec[]) {
  return {
    type: Type.OBJECT,
    properties: {
      diagnosis: {
        type: Type.STRING,
        description:
          'Label diagnosis/impression singkat berdasarkan temuan yang tampak, atau "Normal" jika tidak ada indikasi signifikan.',
      },
      confidenceScore: {
        type: Type.NUMBER,
        description: 'Skor keyakinan keseluruhan atas diagnosis/impression di atas, dalam persen (0-100).',
      },
      ringkasan: {
        type: Type.STRING,
        description: 'Satu kalimat ringkasan temuan utama dalam Bahasa Indonesia.',
      },
      areaTemuan: {
        type: Type.ARRAY,
        description:
          'Kotak pembatas (bounding box) lokasi kelainan pada foto. Hanya diisi untuk foto rontgen thorax (kondisi tbc/pneumonia/bronchopneumonia/bronchitis); untuk jenis pemeriksaan lain, selalu kosongkan array ini.',
        items: TB_AREA_TEMUAN_SCHEMA,
      },
      indikator: buildIndikatorSchema(indicators),
    },
    required: ['diagnosis', 'confidenceScore', 'ringkasan', 'areaTemuan', 'indikator'],
  };
}

const CHEST_SYSTEM_PROMPT = `Anda adalah asisten AI skrining tuberkulosis (TB) yang membantu radiolog membuat DRAFT AWAL skrining foto rontgen thorax, bukan diagnosis final.

Aturan:
- Hasil Anda akan selalu ditampilkan ke pengguna dengan label eksplisit sebagai "draft AI yang wajib ditinjau ulang oleh radiolog" — Anda tidak perlu menambahkan disclaimer itu sendiri di dalam teks, cukup fokus pada isi analisa.
- Nilai setiap indikator (infiltrate, consolidation, cavity, effusion, fibrotic, calcification, bronchopneumonia, bronchitis, cardiomegali, pneumonia) secara independen berdasarkan temuan yang tampak pada foto.
- Untuk "areaTemuan": beri satu kotak pembatas (bounding box) per kondisi tbc/pneumonia/bronchopneumonia/bronchitis yang skornya diperkirakan 30% atau lebih (skor "confidenceScore" untuk tbc, atau skor indikator terkait untuk pneumonia/bronchopneumonia/bronchitis), menandai lokasi kelainan tersebut (mis. area paru kanan atas). Koordinat dinormalisasi 0-1000 relatif terhadap lebar (xmin/xmax) dan tinggi (ymin/ymax) foto, dengan (0,0) di pojok kiri atas. Jangan sertakan entri untuk kondisi dengan skor di bawah 30%.
- Jika gambar buram, tidak jelas, atau bukan foto rontgen thorax, katakan itu secara eksplisit pada "ringkasan", kosongkan "areaTemuan", dan beri skor 0 pada semua indikator alih-alih menebak-nebak.
- Jangan berikan rekomendasi pengobatan, dosis obat, atau resep.
- Tulis dalam Bahasa Indonesia, ringkas, dan gunakan istilah medis yang wajar dipakai radiolog Indonesia.
- Jawab HANYA sesuai skema JSON yang diberikan.`;

/** Prompt sistem untuk modalitas non-thorax (mis. USG Abdomen, Lumbo Sacral):
 * setiap organ/kondisi pada `indicators` dinilai independen lewat "indikator",
 * dan "areaTemuan" (bounding box, khusus foto rontgen thorax) selalu kosong. */
function buildNonChestSystemPrompt(pemeriksaanLabel: string, indicators: readonly IndicatorSpec[]): string {
  const daftar = indicators.map((ind) => ind.label).join(', ');
  return `Anda adalah asisten AI yang membantu radiolog membuat DRAFT AWAL pembacaan foto ${pemeriksaanLabel}, bukan diagnosis final.

Aturan:
- Hasil Anda akan selalu ditampilkan ke pengguna dengan label eksplisit sebagai "draft AI yang wajib ditinjau ulang oleh radiolog" — Anda tidak perlu menambahkan disclaimer itu sendiri di dalam teks, cukup fokus pada isi analisa.
- Nilai setiap indikator berikut secara independen berdasarkan temuan yang tampak pada foto: ${daftar}.
- "diagnosis" diisi kesimpulan/impression singkat keseluruhan (mis. "Dalam batas normal" atau nama kondisi utama yang ditemukan), dan "confidenceScore" adalah skor keyakinan atas kesimpulan tersebut.
- "areaTemuan" hanya berlaku untuk foto rontgen thorax — untuk pemeriksaan ${pemeriksaanLabel}, selalu kosongkan array ini.
- Jika gambar buram, tidak jelas, atau bukan foto ${pemeriksaanLabel} yang valid, katakan itu secara eksplisit pada "ringkasan", dan beri skor 0 pada semua indikator alih-alih menebak-nebak.
- Jangan berikan rekomendasi pengobatan, dosis obat, atau resep.
- Tulis dalam Bahasa Indonesia, ringkas, dan gunakan istilah medis yang wajar dipakai radiolog Indonesia.
- Jawab HANYA sesuai skema JSON yang diberikan.`;
}

const MODEL_PEMERIKSAAN_LABEL: Record<string, string> = {
  'usg-abdomen': 'USG Abdomen',
  lumbosacral: 'rontgen Lumbo Sacral',
  cervikal: 'rontgen Cervikal',
  cranium: 'rontgen Cranium',
  bno: 'rontgen BNO',
  femur: 'rontgen Femur',
  cruris: 'rontgen Cruris',
  anthebrachi: 'rontgen Anthebrachi',
  genu: 'rontgen Genu',
  knee: 'rontgen Genu (Knee)',
  ankle: 'rontgen Ankle',
};

function buildSystemPrompt(model: string | undefined, indicators: readonly IndicatorSpec[]): string {
  if (model && MODEL_PEMERIKSAAN_LABEL[model]) {
    return buildNonChestSystemPrompt(MODEL_PEMERIKSAAN_LABEL[model]!, indicators);
  }
  return CHEST_SYSTEM_PROMPT;
}

const TB_SCREENING_MODEL_BY_VERSION: Record<string, string> = {
  v1: 'gemini-flash-latest',
  v2: 'gemini-flash-lite-latest',
};

export async function registerAnalisaFotoAiRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { page?: string; limit?: string; q?: string } }>(
    '/api/analisa-foto-ai',
    async (req) => {
      const { page, limit, skip } = parsePagination(req.query);
      const q = req.query.q?.trim();
      const where = q ? { namaPasien: { contains: q } } : {};
      const [total, items] = await Promise.all([
        prisma.analisaFotoAi.count({ where }),
        prisma.analisaFotoAi.findMany({
          where,
          orderBy: { tanggal: 'desc' },
          skip,
          take: limit,
        }),
      ]);
      return {
        items: items.map((item) => ({ ...item, tanggal: item.tanggal.toISOString() })),
        pagination: buildPaginationMeta(total, page, limit),
      };
    },
  );

  app.post<{
    Body: {
      namaPasien?: string;
      pemeriksaan?: string;
      namaPenyakit?: string;
      fotoDataUrl?: string;
      kesan?: string;
      isDraftAi?: boolean;
      radiologNama?: string;
      tanggal?: string;
    };
  }>('/api/analisa-foto-ai', async (req, reply) => {
    const b = req.body;
    if (!b.namaPasien?.trim() || !b.fotoDataUrl?.trim()) {
      return badRequest(reply, 'namaPasien dan fotoDataUrl wajib diisi');
    }
    const item = await prisma.analisaFotoAi.create({
      data: {
        namaPasien: b.namaPasien.trim(),
        pemeriksaan: b.pemeriksaan?.trim() || null,
        namaPenyakit: b.namaPenyakit?.trim() || null,
        fotoDataUrl: b.fotoDataUrl,
        kesan: b.kesan?.trim() || null,
        isDraftAi: b.isDraftAi ?? false,
        radiologNama: b.radiologNama?.trim() || null,
        tanggal: b.tanggal ? new Date(b.tanggal) : new Date(),
      },
    });
    return reply.status(201).send({ item: { ...item, tanggal: item.tanggal.toISOString() } });
  });

  app.patch<{
    Params: { id: string };
    Body: {
      namaPasien?: string;
      pemeriksaan?: string;
      namaPenyakit?: string;
      fotoDataUrl?: string;
      kesan?: string;
      isDraftAi?: boolean;
      radiologNama?: string;
      tanggal?: string;
    };
  }>('/api/analisa-foto-ai/:id', async (req, reply) => {
    const existing = await prisma.analisaFotoAi.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.status(404).send({ error: 'Data analisa foto AI tidak ditemukan' });
    const b = req.body;
    const item = await prisma.analisaFotoAi.update({
      where: { id: req.params.id },
      data: {
        namaPasien: b.namaPasien?.trim() ?? existing.namaPasien,
        pemeriksaan: b.pemeriksaan !== undefined ? b.pemeriksaan?.trim() || null : existing.pemeriksaan,
        namaPenyakit: b.namaPenyakit !== undefined ? b.namaPenyakit?.trim() || null : existing.namaPenyakit,
        fotoDataUrl: b.fotoDataUrl ?? existing.fotoDataUrl,
        kesan: b.kesan !== undefined ? b.kesan?.trim() || null : existing.kesan,
        isDraftAi: b.isDraftAi ?? existing.isDraftAi,
        radiologNama: b.radiologNama !== undefined ? b.radiologNama?.trim() || null : existing.radiologNama,
        tanggal: b.tanggal ? new Date(b.tanggal) : existing.tanggal,
      },
    });
    return { item: { ...item, tanggal: item.tanggal.toISOString() } };
  });

  app.delete<{ Params: { id: string } }>('/api/analisa-foto-ai/:id', async (req) => {
    await prisma.analisaFotoAi.delete({ where: { id: req.params.id } });
    return { ok: true };
  });

  app.post<{
    Body: { fotoDataUrl?: string; pemeriksaan?: string; namaPasien?: string };
  }>('/api/analisa-foto-ai/analyze', async (req, reply) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reply.status(503).send({
        error: 'Fitur analisa AI belum dikonfigurasi. Admin perlu mengatur GEMINI_API_KEY di server.',
      });
    }

    const { fotoDataUrl, pemeriksaan, namaPasien } = req.body;
    if (!fotoDataUrl?.trim()) {
      return badRequest(reply, 'fotoDataUrl wajib diisi');
    }
    const parsedImage = parseImageDataUrl(fotoDataUrl);
    if (!parsedImage) {
      return badRequest(reply, 'Format foto tidak didukung. Gunakan JPEG, PNG, GIF, atau WEBP.');
    }

    const contextLines = [
      namaPasien?.trim() ? `Nama pasien: ${namaPasien.trim()}` : null,
      pemeriksaan?.trim() ? `Jenis pemeriksaan: ${pemeriksaan.trim()}` : null,
    ].filter((line): line is string => Boolean(line));

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await generateContentWithRetry(client, {
        model: 'gemini-flash-latest',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: parsedImage.mediaType, data: parsedImage.data } },
              {
                text: [
                  ...contextLines,
                  'Analisa foto di atas dan berikan draft kemungkinan nama penyakit/kondisi serta kesan (impression) singkat sesuai skema JSON.',
                ].join('\n'),
              },
            ],
          },
        ],
        config: {
          systemInstruction: AI_FOTO_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: KESAN_RESPONSE_SCHEMA,
        },
      });

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
        return reply.status(502).send({
          error: 'AI menolak menganalisa foto ini. Silakan isi nama penyakit & kesan secara manual.',
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
      req.log.error(err, 'Gagal memanggil AI vision untuk analisa foto');
      if (isRetryableGeminiError(err)) {
        return reply.status(503).send({
          error: 'Layanan AI sedang sibuk (lonjakan permintaan). Coba lagi dalam beberapa saat.',
        });
      }
      return reply.status(502).send({
        error: err instanceof Error ? `Gagal menghubungi layanan AI: ${err.message}` : 'Gagal menghubungi layanan AI',
      });
    }
  });

  app.post<{
    Body: { fotoDataUrl?: string; model?: string };
  }>('/api/analisa-foto-ai/tb-screening', async (req, reply) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reply.status(503).send({
        error: 'Fitur analisa AI belum dikonfigurasi. Admin perlu mengatur GEMINI_API_KEY di server.',
      });
    }

    const { fotoDataUrl, model } = req.body;
    if (!fotoDataUrl?.trim()) {
      return badRequest(reply, 'fotoDataUrl wajib diisi');
    }
    const parsedImage = parseImageDataUrl(fotoDataUrl);
    if (!parsedImage) {
      return badRequest(reply, 'Format foto tidak didukung. Gunakan JPEG, PNG, GIF, atau WEBP.');
    }
    const geminiModel = (model && TB_SCREENING_MODEL_BY_VERSION[model]) || TB_SCREENING_MODEL_BY_VERSION.v1!;
    const indicators = getIndicatorSet(model);
    const pemeriksaanLabel = (model && MODEL_PEMERIKSAAN_LABEL[model]) || 'rontgen thorax';

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await generateContentWithRetry(client, {
        model: geminiModel,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: parsedImage.mediaType, data: parsedImage.data } },
              {
                text: `Lakukan skrining pada foto ${pemeriksaanLabel} di atas dan berikan draft diagnosis, skor keyakinan, ringkasan, serta indikator detail sesuai skema JSON.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: buildSystemPrompt(model, indicators),
          responseMimeType: 'application/json',
          responseSchema: buildScreeningResponseSchema(indicators),
        },
      });

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
        return reply.status(502).send({ error: 'AI menolak menganalisa foto ini.' });
      }

      const text = response.text;
      if (!text) {
        return reply.status(502).send({ error: 'AI tidak mengembalikan hasil analisa yang valid.' });
      }

      let parsed: {
        diagnosis?: unknown;
        confidenceScore?: unknown;
        ringkasan?: unknown;
        areaTemuan?: readonly { kondisi?: unknown; ymin?: unknown; xmin?: unknown; ymax?: unknown; xmax?: unknown }[];
        indikator?: Record<string, { persen?: unknown; keterangan?: unknown }>;
      };
      try {
        parsed = JSON.parse(text) as typeof parsed;
      } catch {
        return reply.status(502).send({ error: 'AI mengembalikan format hasil yang tidak valid.' });
      }

      const toIndicator = (key: string): { persen: number; keterangan: string } => {
        const raw = parsed.indikator?.[key];
        return {
          persen: typeof raw?.persen === 'number' ? raw.persen : 0,
          keterangan: typeof raw?.keterangan === 'string' ? raw.keterangan : '',
        };
      };

      const KNOWN_KONDISI = ['tbc', 'pneumonia', 'bronchopneumonia', 'bronchitis'];
      const areaTemuan = (parsed.areaTemuan ?? [])
        .filter(
          (a): a is { kondisi: string; ymin: number; xmin: number; ymax: number; xmax: number } =>
            typeof a.kondisi === 'string' &&
            KNOWN_KONDISI.includes(a.kondisi.toLowerCase()) &&
            typeof a.ymin === 'number' &&
            typeof a.xmin === 'number' &&
            typeof a.ymax === 'number' &&
            typeof a.xmax === 'number',
        )
        .map((a) => ({ ...a, kondisi: a.kondisi.toLowerCase() }));

      return {
        diagnosis: typeof parsed.diagnosis === 'string' ? parsed.diagnosis : '',
        confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0,
        ringkasan: typeof parsed.ringkasan === 'string' ? parsed.ringkasan : '',
        areaTemuan,
        indikator: indicators.map((ind) => ({ key: ind.key, label: ind.label, ...toIndicator(ind.key) })),
      };
    } catch (err) {
      req.log.error(err, 'Gagal memanggil AI vision untuk skrining TB');
      if (isRetryableGeminiError(err)) {
        return reply.status(503).send({
          error: 'Layanan AI sedang sibuk (lonjakan permintaan). Coba lagi dalam beberapa saat.',
        });
      }
      return reply.status(502).send({
        error: err instanceof Error ? `Gagal menghubungi layanan AI: ${err.message}` : 'Gagal menghubungi layanan AI',
      });
    }
  });
}
