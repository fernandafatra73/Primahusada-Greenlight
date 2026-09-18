import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  deleteStoredImage,
  readStoredImageAsDataUrl,
  saveImageDataUrl,
  UPLOADS_DIR,
} from '../../apps/api/src/lib/fileStorage.js';

const TEST_SUBDIR = '__test__fileStorage';
// 1x1 transparent PNG.
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

afterEach(() => {
  rmSync(join(UPLOADS_DIR, TEST_SUBDIR), { recursive: true, force: true });
});

describe('saveImageDataUrl', () => {
  test('writes a base64 data URL to disk and returns its served path', () => {
    const url = saveImageDataUrl(PNG_DATA_URL, TEST_SUBDIR);

    expect(url).toMatch(new RegExp(`^/uploads/${TEST_SUBDIR}/[\\w-]+\\.png$`));
    expect(existsSync(join(UPLOADS_DIR, url.slice('/uploads/'.length)))).toBe(true);
  });

  test('returns non-data-url values unchanged (already-stored path)', () => {
    const stored = `/uploads/${TEST_SUBDIR}/existing.jpg`;

    expect(saveImageDataUrl(stored, TEST_SUBDIR)).toBe(stored);
  });

  test('returns an empty string unchanged', () => {
    expect(saveImageDataUrl('', TEST_SUBDIR)).toBe('');
  });
});

describe('readStoredImageAsDataUrl', () => {
  test('reconstructs the original data URL from a saved file', () => {
    const url = saveImageDataUrl(PNG_DATA_URL, TEST_SUBDIR);

    expect(readStoredImageAsDataUrl(url)).toBe(PNG_DATA_URL);
  });

  test('returns null for a path outside /uploads/', () => {
    expect(readStoredImageAsDataUrl('data:image/png;base64,abc')).toBeNull();
  });

  test('returns null when the file does not exist', () => {
    expect(readStoredImageAsDataUrl(`/uploads/${TEST_SUBDIR}/missing.png`)).toBeNull();
  });
});

describe('deleteStoredImage', () => {
  test('removes a previously saved file', () => {
    const url = saveImageDataUrl(PNG_DATA_URL, TEST_SUBDIR);
    const filePath = join(UPLOADS_DIR, url.slice('/uploads/'.length));
    expect(existsSync(filePath)).toBe(true);

    deleteStoredImage(url);

    expect(existsSync(filePath)).toBe(false);
  });

  test('ignores values outside /uploads/ and missing files without throwing', () => {
    expect(() => deleteStoredImage(null)).not.toThrow();
    expect(() => deleteStoredImage(undefined)).not.toThrow();
    expect(() => deleteStoredImage('data:image/png;base64,abc')).not.toThrow();
    expect(() => deleteStoredImage(`/uploads/${TEST_SUBDIR}/missing.png`)).not.toThrow();
  });
});
