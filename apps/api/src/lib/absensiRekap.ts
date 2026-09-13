/** Menghitung jumlah hari kerja (Senin–Sabtu) dari 1 Januari `tahun` sampai
 * `now`, atau sampai 31 Desember `tahun` jika tahun tersebut sudah lewat —
 * dipakai sebagai penyebut rekap persentase kehadiran Admin Klinik. Hari
 * Minggu tidak dihitung sebagai hari kerja. */
export function countHariKerja(tahun: number, now: Date = new Date()): number {
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (tahun > todayUtc.getUTCFullYear()) return 0;

  const yearStart = new Date(Date.UTC(tahun, 0, 1));
  const yearEnd = new Date(Date.UTC(tahun, 11, 31));
  const effectiveEnd = tahun === todayUtc.getUTCFullYear() ? todayUtc : yearEnd;
  if (effectiveEnd < yearStart) return 0;

  let hariKerja = 0;
  for (let d = new Date(yearStart); d <= effectiveEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0) hariKerja += 1;
  }
  return hariKerja;
}

/** Persentase kehadiran dibulatkan ke 1 desimal, 0 jika tidak ada hari kerja
 * (menghindari pembagian dengan nol, mis. tahun yang belum dimulai). */
export function calcPersentaseKehadiran(hariHadir: number, hariKerja: number): number {
  if (hariKerja <= 0) return 0;
  return Math.round((hariHadir / hariKerja) * 1000) / 10;
}
