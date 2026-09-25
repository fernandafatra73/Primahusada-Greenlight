export interface QuranSurahRef {
  readonly number: number;
  readonly name: string;
  readonly englishName: string;
}

export interface QuranAyah {
  readonly number: number;
  readonly numberInSurah: number;
  readonly text: string;
  readonly surah: QuranSurahRef;
  readonly audio?: string;
}

export interface QuranReciter {
  readonly id: string;
  readonly label: string;
}

/** Syaikh Abdullah Al-Mathrud ada di data API Qur'an ini, tapi tidak
 * menyertakan rekaman audio sama sekali (sudah dicoba dua ejaan identifier
 * berbeda, keduanya cuma berisi teks) — jadi belum bisa dijadikan pilihan
 * irama yang bisa dibunyikan. Kalau ada link audio resminya, bisa ditambah. */
export const QURAN_RECITERS: readonly QuranReciter[] = [
  { id: 'ar.mahermuaiqly', label: '🕋 Irama Mekkah — Syaikh Maher Al Muaiqly (Imam Masjidil Haram)' },
  { id: 'ar.alafasy', label: '🎙️ Irama Bayyati — Syaikh Mishary Rashid Alafasy' },
];

const API_BASE = 'https://api.alquran.cloud/v1';
const TRANSLATION_EDITION = 'id.indonesian';

interface AlquranCloudResponse {
  readonly code: number;
  readonly data?: {
    readonly ayahs: readonly QuranAyah[];
  };
}

async function fetchEdition(juz: number, edition: string): Promise<readonly QuranAyah[]> {
  const res = await fetch(`${API_BASE}/juz/${juz}/${edition}`);
  if (!res.ok) throw new Error(`Gagal mengambil data juz ${juz} (${res.status})`);
  const json = (await res.json()) as AlquranCloudResponse;
  if (json.code !== 200 || !json.data) throw new Error(`Juz ${juz} tidak ditemukan`);
  return json.data.ayahs;
}

export interface QuranAyahPair {
  readonly number: number;
  readonly numberInSurah: number;
  readonly surah: QuranSurahRef;
  readonly arab: string;
  readonly terjemahan: string;
  readonly audio: string | null;
}

function pairUp(arab: readonly QuranAyah[], terjemahan: readonly QuranAyah[]): readonly QuranAyahPair[] {
  return arab.map((a, i) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    surah: a.surah,
    arab: a.text,
    terjemahan: terjemahan[i]?.text ?? '',
    audio: a.audio ?? null,
  }));
}

/** Ayat Arab + terjemahan Indonesia satu juz, digabung per nomor ayat global
 * (urutannya sama persis di kedua edisi API-nya). */
export async function fetchJuz(juz: number, reciterId: string): Promise<readonly QuranAyahPair[]> {
  const [arab, terjemahan] = await Promise.all([
    fetchEdition(juz, reciterId),
    fetchEdition(juz, TRANSLATION_EDITION),
  ]);
  return pairUp(arab, terjemahan);
}

export interface QuranSearchResult {
  readonly number: number;
  readonly numberInSurah: number;
  readonly surah: QuranSurahRef;
  readonly cuplikan: string;
}

interface SearchResponse {
  readonly code: number;
  readonly data?: {
    readonly count: number;
    readonly matches: readonly {
      readonly number: number;
      readonly numberInSurah: number;
      readonly text: string;
      readonly surah: QuranSurahRef;
    }[];
  };
}

/** Cari kata kunci di terjemahan Indonesia, di seluruh 30 juz sekaligus. */
export async function searchQuran(keyword: string): Promise<readonly QuranSearchResult[]> {
  const term = keyword.trim();
  if (!term) return [];
  const res = await fetch(`${API_BASE}/search/${encodeURIComponent(term)}/all/${TRANSLATION_EDITION}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Pencarian gagal (${res.status})`);
  const json = (await res.json()) as SearchResponse;
  if (json.code !== 200 || !json.data) return [];
  return json.data.matches.map((m) => ({
    number: m.number,
    numberInSurah: m.numberInSurah,
    surah: m.surah,
    cuplikan: m.text,
  }));
}

/** Juz tempat satu ayat (nomor global 1–6236) berada — dipakai untuk
 * lompat ke hasil pencarian. */
export async function fetchAyahJuz(globalAyahNumber: number): Promise<number> {
  const res = await fetch(`${API_BASE}/ayah/${globalAyahNumber}/quran-uthmani`);
  if (!res.ok) throw new Error(`Gagal menemukan lokasi ayat (${res.status})`);
  const json = (await res.json()) as { code: number; data?: { juz?: number } };
  if (json.code !== 200 || !json.data?.juz) throw new Error('Lokasi ayat tidak ditemukan');
  return json.data.juz;
}

export interface QuranSurahListItem extends QuranSurahRef {
  readonly englishNameTranslation: string;
  readonly numberOfAyahs: number;
}

/** Daftar ringkas 114 surah (nomor, nama, jumlah ayat) — dipakai untuk
 * pemilih surah, mis. di halaman Kisah untuk membaca tafsir per surah. */
export async function fetchSurahList(): Promise<readonly QuranSurahListItem[]> {
  const res = await fetch(`${API_BASE}/surah`);
  if (!res.ok) throw new Error(`Gagal mengambil daftar surah (${res.status})`);
  const json = (await res.json()) as { code: number; data?: readonly QuranSurahListItem[] };
  if (json.code !== 200 || !json.data) throw new Error('Daftar surah tidak ditemukan');
  return json.data;
}
