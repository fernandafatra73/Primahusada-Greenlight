import { describe, expect, test } from 'vitest';
import { filterKesanTemplates } from '../../apps/web/src/lib/filterKesanTemplates.ts';

const items = [
  { judul: 'Thorax normal', isi: 'Cor dan pulmo dalam batas normal' },
  { judul: 'Pneumonia', isi: 'Infiltrat di paru kanan' },
  { judul: 'Kardiomegali', isi: 'CTR > 50%, pulmo normal' },
] as const;

const titles = (query: string): string[] => filterKesanTemplates(items, query).map((i) => i.judul);

describe('filterKesanTemplates', () => {
  test('returns every item in original order for an empty or blank query', () => {
    expect(filterKesanTemplates(items, '')).toEqual(items);
    expect(filterKesanTemplates(items, '   ')).toEqual(items);
  });

  test('matches judul or isi ignoring case and partial words', () => {
    expect(titles('PNEUMO')).toEqual(['Pneumonia']);
    expect(titles('infiltrat')).toEqual(['Pneumonia']);
    expect(titles('kardio')).toEqual(['Kardiomegali']);
  });

  test('ignores punctuation and accents', () => {
    expect(titles('ctr>50')).toEqual(['Kardiomegali']);
    expect(titles('thoráx')).toEqual(['Thorax normal']);
  });

  test('tolerates typos in longer words', () => {
    expect(titles('pneumoina')).toEqual(['Pneumonia']);
    expect(titles('kardiomgali')).toEqual(['Kardiomegali']);
    expect(titles('infilrat')).toEqual(['Pneumonia']);
  });

  test('tolerates a typo in an unfinished word', () => {
    expect(titles('kardimeg')).toEqual(['Kardiomegali']);
  });

  test('keeps short words exact', () => {
    expect(titles('cor')).toEqual(['Thorax normal']);
    expect(titles('cr')).toEqual([]);
    expect(titles('xyz')).toEqual([]);
  });

  test('requires every word to match, in any order', () => {
    expect(titles('normal pulmo')).toEqual(['Thorax normal', 'Kardiomegali']);
    expect(titles('pulmo kanan')).toEqual([]);
  });

  test('ranks judul matches above isi matches', () => {
    const list = [
      { judul: 'Lain-lain', isi: 'tampak pneumonia ringan' },
      { judul: 'Pneumonia', isi: 'Infiltrat' },
    ] as const;
    expect(filterKesanTemplates(list, 'pneumonia').map((i) => i.judul)).toEqual(['Pneumonia', 'Lain-lain']);
  });

  test('returns an empty list when nothing matches', () => {
    expect(titles('fraktur')).toEqual([]);
  });
});
