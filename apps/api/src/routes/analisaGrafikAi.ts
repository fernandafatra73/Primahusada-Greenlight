import type { FastifyInstance, FastifyReply } from 'fastify';
import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithRetry } from './analisaFotoAi.js';

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

const ANALISA_GRAFIK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    instrumen: {
      type: Type.STRING,
      description:
        'Instrumen/pair dan timeframe yang terbaca dari grafik (mis. "XAUUSD 1H"). Isi "Tidak terbaca" jika tidak tampak.',
    },
    tren: {
      type: Type.STRING,
      description: 'Arah tren yang tampak (naik/turun/sideways) beserta alasan singkat dari struktur harga di grafik.',
    },
    polaCandle: {
      type: Type.STRING,
      description: 'Pola candle/chart pattern yang benar-benar tampak pada grafik. Sebutkan jika tidak ada pola jelas.',
    },
    supportResistance: {
      type: Type.STRING,
      description: 'Level support & resistance penting yang terbaca dari skala harga grafik.',
    },
    indikator: {
      type: Type.STRING,
      description: 'Bacaan indikator yang tampak di grafik (MA, RSI, MACD, volume, dsb). Isi "Tidak ada indikator" jika tidak ada.',
    },
    bias: {
      type: Type.STRING,
      description: 'Bias arah: BUY, SELL, atau WAIT/NETRAL, dengan alasan singkat.',
    },
    prediksiArah5Menit: {
      type: Type.STRING,
      enum: ['NAIK', 'TURUN', 'SIDEWAYS'],
      description: 'Perkiraan arah harga 5 menit ke depan berdasarkan momentum candle terakhir di grafik.',
    },
    prediksi5Menit: {
      type: Type.STRING,
      description:
        'Kalimat prediksi 5 menit ke depan, mis. "5 menit ke depan XAU diperkirakan naik sekitar $0.3/menit menuju ±2412.50 (≈ +$1.5)". Sertakan perkiraan perubahan harga per menit dan target harga dalam 5 menit yang dihitung dari kecepatan candle terakhir & jarak ke support/resistance terdekat. Jika tidak terbaca, katakan tidak dapat diprediksi.',
    },
    pembalikanArah: {
      type: Type.ARRAY,
      description:
        'Semua candle pada grafik (terutama timeframe 1 jam) yang menjadi titik pembalikan arah, untuk ditandai panah di atas gambar. Cari KEDUA jenis: pembalikan NAIK (sinyal beli, di dasar/support) DAN pembalikan TURUN (sinyal jual, di puncak/resistance). Maksimal 6 titik paling jelas. Kosongkan array jika tidak ada.',
      items: {
        type: Type.OBJECT,
        properties: {
          arahSetelah: {
            type: Type.STRING,
            enum: ['NAIK', 'TURUN'],
            description: 'Arah harga setelah pembalikan: NAIK (bullish reversal di bawah = beli) atau TURUN (bearish reversal di atas = jual).',
          },
          posisiX: {
            type: Type.NUMBER,
            description: 'Posisi horizontal tengah candle pembalikan pada gambar, skala 0 (kiri) sampai 1000 (kanan).',
          },
          posisiY: {
            type: Type.NUMBER,
            description:
              'Posisi vertikal pada gambar, skala 0 (atas) sampai 1000 (bawah): ujung low candle jika NAIK, ujung high candle jika TURUN.',
          },
          alasan: {
            type: Type.STRING,
            description: 'Alasan singkat (pin bar, engulfing, doji di S/R, shooting star, dsb.) kenapa candle itu pembalikan arah.',
          },
        },
        required: ['arahSetelah', 'posisiX', 'posisiY', 'alasan'],
      },
    },
    entry: { type: Type.STRING, description: 'Area entry yang masuk akal berdasarkan level di grafik.' },
    stopLoss: { type: Type.STRING, description: 'Level stop loss yang masuk akal.' },
    takeProfit: { type: Type.STRING, description: 'Target take profit (boleh lebih dari satu).' },
    persenBuy: {
      type: Type.NUMBER,
      description:
        'Persentase kekuatan pembeli (BUY) 0-100 berdasarkan dominasi candle naik vs turun, momentum candle terakhir, dan posisi harga terhadap support/resistance. Persentase SELL dianggap 100 - persenBuy. Isi 50 jika seimbang atau tidak terbaca.',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Skor keyakinan 0-100. Jangan di atas 75 karena hanya berdasarkan satu gambar.',
    },
    catatan: {
      type: Type.STRING,
      description: 'Catatan risiko: ingatkan ini estimasi AI dari gambar, wajib konfirmasi & pakai manajemen risiko.',
    },
  },
  required: [
    'instrumen',
    'tren',
    'polaCandle',
    'supportResistance',
    'indikator',
    'bias',
    'prediksiArah5Menit',
    'prediksi5Menit',
    'pembalikanArah',
    'entry',
    'stopLoss',
    'takeProfit',
    'persenBuy',
    'confidence',
    'catatan',
  ],
};

