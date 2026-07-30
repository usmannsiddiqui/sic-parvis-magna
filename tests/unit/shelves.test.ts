import { describe, it, expect } from 'vitest';
import { buildShelves, tagsByFrequency } from '../../src/lib/shelves';
import { publishedSorted, type EssayListItem } from '../../src/lib/essays';

function essay(over: Partial<EssayListItem>): EssayListItem {
  return {
    slug: 't',
    title: 'T',
    description: 'd',
    pubDate: new Date('2026-01-01'),
    category: 'Discipline',
    tags: [],
    featured: false,
    draft: false,
    readingTimeLabel: '1 min read',
    ...over,
  };
}

describe('buildShelves', () => {
  it('returns one shelf per CATEGORIES member, in CATEGORIES order, even with no essays', () => {
    const shelves = buildShelves([]);
    expect(shelves).toHaveLength(3);
    expect(shelves.map((s) => s.label)).toEqual(['Discipline', 'Faith', 'Reflections']);
    expect(shelves.map((s) => s.slug)).toEqual(['discipline', 'faith', 'reflections']);
    for (const shelf of shelves) {
      expect(shelf.count).toBe(0);
      expect(shelf.spines).toEqual([]);
      expect(shelf.comingSoon).toBe(3);
      expect(shelf.moreCount).toBe(0);
    }
  });

  it('still returns all three shelves when essays exist in only one category', () => {
    const published = publishedSorted([essay({ slug: 'a', category: 'Discipline' })]);
    const shelves = buildShelves(published);
    expect(shelves).toHaveLength(3);
    const faith = shelves.find((s) => s.label === 'Faith')!;
    const reflections = shelves.find((s) => s.label === 'Reflections')!;
    for (const shelf of [faith, reflections]) {
      expect(shelf.count).toBe(0);
      expect(shelf.spines).toEqual([]);
      expect(shelf.comingSoon).toBe(3);
    }
  });

  it('spines are the 4 most-recent essays in the category, newest first, with real title/href', () => {
    const published = publishedSorted([
      essay({ slug: 'e1', title: 'Essay One', pubDate: new Date('2026-01-01') }),
      essay({ slug: 'e2', title: 'Essay Two', pubDate: new Date('2026-02-01') }),
      essay({ slug: 'e3', title: 'Essay Three', pubDate: new Date('2026-03-01') }),
      essay({ slug: 'e4', title: 'Essay Four', pubDate: new Date('2026-04-01') }),
      essay({ slug: 'e5', title: 'Essay Five', pubDate: new Date('2026-05-01') }),
      essay({ slug: 'e6', title: 'Essay Six', pubDate: new Date('2026-06-01') }),
    ]);
    const shelf = buildShelves(published).find((s) => s.label === 'Discipline')!;
    expect(shelf.spines).toHaveLength(4);
    expect(shelf.spines).toEqual([
      { title: 'Essay Six', href: '/writing/e6' },
      { title: 'Essay Five', href: '/writing/e5' },
      { title: 'Essay Four', href: '/writing/e4' },
      { title: 'Essay Three', href: '/writing/e3' },
    ]);
  });

  it('count is the true total published count in the category, not capped at spines', () => {
    const published = publishedSorted(
      Array.from({ length: 6 }, (_, i) => essay({ slug: `e${i}`, title: `Essay ${i}` })),
    );
    const shelf = buildShelves(published).find((s) => s.label === 'Discipline')!;
    expect(shelf.count).toBe(6);
    expect(shelf.spines).toHaveLength(4);
    expect(shelf.moreCount).toBe(2);
  });

  it('comingSoon is zero once the shelf already has 3+ real spines', () => {
    const published = publishedSorted(
      Array.from({ length: 3 }, (_, i) => essay({ slug: `e${i}` })),
    );
    const shelf = buildShelves(published).find((s) => s.label === 'Discipline')!;
    expect(shelf.spines).toHaveLength(3);
    expect(shelf.comingSoon).toBe(0);

    const published4 = publishedSorted(
      Array.from({ length: 4 }, (_, i) => essay({ slug: `e${i}` })),
    );
    const shelf4 = buildShelves(published4).find((s) => s.label === 'Discipline')!;
    expect(shelf4.spines).toHaveLength(4);
    expect(shelf4.comingSoon).toBe(0);
  });

  it('comingSoon fills up so spines.length + comingSoon >= 3 when fewer real spines exist', () => {
    const oneEssay = publishedSorted([essay({ slug: 'e0' })]);
    const oneShelf = buildShelves(oneEssay).find((s) => s.label === 'Discipline')!;
    expect(oneShelf.spines).toHaveLength(1);
    expect(oneShelf.comingSoon).toBe(2);

    const twoEssays = publishedSorted([essay({ slug: 'e0' }), essay({ slug: 'e1' })]);
    const twoShelf = buildShelves(twoEssays).find((s) => s.label === 'Discipline')!;
    expect(twoShelf.spines).toHaveLength(2);
    expect(twoShelf.comingSoon).toBe(1);
  });

  it('moreCount floors at 0 and coming-soon placeholders never contribute to it', () => {
    const published = publishedSorted([essay({ slug: 'e0' }), essay({ slug: 'e1' })]);
    const shelf = buildShelves(published).find((s) => s.label === 'Discipline')!;
    // 2 real essays, both shown as spines, 1 coming-soon placeholder added to reach 3 items.
    expect(shelf.spines).toHaveLength(2);
    expect(shelf.comingSoon).toBe(1);
    expect(shelf.moreCount).toBe(0);
  });

  it('drafts never appear in spines and never contribute to count', () => {
    const published = publishedSorted([
      essay({ slug: 'real-1', title: 'Real One' }),
      essay({ slug: 'draft-1', title: 'Draft One', draft: true }),
      essay({ slug: 'real-2', title: 'Real Two' }),
    ]);
    const shelf = buildShelves(published).find((s) => s.label === 'Discipline')!;
    expect(shelf.count).toBe(2);
    expect(shelf.spines.map((s) => s.title)).not.toContain('Draft One');
    expect(shelf.spines).toHaveLength(2);
  });

  it('a coming-soon shelf never invents a title or href for its placeholders', () => {
    // No essays at all: every shelf is 100% coming-soon. Spines must stay empty —
    // no fabricated "Coming soon" spine objects should ever appear.
    const shelves = buildShelves([]);
    for (const shelf of shelves) {
      expect(shelf.spines).toEqual([]);
      expect(typeof shelf.comingSoon).toBe('number');
    }
  });

  it('filler geometry is deterministic from the shelf slug (no randomness)', () => {
    const first = buildShelves([]);
    const second = buildShelves([]);
    // Same input twice must produce byte-identical filler arrays (snapshot-stable build).
    expect(first.map((s) => s.fillers)).toEqual(second.map((s) => s.fillers));

    const bySlug = Object.fromEntries(first.map((s) => [s.slug, s.fillers]));
    expect(bySlug['discipline']).toEqual([]);
    expect(bySlug['faith']).toEqual([]);
    expect(bySlug['reflections']).toEqual([15, 14]);
  });

  it('every filler width stays within the 13-16px range and count stays small (0-3)', () => {
    const shelves = buildShelves([]);
    for (const shelf of shelves) {
      expect(shelf.fillers.length).toBeLessThanOrEqual(3);
      for (const width of shelf.fillers) {
        expect(width).toBeGreaterThanOrEqual(13);
        expect(width).toBeLessThanOrEqual(16);
      }
    }
  });
});

