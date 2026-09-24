import { describe, expect, test } from 'vitest';
import { VOLUME_STEP, stepPlayerVolume, toVolumePercent } from '../../apps/web/src/lib/playerVolume.ts';

describe('stepPlayerVolume', () => {
  test('raises by one step', () => {
    expect(stepPlayerVolume(0.5, VOLUME_STEP)).toBe(0.6);
  });

  test('lowers by one step', () => {
    expect(stepPlayerVolume(0.5, -VOLUME_STEP)).toBe(0.4);
  });

  test('clamps at the top so repeated raises stay at full volume', () => {
    expect(stepPlayerVolume(1, VOLUME_STEP)).toBe(1);
    expect(stepPlayerVolume(0.95, VOLUME_STEP)).toBe(1);
  });

  test('clamps at the bottom so repeated lowers stay silent', () => {
    expect(stepPlayerVolume(0, -VOLUME_STEP)).toBe(0);
    expect(stepPlayerVolume(0.05, -VOLUME_STEP)).toBe(0);
  });

  test('does not accumulate binary fraction error across steps', () => {
    let volume = 1;
    for (let i = 0; i < 10; i++) volume = stepPlayerVolume(volume, -VOLUME_STEP);
    expect(volume).toBe(0);

    for (let i = 0; i < 10; i++) volume = stepPlayerVolume(volume, VOLUME_STEP);
    expect(volume).toBe(1);
  });
});

describe('toVolumePercent', () => {
  test('converts the 0-1 scale to whole percent', () => {
    expect(toVolumePercent(0)).toBe(0);
    expect(toVolumePercent(0.3)).toBe(30);
    expect(toVolumePercent(1)).toBe(100);
  });
});
