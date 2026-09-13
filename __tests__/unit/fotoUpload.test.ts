import { describe, expect, test } from 'vitest';
import { FOTO_MAX_BYTES, validateFotoFile } from '../../apps/web/src/lib/fotoUpload.ts';

describe('validateFotoFile', () => {
  test('accepts supported image types within the size limit', () => {
    expect(validateFotoFile({ type: 'image/jpeg', size: 250_000 })).toBeNull();
    expect(validateFotoFile({ type: 'image/png', size: 1 })).toBeNull();
    expect(validateFotoFile({ type: 'image/gif', size: 1024 })).toBeNull();
    expect(validateFotoFile({ type: 'image/webp', size: 1024 })).toBeNull();
  });

  test('accepts a file exactly at the size limit', () => {
    expect(validateFotoFile({ type: 'image/jpeg', size: FOTO_MAX_BYTES })).toBeNull();
  });

  test('rejects unsupported file types', () => {
    expect(validateFotoFile({ type: 'application/pdf', size: 1024 })).toMatch(/Format foto tidak didukung/);
    expect(validateFotoFile({ type: '', size: 1024 })).toMatch(/Format foto tidak didukung/);
  });

  test('rejects empty files', () => {
    expect(validateFotoFile({ type: 'image/jpeg', size: 0 })).toBe('File foto kosong.');
  });

  test('rejects files larger than the size limit', () => {
    expect(validateFotoFile({ type: 'image/jpeg', size: FOTO_MAX_BYTES + 1 })).toBe('Ukuran foto maksimal 10 MB.');
  });
});
