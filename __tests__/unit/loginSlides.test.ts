import { describe, expect, test } from 'vitest';
import { LOGIN_SLIDES, nextSlideIndex, slideImageUrl } from '../../apps/web/src/lib/loginSlides.ts';

describe('LOGIN_SLIDES', () => {
  test('six slides in order with the requested durations', () => {
    expect(LOGIN_SLIDES.map((s) => s.id)).toEqual(['prima-husada', 'poliklinik', 'radiologi', 'laboratorium', 'farmasi', 'hrd']);
    expect(LOGIN_SLIDES[0]?.durationMs).toBe(60_000);
    expect(LOGIN_SLIDES[1]?.durationMs).toBe(60_000);
    expect(LOGIN_SLIDES[2]?.durationMs).toBe(90_000);
  });

  test('radiology and lab slides carry their titles and equipment', () => {
    expect(LOGIN_SLIDES[2]).toMatchObject({ title: 'Radiologi', items: ['Alat Rontgen', 'Alat USG', 'Ruang Operator'] });
    expect(LOGIN_SLIDES[3]).toMatchObject({ title: 'Lab', items: ['Rayto 7600', 'Fotometer', 'Ruang Laboratorium'] });
  });
});

describe('slideImageUrl', () => {
  const urls = {
    '../../../../src/image/slide-radiologi.jpg': '/assets/radiologi.jpg',
    '../../../../src/image/Slide-HRD.PNG': '/assets/hrd.png',
    '../../../../src/image/slide-lab-lama.jpg': '/assets/lama.jpg',
    '../../../../src/image/slide-farmasi.txt': '/assets/farmasi.txt',
  };

  test('finds the photo by slide id, ignoring case and extension', () => {
    expect(slideImageUrl(urls, 'radiologi')).toBe('/assets/radiologi.jpg');
    expect(slideImageUrl(urls, 'hrd')).toBe('/assets/hrd.png');
  });

  test('returns null when the photo is missing, has another name, or is not an image', () => {
    expect(slideImageUrl(urls, 'poliklinik')).toBeNull();
    expect(slideImageUrl(urls, 'lab')).toBeNull();
    expect(slideImageUrl(urls, 'farmasi')).toBeNull();
    expect(slideImageUrl({}, 'radiologi')).toBeNull();
  });
});

describe('nextSlideIndex', () => {
  test('advances and wraps to the first slide', () => {
    expect(nextSlideIndex(0, 6)).toBe(1);
    expect(nextSlideIndex(5, 6)).toBe(0);
  });

  test('an empty slideshow stays at 0', () => {
    expect(nextSlideIndex(3, 0)).toBe(0);
  });
});
