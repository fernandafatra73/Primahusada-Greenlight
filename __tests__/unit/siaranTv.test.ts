import { describe, expect, test } from 'vitest';
import { resolveSiaranTvPlayable } from '../../apps/web/src/lib/siaranTv.ts';

describe('resolveSiaranTvPlayable', () => {
  test('detects youtube watch links', () => {
    expect(resolveSiaranTvPlayable('https://www.youtube.com/watch?v=abcdefghijk')).toEqual({
      kind: 'youtube',
      src: 'https://www.youtube.com/embed/abcdefghijk?autoplay=1&enablejsapi=1',
    });
  });

  test('detects youtu.be short links', () => {
    expect(resolveSiaranTvPlayable('https://youtu.be/abcdefghijk')).toEqual({
      kind: 'youtube',
      src: 'https://www.youtube.com/embed/abcdefghijk?autoplay=1&enablejsapi=1',
    });
  });

  test('detects youtube live links', () => {
    expect(resolveSiaranTvPlayable('https://www.youtube.com/live/abcdefghijk?feature=share')).toEqual({
      kind: 'youtube',
      src: 'https://www.youtube.com/embed/abcdefghijk?autoplay=1&enablejsapi=1',
    });
  });

  test('detects direct video stream URLs', () => {
    expect(resolveSiaranTvPlayable('https://cdn.example.com/stream/index.m3u8')).toEqual({
      kind: 'video',
      src: 'https://cdn.example.com/stream/index.m3u8',
    });
  });

  test('falls back to generic iframe for other embed URLs', () => {
    expect(resolveSiaranTvPlayable('https://player.example.com/embed/channel-1')).toEqual({
      kind: 'iframe',
      src: 'https://player.example.com/embed/channel-1',
    });
  });

  test('detects local blob URLs from a file picker (e.g. USB drive)', () => {
    const src = 'blob:http://localhost:1973/1234-5678';
    expect(resolveSiaranTvPlayable(src)).toEqual({ kind: 'video', src });
  });

  test('detects data: video/audio URLs', () => {
    const src = 'data:video/mp4;base64,AAAA';
    expect(resolveSiaranTvPlayable(src)).toEqual({ kind: 'video', src });
  });
});
