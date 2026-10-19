/** Helper murni untuk edit langsung di sel tabel (lihat components/InlineEditCell.tsx). */

/** Centang/hapus centang satu id, urutan id lain tetap. */
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** True bila dua daftar id berisi id yang sama (urutan & duplikat diabaikan). */
export function samaIsi(a: readonly string[], b: readonly string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const id of setA) if (!setB.has(id)) return false;
  return true;
}

/** Teks isian setelah dirapikan; null bila kosong atau tidak berubah (tidak perlu disimpan). */
export function teksBaru(awal: string, draft: string): string | null {
  const rapi = draft.trim();
  if (!rapi || rapi === awal.trim()) return null;
  return rapi;
}
