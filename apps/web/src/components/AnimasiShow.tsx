import { useEffect, useMemo, useRef, useState } from 'react';
import foto1 from '@src/image/animasi-1.jpg';
import foto2 from '@src/image/animasi-2.jpg';
import foto3 from '@src/image/animasi-3.jpg';
import foto4 from '@src/image/animasi-4.jpg';
import foto5 from '@src/image/animasi-5.jpg';
import { useMusicPlayer, type PlaylistItem } from '../context/MusicPlayerContext.tsx';
import { createMellowPlayer } from '../lib/mellowMusic.ts';
import './animasi-show.css';

const SLIDES: ReadonlyArray<string> = [foto3, foto4, foto1, foto2, foto5];
const SLIDE_MS = 6500;
const TARGET_SONG = 'disaat aku mencintamu';

function findTargetSong(playlist: ReadonlyArray<PlaylistItem>): PlaylistItem | null {
  return playlist.find((song) => song.judul.toLowerCase().includes(TARGET_SONG)) ?? null;
}

const PARTICLES: ReadonlyArray<number> = Array.from({ length: 18 }, (_, i) => i);

export function AnimasiShow() {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const player = useMemo(() => createMellowPlayer(), []);
  const { playlist, playlistLoading, playItem, stopPlaylist } = useMusicPlayer();
  const targetSong = useMemo(() => findTargetSong(playlist), [playlist]);
  const targetId = targetSong?.id ?? null;
  const targetRef = useRef(targetSong);
  const playItemRef = useRef(playItem);
  const stopRef = useRef(stopPlaylist);
  targetRef.current = targetSong;
  playItemRef.current = playItem;
  stopRef.current = stopPlaylist;

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Mounting follows a click on the Animasi button, so audio is allowed to start.
  // Prefer the real song from Musik-PH; fall back to the synthesized loop when it has not been uploaded.
  useEffect(() => {
    if (muted || playlistLoading) return undefined;
    const song = targetRef.current;
    if (song) {
      playItemRef.current(song);
      return () => stopRef.current();
    }
    player.start();
    return () => player.stop();
  }, [muted, playlistLoading, targetId, player]);

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
        {!playlistLoading && !targetSong && (
          <span className="animasi-show__hint">
            Lagu “Disaat Aku Mencintamu” (Dadali) belum ada di Musik-PH. Unggah dulu agar diputar di sini.
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
