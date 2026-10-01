import type { FastifyInstance, FastifyReply } from 'fastify';
import { GoogleGenAI, Type, type Content, type FunctionDeclaration, type Part } from '@google/genai';
import { generateContentWithFallback } from './analisaFotoAi.js';
import { DATA_TOOL_DECLARATIONS, isDataToolName, runDataTool } from '../lib/chatDataTools.js';
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

/// Tambahan prompt khusus Admin/CEO: AI boleh membaca data klinik lewat alat
/// baca-saja. Identitas pasien sudah disamarkan di sisi server (chatDataTools).
const DATA_ACCESS_PROMPT = `AKSES DATA KLINIK (khusus Admin/CEO yang sedang bertanya):
- Anda punya alat daftar_tabel, ambil_data, dan hitung_data untuk membaca data klinik (pasien, pemeriksaan, laporan keuangan, stok, absensi, dst). Pakai alat itu untuk menjawab pertanyaan tentang data klinik — jangan menebak angka atau isi data.
- Untuk jumlah/total/rekap, selalu pakai hitung_data. Kalau belum tahu nama tabel/kolom, panggil daftar_tabel dulu.
- Identitas pasien (nama, alamat, telepon, tanggal lahir) disamarkan oleh sistem, mis. "Pasien-a1b2c3" — nama yang sama selalu punya kode yang sama. Jelaskan itu kalau user menanyakan nama asli, dan JANGAN mencoba mengungkapnya. Kode registrasi (regCode) boleh disebut.
- Data hanya bisa dibaca, tidak bisa diubah. Tabel akun/password dan kredensial tidak tersedia.
- Sebutkan tabel/periode yang Anda pakai, dan katakan terus terang kalau datanya tidak ditemukan atau terpotong (maksimal 50 baris per panggilan).`;

const GOOGLE_TOOL_DECLARATION: FunctionDeclaration = {
  name: 'cari_di_google',
  description: 'Cari informasi terbaru di internet lewat Google untuk pertanyaan di luar data klinik.',
  parameters: {
    type: Type.OBJECT,
    properties: { pertanyaan: { type: Type.STRING, description: 'Pertanyaan atau kata kunci yang dicari.' } },
    required: ['pertanyaan'],
  },
};

const MAX_TOOL_ROUNDS = 6;
const CHAT_MODEL = 'gemini-3.6-flash';
const CHAT_TIMEOUT_MS = 45_000;
const DATA_ROLES: ReadonlySet<string> = new Set(['ADMIN', 'CEO']);

/// API ini belum punya sesi/token, jadi identitas hanya dikirim klien (staffId
/// dari login). Role-nya tetap dibaca dari database, bukan dari klien.
export async function canAccessClinicData(staffId: unknown): Promise<boolean> {
  if (typeof staffId !== 'string' || !staffId) return false;
  const staff = await prisma.staff.findUnique({ where: { id: staffId }, select: { role: true } });
  return staff !== null && DATA_ROLES.has(staff.role);
}

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

type GenerateResponse = Awaited<ReturnType<typeof generateContentWithFallback>>;

function isRefusal(response: GenerateResponse): boolean {
  const finishReason = response.candidates?.[0]?.finishReason;
  return finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT';
}

/// Pencarian Google dijalankan sebagai panggilan Gemini terpisah, karena
/// grounding Google Search tidak bisa digabung dengan function calling dalam
/// satu permintaan.
async function searchGoogle(client: GoogleGenAI, args: Readonly<Record<string, unknown>>): Promise<unknown> {
  const pertanyaan = typeof args.pertanyaan === 'string' ? args.pertanyaan.trim() : '';
  if (!pertanyaan) return { error: 'pertanyaan wajib diisi' };
  const response = await generateContentWithFallback(client, {
    model: CHAT_MODEL,
    contents: [{ role: 'user', parts: [{ text: pertanyaan }] }],
    config: { tools: [{ googleSearch: {} }], httpOptions: { timeout: CHAT_TIMEOUT_MS } },
  });
  return { jawaban: response.text ?? 'Tidak ada hasil.' };
}

async function runToolCall(
  client: GoogleGenAI,
  name: string,
  args: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  if (name === GOOGLE_TOOL_DECLARATION.name) {
    try {
      return await searchGoogle(client, args);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Pencarian Google gagal' };
    }
  }
  if (isDataToolName(name)) return runDataTool(name, args);
  return { error: `Alat "${name}" tidak dikenal` };
}

/// Jalur Admin/CEO: Gemini boleh memanggil alat baca data klinik dan pencarian
/// Google dalam beberapa putaran sebelum memberi jawaban akhir.
async function replyWithClinicData(
  client: GoogleGenAI,
  systemInstruction: string,
  initial: readonly Content[],
): Promise<GenerateResponse> {
  const contents: Content[] = [...initial];
  const tools = [{ functionDeclarations: [...DATA_TOOL_DECLARATIONS, GOOGLE_TOOL_DECLARATION] }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await generateContentWithFallback(client, {
      model: CHAT_MODEL,
      contents,
      config: { systemInstruction, tools, httpOptions: { timeout: CHAT_TIMEOUT_MS } },
    });

    const calls = response.functionCalls;
    const modelContent = response.candidates?.[0]?.content;
    if (!calls?.length || !modelContent) return response;

    // Konten model dikembalikan utuh (termasuk thought signature) supaya
    // Gemini bisa melanjutkan penalarannya setelah hasil alat masuk.
    contents.push(modelContent);
    const results: Part[] = await Promise.all(
      calls.map(async (call): Promise<Part> => {
        const name = call.name ?? '';
        const output = await runToolCall(client, name, call.args ?? {});
        return { functionResponse: { name, response: { output } } };
      }),
    );
    contents.push({ role: 'user', parts: results });
  }
  throw new Error('Pertanyaan terlalu rumit: AI terlalu banyak memanggil alat tanpa memberi jawaban.');
}

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { history?: unknown; message?: string; staffId?: unknown } }>('/api/chat', async (req, reply) => {
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
      const basePrompt = masterKesanContext
        ? `${CHAT_SYSTEM_PROMPT}

${masterKesanContext}`
        : CHAT_SYSTEM_PROMPT;
      const client = new GoogleGenAI({ apiKey });

      const withData = await canAccessClinicData(req.body.staffId);
      // Tanpa timeout, request bisa menggantung tanpa batas kalau Gemini
      // tidak merespons — chat widget di frontend butuh kepastian gagal.
      // gemini-3.6-flash pakai mode "thinking" yang bisa makan >20 detik
      // walau untuk prompt pendek, jadi timeout dilonggarkan ke 45 detik.
      // 429/503/504 sesaat sudah dicoba ulang otomatis, lalu jatuh ke
      // gemini-flash-lite-latest kalau kuota model utama habis (lihat
      // generateContentWithFallback di analisaFotoAi.ts).
      const response = withData
        ? await replyWithClinicData(client, `${basePrompt}

${DATA_ACCESS_PROMPT}`, contents)
        : await generateContentWithFallback(client, {
            model: CHAT_MODEL,
            contents,
            config: {
              systemInstruction: basePrompt,
              tools: [{ googleSearch: {} }],
              httpOptions: { timeout: CHAT_TIMEOUT_MS },
            },
          });

      if (isRefusal(response)) return reply.status(502).send({ error: 'AI menolak menjawab pesan ini.' });

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
