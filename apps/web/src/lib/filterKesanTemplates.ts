export interface SearchableKesan {
  readonly judul: string;
  readonly isi: string;
}

/** Huruf kecil, tanpa aksen, dan semua tanda baca/simbol dianggap spasi. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Jarak edit (sisip/hapus/ganti/tukar huruf bersebelahan), berhenti lebih awal bila melebihi `max`. */
function withinEdits(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (prev2[j - 2] ?? 0) + 1);
      }
      row.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return false;
    prev2 = prev;
    prev = row;
  }
  return (prev[b.length] ?? Infinity) <= max;
}

/** Kata pendek harus persis; kata lebih panjang boleh salah ketik 1-2 huruf. */
function allowedEdits(word: string): number {
  if (word.length < 4) return 0;
  return word.length < 8 ? 1 : 2;
}

/** Skor satu kata terhadap satu bidang: 0 = tidak cocok. */
function scoreWord(word: string, field: string, tokens: readonly string[]): number {
  if (field.includes(word)) return 3;
  const edits = allowedEdits(word);
  if (edits === 0) return 0;
  // Bandingkan juga dengan awalan token, supaya kata yang belum selesai diketik dan salah huruf tetap ketemu.
  const fuzzy = tokens.some((t) => withinEdits(word, t, edits) || withinEdits(word, t.slice(0, word.length), edits));
  return fuzzy ? 1 : 0;
}

/**
 * Pencarian cepat Master Kesan yang toleran: tanda baca/aksen/huruf besar diabaikan,
 * kata boleh terpotong atau salah ketik sedikit, dan setiap kata harus ada di judul
 * atau isi (urutan bebas). Hasil diurutkan dari yang paling cocok (judul lebih berat
 * dari isi, cocok persis lebih berat dari mirip). Query kosong mengembalikan semua item
 * dengan urutan asli.
 */
export function filterKesanTemplates<T extends SearchableKesan>(items: readonly T[], query: string): readonly T[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return items;

  const scored: { item: T; score: number; index: number }[] = [];
  items.forEach((item, index) => {
    const judul = normalize(item.judul);
    const isi = normalize(item.isi);
    const judulTokens = judul.split(' ');
    const isiTokens = isi.split(' ');
    let total = 0;
    for (const word of words) {
      const inJudul = scoreWord(word, judul, judulTokens);
      const inIsi = scoreWord(word, isi, isiTokens);
      // Judul dihitung lebih berat supaya judul yang cocok naik ke atas.
      const best = Math.max(inJudul * 2, inIsi);
      if (best === 0) return;
      total += best;
    }
    scored.push({ item, score: total, index });
  });
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).map((s) => s.item);
}
