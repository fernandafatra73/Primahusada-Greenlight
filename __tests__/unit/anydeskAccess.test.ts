import { describe, expect, test } from 'vitest';
import {
  configKeys,
  describeIncomingAccess,
  hasUnattendedPassword,
} from '../../apps/api/src/lib/anydeskAccess.ts';

const TANPA_SANDI = ['ad.anynet.cert=AAAA\nad.anynet.pkey=BBBB\nad.license.state_store=CCCC'];
const DENGAN_SANDI = ['ad.anynet.cert=AAAA\nad.anynet.pwd_hash=rahasia\n'];

describe('configKeys', () => {
  test('returns key names only, never the values', () => {
    expect(configKeys('ad.anynet.pwd_hash=rahasia-sekali')).toEqual(['ad.anynet.pwd_hash']);
  });

  test('handles both line ending styles', () => {
    expect(configKeys('a=1\r\nb=2\n')).toEqual(['a', 'b']);
  });

  test('skips blank lines and comments', () => {
    expect(configKeys('# catatan\n\na=1\n')).toEqual(['a']);
  });

  test('keeps a key that has no value', () => {
    expect(configKeys('ad.flag\n')).toEqual(['ad.flag']);
  });
});

describe('hasUnattendedPassword', () => {
  test('finds a stored unattended password', () => {
    expect(hasUnattendedPassword(DENGAN_SANDI)).toBe(true);
  });

  test('finds it in any of the files, not just the first', () => {
    expect(hasUnattendedPassword([...TANPA_SANDI, ...DENGAN_SANDI])).toBe(true);
  });

  test('recognises the salt key too, and ignores letter case', () => {
    expect(hasUnattendedPassword(['ad.security.PWD_SALT=xx'])).toBe(true);
  });

  test('says no when only ordinary keys are present', () => {
    expect(hasUnattendedPassword(TANPA_SANDI)).toBe(false);
  });

  test('is not fooled by keys that merely mention permissions', () => {
    expect(
      hasUnattendedPassword([
        'ad.security.permission_profiles._unattended_access.permissions.sas=1\n' +
          'ad.security.permission_profiles.version=2',
      ]),
    ).toBe(false);
  });

  test('says no for an empty configuration', () => {
    expect(hasUnattendedPassword([])).toBe(false);
    expect(hasUnattendedPassword([''])).toBe(false);
  });
});

describe('describeIncomingAccess', () => {
  test('reports that approval is required when no password is set', () => {
    const hasil = describeIncomingAccess(TANPA_SANDI, true);
    expect(hasil.wajibSetujui).toBe(true);
    expect(hasil.pesan).toContain('disetujui');
  });

  test('warns plainly when unattended access is switched on', () => {
    const hasil = describeIncomingAccess(DENGAN_SANDI, true);
    expect(hasil.wajibSetujui).toBe(false);
    expect(hasil.pesan).toContain('AKTIF');
  });

  test('admits it does not know rather than assuming it is safe', () => {
    const hasil = describeIncomingAccess([], false);
    expect(hasil.wajibSetujui).toBe(false);
    expect(hasil.pesan).toContain('tidak terbaca');
  });
});
