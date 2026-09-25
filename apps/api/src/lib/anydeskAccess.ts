/** Memeriksa apakah komputer ini menuntut persetujuan untuk setiap sambungan
 * masuk.
 *
 * AnyDesk punya dua cara orang lain bisa masuk:
 *   1. Sambungan biasa — muncul kotak "Terima / Tolak" di layar komputer ini,
 *      dan sesi baru mulai setelah ditekan Terima.
 *   2. Akses tanpa pengawasan — penyambung cukup tahu kata sandi, tidak ada
 *      yang perlu menekan apa pun di sini.
 *
 * Cara kedua aktif kalau kata sandinya sudah dipasang, yang terekam di berkas
 * pengaturan AnyDesk sebagai kunci ber-`pwd_hash`/`pwd_salt`. Modul ini
 * membaca nama kuncinya saja — nilainya (hash kata sandi) tidak pernah
 * dibaca, dibawa, apalagi ditampilkan. */

/** Nama kunci yang menandakan kata sandi akses tanpa pengawasan sudah
 * dipasang. Dicocokkan sebagai potongan nama, karena AnyDesk mengubah awalan
 * kuncinya antar versi. */
const PENANDA_TANPA_PENGAWASAN = ['pwd_hash', 'pwd_salt'];

/** Nama-nama kunci dalam satu berkas pengaturan AnyDesk. Nilainya sengaja
 * dibuang di sini supaya tidak ikut terbawa ke mana-mana. */
export function configKeys(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split('=')[0]?.trim() ?? '')
    .filter((key) => key !== '' && !key.startsWith('#'));
}

/** Apakah salah satu berkas pengaturan memuat kata sandi akses tanpa
 * pengawasan. */
export function hasUnattendedPassword(configTexts: readonly string[]): boolean {
  for (const text of configTexts) {
    for (const key of configKeys(text)) {
      const lower = key.toLowerCase();
      if (PENANDA_TANPA_PENGAWASAN.some((penanda) => lower.includes(penanda))) return true;
    }
  }
  return false;
}

export interface IncomingAccess {
  /** true = setiap sambungan masuk harus ditekan Terima di komputer ini. */
  readonly wajibSetujui: boolean;
  readonly pesan: string;
}

/** Keterangan siap tampil tentang cara orang lain bisa masuk ke komputer ini.
 *
 * `bisaDibaca` false berarti berkas pengaturan tidak ditemukan — keadaannya
 * tidak diketahui, dan itu dikatakan apa adanya alih-alih ditebak aman. */
export function describeIncomingAccess(
  configTexts: readonly string[],
  bisaDibaca: boolean,
): IncomingAccess {
  if (!bisaDibaca) {
    return {
      wajibSetujui: false,
      pesan:
        'Pengaturan AnyDesk tidak terbaca, jadi belum bisa dipastikan apakah sambungan masuk perlu persetujuan. Periksa langsung di aplikasi AnyDesk.',
    };
  }

  if (hasUnattendedPassword(configTexts)) {
    return {
      wajibSetujui: false,
      pesan:
        'Akses tanpa pengawasan AKTIF di komputer ini: orang yang tahu kata sandinya bisa masuk tanpa ada yang menekan Terima. Matikan di AnyDesk → Pengaturan → Keamanan bila tidak dikehendaki.',
    };
  }

  return {
    wajibSetujui: true,
    pesan:
      'Setiap sambungan masuk harus disetujui dulu: kotak Terima/Tolak muncul di layar komputer ini, dan sesi baru mulai setelah ditekan Terima.',
  };
}
