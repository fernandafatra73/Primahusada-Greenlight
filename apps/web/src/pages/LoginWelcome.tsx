import { useEffect, useRef } from 'react';
import { isCabinSilent, playCabinChime, playJetSound, setCabinAudioPaused, unlockCabinAudio } from '../lib/cabinSounds.ts';
import { withIndonesianVoice } from '../lib/speechVoice.ts';

// Seberapa jauh siklus animasi pesawat mendarat (login.css, login-landing) saat roda
// menyentuh landasan (54% dari siklus 30 detik), dan seberapa sering kita memeriksanya.
const TOUCHDOWN_PROGRESS = 0.54;
const POLL_MS = 150;
const LANDING_SOUND_MS = 6000;
const TAKEOFF_SOUND_MS = 9000;
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

function animationProgress(selector: string): number | null {
  const el = document.querySelector(selector);
  const anim = el?.getAnimations()[0];
  const progress = anim?.effect?.getComputedTiming().progress;
  return typeof progress === 'number' ? progress : null;
}

interface LoginWelcomeProps {
  readonly paused: boolean;
  /** Dipanggil setelah ucapan sambutan dan bel kabin selesai. */
  readonly onVoiceDone: () => void;
}

// Saat pesawat di adegan login mendarat:
// pendaratan pertama membacakan ucapan selamat datang sekali saja, lalu bel
// kabin. Pendaratan berikutnya memutar deru mesin, dan setiap pesawat mulai
// lepas landas (naik) juga berbunyi, kecuali saat ucapan atau adegan samping.
// Browser dapat menolak suara sebelum pengguna berinteraksi, jadi ucapan yang
// tertahan diputar pada interaksi pertama.
export function LoginWelcome({ paused, onVoiceDone }: LoginWelcomeProps) {
  // Efek utama hanya jalan sekali; callback terbaru dibaca lewat ref.
  const onVoiceDoneRef = useRef(onVoiceDone);
  onVoiceDoneRef.current = onVoiceDone;
  const busyRef = useRef(false);
  const voiceUsedRef = useRef(false);
  const pendingVoiceRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const synthSupported = 'speechSynthesis' in window;

    function finishVoice(): void {
      void playCabinChime().then(() => {
        busyRef.current = false;
        onVoiceDoneRef.current();
      });
    }

    function speak(): void {
      if (!synthSupported) {
        busyRef.current = false;
        onVoiceDoneRef.current();
        return;
      }
      busyRef.current = true;
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
          busyRef.current = false;
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

    function onLanded(): void {
      if (busyRef.current) return;
      if (!voiceUsedRef.current) {
        voiceUsedRef.current = true;
        // Setelah logout otomatis, atau bila ucapan sudah dibacakan di sesi ini: tanpa ucapan,
        // tetapi adegan samping tetap lanjut.
        if (isCabinSilent() || voicePlayedThisSession()) {
          onVoiceDoneRef.current();
        } else {
          speak();
          return;
        }
      }
      playJetSound(LANDING_SOUND_MS);
    }

    function onTakeoff(): void {
      // Tidak menimpa ucapan sambutan, dan adegan samping punya suasananya sendiri.
      if (busyRef.current || document.querySelector('.login-scene--away')) return;
      const takeoff = document.querySelector('.login-scene__takeoff');
      if (!takeoff || getComputedStyle(takeoff).visibility === 'hidden') return;
      playJetSound(TAKEOFF_SOUND_MS);
    }

    function onFirstInteraction(): void {
      void unlockCabinAudio();
      if (!pendingVoiceRef.current) return;
      pendingVoiceRef.current = false;
      speak();
    }

    let previousLanding: number | null = null;
    let previousTakeoff: number | null = null;
    const poll = window.setInterval(() => {
      const landing = animationProgress('.login-scene__landing');
      if (landing !== null) {
        if (previousLanding !== null && previousLanding < TOUCHDOWN_PROGRESS && landing >= TOUCHDOWN_PROGRESS) {
          onLanded();
        }
        previousLanding = landing;
      }
      const takeoff = animationProgress('.login-scene__takeoff');
      if (takeoff !== null) {
        // Progres kembali ke awal = siklus baru = pesawat mulai bergerak di landasan.
        if (previousTakeoff !== null && takeoff < previousTakeoff) onTakeoff();
        previousTakeoff = takeoff;
      }
    }, POLL_MS);

    // Tanpa animasi (reduced-motion) pesawat tidak mendarat; sambut sekali saja.
    const noAnimationTimer = window.setTimeout(() => {
      if (animationProgress('.login-scene__landing') === null) onLanded();
    }, 2000);

    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(noAnimationTimer);
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
      if (synthSupported) window.speechSynthesis.cancel();
      setCabinAudioPaused(false);
    };
  }, []);

  // Tombol Stop / Lanjut: jeda dan lanjutkan suara sambutan dan deru mesin.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      if (paused) window.speechSynthesis.pause();
      else window.speechSynthesis.resume();
    }
    setCabinAudioPaused(paused);
  }, [paused]);

  return null;
}
