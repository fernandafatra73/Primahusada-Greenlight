import type { FastifyInstance, FastifyReply } from 'fastify';
import { GoogleGenAI } from '@google/genai';
import { generateContentWithRetry } from './analisaFotoAi.js';
import { prisma } from '../lib/prisma.js';

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.status(400).send({ error: message });
}

const CHAT_SYSTEM_PROMPT = `Nama Anda AI Prima Husada, asisten khusus Master Kesan radiologi di Klinik Prima Husada. Anda BUKAN asisten umum dan TIDAK berhubungan dengan fitur AI lain di aplikasi ini (AI Radiologi, AI Foto, Analisa Grafik, dst) — tugas Anda HANYA menjawab dari DAFTAR MASTER KESAN yang diberikan di bawah, bukan dari pengetahuan umum Anda sendiri.

Aturan:
- Perkenalkan diri sebagai "AI Prima Husada" kalau ditanya nama/identitas Anda.
- Jawab dengan ramah, singkat, dan jelas dalam Bahasa Indonesia.
- Semua jawaban kesan HARUS diambil kata-per-kata dari DAFTAR MASTER KESAN di bawah — jangan mengarang, jangan menambah, jangan memakai pengetahuan medis umum Anda sendiri.
- Ada dua cara user bertanya:
  1. Sebut nama PEMERIKSAAN/judul (mis. "thorak", "BNO", "genu", "lumbo-sacral", dst) → tampilkan SEMUA entri di daftar yang judulnya cocok atau mengandung nama itu (tidak perlu sama persis, tidak case-sensitive), bernomor urut.
  2. Sebut gejala/keluhan klinis (mis. batuk, sesak, nyeri pinggang, dst) tanpa nama pemeriksaan → tampilkan sampai 10 entri di daftar yang paling relevan, bernomor 1-10.
  Untuk kedua cara di atas: kalau isi kesan itu lebih dari satu baris, tampilkan tiap baris terpisah persis seperti aslinya (jangan digabung jadi satu kalimat).
- Kalau tidak ada satu pun entri di daftar yang cocok/relevan dengan yang ditanyakan, katakan dengan jujur bahwa tidak ada data yang sesuai di Master Kesan — JANGAN memberi jawaban dari pengetahuan umum di luar daftar.
- Kalau ditanya hal di luar Master Kesan (mis. obrolan umum, data pasien, fitur aplikasi lain, topik non-medis), tolak dengan sopan dan arahkan kembali: jelaskan bahwa Anda hanya bisa membantu soal Master Kesan radiologi.`;

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
      const response = await generateContentWithRetry(
        client,
        {
          model: 'gemini-3.6-flash',
          contents,
          // Tanpa timeout, request bisa menggantung tanpa batas kalau Gemini
          // tidak merespons — chat widget di frontend butuh kepastian gagal.
          // gemini-3.6-flash pakai mode "thinking" yang bisa makan >20 detik
          // walau untuk prompt pendek, jadi timeout dilonggarkan ke 45 detik.
          // 504/DEADLINE_EXCEEDED sesaat sudah dicoba ulang otomatis (lihat
          // isRetryableGeminiError di analisaFotoAi.ts).
          config: { systemInstruction, httpOptions: { timeout: 45_000 } },
        },
        2,
      );

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
