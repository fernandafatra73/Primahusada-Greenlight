import type { QuranSurahRef } from './quranApi.ts';

export interface TafsirEdition {
  readonly id: string;
  readonly label: string;
}

export const TAFSIR_EDITIONS: readonly TafsirEdition[] = [
  { id: 'id.jalalayn', label: 'Tafsir Jalalayn' },
  { id: 'id.muntakhab', label: 'Tafsir Al-Muntakhab (M. Quraish Shihab dkk.)' },
];

export interface TafsirAyah {
  readonly numberInSurah: number;
  readonly arab: string;
  readonly tafsir: string;
}

const API_BASE = 'https://api.alquran.cloud/v1';

interface SurahEditionAyah {
  readonly numberInSurah: number;
  readonly text: string;
  readonly surah: QuranSurahRef;
}

interface Response {
  readonly code: number;
  readonly data?: {
    readonly ayahs: readonly SurahEditionAyah[];
  };
}

async function fetchSurahEdition(surahNumber: number, edition: string): Promise<readonly SurahEditionAyah[]> {
  const res = await fetch(`${API_BASE}/surah/${surahNumber}/${edition}`);
  if (!res.ok) throw new Error(`Gagal mengambil data surah ${surahNumber} (${res.status})`);
  const json = (await res.json()) as Response;
  if (json.code !== 200 || !json.data) throw new Error(`Surah ${surahNumber} tidak ditemukan`);
  return json.data.ayahs;
}

/** Teks Arab + tafsir satu surah penuh, digabung per ayat. */
export async function fetchTafsir(
  surahNumber: number,
  tafsirEdition: string,
): Promise<{ readonly surah: QuranSurahRef; readonly ayat: readonly TafsirAyah[] }> {
  const [arab, tafsir] = await Promise.all([
    fetchSurahEdition(surahNumber, 'quran-uthmani'),
    fetchSurahEdition(surahNumber, tafsirEdition),
  ]);
  return {
    surah: arab[0]!.surah,
    ayat: arab.map((a, i) => ({
      numberInSurah: a.numberInSurah,
      arab: a.text,
      tafsir: tafsir[i]?.text ?? '',
    })),
  };
}
