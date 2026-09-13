import { config } from 'dotenv';

config({ path: new URL('../.env', import.meta.url), override: true });

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN belum diset.');
  console.error('Tambahkan barisnya di apps/api/.env (file ini sudah masuk .gitignore):');
  console.error('');
  console.error('  TELEGRAM_BOT_TOKEN=token-dari-BotFather');
  console.error('');
  process.exit(1);
}

let payload;
try {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    signal: AbortSignal.timeout(15_000),
  });
  payload = await res.json();
} catch (err) {
  console.error('Gagal menghubungi API Telegram:', err instanceof Error ? err.message : err);
  process.exit(1);
}

if (!payload?.ok) {
  // description Telegram tidak pernah memuat token, aman dicetak.
  const alasan = payload?.description ?? 'respons tidak dikenali';
  console.error('Telegram menolak permintaan:', alasan);
  if (payload?.error_code === 401) {
    console.error('Token bot salah atau sudah di-revoke. Cek lagi lewat @BotFather.');
  } else if (payload?.error_code === 409) {
    console.error('Bot ini sedang memakai webhook, jadi getUpdates diblokir.');
    console.error('Matikan dulu: https://api.telegram.org/bot<TOKEN>/deleteWebhook');
  }
  process.exit(1);
}

// Satu update bisa berbentuk message, edited_message, channel_post, dst.
// Semuanya membawa objek chat di dalamnya.
const chats = new Map();
for (const update of payload.result ?? []) {
  const chat =
    update.message?.chat ??
    update.edited_message?.chat ??
    update.channel_post?.chat ??
    update.edited_channel_post?.chat ??
    update.my_chat_member?.chat ??
    update.callback_query?.message?.chat;
  if (chat?.id !== undefined) {
    chats.set(chat.id, chat);
  }
}

if (chats.size === 0) {
  console.log('Belum ada chat yang terdeteksi.');
  console.log('');
  console.log('Lakukan ini dulu, lalu jalankan ulang script ini:');
  console.log('  1. Buka bot-mu di Telegram, kirim /start atau pesan apa saja.');
  console.log('  2. Untuk grup/channel: masukkan bot ke sana, lalu kirim satu pesan.');
  console.log('');
  console.log('Catatan: Telegram hanya menyimpan update sekitar 24 jam terakhir.');
  process.exit(1);
}

console.log(`Ditemukan ${chats.size} chat:`);
console.log('');
for (const chat of chats.values()) {
  const nama = [chat.title, chat.first_name, chat.last_name].filter(Boolean).join(' ');
  const username = chat.username ? ` @${chat.username}` : '';
  console.log(`  chat_id : ${chat.id}`);
  console.log(`  tipe    : ${chat.type}`);
  console.log(`  nama    : ${nama || '(tanpa nama)'}${username}`);
  console.log('');
}

const [pertama] = chats.values();
console.log('Salin baris ini ke apps/api/.env:');
console.log('');
console.log(`  TELEGRAM_CHAT_ID=${pertama.id}`);
