import { describe, expect, test } from 'vitest';
import {
  ANYDESK_CANDIDATE_PATHS,
  findAnydeskExecutable,
  formatAnydeskId,
  normalizeAnydeskAddress,
  parseAnydeskIdOutput,
} from '../../apps/api/src/lib/anydesk.ts';

describe('normalizeAnydeskAddress', () => {
  test('accepts a plain id', () => {
    expect(normalizeAnydeskAddress('123456789')).toBe('123456789');
  });

  test('accepts the spaced form AnyDesk itself displays', () => {
    expect(normalizeAnydeskAddress('123 456 789')).toBe('123456789');
    expect(normalizeAnydeskAddress('  1 234 567 890  ')).toBe('1234567890');
  });

  test('accepts an alias', () => {
    expect(normalizeAnydeskAddress('pendaftaran-ph@ad')).toBe('pendaftaran-ph@ad');
    expect(normalizeAnydeskAddress('Radiologi.PH@AD')).toBe('radiologi.ph@ad');
  });

  test('rejects empty and whitespace-only input', () => {
    expect(normalizeAnydeskAddress('')).toBeNull();
    expect(normalizeAnydeskAddress('   ')).toBeNull();
  });

  test('rejects anything too short or too long to be an id', () => {
    expect(normalizeAnydeskAddress('12345')).toBeNull();
    expect(normalizeAnydeskAddress('1234567890123')).toBeNull();
  });

  // Endpoint penyambung menjalankan program, jadi masukan yang menyerupai
  // argumen atau perintah harus ditolak mentah-mentah.
  test('rejects anything that could smuggle in another argument', () => {
    const dangerous = [
      '123456789 --plain',
      '--get-id',
      '123456789;calc',
      '123456789 && calc',
      '123456789 | calc',
      '"123456789"',
      'C:\\Windows\\System32\\calc.exe',
      '../../evil',
      '123456789\ncalc',
      '$(calc)',
      '`calc`',
    ];
    const accepted = dangerous.filter((input) => normalizeAnydeskAddress(input) !== null);
    expect(accepted).toEqual([]);
  });

  test('rejects an alias with a different suffix', () => {
    expect(normalizeAnydeskAddress('someone@example.com')).toBeNull();
    expect(normalizeAnydeskAddress('someone@ads')).toBeNull();
  });
});

describe('formatAnydeskId', () => {
  test('groups digits in threes, the way AnyDesk shows them', () => {
    expect(formatAnydeskId('123456789')).toBe('123 456 789');
    expect(formatAnydeskId('1234567890')).toBe('1 234 567 890');
  });

  test('leaves an alias alone', () => {
    expect(formatAnydeskId('pendaftaran-ph@ad')).toBe('pendaftaran-ph@ad');
  });
});

describe('findAnydeskExecutable', () => {
  test('returns the first path that exists', () => {
    const found = findAnydeskExecutable(['A', 'B', 'C'], (p) => p === 'B');
    expect(found).toBe('B');
  });

  test('returns null when AnyDesk is not installed', () => {
    expect(findAnydeskExecutable(['A', 'B'], () => false)).toBeNull();
  });

  test('only ever looks at the fixed candidate list', () => {
    expect(ANYDESK_CANDIDATE_PATHS.every((p) => p.endsWith('AnyDesk.exe'))).toBe(true);
  });
});

describe('parseAnydeskIdOutput', () => {
  test('reads the id from the command output', () => {
    expect(parseAnydeskIdOutput('123456789\n')).toBe('123456789');
    expect(parseAnydeskIdOutput('  1234567890  \r\n')).toBe('1234567890');
  });

  test('returns null when the output is not an id', () => {
    expect(parseAnydeskIdOutput('')).toBeNull();
    expect(parseAnydeskIdOutput('error: service not running')).toBeNull();
  });
});
