/** Penataan rantai kartu gaplek di atas meja.
 *
 * Rantai berjalan mendatar, lalu berbalik arah di baris berikutnya begitu satu
 * baris penuh — seperti kartu gaplek yang disusun membelok saat rantainya
 * kepanjangan. Kartu balak dipasang melintang sehingga hanya memakan ruang
 * selebar kartu, dan posisi dihitung menumpuk (bukan kisi tetap) supaya tidak
 * ada celah di antara kartu. */

import type { PlacedTile } from './gaplek.ts';

/** Panjang kartu yang dipasang searah rantai. */
export const TILE_LONG = 52;
/** Lebar kartu — juga panjang yang dipakai balak karena dipasang melintang. */
export const TILE_SHORT = 30;
export const ZONE_SIZE = 46;
export const ROW_W = 376;
export const ROW_H = 58;

export interface ChainSlot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** Arah jalannya baris ini. Baris yang berjalan mundur harus menggambar
   * kedua sisi kartu terbalik, kalau tidak angka yang bersentuhan terlihat
   * tidak menyambung padahal rantainya benar. */
  readonly leftToRight: boolean;
}

export function isDoubleTile(tile: PlacedTile): boolean {
  return tile[0] === tile[1];
}

/** Ruang yang dipakai satu kartu sepanjang arah rantai. */
export function tileFootprint(tile: PlacedTile): number {
  return isDoubleTile(tile) ? TILE_SHORT : TILE_LONG;
}

/** Menata potongan rantai sesuai lebar masing-masing.
 *
 * Baris genap berjalan ke kanan dan baris ganjil ke kiri, jadi ujung satu
 * baris bersambung langsung dengan awal baris berikutnya. Potongan yang lebih
 * lebar dari satu baris tetap ditempatkan, tidak dibuang. */
export function layoutSnake(widths: readonly number[]): ChainSlot[] {
  const slots: ChainSlot[] = [];
  let row = 0;
  let cursor = 0;

  for (const width of widths) {
    if (cursor > 0 && cursor + width > ROW_W) {
      row += 1;
      cursor = 0;
    }
    const leftToRight = row % 2 === 0;
    slots.push({
      x: leftToRight ? cursor : ROW_W - cursor - width,
      y: row * ROW_H,
      width,
      leftToRight,
    });
    cursor += width;
  }
  return slots;
}

/** Lebar seluruh potongan rantai: zona jatuh kiri, kartu-kartu, zona kanan. */
export function chainWidths(placed: readonly PlacedTile[]): number[] {
  return [ZONE_SIZE, ...placed.map(tileFootprint), ZONE_SIZE];
}

export function rowCount(slots: readonly ChainSlot[]): number {
  if (slots.length === 0) return 1;
  return Math.max(...slots.map((slot) => slot.y)) / ROW_H + 1;
}
