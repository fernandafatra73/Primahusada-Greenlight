import { describe, expect, test } from 'vitest';
import { filterKesanTemplates } from '../../apps/web/src/lib/filterKesanTemplates.ts';

const items = [
  { judul: 'Thorax normal', isi: 'Cor dan pulmo dalam batas normal' },
  { judul: 'Pneumonia', isi: 'Infiltrat di paru kanan' },
  { judul: 'Kardiomegali', isi: 'CTR > 50%, pulmo normal' },
] as const;

describe('filterKesanTemplates', () => {
  test('returns every item for an empty or blank query', () => {
    expect(filterKesanTemplates(items, '')).toEqual(items);
    expect(filterKesanTemplates(items, '   ')).toEqual(items);
  });

  test('matches judul or isi ignoring case', () => {
    expect(filterKesanTemplates(items, 'PNEUMO').map((i) => i.judul)).toEqual(['Pneumonia']);
    expect(filterKesanTemplates(items, 'infiltrat').map((i) => i.judul)).toEqual(['Pneumonia']);
  });

  test('requires every word to match, in any order', () => {
    expect(filterKesanTemplates(items, 'normal pulmo').map((i) => i.judul)).toEqual(['Thorax normal', 'Kardiomegali']);
    expect(filterKesanTemplates(items, 'pulmo kanan')).toEqual([]);
  });

  test('returns an empty list when nothing matches', () => {
    expect(filterKesanTemplates(items, 'fraktur')).toEqual([]);
  });
});
