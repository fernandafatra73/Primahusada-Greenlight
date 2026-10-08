import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  DASHBOARD_PLAYLIST,
  isAudioFileName,
  nextTrackIndex,
  titleFromFileName,
  type DashboardTrack,
} from '../lib/dashboardPlaylist.ts';

const VOLUME = 0.5;

// Lagu yang diambil dari USB disimpan selama aplikasi terbuka (bukan per kunjungan Dashboard),
// supaya tidak hilang saat pindah halaman lalu kembali. Hilang saat refresh/tutup browser:
// browser tidak boleh membaca USB sendiri, jadi file harus dipilih ulang.
let usbTracksThisSession: DashboardTrack[] = [];

/**
 * Musik latar Dashboard: playlist diputar otomatis berurutan dan berulang, dengan tombol
 * Stop / Putar, Lagu Berikutnya, dan Musik dari USB. Browser bisa menolak pemutaran otomatis
 * (mis. setelah refresh tanpa interaksi); lagu lalu dicoba lagi pada klik/tombol pertama,
 * kecuali pengguna menekan Stop.
 */
export function DashboardMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usbTracks, setUsbTracks] = useState<readonly DashboardTrack[]>(usbTracksThisSession);
  const playlist = [...DASHBOARD_PLAYLIST, ...usbTracks];
  const [index, setIndex] = useState(0);
  const [wantPlaying, setWantPlaying] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const track = playlist[index];

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
  }, [wantPlaying, index, track?.url]);

  function onUsbFiles(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []).filter((file) => isAudioFileName(file.name));
    // Kosongkan supaya file yang sama bisa dipilih lagi nanti.
    event.target.value = '';
    if (files.length === 0) {
      setNotice('Tidak ada file lagu (mp3, m4a, wav, ogg, flac) yang dipilih.');
      return;
    }
    const added = files.map((file) => ({ title: titleFromFileName(file.name), url: URL.createObjectURL(file) }));
    const next = [...usbTracks, ...added];
    usbTracksThisSession = next;
    setUsbTracks(next);
    // Langsung putar lagu USB pertama yang baru ditambahkan.
    setIndex(DASHBOARD_PLAYLIST.length + usbTracks.length);
    setWantPlaying(true);
    setNotice(`${added.length} lagu dari USB ditambahkan.`);
  }

  if (!track) return null;

  return (
    <div className="dashboard-music">
      <audio
        ref={audioRef}
        src={track.url}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setIndex((i) => nextTrackIndex(i, playlist.length))}
      />
      <span className="dashboard-music__note" aria-hidden>
        {playing ? '♫' : '♪'}
      </span>
      <span className="dashboard-music__title" title={notice ?? track.title}>
        {track.title}
        <small className="dashboard-music__count">
          {index + 1}/{playlist.length}
        </small>
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
          setIndex((i) => nextTrackIndex(i, playlist.length));
          setWantPlaying(true);
        }}
      >
        Lagu Berikutnya ⏭
      </button>
      <button
        type="button"
        className="dashboard-music__btn dashboard-music__btn--usb"
        title="Pilih lagu dari flashdisk / USB (bisa banyak sekaligus)"
        onClick={() => fileInputRef.current?.click()}
      >
        Musik dari USB
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
        multiple
        hidden
        onChange={onUsbFiles}
      />
    </div>
  );
}
