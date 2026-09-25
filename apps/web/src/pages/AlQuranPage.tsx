import { useCallback, useEffect, useRef, useState } from 'react';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { fetchJuz, QURAN_RECITERS, type QuranAyahPair } from '../lib/quranApi.ts';
import '../components/ui/ui.css';

const JUZ_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);
const RECITER_KEY = 'dirimu-reciter';

function loadReciter(): string {
  try {
    return window.localStorage.getItem(RECITER_KEY) ?? QURAN_RECITERS[0]!.id;
  } catch {
    return QURAN_RECITERS[0]!.id;
  }
}

/** Halaman "Dirimu" — Al-Qur'an & terjemahan per juz, bisa dibacakan
 * (audio) berurutan ayat demi ayat, dengan pilihan 2 irama/qari. */
export function AlQuranPage() {
  const [juz, setJuz] = useState<number | null>(null);
  const [ayat, setAyat] = useState<readonly QuranAyahPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reciterId, setReciterId] = useState(loadReciter);

  const [playIndex, setPlayIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ayatRef = useRef<readonly QuranAyahPair[]>([]);
  ayatRef.current = ayat;

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setPlayIndex(null);
  }, []);

  const playFromIndex = useCallback((index: number) => {
    const list = ayatRef.current;
    const item = list[index];
    if (!item?.audio) return;
    audioRef.current?.pause();
    const audio = new Audio(item.audio);
    audioRef.current = audio;
    setPlayIndex(index);
    setIsPlaying(true);
    audio.onended = () => {
      const next = index + 1;
      if (next < ayatRef.current.length) {
        playFromIndex(next);
      } else {
        stopAudio();
      }
    };
    void audio.play().catch(() => setIsPlaying(false));
  }, [stopAudio]);

  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resumeAudio = useCallback(() => {
    if (audioRef.current) {
      void audioRef.current.play();
      setIsPlaying(true);
    } else if (playIndex !== null) {
      playFromIndex(playIndex);
    } else {
      playFromIndex(0);
    }
  }, [playIndex, playFromIndex]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  async function loadJuz(n: number) {
    stopAudio();
    setJuz(n);
    setLoading(true);
    setError(null);
    try {
      const items = await fetchJuz(n, reciterId);
      setAyat(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat Juz');
      setAyat([]);
    } finally {
      setLoading(false);
    }
  }

  function changeReciter(id: string) {
    setReciterId(id);
    try {
      window.localStorage.setItem(RECITER_KEY, id);
    } catch {
      // Penyimpanan browser diblokir — pilihan berlaku untuk sesi ini saja.
    }
    if (juz !== null) void loadJuz(juz);
  }

  let lastSurahNumber: number | null = null;

  return (
    <ListPageShell
      title="Dirimu — Al-Qur'an & Terjemahan"
      subtitle="Pilih Juz 1–30, bisa dibacakan (audio) berurutan ayat demi ayat"
    >
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>🎙️ Irama/Qari</span>
          <select
            value={reciterId}
            onChange={(e) => changeReciter(e.target.value)}
            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            {QURAN_RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
            gap: '0.4rem',
            marginBottom: '1.25rem',
          }}
        >
          {JUZ_NUMBERS.map((n) => (
            <button
              key={n}
              type="button"
              className={`btn btn--sm ${juz === n ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => void loadJuz(n)}
            >
              Juz {n}
            </button>
          ))}
        </div>

        {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {juz !== null && !loading && !error && ayat.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              padding: '0.75rem 1rem',
              background: '#0f172a',
              color: '#fff',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              position: 'sticky',
              top: 0,
              zIndex: 5,
            }}
          >
            <strong>Juz {juz}</strong>
            {isPlaying ? (
              <button type="button" className="btn btn--sm btn--secondary" onClick={pauseAudio}>
                ⏸️ Jeda
              </button>
            ) : (
              <button type="button" className="btn btn--sm btn--secondary" onClick={resumeAudio}>
                ▶️ {playIndex !== null ? 'Lanjut' : 'Putar'}
              </button>
            )}
            <button type="button" className="btn btn--sm btn--danger" onClick={stopAudio}>
              ⏹️ Stop
            </button>
            {playIndex !== null && (
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Ayat {playIndex + 1}/{ayat.length}
              </span>
            )}
          </div>
        )}

        {loading && <p style={{ textAlign: 'center', color: '#64748b' }}>Memuat Juz {juz}…</p>}

        {!loading &&
          ayat.map((a, i) => {
            const showSurahHeader = a.surah.number !== lastSurahNumber;
            lastSurahNumber = a.surah.number;
            return (
              <div key={a.number}>
                {showSurahHeader && (
                  <div
                    style={{
                      margin: '1.25rem 0 0.75rem',
                      padding: '0.5rem 0.75rem',
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {a.surah.englishName} — {a.surah.name}
                  </div>
                )}
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    background: playIndex === i ? '#eff6ff' : 'transparent',
                    border: playIndex === i ? '1px solid #93c5fd' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        border: '1px solid #cbd5e1',
                        borderRadius: '999px',
                        width: '1.6rem',
                        height: '1.6rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {a.numberInSurah}
                    </span>
                    <button
                      type="button"
                      onClick={() => playFromIndex(i)}
                      title="Putar dari ayat ini"
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        cursor: a.audio ? 'pointer' : 'default',
                        flex: 1,
                        textAlign: 'right',
                        fontSize: '1.4rem',
                        lineHeight: 2,
                        direction: 'rtl',
                        fontFamily: 'inherit',
                      }}
                      disabled={!a.audio}
                    >
                      {a.arab}
                    </button>
                  </div>
                  <p style={{ margin: '0.35rem 0 0 2.1rem', color: '#334155', fontSize: '0.9rem' }}>{a.terjemahan}</p>
                </div>
              </div>
            );
          })}

        {juz === null && !loading && (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
            Pilih salah satu Juz di atas untuk mulai membaca.
          </p>
        )}
      </div>
    </ListPageShell>
  );
}
