// Sudut jarum jam dinding (derajat searah jarum jam dari angka 12).

export interface ClockAngles {
  readonly hour: number;
  readonly minute: number;
  /** Selalu bertambah (tidak kembali ke 0 setiap menit) supaya animasi detak tidak berputar mundur. */
  readonly second: number;
}

/**
 * Sudut jarum untuk waktu `date`. `secondTurns` = berapa putaran penuh jarum detik sejak
 * jam mulai tampil, ditambahkan ke sudut detik agar 59 -> 0 tetap maju.
 */
export function clockAngles(date: Date, secondTurns = 0): ClockAngles {
  const h = date.getHours() % 12;
  const m = date.getMinutes();
  const s = date.getSeconds();
  return {
    hour: h * 30 + m * 0.5 + s / 120,
    minute: m * 6 + s * 0.1,
    second: s * 6 + secondTurns * 360,
  };
}

/** Putaran jarum detik berikutnya: bertambah satu saat detik kembali dari 59 ke 0. */
export function nextSecondTurns(previousSecond: number, currentSecond: number, turns: number): number {
  return currentSecond < previousSecond ? turns + 1 : turns;
}
