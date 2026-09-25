import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from './ui/Modal.tsx';
import { fetchJuz, type QuranAyahPair } from '../lib/quranApi.ts';
import { buildSholatSteps, RAKAAT_PER_SHOLAT, type SholatStep } from '../lib/sholatGuide.ts';

// Bacaan Al-Fatihah/surah pendek dilafalkan memakai qari Imam Masjidil
// Haram — sesuai permintaan "bacaan sesuai sholat di Mekah".
const MEKKAH_RECITER = 'ar.mahermuaiqly';

interface SholatGuideModalProps {
  readonly namaSholat: string;
  readonly onClose: () => void;
}

/** Tuntunan sholat otomatis yang terbuka begitu azan selesai — menuntun
 * gerakan & bacaan per rakaat sesuai jumlah rakaat fardhu waktu sholat itu.
 * Ini panduan untuk diikuti, bukan pengganti sholat sungguhan. */
export function SholatGuideModal({ namaSholat, onClose }: SholatGuideModalProps) {
  const steps = useRef<readonly SholatStep[]>(buildSholatSteps(namaSholat));
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [surahAyat, setSurahAyat] = useState<readonly QuranAyahPair[] | null>(null);
  const [surahLoading, setSurahLoading] = useState(false);
  const [surahError, setSurahError] = useState<string | null>(null);
  // Bacaan diambil lewat Juz yang sama dengan halaman Dirimu (bukan endpoint
  // surah terpisah), lalu disaring per nomor surah — cache per nomor Juz
  // supaya Juz 30 (Al-Ikhlas/Al-Falaq/An-Nas) tidak diambil ulang tiap rakaat.
  const juzCacheRef = useRef<Map<number, readonly QuranAyahPair[]>>(new Map());

  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const step = steps.current[index]!;
  const totalRakaat = RAKAAT_PER_SHOLAT[namaSholat] ?? 2;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAyahAudio = useCallback(() => {
    ayahAudioRef.current?.pause();
    ayahAudioRef.current = null;
  }, []);

  const goToNext = useCallback(() => {
    clearTimer();
    stopAyahAudio();
    setIndex((i) => Math.min(i + 1, steps.current.length - 1));
  }, [clearTimer, stopAyahAudio]);

  const isLastStep = index >= steps.current.length - 1;

  // Muat teks+audio surah sungguhan tiap kali langkah "bacaSurah" aktif.
  useEffect(() => {
    if (!step.bacaSurah) {
      setSurahAyat(null);
      return;
    }
    const { nomor, juz: juzSurah } = step.bacaSurah;
    const cachedJuz = juzCacheRef.current.get(juzSurah);
    if (cachedJuz) {
      setSurahAyat(cachedJuz.filter((a) => a.surah.number === nomor));
      return;
    }
    let cancelled = false;
    setSurahLoading(true);
    setSurahError(null);
    fetchJuz(juzSurah, MEKKAH_RECITER)
      .then((ayat) => {
        if (cancelled) return;
        juzCacheRef.current.set(juzSurah, ayat);
        setSurahAyat(ayat.filter((a) => a.surah.number === nomor));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSurahError(err instanceof Error ? err.message : 'Gagal memuat bacaan surah');
      })
      .finally(() => {
        if (!cancelled) setSurahLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [index]);

  // Mode "Putar": langkah biasa lanjut otomatis setelah durasiDetik; langkah
  // bacaSurah lanjut otomatis setelah audio ayat terakhirnya selesai.
  useEffect(() => {
    if (!playing) return;
    if (step.bacaSurah) {
      if (surahLoading || !surahAyat || surahAyat.length === 0) return;
      let i = 0;
      const playNext = () => {
        const ayah = surahAyat[i];
        if (!ayah?.audio) {
          if (isLastStep) setPlaying(false);
          else goToNext();
          return;
        }
        const audio = new Audio(ayah.audio);
        ayahAudioRef.current = audio;
        audio.onended = () => {
          i += 1;
          if (i < surahAyat.length) {
            playNext();
          } else if (isLastStep) {
            setPlaying(false);
          } else {
            goToNext();
          }
        };
        void audio.play().catch(() => setPlaying(false));
      };
      playNext();
      return () => stopAyahAudio();
    }
    timerRef.current = window.setTimeout(() => {
      if (isLastStep) setPlaying(false);
      else goToNext();
    }, step.durasiDetik * 1000);
    return () => clearTimer();
  }, [playing, index, surahAyat, surahLoading]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopAyahAudio();
    };
  }, [clearTimer, stopAyahAudio]);

  function handleClose() {
    clearTimer();
    stopAyahAudio();
    onClose();
  }

  function goToPrev() {
    clearTimer();
    stopAyahAudio();
    setIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <Modal open title={`🕌 Tuntunan Sholat ${namaSholat} (${totalRakaat} Rakaat)`} onClose={handleClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p className="form-hint" style={{ margin: 0 }}>
          Panduan gerakan &amp; bacaan untuk diikuti sambil sholat — bukan pengganti sholat itu sendiri.
        </p>

        <div
          style={{
            background: '#0f172a',
            color: '#fff',
            borderRadius: '10px',
            padding: '1.25rem',
            minHeight: '10rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
            Langkah {index + 1}/{steps.current.length}
          </div>
          <h3 style={{ margin: '0 0 0.6rem' }}>{step.judul}</h3>

          {step.bacaSurah ? (
            <>
              {surahLoading && <p style={{ color: '#cbd5e1' }}>Memuat bacaan {step.bacaSurah.nama}…</p>}
              {surahError && <p style={{ color: '#fca5a5' }}>{surahError}</p>}
              {surahAyat?.map((a) => (
                <div key={a.number} style={{ marginBottom: '0.6rem' }}>
                  <div style={{ fontSize: '1.3rem', direction: 'rtl', lineHeight: 1.9 }}>{a.arab}</div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{a.terjemahan}</div>
                </div>
              ))}
            </>
          ) : (
            <>
              {step.arab && (
                <div style={{ fontSize: '1.4rem', direction: 'rtl', lineHeight: 1.9, marginBottom: '0.5rem' }}>
                  {step.arab}
                </div>
              )}
              {step.latin && <div style={{ fontStyle: 'italic', color: '#e2e8f0', marginBottom: '0.4rem' }}>{step.latin}</div>}
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{step.arti}</div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--sm btn--secondary" onClick={goToPrev} disabled={index === 0}>
            ⬅️ Sebelumnya
          </button>
          {playing ? (
            <button
              type="button"
              className="btn btn--sm btn--secondary"
              onClick={() => {
                setPlaying(false);
                clearTimer();
                stopAyahAudio();
              }}
            >
              ⏸️ Jeda
            </button>
          ) : (
            <button type="button" className="btn btn--sm btn--primary" onClick={() => setPlaying(true)}>
              ▶️ {index === 0 ? 'Mulai' : 'Lanjut'}
            </button>
          )}
          <button type="button" className="btn btn--sm btn--secondary" onClick={goToNext} disabled={isLastStep}>
            Berikutnya ➡️
          </button>
          <button type="button" className="btn btn--sm btn--danger" onClick={handleClose} style={{ marginLeft: 'auto' }}>
            ✕ Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
