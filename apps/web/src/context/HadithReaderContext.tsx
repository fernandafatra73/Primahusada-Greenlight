import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchHadith, type HadithCollection, type HadithResult } from '../lib/hadithApi.ts';
import { toSpeakableText, withIndonesianVoice } from '../lib/speechVoice.ts';

function stopSpeechSynthesis(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

interface HadithReaderContextValue {
  readonly collection: HadithCollection['id'] | null;
  readonly current: HadithResult | null;
  readonly isSpeaking: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  /** Mulai baca dari nomor ini, lalu lanjut otomatis ke nomor berikutnya
   * sampai `stop()` dipanggil atau nomor berikutnya tidak ditemukan. */
  readonly startReading: (collection: HadithCollection['id'], fromNumber: number) => void;
  /** Ambil & tampilkan satu hadits saja, tanpa dibacakan/lanjut otomatis. */
  readonly showOnce: (collection: HadithCollection['id'], number: number) => void;
  readonly stop: () => void;
}

const HadithReaderContext = createContext<HadithReaderContextValue | null>(null);

/** Hidup di level App (di luar halaman Kisah) supaya pembacaan hadits
 * beruntun (Bukhari/Muslim) terus jalan walau penggunanya pindah tab/menu
 * lain — hanya berhenti kalau ditekan "Stop", bukan karena halamannya
 * ditinggalkan. Lihat KaraokePlayerContext untuk pola yang sama. */
export function HadithReaderProvider({ children }: { readonly children: ReactNode }) {
  const [collection, setCollection] = useState<HadithCollection['id'] | null>(null);
  const [current, setCurrent] = useState<HadithResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref (bukan cuma state) supaya callback onEnd dari speechSynthesis —
  // yang bisa terpicu lama setelah halaman Kisah ditinggalkan — tetap tahu
  // persis apakah mode lanjut-otomatis masih aktif.
  const autoPlayRef = useRef(false);
  const sessionRef = useRef(0);

  const stop = useCallback(() => {
    autoPlayRef.current = false;
    sessionRef.current += 1;
    stopSpeechSynthesis();
    setIsSpeaking(false);
  }, []);

  const playFrom = useCallback((col: HadithCollection['id'], n: number, session: number) => {
    setLoading(true);
    setError(null);
    fetchHadith(col, n)
      .then((result) => {
        if (session !== sessionRef.current) return; // dihentikan/diganti sementara fetch berjalan
        setCurrent(result);
        setLoading(false);
        if (!autoPlayRef.current) return;
        setIsSpeaking(true);
        withIndonesianVoice((voice) => {
          if (session !== sessionRef.current) return;
          stopSpeechSynthesis();
          const utter = new SpeechSynthesisUtterance(toSpeakableText(result.text));
          utter.lang = voice?.lang ?? 'id-ID';
          if (voice) utter.voice = voice;
          const onDone = () => {
            if (session !== sessionRef.current || !autoPlayRef.current) {
              setIsSpeaking(false);
              return;
            }
            playFrom(col, n + 1, session);
          };
          utter.onend = onDone;
          utter.onerror = onDone;
          window.speechSynthesis.speak(utter);
        });
      })
      .catch((err: unknown) => {
        if (session !== sessionRef.current) return;
        setLoading(false);
        setIsSpeaking(false);
        autoPlayRef.current = false;
        setError(err instanceof Error ? err.message : 'Gagal mengambil hadits berikutnya (mungkin sudah nomor terakhir)');
      });
  }, []);

  const startReading = useCallback(
    (col: HadithCollection['id'], fromNumber: number) => {
      autoPlayRef.current = true;
      sessionRef.current += 1;
      setCollection(col);
      playFrom(col, fromNumber, sessionRef.current);
    },
    [playFrom],
  );

  const showOnce = useCallback(
    (col: HadithCollection['id'], number: number) => {
      autoPlayRef.current = false;
      sessionRef.current += 1;
      stopSpeechSynthesis();
      setIsSpeaking(false);
      setCollection(col);
      playFrom(col, number, sessionRef.current);
    },
    [playFrom],
  );

  const value = useMemo<HadithReaderContextValue>(
    () => ({ collection, current, isSpeaking, loading, error, startReading, showOnce, stop }),
    [collection, current, isSpeaking, loading, error, startReading, showOnce, stop],
  );

  return <HadithReaderContext.Provider value={value}>{children}</HadithReaderContext.Provider>;
}

export function useHadithReader(): HadithReaderContextValue {
  const ctx = useContext(HadithReaderContext);
  if (!ctx) {
    throw new Error('useHadithReader must be used within HadithReaderProvider');
  }
  return ctx;
}
