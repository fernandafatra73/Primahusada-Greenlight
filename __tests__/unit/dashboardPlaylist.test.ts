import { describe, expect, test } from 'vitest';
import {
  DASHBOARD_PLAYLIST,
  isAudioFileName,
  nextTrackIndex,
  titleFromFileName,
} from '../../apps/web/src/lib/dashboardPlaylist.ts';

describe('USB songs', () => {
  test('accepts common audio files and rejects others', () => {
    expect(isAudioFileName('Lagu Saya.MP3')).toBe(true);
    expect(isAudioFileName('rekaman.m4a')).toBe(true);
    expect(isAudioFileName('lagu.flac')).toBe(true);
    expect(isAudioFileName('foto.jpg')).toBe(false);
    expect(isAudioFileName('catatan.txt')).toBe(false);
    expect(isAudioFileName('mp3')).toBe(false);
  });

  test('turns a file name into a readable title', () => {
    expect(titleFromFileName('01_Haruskah-Aku__Mengakhiri.mp3')).toBe('01 Haruskah Aku Mengakhiri');
    expect(titleFromFileName('Musik/Relax Song.wav')).toBe('Relax Song');
    expect(titleFromFileName('.mp3')).toBe('.mp3');
  });
});

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
