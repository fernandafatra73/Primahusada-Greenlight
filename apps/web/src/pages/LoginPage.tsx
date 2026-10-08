import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import { apiPost } from '../lib/api.ts';
import type { AuthUser } from '../lib/auth.ts';
import { isCabinSilent, unlockCabinAudio } from '../lib/cabinSounds.ts';
import { startLoginMusic, stopLoginMusic } from '../lib/loginMusic.ts';
import { LoginProfile } from './LoginProfile.tsx';
import { LoginSlideshow } from './LoginSlideshow.tsx';
import { LoginWelcome } from './LoginWelcome.tsx';
import './login.css';

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
  // Kolom login tersembunyi sampai tombol Login (di sebelah Visi, Misi, Motto) ditekan.
  const [showLogin, setShowLogin] = useState(false);
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

  useEffect(() => {
    if (showLogin) passwordRef.current?.focus();
  }, [showLogin]);

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
        <LoginSlideshow />
        <LoginWelcome onVoiceDone={() => setVoiceFinished(true)} />

        <section className={showLogin ? 'login-panel' : 'login-panel login-panel--hidden'} aria-labelledby="login-title">
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
      <div className="login-actions">
        <LoginProfile />
        <button
          type="button"
          className="login-actions__btn login-actions__btn--login"
          aria-pressed={showLogin}
          onClick={() => setShowLogin((on) => !on)}
        >
          {showLogin ? 'Tutup Login' : 'Login'}
        </button>
        <button type="button" className="login-actions__btn" aria-pressed={musicOn} onClick={() => setMusicOn((on) => !on)}>
          {musicOn ? 'Musik: Hidup' : 'Musik: Mati'}
        </button>
      </div>
    </main>
  );
}
