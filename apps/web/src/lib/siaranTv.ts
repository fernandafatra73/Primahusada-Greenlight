export type SiaranTvPlayerKind = 'youtube' | 'video' | 'iframe';

export interface SiaranTvPlayable {
  readonly kind: SiaranTvPlayerKind;
  readonly src: string;
}

const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

const DIRECT_VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i;

/** File lokal (mis. dari USB/PC lewat input file) dibuka lewat blob: atau
 * data: URL oleh browser — keduanya tidak punya ekstensi di akhir string. */
const LOCAL_MEDIA_URL_PATTERN = /^(blob:|data:(video|audio)\/)/i;

/** Menentukan cara memutar URL siaran TV: embed YouTube, tag <video> untuk
 * link stream langsung atau file lokal, atau <iframe> generik untuk halaman
 * embed lainnya. */
export function resolveSiaranTvPlayable(url: string): SiaranTvPlayable {
  const trimmed = url.trim();
  const youtubeMatch = YOUTUBE_ID_PATTERN.exec(trimmed);
  if (youtubeMatch) {
    return {
      kind: 'youtube',
      src: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&enablejsapi=1`,
    };
  }
  if (DIRECT_VIDEO_EXTENSION_PATTERN.test(trimmed) || LOCAL_MEDIA_URL_PATTERN.test(trimmed)) {
    return { kind: 'video', src: trimmed };
  }
  return { kind: 'iframe', src: trimmed };
}
