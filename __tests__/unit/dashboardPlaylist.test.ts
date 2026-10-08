import { describe, expect, test } from 'vitest';
import { DASHBOARD_PLAYLIST, nextTrackIndex } from '../../apps/web/src/lib/dashboardPlaylist.ts';

describe('DASHBOARD_PLAYLIST', () => {
  test('holds the eight songs, each a distinct mp3 under /audio/dashboard/', () => {
    expect(DASHBOARD_PLAYLIST).toHaveLength(8);
    const urls = DASHBOARD_PLAYLIST.map((t) => t.url);
    expect(new Set(urls).size).toBe(8);
    for (const url of urls) expect(url).toMatch(/^\/audio\/dashboard\/[\w-]+\.mp3$/);
  });
});

describe('nextTrackIndex', () => {
  test('advances and wraps to the first song', () => {
    expect(nextTrackIndex(0, 8)).toBe(1);
    expect(nextTrackIndex(7, 8)).toBe(0);
  });

  test('an empty playlist stays at 0', () => {
    expect(nextTrackIndex(2, 0)).toBe(0);
  });
});
