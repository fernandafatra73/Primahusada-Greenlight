import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import {
  fetchAyahJuz,
  fetchJuz,
  searchQuran,
  QURAN_RECITERS,
  type QuranAyahPair,
  type QuranSearchResult,
  type QuranSurahRef,
} from '../lib/quranApi.ts';
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

interface SurahGroup {
  readonly surah: QuranSurahRef;
  /** Ayat surah ini, dengan index aslinya di array `ayat` satu juz penuh —
   * dipakai supaya tombol putar tetap bisa memutar berurutan lintas surah. */
  readonly items: readonly { readonly ayah: QuranAyahPair; readonly index: number }[];
}

function groupBySurah(ayat: readonly QuranAyahPair[]): readonly SurahGroup[] {
  const groups: SurahGroup[] = [];
  ayat.forEach((ayah, index) => {
    const last = groups[groups.length - 1];
    if (last && last.surah.number === ayah.surah.number) {
      (last.items as { ayah: QuranAyahPair; index: number }[]).push({ ayah, index });
    } else {
      groups.push({ surah: ayah.surah, items: [{ ayah, index }] });
    }
  });
  return groups;
}

/** Halaman "Dirimu" — Al-Qur'an & terjemahan per juz, bisa dibacakan
 * (audio) berurutan ayat demi ayat, dengan pilihan 2 irama/qari. */
export function AlQuranPage() {
  const [juz, setJuz] = useState<number | null>(null);
  const [ayat, setAyat] = useState<readonly QuranAyahPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reciterId, setReciterId] = useState(loadReciter);
  // Surah yang sedang dibuka ayat-ayatnya — null berarti cuma daftar surah
  // yang tampil, belum ada ayat yang dikeluarkan.
  const [expandedSurah, setExpandedSurah] = useState<number | null>(null);

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
    setExpandedSurah(null);
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

  function toggleSurah(surahNumber: number) {
    setExpandedSurah((cur) => (cur === surahNumber ? null : surahNumber));
  }

  // ── Pencarian ────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<readonly QuranSearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const [highlightNumber, setHighlightNumber] = useState<number | null>(null);

  async function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setSearchLoading(true);
    setSearchError(null);
    try {
      const results = await searchQuran(searchTerm);
      setSearchResults(results);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Pencarian gagal');
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }

  function closeSearch() {
    setSearchResults(null);
    setSearchTerm('');
    setSearchError(null);
  }

  async function goToResult(result: QuranSearchResult) {
    try {
      const targetJuz = await fetchAyahJuz(result.number);
      closeSearch();
      setJumpTarget(result.number);
      await loadJuz(targetJuz);
      setExpandedSurah(result.surah.number);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Gagal membuka ayat ini');
    }
  }

  // Begitu ayat hasil pencarian sudah termuat, gulir ke situ & sorot sebentar.
  useEffect(() => {
    if (jumpTarget === null || loading) return;
    const el = document.getElementById(`ayat-${jumpTarget}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightNumber(jumpTarget);
      const id = window.setTimeout(() => setHighlightNumber(null), 4000);
      setJumpTarget(null);
      return () => window.clearTimeout(id);
    }
    setJumpTarget(null);
  }, [jumpTarget, loading, ayat]);

  function changeReciter(id: string) {
    setReciterId(id);
    try {
      window.localStorage.setItem(RECITER_KEY, id);
    } catch {
      // Penyimpanan browser diblokir — pilihan berlaku untuk sesi ini saja.
    }
    if (juz !== null) void loadJuz(juz);
  }

  const surahGroups = groupBySurah(ayat);

  return (
    <ListPageShell
      title="Dirimu — Al-Qur'an & Terjemahan"
      subtitle="Pilih Juz 1–30 → pilih surahnya → ayatnya baru tampil, bisa dibacakan (audio) berurutan"
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

        <form onSubmit={(e) => void onSearchSubmit(e)} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kata/topik dalam Al-Qur'an, mis. sabar, rezeki, puasa…"
            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
          <button type="submit" className="btn btn--sm btn--primary" disabled={searchLoading || !searchTerm.trim()}>
            {searchLoading ? '⏳ Mencari…' : '🔍 Cari'}
          </button>
          {searchResults !== null && (
            <button type="button" className="btn btn--sm btn--secondary" onClick={closeSearch}>
              ✕ Tutup
            </button>
          )}
        </form>

        {searchError && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{searchError}</div>}

        {searchResults !== null && (
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              maxHeight: '22rem',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: '0.6rem 0.85rem',
                background: '#f1f5f9',
                fontWeight: 700,
                color: '#0f172a',
                fontSize: '0.85rem',
              }}
            >
              {searchResults.length === 0
                ? `Tidak ada hasil untuk "${searchTerm}"`
                : `${searchResults.length} ayat ditemukan untuk "${searchTerm}"`}
            </div>
            {searchResults.map((r) => (
              <button
                key={r.number}
                type="button"
                onClick={() => void goToResult(r)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.65rem 0.85rem',
                  border: 'none',
                  borderTop: '1px solid #e2e8f0',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#0369a1', marginBottom: '0.15rem' }}>
                  {r.surah.englishName} : {r.numberInSurah}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155' }}>{r.cuplikan}</div>
              </button>
            ))}
          </div>
        )}

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
          surahGroups.map((group) => {
            const isExpanded = expandedSurah === group.surah.number;
            return (
              <div key={group.surah.number} style={{ marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => toggleSurah(group.surah.number)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: isExpanded ? '#0f172a' : '#f1f5f9',
                    color: isExpanded ? '#fff' : '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    {group.surah.englishName} — {group.surah.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>
                    {group.items.length} ayat {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {isExpanded &&
                  group.items.map(({ ayah: a, index: i }) => (
                    <div key={a.number} id={`ayat-${a.number}`}>
                      <div
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          marginBottom: '0.5rem',
                          background: playIndex === i || highlightNumber === a.number ? '#eff6ff' : 'transparent',
                          border:
                            playIndex === i || highlightNumber === a.number
                              ? '1px solid #93c5fd'
                              : '1px solid transparent',
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
                        <p style={{ margin: '0.35rem 0 0 2.1rem', color: '#334155', fontSize: '0.9rem' }}>
                          {a.terjemahan}
                        </p>
                      </div>
                    </div>
                  ))}
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
