export interface SearchableKesan {
  readonly judul: string;
  readonly isi: string;
}

/**
 * Pencarian cepat Master Kesan: setiap kata pada `query` harus ada di judul atau isi
 * (tanpa membedakan huruf besar/kecil). Query kosong mengembalikan semua item.
 */
export function filterKesanTemplates<T extends SearchableKesan>(items: readonly T[], query: string): readonly T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((item) => {
    const haystack = `${item.judul} ${item.isi}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
