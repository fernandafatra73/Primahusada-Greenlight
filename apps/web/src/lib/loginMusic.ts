import { isCabinSilent } from './cabinSounds.ts';

// Musik latar halaman login: lagu "Haruskah Aku Mengakhiri" diputar berulang. Browser menolak
// pemutaran otomatis sebelum pengguna berinteraksi, jadi startLoginMusic dipanggil ulang pada
// interaksi pertama sampai pemutaran benar-benar berjalan.

const MUSIC_URL = '/audio/haruskah-aku-mengakhiri.mp3';
const VOLUME = 0.5;

let audio: HTMLAudioElement | null = null;

/** Mulai (atau lanjutkan) lagu; aman dipanggil berulang. Diam bila ditolak browser atau mode senyap. */
export function startLoginMusic(): void {
  if (isCabinSilent() || typeof Audio === 'undefined') return;
  if (!audio) {
    audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = VOLUME;
  }
  if (!audio.paused) return;
  void audio.play().catch(() => undefined);
}

export function stopLoginMusic(): void {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio = null;
}

/** Tombol Stop / Lanjut: jeda dan lanjutkan lagu tanpa mengulang dari awal. */
export function setLoginMusicPaused(paused: boolean): void {
  if (!audio) return;
  if (paused) audio.pause();
  else void audio.play().catch(() => undefined);
}