describe('tagsByFrequency', () => {
  it('sorts by count descending, then label ascending on ties, with a frequency-based 33->12 size ramp (ties in count share the same size)', () => {
    // tagA:5 tagB:4 tagC:4 tagD:3 tagE:2 tagF:1 tagG:1
    const published = publishedSorted([
      essay({ slug: 'e1', tags: ['tagA', 'tagB', 'tagC', 'tagD', 'tagE'] }),
      essay({ slug: 'e2', tags: ['tagA', 'tagB', 'tagC', 'tagD', 'tagE'] }),
      essay({ slug: 'e3', tags: ['tagA', 'tagB', 'tagC', 'tagD'] }),
      essay({ slug: 'e4', tags: ['tagA', 'tagB', 'tagC'] }),
      essay({ slug: 'e5', tags: ['tagA', 'tagF'] }),
      essay({ slug: 'e6', tags: ['tagG'] }),
    ]);
    const tags = tagsByFrequency(published);
    expect(tags.map((t) => t.label)).toEqual([
      'tagA',
      'tagB',
      'tagC',
      'tagD',
      'tagE',
      'tagF',
      'tagG',
    ]);
    expect(tags.map((t) => t.count)).toEqual([5, 4, 4, 3, 2, 1, 1]);
    expect(tags.map((t) => t.size)).toEqual([33, 28, 28, 23, 17, 12, 12]);
    // rank 5 (tagE) -> fire, rank 7 (tagG) -> sage, everything else -> text.
    expect(tags.map((t) => t.tone)).toEqual([
      'text',
      'text',
      'text',
      'text',
      'fire',
      'text',
      'sage',
    ]);
  });

  it('gives the single tag size 33 when there is only one tag total', () => {
    const published = publishedSorted([essay({ slug: 'e1', tags: ['onlyTag'] })]);
    const tags = tagsByFrequency(published);
    expect(tags).toHaveLength(1);
    expect(tags[0].size).toBe(33);
    expect(tags[0].tone).toBe('text');
  });

  it('breaks ties by label ascending', () => {
    const published = publishedSorted([
      essay({ slug: 'e1', tags: ['tagZ', 'tagA'] }),
      essay({ slug: 'e2', tags: ['tagZ', 'tagA'] }),
    ]);
    const tags = tagsByFrequency(published);
    expect(tags.map((t) => t.label)).toEqual(['tagA', 'tagZ']);
    expect(tags.map((t) => t.count)).toEqual([2, 2]);
    expect(tags.map((t) => t.size)).toEqual([33, 33]);
  });

  it('cycles tone deterministically by rank: fire at 5/10, sage at 7, muted at 11', () => {
    // tag01 has the highest count (11), tag11 the lowest (1) -> rank == numeric suffix.
    const published = publishedSorted(
      Array.from({ length: 11 }, (_, i) => {
        const essayIndex = i + 1;
        const tags = Array.from(
          { length: 12 - essayIndex },
          (_, k) => `tag${String(k + 1).padStart(2, '0')}`,
        );
        return essay({ slug: `e${essayIndex}`, tags });
      }),
    );
    const tags = tagsByFrequency(published);
    expect(tags.map((t) => t.label)).toEqual([
      'tag01',
      'tag02',
      'tag03',
      'tag04',
      'tag05',
      'tag06',
      'tag07',
      'tag08',
      'tag09',
      'tag10',
      'tag11',
    ]);
    expect(tags.map((t) => t.tone)).toEqual([
      'text',
      'text',
      'text',
      'text',
      'fire',
      'text',
      'sage',
      'text',
      'text',
      'fire', // rank 10 is also a multiple of 5
      'muted',
    ]);
    expect(tags.map((t) => t.size)).toEqual([33, 31, 29, 27, 25, 23, 20, 18, 16, 14, 12]);
  });
});
