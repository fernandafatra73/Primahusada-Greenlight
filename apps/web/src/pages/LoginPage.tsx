import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import { apiPost } from '../lib/api.ts';
import type { AuthUser } from '../lib/auth.ts';
import { isCabinSilent, unlockCabinAudio } from '../lib/cabinSounds.ts';
import { setLoginMusicPaused, startLoginMusic, stopLoginMusic } from '../lib/loginMusic.ts';
import { LoginParkedPlane } from './LoginParkedPlane.tsx';
import { LoginProfile } from './LoginProfile.tsx';
import { LoginScene } from './LoginScene.tsx';
import { LoginWelcome } from './LoginWelcome.tsx';
import { WelcomePhoto, WELCOME_PHOTO_URL } from '../components/WelcomePhoto.tsx';
import './login.css';

const PHOTO_VISIBLE_MS = 20000;

interface LoginPageProps {
  readonly onLogin: (user: AuthUser) => void;
}

interface LoginResponse {
  readonly user: AuthUser;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('admin@primahusada.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);
  // Timer foto dan gambar mengikuti bar kecepatan, jadi dibaca dari ref saat dijadwalkan.
  const speedRef = useRef(1);
  speedRef.current = speed;
  const [arrival, setArrival] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [musicOn, setMusicOn] = useState(() => !isCabinSilent());
  // Musik baru berjalan setelah ucapan sambutan (dan bel kabin) selesai.
  const [voiceFinished, setVoiceFinished] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [parkedVisible, setParkedVisible] = useState(false);
  const photoTimerRef = useRef<number | null>(null);
  const parkedTimerRef = useRef<number | null>(null);
  // Tampilan samping baru dimulai bila ucapan selesai DAN semua pesawat di apron kiri sudah lepas landas.
  const voiceDoneRef = useRef(false);
  const apronEmptyRef = useRef(false);
  const arrivalStartedRef = useRef(false);

  // Bar kecepatan: semua animasi di bingkai (adegan utama, kedatangan, mobil, orang) dipercepat
  // lewat playbackRate. Animasi baru (adegan kedatangan) dipasangi lagi tiap 0,4 detik.
  useEffect(() => {
    function apply(): void {
      frameRef.current?.getAnimations({ subtree: true }).forEach((animation) => {
        if (animation.playbackRate !== speed) animation.updatePlaybackRate(speed);
      });
    }
    apply();
    const id = window.setInterval(apply, 400);
    return () => window.clearInterval(id);
  }, [speed]);

  // Musik latar login: mulai setelah ucapan selesai dan interaksi pertama (aturan browser), berhenti saat masuk.
  useEffect(() => {
    if (!musicOn || !voiceFinished) {
      stopLoginMusic();
      return undefined;
    }
    startLoginMusic();
    // Bila browser menolak pemutaran otomatis, lagu dicoba lagi pada interaksi pertama.
    const unlock = (): void => {
      void unlockCabinAudio();
      if (!pausedRef.current) startLoginMusic();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      stopLoginMusic();
    };
  }, [musicOn, voiceFinished]);

  // Tombol Stop / Lanjut juga menjeda lagu.
  useEffect(() => {
    setLoginMusicPaused(paused);
  }, [paused]);

  useEffect(
    () => () => {
      if (photoTimerRef.current !== null) window.clearTimeout(photoTimerRef.current);
      if (parkedTimerRef.current !== null) window.clearTimeout(parkedTimerRef.current);
    },
    [],
  );

  // Setelah foto hilang, gambar pesawat Prima Husada yang parkir tampil 20 detik.
  function showParked(): void {
    setParkedVisible(true);
    if (parkedTimerRef.current !== null) window.clearTimeout(parkedTimerRef.current);
    parkedTimerRef.current = window.setTimeout(() => setParkedVisible(false), PHOTO_VISIBLE_MS / speedRef.current);
  }

  // Foto sambutan muncul di atas setelah semua adegan pesawat selesai, lalu hilang setelah 20 detik.
  function showPhoto(): void {
    setPhotoVisible(true);
    if (photoTimerRef.current !== null) window.clearTimeout(photoTimerRef.current);
    photoTimerRef.current = window.setTimeout(() => {
      setPhotoVisible(false);
      showParked();
    }, PHOTO_VISIBLE_MS / speedRef.current);
  }

  // Setelah ucapan sambutan selesai: tampilan beralih ke samping (penumpang turun, ambil bagasi,
  // naik DAMRI) lalu kembali pelan-pelan; tanpa animasi langsung tampilkan foto.
  function startArrival(): void {
    arrivalStartedRef.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showPhoto();
      return;
    }
    setArrival(true);
  }

