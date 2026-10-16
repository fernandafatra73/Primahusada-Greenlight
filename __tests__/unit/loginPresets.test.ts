import { describe, expect, test } from 'vitest';
import {
  LOGIN_PRESETS,
  findLoginPreset,
  toggleLoginPanel,
} from '../../apps/web/src/lib/loginPresets.ts';

describe('login presets', () => {
  test('prefill emails match the seeded department accounts', () => {
    expect(findLoginPreset('umum').email).toBe('admin@primahusada.local');
    expect(findLoginPreset('radiologi').email).toBe('radiologi@primahusada.local');
    expect(findLoginPreset('laboratorium').email).toBe('lab@primahusada.local');
  });

  test('preset ids are unique', () => {
    const ids = LOGIN_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('toggleLoginPanel', () => {
  test('opens a closed panel with the clicked preset', () => {
    expect(toggleLoginPanel({ open: false, preset: 'umum' }, 'radiologi')).toEqual({
      open: true,
      preset: 'radiologi',
    });
  });

  test('closes the panel when the active preset is clicked again', () => {
    expect(toggleLoginPanel({ open: true, preset: 'laboratorium' }, 'laboratorium')).toEqual({
      open: false,
      preset: 'laboratorium',
    });
  });

  test('switches preset without closing when another button is clicked', () => {
    expect(toggleLoginPanel({ open: true, preset: 'umum' }, 'laboratorium')).toEqual({
      open: true,
      preset: 'laboratorium',
    });
  });
});
