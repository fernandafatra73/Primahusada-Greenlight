export interface PrayerTime {
  readonly id: 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya';
  readonly label: string;
  /** Format "HH:MM", jam lokal sesuai kota yang dipilih. */
  readonly time: string;
}

const ALADHAN_KEY_BY_ID: Record<PrayerTime['id'], string> = {
  Subuh: 'Fajr',
  Dzuhur: 'Dhuhr',
  Ashar: 'Asr',
  Maghrib: 'Maghrib',
  Isya: 'Isha',
};

interface AladhanResponse {
  readonly code: number;
  readonly data?: {
    readonly timings: Record<string, string>;
  };
}

/** Mengambil jadwal 5 waktu sholat hari ini dari API publik Aladhan
 * (https://aladhan.com/prayer-times-api), berdasarkan kota. Butuh koneksi
 * internet — dipakai untuk memicu azan otomatis di halaman Jam. */
export async function fetchPrayerTimes(city: string, country: string): Promise<readonly PrayerTime[]> {
  const params = new URLSearchParams({ city, country });
  const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?${params.toString()}`);
  if (!res.ok) throw new Error(`Gagal mengambil jadwal sholat (${res.status})`);
  const json = (await res.json()) as AladhanResponse;
  const timings = json.data?.timings;
  if (json.code !== 200 || !timings) throw new Error('Jadwal sholat tidak ditemukan untuk kota ini');
  return (Object.keys(ALADHAN_KEY_BY_ID) as PrayerTime['id'][]).map((id) => ({
    id,
    label: id,
    time: (timings[ALADHAN_KEY_BY_ID[id]] ?? '--:--').slice(0, 5),
  }));
}
