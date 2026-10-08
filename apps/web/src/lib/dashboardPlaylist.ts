// Playlist musik latar Dashboard (dan slide Klinik): lagu relaksasi bebas royalti di
// apps/web/public/audio/dashboard/, diputar berurutan lalu kembali ke lagu pertama.

export interface DashboardTrack {
  readonly title: string;
  readonly url: string;
}

export const DASHBOARD_PLAYLIST: readonly DashboardTrack[] = [
  { title: 'Relax — Atlas Audio', url: '/audio/dashboard/01-relax.mp3' },
  { title: 'Relaxing Music — Velario Music', url: '/audio/dashboard/02-relaxing-music.mp3' },
  { title: 'Spa Relaxation — Atlas Audio', url: '/audio/dashboard/03-spa-relaxation.mp3' },
  { title: 'Relaxation — Marlowe Music', url: '/audio/dashboard/04-relaxation.mp3' },
  { title: 'Spa Relaxation II — Atlas Audio', url: '/audio/dashboard/05-spa-relaxation-2.mp3' },
];

/** Lagu berikutnya; setelah lagu terakhir kembali ke lagu pertama. */
export function nextTrackIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return (index + 1) % count;
}
