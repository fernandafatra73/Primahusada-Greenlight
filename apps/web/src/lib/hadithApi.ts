export interface HadithCollection {
  readonly id: 'ind-bukhari' | 'ind-muslim';
  readonly label: string;
}

export const HADITH_COLLECTIONS: readonly HadithCollection[] = [
  { id: 'ind-bukhari', label: 'Shahih Al-Bukhari' },
  { id: 'ind-muslim', label: 'Shahih Muslim' },
];

export interface HadithResult {
  readonly number: number;
  readonly text: string;
  readonly collectionName: string;
  readonly sectionName: string | null;
}

interface HadithApiResponse {
  readonly metadata?: {
    readonly name?: string;
    readonly section?: Record<string, string>;
  };
  readonly hadiths?: readonly {
    readonly hadithnumber: number;
    readonly text: string;
    readonly reference?: { readonly book: number };
  }[];
}

const BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

/** Ambil satu hadits berdasarkan nomornya langsung dari sumber terbuka
 * fawazahmed0/hadith-api — supaya teksnya akurat sesuai database aslinya,
 * bukan dikutip dari ingatan. */
export async function fetchHadith(collection: HadithCollection['id'], number: number): Promise<HadithResult> {
  const res = await fetch(`${BASE}/${collection}/${number}.json`);
  if (!res.ok) throw new Error(`Hadits nomor ${number} tidak ditemukan (${res.status})`);
  const json = (await res.json()) as HadithApiResponse;
  const hadith = json.hadiths?.[0];
  if (!hadith || !hadith.text) throw new Error(`Hadits nomor ${number} tidak ditemukan atau kosong`);
  const bookNo = hadith.reference?.book;
  const sectionName = bookNo !== undefined ? (json.metadata?.section?.[String(bookNo)] ?? null) : null;
  return {
    number: hadith.hadithnumber,
    text: hadith.text,
    collectionName: json.metadata?.name ?? collection,
    sectionName,
  };
}
