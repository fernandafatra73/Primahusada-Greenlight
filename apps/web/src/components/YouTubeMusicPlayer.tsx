interface YouTubeMusicPlayerProps {
  /** ID video YouTube (bagian setelah "watch?v=" pada tautannya). */
  readonly videoId: string;
}

/**
 * Musik latar dari video YouTube lewat player embed resmi (bukan unduhan). Player tetap
 * terlihat kecil di pojok, sesuai ketentuan YouTube yang melarang player disembunyikan.
 * Diputar otomatis dan berulang; perlu koneksi internet.
 */
export function YouTubeMusicPlayer({ videoId }: YouTubeMusicPlayerProps) {
  const params = new URLSearchParams({
    autoplay: '1',
    loop: '1',
    // loop pada embed hanya berjalan bila video yang sama juga dijadikan playlist.
    playlist: videoId,
    rel: '0',
    modestbranding: '1',
  });
  return (
    <div className="youtube-music">
      <iframe
        className="youtube-music__frame"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`}
        title="Musik latar Dashboard"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
