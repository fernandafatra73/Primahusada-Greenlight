import { describe, expect, test } from 'vitest';
import {
  TEAMVIEWER_CANDIDATE_PATHS,
  findTeamViewerExecutable,
  formatTeamViewerId,
  normalizeTeamViewerId,
} from '../../apps/api/src/lib/teamviewer.ts';

describe('normalizeTeamViewerId', () => {
  test('accepts a plain id', () => {
    expect(normalizeTeamViewerId('123456789')).toBe('123456789');
  });

  test('accepts the spaced form TeamViewer itself displays', () => {
    expect(normalizeTeamViewerId('123 456 789')).toBe('123456789');
    expect(normalizeTeamViewerId('  1 234 567 890  ')).toBe('1234567890');
  });

  test('rejects empty and whitespace-only input', () => {
    expect(normalizeTeamViewerId('')).toBeNull();
    expect(normalizeTeamViewerId('   ')).toBeNull();
  });

  test('rejects anything too short or too long to be an id', () => {
    expect(normalizeTeamViewerId('12345')).toBeNull();
    expect(normalizeTeamViewerId('1234567890123')).toBeNull();
  });

  // Endpoint penyambung menjalankan program, jadi masukan yang menyerupai
  // argumen atau perintah harus ditolak mentah-mentah.
  test('rejects anything that could smuggle in another argument', () => {
    const dangerous = [
      '123456789 --plain',
      '--id',
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
    const accepted = dangerous.filter((input) => normalizeTeamViewerId(input) !== null);
    expect(accepted).toEqual([]);
  });
});

describe('formatTeamViewerId', () => {
  test('groups digits in threes, the way TeamViewer shows them', () => {
    expect(formatTeamViewerId('123456789')).toBe('123 456 789');
    expect(formatTeamViewerId('1234567890')).toBe('1 234 567 890');
  });
});

describe('findTeamViewerExecutable', () => {
  test('returns the first path that exists', () => {
    const found = findTeamViewerExecutable(['A', 'B', 'C'], (p) => p === 'B');
    expect(found).toBe('B');
  });

  test('returns null when TeamViewer is not installed', () => {
    expect(findTeamViewerExecutable(['A', 'B'], () => false)).toBeNull();
  });

  test('only ever looks at the fixed candidate list', () => {
    expect(TEAMVIEWER_CANDIDATE_PATHS.every((p) => p.endsWith('TeamViewer.exe'))).toBe(true);
  });
});
