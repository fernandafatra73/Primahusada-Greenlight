export interface TextInsertResult {
  readonly text: string;
  /** Posisi kursor setelah teks disisipkan. */
  readonly cursor: number;
}

/**
 * Sisipkan `insert` menggantikan seleksi [start, end) pada `text`. Bila sisipan
 * menempel ke teks lain, diberi pemisah baris baru supaya kalimat template tidak
 * menyambung dengan kalimat sebelumnya/sesudahnya.
 */
export function insertTextAt(text: string, insert: string, start: number, end: number): TextInsertResult {
  const from = Math.max(0, Math.min(start, end, text.length));
  const to = Math.min(text.length, Math.max(start, end, from));
  const before = text.slice(0, from);
  const after = text.slice(to);
  const lead = before !== '' && !before.endsWith('\n') ? '\n' : '';
  const trail = after !== '' && !after.startsWith('\n') ? '\n' : '';
  const inserted = `${lead}${insert}${trail}`;
  return {
    text: `${before}${inserted}${after}`,
    cursor: before.length + lead.length + insert.length,
  };
}
