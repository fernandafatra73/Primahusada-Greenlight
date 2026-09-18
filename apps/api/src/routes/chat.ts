import type { FastifyInstance, FastifyReply } from 'fastify';
import { GoogleGenAI } from '@google/genai';
import { generateContentWithRetry } from './analisaFotoAi.js';

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.status(400).send({ error: message });
}

const CHAT_SYSTEM_PROMPT = `Anda adalah asisten AI untuk staff di Klinik Prima Husada (aplikasi manajemen klinik untuk radiologi, laboratorium, pendaftaran, farmasi, dan keuangan).

Aturan:
- Jawab dengan ramah, singkat, dan jelas dalam Bahasa Indonesia.
- Anda boleh membantu pertanyaan umum, penjelasan istilah, atau bantuan memakai fitur aplikasi.
- Untuk pertanyaan medis (diagnosa, dosis obat, resep, interpretasi hasil pemeriksaan pasien tertentu), tegaskan bahwa Anda tidak menggantikan penilaian dokter/radiolog dan sarankan berkonsultasi dengan tenaga medis di klinik.
- Jangan mengarang data pasien atau data klinik — Anda tidak punya akses ke database aplikasi.`;

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
      const client = new GoogleGenAI({ apiKey });
      const response = await generateContentWithRetry(client, {
        model: 'gemini-flash-latest',
        contents,
        // Tanpa timeout, request bisa menggantung tanpa batas kalau Gemini
        // tidak merespons — chat widget di frontend butuh kepastian gagal.
        config: { systemInstruction: CHAT_SYSTEM_PROMPT, httpOptions: { timeout: 20_000 } },
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
