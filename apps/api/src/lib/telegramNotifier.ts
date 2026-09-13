const TELEGRAM_TIMEOUT_MS = 15_000;

interface TelegramResponse {
  readonly ok?: boolean;
  readonly description?: string;
}

export interface TelegramConfig {
  readonly token: string;
  readonly chatId: string;
}

/** Baca konfigurasi bot dari environment. Mengembalikan null kalau belum
 * lengkap supaya pemanggilnya bisa memilih untuk tidak menjalankan job sama
 * sekali, mengikuti pola GEMINI_API_KEY di route analisa AI. */
export function readTelegramConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

/** Kirim pesan teks biasa ke satu chat. Sengaja tanpa parse_mode supaya tidak
 * ada pesan gagal terkirim gara-gara karakter yang perlu di-escape. */
export async function sendTelegramMessage(config: TelegramConfig, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });

  const data = (await res.json().catch(() => null)) as TelegramResponse | null;
  if (!res.ok || !data?.ok) {
    // description dari Telegram tidak pernah memuat token, aman dicatat.
    throw new Error(`Telegram menolak pesan: ${data?.description ?? `status ${res.status}`}`);
  }
}
