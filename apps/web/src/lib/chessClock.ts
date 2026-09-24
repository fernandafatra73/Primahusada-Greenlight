export interface TimeControl {
  readonly id: string;
  readonly label: string;
  /** null = tanpa batas waktu, jam tidak berjalan. */
  readonly ms: number | null;
}

const MINUTE = 60_000;

export const TIME_CONTROLS: readonly TimeControl[] = [
  { id: 'tanpa-batas', label: 'Tanpa batas waktu', ms: null },
  { id: '5m', label: '5 menit', ms: 5 * MINUTE },
  { id: '10m', label: '10 menit', ms: 10 * MINUTE },
  { id: '1j', label: '1 jam', ms: 60 * MINUTE },
];

export const DEFAULT_TIME_CONTROL_ID = 'tanpa-batas';

export function findTimeControl(id: string): TimeControl {
  return TIME_CONTROLS.find((tc) => tc.id === id) ?? (TIME_CONTROLS[0] as TimeControl);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Sisa waktu jadi "m:ss", atau "j:mm:ss" bila sudah satu jam atau lebih.
 * Dibulatkan ke atas supaya jam baru menunjukkan 0:00 saat waktu benar-benar
 * habis, bukan sedetik sebelumnya. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Waktu menipis — dipakai untuk mewarnai jam jadi merah. */
export function isLowTime(ms: number): boolean {
  return ms <= 30_000;
}
