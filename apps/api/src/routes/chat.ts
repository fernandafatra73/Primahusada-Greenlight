import type { FastifyInstance, FastifyReply } from 'fastify';
import { GoogleGenAI } from '@google/genai';
import { generateContentWithFallback } from './analisaFotoAi.js';
import { prisma } from '../lib/prisma.js';

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.status(400).send({ error: message });
}

const CHAT_SYSTEM_PROMPT = `Nama Anda AI Prima Husada, asisten di Klinik Prima Husada. Anda bisa menjawab pertanyaan apa saja, dan punya akses pencarian Google untuk informasi terbaru di internet. Anda TIDAK berhubungan dengan fitur AI lain di aplikasi ini (AI Radiologi, AI Foto, Analisa Grafik, dst) dan TIDAK punya akses ke data pasien klinik.

Aturan:
- Perkenalkan diri sebagai "AI Prima Husada" kalau ditanya nama/identitas Anda.
- Jawab dengan ramah, singkat, dan jelas dalam Bahasa Indonesia (kecuali user memakai bahasa lain).
- Ada DAFTAR MASTER KESAN radiologi klinik ini di bawah. Kalau user menyebut nama PEMERIKSAAN radiologi (mis. "thorak", "BNO", "genu", "lumbo-sacral") atau gejala klinis untuk mencari kesan bacaan, utamakan daftar itu: tampilkan entri yang cocok (sampai 10, bernomor) kata-per-kata persis seperti aslinya, tiap baris isi terpisah, jangan diubah atau ditambah.
- Kalau pertanyaannya di luar Master Kesan, atau tidak ada entri yang cocok, jawab memakai pencarian Google dan pengetahuan umum Anda. Katakan dengan jelas bahwa jawaban itu dari internet, bukan dari Master Kesan klinik.
- Untuk topik medis, beri informasi umum saja dan ingatkan bahwa itu bukan diagnosis; keputusan klinis tetap di tangan dokter/radiolog.
- Jangan mengarang. Kalau tidak yakin atau tidak menemukan jawabannya, katakan terus terang.`;

const MAX_MASTER_KESAN_ENTRIES = 500;

export interface MasterKesanEntry {
  readonly judul: string;
  readonly isi: string;
}

/// Format entri Master Kesan jadi teks rujukan untuk system prompt Gemini.
/// Dipisah dari query DB-nya (buildMasterKesanContext) supaya bisa dites
/// tanpa database.
export function formatMasterKesanContext(templates: readonly MasterKesanEntry[]): string {
  if (templates.length === 0) return '';

  const lines = templates.map((t, index) => {
    const isiLines = t.isi
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' / ');
    return `${index + 1}. [${t.judul}] ${isiLines}`;
  });
  return [
    'DAFTAR MASTER KESAN (judul pemeriksaan dalam kurung siku, lalu isi bacaan per baris dipisah "/"):',
    ...lines,
  ].join('\n');
}

/// Ambil seluruh isi Master Kesan (KesanTemplate, diisi lewat menu Radiologi >
/// Master Kesan) untuk dijadikan rujukan jawaban chat — supaya AI menjawab
/// dengan redaksi kesan yang benar-benar dipakai klinik ini, bukan mengarang.
export async function buildMasterKesanContext(): Promise<string> {
  const templates = await prisma.kesanTemplate.findMany({
    select: { judul: true, isi: true },
    orderBy: { judul: 'asc' },
    take: MAX_MASTER_KESAN_ENTRIES,
  });
  return formatMasterKesanContext(templates);
}

type ChatRole = 'user' | 'model';
interface ChatTurn {
  readonly role: ChatRole;
  readonly text: string;
}

export const MAX_HISTORY_TURNS = 20;
export const MAX_MESSAGE_LENGTH = 4000;

export function sanitizeHistory(history: unknown): ChatTurn[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (turn): turn is ChatTurn =>
        Boolean(turn) &&
        typeof turn === 'object' &&
        (turn as { role?: unknown }).role !== undefined &&
        ((turn as { role?: unknown }).role === 'user' || (turn as { role?: unknown }).role === 'model') &&
        typeof (turn as { text?: unknown }).text === 'string' &&
        (turn as { text: string }).text.trim().length > 0,
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, MAX_MESSAGE_LENGTH) }));
}

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { history?: unknown; message?: string } }>('/api/chat', async (req, reply) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reply.status(503).send({
        error: 'Fitur chat AI belum dikonfigurasi. Admin perlu mengatur GEMINI_API_KEY di server.',
      });
    }

    const message = req.body.message?.trim();
    if (!message) return badRequest(reply, 'message wajib diisi');
    if (message.length > MAX_MESSAGE_LENGTH) {
      return badRequest(reply, `Pesan terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter)`);
    }

    const history = sanitizeHistory(req.body.history);
    const contents = [
      ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      { role: 'user' as const, parts: [{ text: message }] },
    ];

    try {
      const masterKesanContext = await buildMasterKesanContext();
      const systemInstruction = masterKesanContext
        ? `${CHAT_SYSTEM_PROMPT}\n\n${masterKesanContext}`
        : CHAT_SYSTEM_PROMPT;

      const client = new GoogleGenAI({ apiKey });
      const response = await generateContentWithFallback(client, {
        model: 'gemini-3.6-flash',
        contents,
        // Tanpa timeout, request bisa menggantung tanpa batas kalau Gemini
        // tidak merespons — chat widget di frontend butuh kepastian gagal.
        // gemini-3.6-flash pakai mode "thinking" yang bisa makan >20 detik
        // walau untuk prompt pendek, jadi timeout dilonggarkan ke 45 detik.
        // 429/503/504 sesaat sudah dicoba ulang otomatis, lalu jatuh ke
        // gemini-flash-lite-latest kalau kuota model utama habis (lihat
        // generateContentWithFallback di analisaFotoAi.ts).
        config: { systemInstruction, tools: [{ googleSearch: {} }], httpOptions: { timeout: 45_000 } },
      });

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
        return reply.status(502).send({ error: 'AI menolak menjawab pesan ini.' });
      }

      const text = response.text;
      if (!text) return reply.status(502).send({ error: 'AI tidak mengembalikan balasan yang valid.' });
      return { reply: text };
    } catch (err) {
      req.log.error(err, 'Gagal memanggil AI chat');
      return reply.status(502).send({
        error: err instanceof Error ? `Gagal menghubungi layanan AI: ${err.message}` : 'Gagal menghubungi layanan AI',
      });
    }
  });
}
