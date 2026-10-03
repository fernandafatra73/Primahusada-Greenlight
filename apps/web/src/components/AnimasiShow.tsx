import { useEffect, useMemo, useRef, useState } from 'react';
import foto1 from '@src/image/animasi-1.jpg';
import foto2 from '@src/image/animasi-2.jpg';
import foto3 from '@src/image/animasi-3.jpg';
import foto4 from '@src/image/animasi-4.jpg';
import foto5 from '@src/image/animasi-5.jpg';
import { useKaraokePlayer, type KaraokeLagu } from '../context/KaraokePlayerContext.tsx';
import { useMusicPlayer, type PlaylistItem } from '../context/MusicPlayerContext.tsx';
import { apiGet } from '../lib/api.ts';
import { createMellowPlayer } from '../lib/mellowMusic.ts';
import './animasi-show.css';

const SLIDES: ReadonlyArray<string> = [foto3, foto4, foto1, foto2, foto5];
const SLIDE_MS = 6500;
const TARGET_SONG = 'disaat aku mencintamu';

function matchesTarget(judul: string): boolean {
  return judul.toLowerCase().includes(TARGET_SONG);
}

function findTargetSong(playlist: ReadonlyArray<PlaylistItem>): PlaylistItem | null {
  return playlist.find((song) => matchesTarget(song.judul)) ?? null;
}

const PARTICLES: ReadonlyArray<number> = Array.from({ length: 18 }, (_, i) => i);

export function AnimasiShow() {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const player = useMemo(() => createMellowPlayer(), []);
  const { playlist, playlistLoading, playItem, stopPlaylist } = useMusicPlayer();
  const { playNow, stop: stopKaraoke } = useKaraokePlayer();
  const [karaokeSong, setKaraokeSong] = useState<KaraokeLagu | null>(null);
  const [karaokeLoading, setKaraokeLoading] = useState(true);
  const karaokeRef = useRef(karaokeSong);
  const playNowRef = useRef(playNow);
  const stopKaraokeRef = useRef(stopKaraoke);
  karaokeRef.current = karaokeSong;
  playNowRef.current = playNow;
  stopKaraokeRef.current = stopKaraoke;
  const karaokeId = karaokeSong?.id ?? null;
  const targetSong = useMemo(() => findTargetSong(playlist), [playlist]);
  const targetId = targetSong?.id ?? null;
  const targetRef = useRef(targetSong);
  const playItemRef = useRef(playItem);
  const stopRef = useRef(stopPlaylist);
  targetRef.current = targetSong;
  playItemRef.current = playItem;
  stopRef.current = stopPlaylist;

  // The song is looked up in the Karaoke library first, since that is where the clinic keeps it.
  useEffect(() => {
    let cancelled = false;
    void apiGet<{ items: readonly KaraokeLagu[] }>(`/api/karaoke-lagu?q=${encodeURIComponent(TARGET_SONG)}&limit=20`)
      .then((res) => {
        if (!cancelled) setKaraokeSong(res.items.find((lagu) => matchesTarget(lagu.judul)) ?? null);
      })
      .catch(() => {
        if (!cancelled) setKaraokeSong(null);
      })
      .finally(() => {
        if (!cancelled) setKaraokeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Mounting follows a click on the Animasi button, so audio is allowed to start.
  // Order of preference: Karaoke library, then Musik-PH, then the synthesized loop.
  useEffect(() => {
    if (muted || playlistLoading || karaokeLoading) return undefined;
    const karaoke = karaokeRef.current;
    if (karaoke) {
      playNowRef.current(karaoke);
      return () => stopKaraokeRef.current();
    }
    const song = targetRef.current;
    if (song) {
      playItemRef.current(song);
      return () => stopRef.current();
    }
    player.start();
    return () => player.stop();
  }, [muted, playlistLoading, karaokeLoading, karaokeId, targetId, player]);

  return (
    <section className="animasi-show" aria-label="Animasi foto">
      {SLIDES.map((src, i) => (
        <div key={src} className={`animasi-show__slide${i === index ? ' animasi-show__slide--active' : ''}`}>
          <img src={src} alt="" className="animasi-show__backdrop" />
          <img src={src} alt="" className={`animasi-show__photo animasi-show__photo--${i % 2 === 0 ? 'in' : 'out'}`} />
        </div>
      ))}

      <div className="animasi-show__vignette" aria-hidden />
      <div className="animasi-show__particles" aria-hidden>
        {PARTICLES.map((p) => (
          <span
            key={p}
            style={{
              left: `${(p * 37) % 100}%`,
              animationDelay: `${(p * 1.3) % 9}s`,
              animationDuration: `${9 + ((p * 5) % 7)}s`,
              width: `${3 + (p % 4) * 2}px`,
              height: `${3 + (p % 4) * 2}px`,
            }}
          />
        ))}
      </div>

      <div className="animasi-show__bar">
        <div className="animasi-show__dots" aria-hidden>
          {SLIDES.map((src, i) => (
            <span key={src} className={i === index ? 'animasi-show__dot animasi-show__dot--active' : 'animasi-show__dot'} />
          ))}
        </div>
        {!playlistLoading && !karaokeLoading && !targetSong && !karaokeSong && (
          <span className="animasi-show__hint">
            Lagu “Disaat Aku Mencintamu” (Dadali) belum ada di Karaoke atau Musik-PH. Tambahkan dulu agar diputar di sini.
          </span>
        )}
        <button
          type="button"
          className="animasi-show__sound"
          aria-pressed={!muted}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? '🔇 Musik mati' : '🎵 Musik nyala'}
        </button>
      </div>
    </section>
  );
}
