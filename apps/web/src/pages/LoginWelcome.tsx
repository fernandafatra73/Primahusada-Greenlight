import { useEffect, useRef } from 'react';
import { isCabinSilent, playCabinChime, unlockCabinAudio } from '../lib/cabinSounds.ts';
import { withIndonesianVoice } from '../lib/speechVoice.ts';

// Jeda singkat setelah halaman login tampil sebelum ucapan sambutan dibacakan.
const GREETING_DELAY_MS = 1500;
// Ucapan hanya sekali saat komputer/peramban baru dinyalakan: ditandai per sesi peramban.
const VOICE_FLAG = 'login-voice-played';

function voicePlayedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(VOICE_FLAG) === '1';
  } catch {
    return false;
  }
}

function markVoicePlayed(): void {
  try {
    window.sessionStorage.setItem(VOICE_FLAG, '1');
  } catch {
    // Tanpa penyimpanan sesi, ucapan hanya dijaga oleh ref komponen.
  }
}

function greetingWord(date: Date): string {
  const hour = date.getHours();
  if (hour < 11) return 'pagi';
  if (hour < 15) return 'siang';
  if (hour < 18) return 'sore';
  return 'malam';
}

function welcomeSpeech(date: Date): string {
  return (
    `Selamat ${greetingWord(date)} dan selamat datang di Klinik Prima Husada. ` +
    'Atas nama seluruh tim medis dan staf pelayanan, kami mengucapkan terima kasih karena Anda telah ' +
    'mempercayakan kesehatan Anda dan keluarga kepada kami. Demi kenyamanan dan kelancaran pelayanan Anda ' +
    'hari ini, mohon pastikan Anda telah mengambil nomor antrean dan menyiapkan kartu identitas atau kartu ' +
    'asuransi Anda. ' +
    'Klinik kami berkomitmen untuk memberikan pelayanan yang prima, aman, dan penuh kepedulian. Jika Anda ' +
    'memerlukan bantuan atau memiliki pertanyaan selama berada di area klinik, jangan ragu untuk menghubungi ' +
    'staf kami yang bertugas. ' +
    'Terima kasih atas kerja sama Anda, dan semoga Anda sehat selalu.'
  );
}

interface LoginWelcomeProps {
  /** Dipanggil setelah ucapan sambutan dan bel selesai (atau langsung bila ucapan dilewati). */
  readonly onVoiceDone: () => void;
}

// Sesaat setelah halaman login tampil, ucapan selamat datang dibacakan sekali
// per sesi peramban, lalu bel. Setelah logout otomatis (senyap) atau bila sudah
// dibacakan di sesi ini, ucapan dilewati. Browser dapat menolak suara sebelum
// pengguna berinteraksi, jadi ucapan yang tertahan diputar pada interaksi pertama.
export function LoginWelcome({ onVoiceDone }: LoginWelcomeProps) {
  // Efek utama hanya jalan sekali; callback terbaru dibaca lewat ref.
  const onVoiceDoneRef = useRef(onVoiceDone);
  onVoiceDoneRef.current = onVoiceDone;
  const pendingVoiceRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const synthSupported = 'speechSynthesis' in window;

    function finishVoice(): void {
      void playCabinChime().then(() => onVoiceDoneRef.current());
    }

    function speak(): void {
      if (!synthSupported) {
        onVoiceDoneRef.current();
        return;
      }
      markVoicePlayed();
      const utter = new SpeechSynthesisUtterance(welcomeSpeech(new Date()));
      utter.lang = 'id-ID';
      utter.rate = 0.9;
      utter.pitch = 1.05;
      utter.volume = 0.95;
      utter.onend = finishVoice;
      utter.onerror = (event) => {
        if (event.error === 'not-allowed') {
          pendingVoiceRef.current = true;
          return;
        }
        finishVoice();
      };
      withIndonesianVoice((voice) => {
        if (voice) {
          utter.voice = voice;
          utter.lang = voice.lang;
        }
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      });
    }

    function onFirstInteraction(): void {
      void unlockCabinAudio();
      if (!pendingVoiceRef.current) return;
      pendingVoiceRef.current = false;
      speak();
    }

    const timer = window.setTimeout(() => {
      if (isCabinSilent() || voicePlayedThisSession()) onVoiceDoneRef.current();
      else speak();
    }, GREETING_DELAY_MS);

    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
      if (synthSupported) window.speechSynthesis.cancel();
    };
  }, []);

  return null;
}
