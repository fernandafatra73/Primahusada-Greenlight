import { describe, expect, test } from 'vitest';
import { isQuotaOrOverloadError } from '../../apps/api/src/routes/analisaFotoAi.ts';

describe('isQuotaOrOverloadError', () => {
  test('matches quota-exhausted (429/RESOURCE_EXHAUSTED) errors', () => {
    expect(isQuotaOrOverloadError(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}'))).toBe(true);
    expect(isQuotaOrOverloadError(new Error('You exceeded your current quota, RESOURCE_EXHAUSTED'))).toBe(true);
  });

  test('matches overload/unavailable (503) and deadline (504) errors', () => {
    expect(isQuotaOrOverloadError(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}'))).toBe(true);
    expect(isQuotaOrOverloadError(new Error('This model is currently experiencing high demand.'))).toBe(true);
    expect(isQuotaOrOverloadError(new Error('{"error":{"code":504,"status":"DEADLINE_EXCEEDED"}}'))).toBe(true);
  });

  test('does not match unrelated errors', () => {
    expect(isQuotaOrOverloadError(new Error('{"error":{"code":400,"status":"INVALID_ARGUMENT"}}'))).toBe(false);
    expect(isQuotaOrOverloadError(new Error('Network request failed'))).toBe(false);
    expect(isQuotaOrOverloadError('plain string, not an Error')).toBe(false);
  });
});
