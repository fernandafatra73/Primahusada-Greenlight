import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import { apiPost } from '../lib/api.ts';
import type { AuthUser } from '../lib/auth.ts';
import { isCabinSilent, unlockCabinAudio } from '../lib/cabinSounds.ts';
import { startLoginMusic, stopLoginMusic } from '../lib/loginMusic.ts';
import { LoginProfile } from './LoginProfile.tsx';
import { LoginWelcome } from './LoginWelcome.tsx';
import { WelcomePhoto, WELCOME_PHOTO_URL } from '../components/WelcomePhoto.tsx';
import './login.css';

const CLINIC_ADDRESS = 'Jl. Siliwangi Ruko Palapa II Parung Kuda - Sukabumi';
const CLINIC_PHONE = 'Telp 0857-1932-5557';

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
  const [musicOn, setMusicOn] = useState(() => !isCabinSilent());
  // Musik baru berjalan setelah ucapan sambutan (dan bel) selesai.
  const [voiceFinished, setVoiceFinished] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

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
      startLoginMusic();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      stopLoginMusic();
    };
  }, [musicOn, voiceFinished]);

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
      <div className="login-frame">
        <WelcomePhoto className="login-frame__photo" />
        <LoginWelcome onVoiceDone={() => setVoiceFinished(true)} />

        {/* Dengan foto: alamat diletakkan di bawah slogan "Sehat Bersama, Hidup Lebih Baik"
            pada foto; tanpa foto: di bawah judul. */}
        {WELCOME_PHOTO_URL ? (
          <p className="login-frame__address">
            <span>{CLINIC_ADDRESS}</span>
            <span>{CLINIC_PHONE}</span>
          </p>
        ) : null}

        <header className="login-header">
          <img src={logoPrimahusada} alt="" className="login-header__logo" />
          <div className="login-header__text">
            <h1 className="login-header__title">Aplikasi Klinik Prima Husada</h1>
            {WELCOME_PHOTO_URL ? null : (
              <p className="login-header__address">
                {CLINIC_ADDRESS} &middot; {CLINIC_PHONE}
              </p>
            )}
          </div>
          <button
            type="button"
            className="login-header__music"
            aria-pressed={musicOn}
            onClick={() => setMusicOn((on) => !on)}
          >
            {musicOn ? 'Musik: Hidup' : 'Musik: Mati'}
          </button>
        </header>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel__brand">
            <img src={logoPrimahusada} alt="Klinik Prima Husada" className="login-panel__logo" />
            <p className="login-panel__eyebrow">Klinik Prima Husada</p>
          </div>

          <div className="login-panel__divider" aria-hidden />

          <h2 id="login-title" className="login-panel__title">Masuk ke sistem</h2>

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
