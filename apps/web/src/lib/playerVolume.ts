/** Besar satu langkah tombol volume naik/turun. */
export const VOLUME_STEP = 0.1;

/** Menaikkan/menurunkan volume pemutar dalam skala 0–1 (seperti
 * `HTMLMediaElement.volume`), dijaga tetap di rentang itu. Hasilnya dibulatkan
 * per 0,1 supaya galat pecahan biner tidak menumpuk setelah beberapa klik
 * (mis. 0.7 + 0.1 = 0.7999999999999999). */
export function stepPlayerVolume(current: number, delta: number): number {
  const next = Math.round((current + delta) * 10) / 10;
  return Math.min(1, Math.max(0, next));
}

/** Skala 0–1 menjadi persen bulat — dipakai untuk label tombol dan untuk
 * YouTube IFrame API yang memakai 0–100, bukan 0–1 seperti `<video>`. */
export function toVolumePercent(volume: number): number {
  return Math.round(volume * 100);
}
