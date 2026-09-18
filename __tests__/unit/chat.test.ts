import { describe, expect, test } from 'vitest';
import {
  formatMasterKesanContext,
  MAX_HISTORY_TURNS,
  MAX_MESSAGE_LENGTH,
  sanitizeHistory,
} from '../../apps/api/src/routes/chat.ts';

describe('sanitizeHistory', () => {
  test('returns an empty array for non-array input', () => {
    expect(sanitizeHistory(null)).toEqual([]);
    expect(sanitizeHistory(undefined)).toEqual([]);
    expect(sanitizeHistory('not an array')).toEqual([]);
    expect(sanitizeHistory({ role: 'user', text: 'hi' })).toEqual([]);
  });

  test('keeps only well-formed user/model turns with non-empty text', () => {
    const result = sanitizeHistory([
      { role: 'user', text: 'Halo' },
      { role: 'model', text: 'Hai, ada yang bisa dibantu?' },
      { role: 'system', text: 'diabaikan (role tidak dikenal)' },
      { role: 'user', text: '   ' },
      { role: 'user', text: 42 },
      null,
      'garbage',
    ]);
    expect(result).toEqual([
      { role: 'user', text: 'Halo' },
      { role: 'model', text: 'Hai, ada yang bisa dibantu?' },
    ]);
  });

  test('caps history to the last MAX_HISTORY_TURNS entries', () => {
    const history = Array.from({ length: MAX_HISTORY_TURNS + 5 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'model',
      text: `pesan ${i}`,
    }));
    const result = sanitizeHistory(history);
    expect(result).toHaveLength(MAX_HISTORY_TURNS);
    expect(result[0]!.text).toBe(`pesan 5`);
    expect(result.at(-1)!.text).toBe(`pesan ${MAX_HISTORY_TURNS + 4}`);
  });

  test('truncates overly long text to MAX_MESSAGE_LENGTH', () => {
    const longText = 'a'.repeat(MAX_MESSAGE_LENGTH + 500);
    const result = sanitizeHistory([{ role: 'user', text: longText }]);
    expect(result[0]!.text).toHaveLength(MAX_MESSAGE_LENGTH);
  });
});

describe('formatMasterKesanContext', () => {
  test('returns an empty string when there are no templates', () => {
    expect(formatMasterKesanContext([])).toBe('');
  });

  test('numbers entries and joins multi-line isi with " / "', () => {
    const result = formatMasterKesanContext([
      { judul: 'Thorak', isi: 'Tb paru aktif paru kanan dan kiri\nTidak tampak cardiomegali' },
      { judul: 'Thorak', isi: 'BP Kanan dan kiri\nTidak tampak cardiomegali' },
    ]);
    expect(result).toBe(
      [
        'DAFTAR MASTER KESAN (judul pemeriksaan dalam kurung siku, lalu isi bacaan per baris dipisah "/"):',
        '1. [Thorak] Tb paru aktif paru kanan dan kiri / Tidak tampak cardiomegali',
        '2. [Thorak] BP Kanan dan kiri / Tidak tampak cardiomegali',
      ].join('\n'),
    );
  });

  test('trims each line and drops empty lines from isi', () => {
    const result = formatMasterKesanContext([{ judul: 'BNO', isi: '  Obs Konstipasi  \n\n Saran: foto colon in loop ' }]);
    expect(result).toBe(
      [
        'DAFTAR MASTER KESAN (judul pemeriksaan dalam kurung siku, lalu isi bacaan per baris dipisah "/"):',
        '1. [BNO] Obs Konstipasi / Saran: foto colon in loop',
      ].join('\n'),
    );
  });
});
