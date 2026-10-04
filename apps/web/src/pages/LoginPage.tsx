import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import { apiPost } from '../lib/api.ts';
import type { AuthUser } from '../lib/auth.ts';
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
  const [arrival, setArrival] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const photoTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (photoTimerRef.current !== null) window.clearTimeout(photoTimerRef.current);
    },
    [],
  );

  // Foto sambutan muncul di atas setelah semua adegan pesawat selesai, lalu hilang setelah 20 detik.
  function showPhoto(): void {
    setPhotoVisible(true);
    if (photoTimerRef.current !== null) window.clearTimeout(photoTimerRef.current);
    photoTimerRef.current = window.setTimeout(() => setPhotoVisible(false), PHOTO_VISIBLE_MS);
  }

  // Setelah ucapan sambutan selesai: tampilan beralih ke samping (penumpang turun, ambil bagasi,
  // naik DAMRI) lalu kembali pelan-pelan; tanpa animasi langsung tampilkan foto.
  function startArrival(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showPhoto();
      return;
    }
    setArrival(true);
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
      <div className={paused ? 'login-frame login-frame--paused' : 'login-frame'}>
        <LoginScene arrival={arrival} onArrivalEnd={endArrival} />
        <LoginWelcome paused={paused} onVoiceDone={startArrival} />
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
        </div>
        <section className="login-panel" aria-labelledby="login-title">
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
