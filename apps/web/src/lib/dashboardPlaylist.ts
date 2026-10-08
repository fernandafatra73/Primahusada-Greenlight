// Playlist musik latar Dashboard (dan slide Klinik): lagu relaksasi bebas royalti di
// apps/web/public/audio/dashboard/, diputar berurutan lalu kembali ke lagu pertama.

export interface DashboardTrack {
  readonly title: string;
  readonly url: string;
}

export const DASHBOARD_PLAYLIST: readonly DashboardTrack[] = [
  { title: 'Relax — Atlas Audio', url: '/audio/dashboard/01-relax.mp3' },
  { title: 'Relaxing Music — Fernanda Music', url: '/audio/dashboard/02-relaxing-music.mp3' },
  { title: 'Spa Relaxation — Atlas Audio', url: '/audio/dashboard/03-spa-relaxation.mp3' },
  { title: 'Relaxation — Marlowe Music', url: '/audio/dashboard/04-relaxation.mp3' },
  { title: 'Spa Relaxation II — Atlas Audio', url: '/audio/dashboard/05-spa-relaxation-2.mp3' },
  { title: 'Angelic Meditation', url: '/audio/dashboard/06-angelic-meditation.mp3' },
  { title: 'Garden of Memories — Light Music', url: '/audio/dashboard/07-garden-of-memories.mp3' },
  { title: 'Trouver la Sérénité — Jean Angius', url: '/audio/dashboard/08-trouver-la-serenite.mp3' },
];

const AUDIO_EXTENSION = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i;

/** True untuk nama file lagu yang bisa diputar browser (dicek dari ekstensinya). */
export function isAudioFileName(name: string): boolean {
  return AUDIO_EXTENSION.test(name);
}

/** Judul lagu dari nama file USB: tanpa ekstensi, garis bawah/strip jadi spasi. */
export function titleFromFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const title = base.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return title || base;
}

/** Lagu berikutnya; setelah lagu terakhir kembali ke lagu pertama. */
export function nextTrackIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return (index + 1) % count;
}
