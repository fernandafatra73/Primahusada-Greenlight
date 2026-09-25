export interface AzanTrack {
  readonly id: string;
  readonly label: string;
  readonly src: string;
}

/** Rekaman azan bawaan (file di public/azan) — dipakai sebagai suara alarm
 * & penanda masuknya waktu sholat di halaman Jam. Diberi label generik
 * karena tidak diketahui qari/gayanya masing-masing; pengguna bisa
 * mencoba lewat tombol "▶️ Coba" untuk memilih yang disuka. */
export const AZAN_TRACKS: readonly AzanTrack[] = [
  { id: 'azan1', label: 'Azan 1', src: '/azan/azan1.mp3' },
  { id: 'azan2', label: 'Azan 2', src: '/azan/azan2.mp3' },
  { id: 'azan3', label: 'Azan 3', src: '/azan/azan3.mp3' },
  { id: 'azan5', label: 'Azan 4', src: '/azan/azan5.mp3' },
  { id: 'azan6', label: 'Azan 5', src: '/azan/azan6.mp3' },
  { id: 'azan7', label: 'Azan 6', src: '/azan/azan7.mp3' },
  { id: 'azan8', label: 'Azan 7', src: '/azan/azan8.mp3' },
  { id: 'azan9', label: 'Azan 8', src: '/azan/azan9.mp3' },
  { id: 'azan10', label: 'Azan 9', src: '/azan/azan10.mp3' },
];

export function playAzanTrack(id: string): void {
  const track = AZAN_TRACKS.find((t) => t.id === id) ?? AZAN_TRACKS[0]!;
  void new Audio(track.src).play();
}
