import { useEffect, useRef, useState } from 'react';
import { DASHBOARD_PLAYLIST, nextTrackIndex } from '../lib/dashboardPlaylist.ts';

const VOLUME = 0.5;

/**
 * Musik latar Dashboard: playlist diputar otomatis berurutan dan berulang, dengan tombol
 * Stop / Putar. Browser bisa menolak pemutaran otomatis (mis. setelah refresh tanpa
 * interaksi); lagu lalu dicoba lagi pada klik/tombol pertama, kecuali pengguna menekan Stop.
 */
export function DashboardMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [wantPlaying, setWantPlaying] = useState(true);
  const [playing, setPlaying] = useState(false);
  const track = DASHBOARD_PLAYLIST[index];

  // Putar / jeda mengikuti tombol, dan putar lagi saat lagu berganti.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.volume = VOLUME;
    if (!wantPlaying) {
      audio.pause();
      return undefined;
    }
    void audio.play().catch(() => undefined);
    // Bila ditolak browser, coba lagi pada interaksi pertama.
    const retry = (): void => {
      if (audio.paused) void audio.play().catch(() => undefined);
    };
    window.addEventListener('pointerdown', retry);
    window.addEventListener('keydown', retry);
    return () => {
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
    };
  }, [wantPlaying, index]);

  if (!track) return null;

  return (
    <div className="dashboard-music">
      <audio
        ref={audioRef}
        src={track.url}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setIndex((i) => nextTrackIndex(i, DASHBOARD_PLAYLIST.length))}
      />
      <span className="dashboard-music__note" aria-hidden>
        {playing ? '♫' : '♪'}
      </span>
      <span className="dashboard-music__title" title={track.title}>
        {track.title}
      </span>
      <button
        type="button"
        className="dashboard-music__btn"
        aria-pressed={!wantPlaying}
        onClick={() => setWantPlaying((on) => !on)}
      >
        {wantPlaying ? 'Stop Musik' : 'Putar Musik'}
      </button>
      {/* Lompat ke lagu berikutnya dan langsung memutarnya, juga bila sebelumnya di-Stop. */}
      <button
        type="button"
        className="dashboard-music__btn dashboard-music__btn--next"
        aria-label="Lagu berikutnya"
        title="Lagu berikutnya"
        onClick={() => {
          setIndex((i) => nextTrackIndex(i, DASHBOARD_PLAYLIST.length));
          setWantPlaying(true);
        }}
      >
        Lagu Berikutnya ⏭
      </button>
    </div>
  );
}