const ANALISA_GRAFIK_SYSTEM_PROMPT = `Anda adalah asisten edukasi trading yang membaca screenshot grafik (umumnya dari TradingView) dan menyusun analisa teknikal untuk tujuan pembelajaran, BUKAN nasihat keuangan profesional.

Aturan PENTING:
- Analisa HANYA berdasarkan apa yang benar-benar tampak di gambar: candle, skala harga, garis, indikator, dan label yang terbaca.
- Baca angka level harga dari skala harga di sisi kanan grafik; jangan mengarang angka yang tidak terbaca.
- Jika gambar bukan grafik harga, buram, atau terlalu kecil untuk dibaca, katakan itu secara eksplisit di setiap field alih-alih menebak.
- Prediksi 5 menit ke depan adalah estimasi momentum jangka sangat pendek yang sangat tidak pasti; hitung kecepatan per menit dari ukuran candle terakhir dan skala waktu grafik, dan jangan mengklaim pasti terjadi.
- Untuk pembalikanArah, periksa puncak (calon pembalikan TURUN/jual) dan dasar (calon pembalikan NAIK/beli) secara terpisah, lalu tunjuk posisi candle yang benar-benar tampak di gambar (koordinat 0-1000 relatif terhadap seluruh gambar). Jangan hanya melaporkan satu arah jika pembalikan arah lain juga tampak jelas. Kosongkan array jika tidak ada tanda pembalikan yang jelas.
- confidence maksimal 75.
- Selalu ingatkan pentingnya stop loss & manajemen risiko di field catatan.
- Tulis dalam Bahasa Indonesia, ringkas per field.
- Jawab HANYA sesuai skema JSON yang diberikan.`;

function isQuotaOrOverloadError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /"code"\s*:\s*(429|503|504)|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|high demand/i.test(message);
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

interface PembalikanArah {
  readonly arahSetelah: 'NAIK' | 'TURUN';
  readonly posisiX: number;
  readonly posisiY: number;
  readonly alasan: string;
}

const MAX_TITIK_PEMBALIKAN = 6;

/** Hanya titik dengan arah & koordinat valid yang diteruskan, urut dari kiri ke kanan (lama ke terbaru). */
function parseDaftarPembalikanArah(value: unknown): PembalikanArah[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(parsePembalikanArah)
    .filter((p): p is PembalikanArah => p !== null)
    .slice(0, MAX_TITIK_PEMBALIKAN)
    .sort((a, b) => a.posisiX - b.posisiX);
}

function parsePembalikanArah(value: unknown): PembalikanArah | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.arahSetelah !== 'NAIK' && v.arahSetelah !== 'TURUN') return null;
  if (typeof v.posisiX !== 'number' || typeof v.posisiY !== 'number') return null;
  if (!Number.isFinite(v.posisiX) || !Number.isFinite(v.posisiY)) return null;
  const clamp = (n: number): number => Math.min(1000, Math.max(0, n));
  return {
    arahSetelah: v.arahSetelah,
    posisiX: clamp(v.posisiX),
    posisiY: clamp(v.posisiY),
    alasan: stringField(v.alasan),
  };
}

export async function registerAnalisaGrafikAiRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { gambarDataUrl?: string; keterangan?: string } }>(
    '/api/analisa-grafik/analyze',
    async (req, reply) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return reply.status(503).send({
          error: 'Fitur analisa AI belum dikonfigurasi. Admin perlu mengatur GEMINI_API_KEY di server.',
        });
      }

      const { gambarDataUrl, keterangan } = req.body ?? {};
      if (!gambarDataUrl?.trim()) {
        return badRequest(reply, 'gambarDataUrl wajib diisi');
      }
      const parsedImage = parseImageDataUrl(gambarDataUrl);
      if (!parsedImage) {
        return badRequest(reply, 'Format gambar tidak didukung. Gunakan JPEG, PNG, GIF, atau WEBP.');
      }

      try {
        const client = new GoogleGenAI({ apiKey });
        const params = {
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: parsedImage.mediaType, data: parsedImage.data } },
                {
                  text: [
                    keterangan?.trim() ? `Keterangan dari trader: ${keterangan.trim()}` : null,
                    'Analisa grafik trading di atas sesuai skema JSON.',
                  ]
                    .filter((line): line is string => Boolean(line))
                    .join('\n'),
                },
              ],
            },
          ],
          config: {
            systemInstruction: ANALISA_GRAFIK_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: ANALISA_GRAFIK_RESPONSE_SCHEMA,
          },
        };
        // Model utama sering penuh (503) atau kuota free tier-nya habis (429);
        // model lite biasanya masih tersedia, jadi dipakai sebagai cadangan.
        let response: Awaited<ReturnType<typeof generateContentWithRetry>>;
        try {
          response = await generateContentWithRetry(client, { ...params, model: 'gemini-3.6-flash' }, 2);
        } catch (err) {
          if (!isQuotaOrOverloadError(err)) throw err;
          req.log.warn('gemini-3.6-flash tidak tersedia; memakai gemini-flash-lite-latest untuk analisa grafik');
          response = await generateContentWithRetry(client, { ...params, model: 'gemini-flash-lite-latest' });
        }

        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
          return reply.status(502).send({ error: 'AI menolak menganalisa gambar ini.' });
        }

        const text = response.text;
        if (!text) {
          return reply.status(502).send({ error: 'AI tidak mengembalikan hasil analisa yang valid.' });
        }

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
          return reply.status(502).send({ error: 'AI mengembalikan format hasil yang tidak valid.' });
        }

        return {
          instrumen: stringField(parsed.instrumen),
          tren: stringField(parsed.tren),
          polaCandle: stringField(parsed.polaCandle),
          supportResistance: stringField(parsed.supportResistance),
          indikator: stringField(parsed.indikator),
          bias: stringField(parsed.bias),
          prediksiArah5Menit: stringField(parsed.prediksiArah5Menit),
          prediksi5Menit: stringField(parsed.prediksi5Menit),
          pembalikanArah: parseDaftarPembalikanArah(parsed.pembalikanArah),
          entry: stringField(parsed.entry),
          stopLoss: stringField(parsed.stopLoss),
          takeProfit: stringField(parsed.takeProfit),
          persenBuy:
            typeof parsed.persenBuy === 'number' && Number.isFinite(parsed.persenBuy)
              ? Math.round(Math.min(100, Math.max(0, parsed.persenBuy)))
              : 50,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
          catatan: stringField(parsed.catatan),
        };
      } catch (err) {
        req.log.error(err, 'Gagal memanggil AI vision untuk analisa grafik');
        return reply.status(502).send({
          error: err instanceof Error ? `Gagal menghubungi layanan AI: ${err.message}` : 'Gagal menghubungi layanan AI',
        });
      }
    },
  );
}
