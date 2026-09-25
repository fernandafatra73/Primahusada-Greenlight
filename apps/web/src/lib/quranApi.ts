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

/** Dua pilihan qari/irama bacaan. "Al-Madruk" yang diminta tidak bisa
 * dipastikan namanya di API Quran publik, jadi diganti dengan qari lain
 * yang beneran ada rekamannya — bisa diganti kalau ada nama pastinya. */
export const QURAN_RECITERS: readonly QuranReciter[] = [
  { id: 'ar.mahermuaiqly', label: '🕋 Irama Mekkah — Syaikh Maher Al Muaiqly (Imam Masjidil Haram)' },
  { id: 'ar.husary', label: '🎙️ Irama Lain — Syaikh Mahmoud Khalil Al-Husary' },
];

const API_BASE = 'https://api.alquran.cloud/v1';
const TRANSLATION_EDITION = 'id.indonesian';

interface AlquranCloudResponse {
  readonly code: number;
  readonly data?: {
    readonly ayahs: readonly QuranAyah[];
  };
}

async function fetchJuzEdition(juz: number, edition: string): Promise<readonly QuranAyah[]> {
  const res = await fetch(`${API_BASE}/juz/${juz}/${edition}`);
  if (!res.ok) throw new Error(`Gagal mengambil data Juz ${juz} (${res.status})`);
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

/** Ayat Arab + terjemahan Indonesia satu juz, digabung per nomor ayat global
 * (urutannya sama persis di kedua edisi API-nya). */
export async function fetchJuz(juz: number, reciterId: string): Promise<readonly QuranAyahPair[]> {
  const [arab, terjemahan] = await Promise.all([
    fetchJuzEdition(juz, reciterId),
    fetchJuzEdition(juz, TRANSLATION_EDITION),
  ]);
  return arab.map((a, i) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    surah: a.surah,
    arab: a.text,
    terjemahan: terjemahan[i]?.text ?? '',
    audio: a.audio ?? null,
  }));
}