  function onVoiceDone(): void {
    voiceDoneRef.current = true;
    setVoiceFinished(true);
    if (apronEmptyRef.current && !arrivalStartedRef.current) startArrival();
  }

  function onLeftApronEmpty(): void {
    apronEmptyRef.current = true;
    if (voiceDoneRef.current && !arrivalStartedRef.current) startArrival();
  }

  function endArrival(): void {
    setArrival(false);
    showPhoto();
  }
  const passwordRef = useRef<HTMLInputElement>(null);

  function onEmailKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      passwordRef.current?.focus();
    }
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await apiPost<LoginResponse>('/api/auth/login', { email, password });
      onLogin(result.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div ref={frameRef} className={paused ? 'login-frame login-frame--paused' : 'login-frame'}>
        <LoginScene arrival={arrival} onArrivalEnd={endArrival} onLeftApronEmpty={onLeftApronEmpty} />
        <LoginWelcome paused={paused} onVoiceDone={onVoiceDone} />
        {parkedVisible ? <LoginParkedPlane /> : null}
        {photoVisible ? (
          <figure className="login-photo">
            {WELCOME_PHOTO_URL ? (
              <WelcomePhoto />
            ) : (
              <div className="login-photo__fallback">
                <img src={logoPrimahusada} alt="Klinik Prima Husada" />
                <p className="login-photo__title">Selamat Datang di Klinik Prima Husada</p>
              </div>
            )}
          </figure>
        ) : null}
        <div className="login-controls">
          <button type="button" onClick={() => setPaused(true)} disabled={paused}>
            Stop
          </button>
          <button type="button" onClick={() => setPaused(false)} disabled={!paused}>
            Lanjut
          </button>
          <button type="button" className="login-controls__login" aria-pressed={showLogin} onClick={() => setShowLogin((on) => !on)}>
            {showLogin ? 'Sembunyikan Login' : 'Login'}
          </button>
          <button type="button" aria-pressed={musicOn} onClick={() => setMusicOn((on) => !on)}>
            {musicOn ? 'Musik: Hidup' : 'Musik: Mati'}
          </button>
          <label className="login-controls__speed">
            <span>Kecepatan</span>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={speed}
              aria-label="Kecepatan animasi"
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
            <output>{speed}x</output>
          </label>
        </div>
        <section className={showLogin ? 'login-panel' : 'login-panel login-panel--hidden'} aria-labelledby="login-title">
          <div className="login-panel__brand">
            <img src={logoPrimahusada} alt="Klinik Prima Husada" className="login-panel__logo" />
            <p className="login-panel__eyebrow">Klinik Prima Husada</p>
          </div>

          <div className="login-panel__divider" aria-hidden />

          <h1 id="login-title" className="login-panel__title">Masuk ke sistem</h1>

          <form className="login-form" onSubmit={(event) => void onSubmit(event)}>
            <div className="form-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={onEmailKeyDown}
              />
            </div>

            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? <p className="login-form__error">{error}</p> : null}

            <button type="submit" className="btn btn--primary login-form__submit" disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </section>
      </div>
      <LoginProfile />
    </main>
  );
}
