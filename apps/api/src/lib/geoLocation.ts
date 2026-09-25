/** Penanganan titik lokasi yang ikut direkam saat absensi.
 *
 * Koordinat datang dari browser (Geolocation API) dan tidak boleh dipercaya
 * apa adanya: nilainya dipastikan berupa angka di rentang yang masuk akal
 * sebelum disimpan, supaya kolom lokasi tidak pernah berisi data sampah. */

export interface Coordinate {
  readonly lat: number;
  readonly lng: number;
  /** Perkiraan simpangan dalam meter, sebagaimana dilaporkan peramban. */
  readonly akurasi: number | null;
}

/** Akurasi di atas ini praktis tidak berguna untuk memastikan orangnya ada di
 * klinik — biasanya hasil penentuan lokasi lewat alamat IP, bukan GPS. */
export const AKURASI_KASAR_METER = 1000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Memeriksa koordinat dari permintaan, atau null bila tidak sah/tidak ada.
 *
 * Lintang di luar ±90 dan bujur di luar ±180 ditolak, begitu pula nilai yang
 * bukan angka. Akurasi negatif dianggap tidak dilaporkan. */
export function normalizeCoordinate(
  lat: unknown,
  lng: unknown,
  akurasi?: unknown,
): Coordinate | null {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;

  const akurasiBersih = isFiniteNumber(akurasi) && akurasi >= 0 ? akurasi : null;
  return { lat, lng, akurasi: akurasiBersih };
}

/** Koordinat 0,0 ada di tengah laut lepas Afrika — hampir selalu tanda alat
 * gagal menentukan lokasi, bukan lokasi sebenarnya. */
export function isNullIsland(coord: Coordinate): boolean {
  return coord.lat === 0 && coord.lng === 0;
}

/** Ditulis 6 angka di belakang koma — kira-kira setara 0,1 meter, lebih dari
 * cukup dan tidak menyesatkan seolah lebih presisi dari kenyataan. */
export function formatCoordinate(coord: Coordinate): string {
  return `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`;
}

/** Tautan peta untuk menengok titik absensi. */
export function mapsUrl(coord: Coordinate): string {
  return `https://www.google.com/maps?q=${coord.lat},${coord.lng}`;
}

/** Apakah akurasinya cukup untuk dipercaya sebagai bukti kehadiran. */
export function isAkurasiMemadai(coord: Coordinate): boolean {
  return coord.akurasi !== null && coord.akurasi <= AKURASI_KASAR_METER;
}
