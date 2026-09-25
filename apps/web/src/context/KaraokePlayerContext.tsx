import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { stepPlayerVolume } from '../lib/playerVolume.ts';
import { resolveSiaranTvPlayable, type SiaranTvPlayable } from '../lib/siaranTv.ts';

export interface KaraokeLagu {
  readonly id: string;
  readonly judul: string;
  readonly penyanyi: string | null;
  readonly url: string | null;
  readonly hasFile: boolean;
}

export interface AntrianItem {
  readonly id: string;
  readonly namaPenyanyi: string;
  readonly lagu: KaraokeLagu;
}

export function newAntrianId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Lagu dari file (tombol USB) diputar lewat endpoint file di server, bukan
 * dari field url — supaya tersimpan permanen dan tidak hilang saat reload. */
export function getPlayableForLagu(lagu: KaraokeLagu): SiaranTvPlayable {
  if (lagu.hasFile) {
    return { kind: 'video', src: `/api/karaoke-lagu/${lagu.id}/file` };
  }
  return resolveSiaranTvPlayable(lagu.url ?? '');
}

interface KaraokePlayerContextValue {
  readonly nowPlaying: AntrianItem | null;
  readonly antrian: readonly AntrianItem[];
  readonly replayKey: number;
  readonly isPaused: boolean;
  readonly volume: number;
  readonly videoRef: MutableRefObject<HTMLVideoElement | null>;
  readonly iframeRef: MutableRefObject<HTMLIFrameElement | null>;
  readonly playNow: (lagu: KaraokeLagu) => void;
  readonly addToQueue: (lagu: KaraokeLagu, namaPenyanyi: string) => void;
  readonly playFromQueue: (entry: AntrianItem) => void;
  readonly nextInQueue: () => void;
  readonly removeFromQueue: (id: string) => void;
  readonly shuffleQueue: () => void;
  readonly clearQueue: () => void;
  readonly stop: () => void;
  readonly replay: () => void;
  readonly togglePause: () => void;
  readonly changeVolume: (delta: number) => void;
  readonly setIsPaused: (paused: boolean) => void;
}

const KaraokePlayerContext = createContext<KaraokePlayerContextValue | null>(null);

/** Pemutar karaoke hidup di sini, di luar halaman "Bernyanyi", supaya lagu
 * terus jalan (lewat KaraokePlayerWidget yang selalu terpasang) walau
 * penggunanya pindah tab/halaman lain. Lagu hanya berhenti saat ditekan
 * tombol "Berhenti" atau habis antriannya. */
export function KaraokePlayerProvider({ children }: { readonly children: ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<AntrianItem | null>(null);
  const [antrian, setAntrian] = useState<readonly AntrianItem[]>([]);
  const [replayKey, setReplayKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setIsPaused(false);
  }, [nowPlaying?.id, replayKey]);

  const playable = nowPlaying ? getPlayableForLagu(nowPlaying.lagu) : null;
  const playableKind = playable?.kind;
  const playableSrc = playable?.src;

  const postVolumeToYouTube = useCallback((value: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.round(value * 100)] }),
      '*',
    );
  }, []);

  // Volume dipasang lewat efek, bukan atribut: elemen <video> dibuat ulang tiap
  // ganti lagu/ulangi (key berubah) sehingga nilainya harus dipasang lagi.
  useEffect(() => {
    if (playableKind === 'video') {
      if (videoRef.current) videoRef.current.volume = volume;
      return;
    }
    if (playableKind === 'youtube') postVolumeToYouTube(volume);
  }, [volume, playableKind, playableSrc, replayKey, postVolumeToYouTube]);

  const playNow = useCallback((lagu: KaraokeLagu) => {
    setAntrian((prev) => prev.filter((a) => a.lagu.id !== lagu.id));
    setNowPlaying({ id: newAntrianId(), namaPenyanyi: 'Anda', lagu });
  }, []);

  const addToQueue = useCallback((lagu: KaraokeLagu, namaPenyanyi: string) => {
    const entry: AntrianItem = { id: newAntrianId(), namaPenyanyi: namaPenyanyi.trim() || 'Tanpa nama', lagu };
    setAntrian((prev) => [...prev, entry]);
    setNowPlaying((cur) => cur ?? entry);
  }, []);

  const playFromQueue = useCallback((entry: AntrianItem) => {
    setAntrian((prev) => prev.filter((a) => a.id !== entry.id));
    setNowPlaying(entry);
  }, []);

  const nextInQueue = useCallback(() => {
    setAntrian((prev) => {
      const [next, ...rest] = prev;
      setNowPlaying(next ?? null);
      return rest;
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setAntrian((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const shuffleQueue = useCallback(() => {
    setAntrian((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      return shuffled;
    });
  }, []);

  const clearQueue = useCallback(() => setAntrian([]), []);

  const stop = useCallback(() => setNowPlaying(null), []);

  const replay = useCallback(() => setReplayKey((k) => k + 1), []);

  const togglePause = useCallback(() => {
    if (!playable) return;
    if (playable.kind === 'video') {
      if (isPaused) {
        videoRef.current?.play();
      } else {
        videoRef.current?.pause();
      }
      return;
    }
    // Kontrol YouTube lewat postMessage bawaan (butuh enablejsapi=1 di src iframe).
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: isPaused ? 'playVideo' : 'pauseVideo', args: [] }),
      '*',
    );
    setIsPaused((p) => !p);
  }, [playable, isPaused]);

  const changeVolume = useCallback((delta: number) => {
    setVolume((prev) => stepPlayerVolume(prev, delta));
  }, []);

  const value = useMemo<KaraokePlayerContextValue>(
    () => ({
      nowPlaying,
      antrian,
      replayKey,
      isPaused,
      volume,
      videoRef,
      iframeRef,
      playNow,
      addToQueue,
      playFromQueue,
      nextInQueue,
      removeFromQueue,
      shuffleQueue,
      clearQueue,
      stop,
      replay,
      togglePause,
      changeVolume,
      setIsPaused,
    }),
    [
      nowPlaying,
      antrian,
      replayKey,
      isPaused,
      volume,
      playNow,
      addToQueue,
      playFromQueue,
      nextInQueue,
      removeFromQueue,
      shuffleQueue,
      clearQueue,
      stop,
      replay,
      togglePause,
      changeVolume,
    ],
  );

  return <KaraokePlayerContext.Provider value={value}>{children}</KaraokePlayerContext.Provider>;
}

export function useKaraokePlayer(): KaraokePlayerContextValue {
  const ctx = useContext(KaraokePlayerContext);
  if (!ctx) {
    throw new Error('useKaraokePlayer must be used within KaraokePlayerProvider');
  }
  return ctx;
}
