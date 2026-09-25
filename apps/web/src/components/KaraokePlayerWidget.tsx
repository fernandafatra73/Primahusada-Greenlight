import { useState } from 'react';
import { getPlayableForLagu, useKaraokePlayer } from '../context/KaraokePlayerContext.tsx';
import { VOLUME_STEP, toVolumePercent } from '../lib/playerVolume.ts';

/** Pemutar karaoke mengambang, dipasang sekali di App.tsx di luar
 * halaman "Bernyanyi" — supaya lagu terus jalan walau penggunanya pindah
 * ke tab/menu lain, dan baru berhenti kalau tombol "Berhenti" ditekan. */
export function KaraokePlayerWidget() {
  const {
    nowPlaying,
    replayKey,
    isPaused,
    volume,
    videoRef,
    iframeRef,
    nextInQueue,
    stop,
    replay,
    togglePause,
    changeVolume,
    setIsPaused,
  } = useKaraokePlayer();
  const [minimized, setMinimized] = useState(false);

  if (!nowPlaying) return null;

  const playable = getPlayableForLagu(nowPlaying.lagu);

  return (
    <div
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        width: minimized ? 'auto' : '340px',
        maxWidth: 'calc(100vw - 2rem)',
        background: '#0f172a',
        color: '#fff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        zIndex: 70,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.5rem 0.65rem',
          background: '#1e293b',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🎤 {nowPlaying.namaPenyanyi} — {nowPlaying.lagu.judul}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => setMinimized((m) => !m)}
            title={minimized ? 'Perbesar' : 'Kecilkan'}
          >
            {minimized ? '⬆️' : '⬇️'}
          </button>
          <button type="button" className="btn btn--sm btn--danger" onClick={stop} title="Berhenti">
            ⏹️
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexWrap: 'wrap',
              padding: '0.5rem 0.65rem',
              background: '#1e293b',
            }}
          >
            {playable.kind !== 'iframe' && (
              <>
                <button type="button" className="btn btn--sm btn--secondary" onClick={togglePause}>
                  {isPaused ? '▶️' : '⏸️'}
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--secondary"
                  onClick={() => changeVolume(-VOLUME_STEP)}
                  disabled={volume === 0}
                  title="Volume turun"
                >
                  🔉
                </button>
                <span style={{ fontSize: '0.75rem', minWidth: '2.4rem', textAlign: 'center' }} aria-live="polite">
                  {toVolumePercent(volume)}%
                </span>
                <button
                  type="button"
                  className="btn btn--sm btn--secondary"
                  onClick={() => changeVolume(VOLUME_STEP)}
                  disabled={volume === 1}
                  title="Volume naik"
                >
                  🔊
                </button>
              </>
            )}
            <button type="button" className="btn btn--sm btn--secondary" onClick={replay} title="Ulangi">
              🔁
            </button>
            <button type="button" className="btn btn--sm btn--secondary" onClick={nextInQueue} title="Lagu berikutnya">
              ⏭️
            </button>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
            {playable.kind === 'video' ? (
              <video
                key={`${playable.src}-${replayKey}`}
                ref={videoRef}
                src={playable.src}
                controls
                autoPlay
                onPlay={() => setIsPaused(false)}
                onPause={() => setIsPaused(true)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
            ) : (
              <iframe
                key={`${playable.src}-${replayKey}`}
                ref={iframeRef}
                src={playable.src}
                title={nowPlaying.lagu.judul}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
