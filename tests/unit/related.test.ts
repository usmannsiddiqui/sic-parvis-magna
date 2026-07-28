import { describe, it, expect } from 'vitest';
import { relatedScore, relatedEssays } from '../../src/lib/related';
import type { EssayListItem } from '../../src/lib/essays';

function essay(over: Partial<EssayListItem> = {}): EssayListItem {
  return {
    slug: over.slug ?? 't',
    title: over.title ?? 'T',
    description: over.description ?? 'd',
    pubDate: over.pubDate ?? new Date('2026-01-01'),
    category: over.category ?? 'Discipline',
    tags: over.tags ?? [],
    featured: over.featured ?? false,
    draft: over.draft ?? false,
    readingTimeLabel: over.readingTimeLabel ?? '1 min read',
  };
}

describe('relatedScore', () => {
  it('adds +2 for same category', () => {
    const current = essay({ category: 'Faith', tags: [] });
    expect(relatedScore(current, essay({ category: 'Faith', tags: [] }))).toBe(2);
    expect(relatedScore(current, essay({ category: 'Discipline', tags: [] }))).toBe(0);
  });

  it('adds +1 per shared tag, on top of category', () => {
    const current = essay({ category: 'Faith', tags: ['prayer', 'fasting'] });
    const candidate = essay({ category: 'Faith', tags: ['prayer', 'fasting', 'other'] });
    expect(relatedScore(current, candidate)).toBe(4); // 2 category + 2 shared tags
  });

  it('counts each shared tag once regardless of duplicates', () => {
    const current = essay({ category: 'Discipline', tags: ['habit'] });
    const candidate = essay({ category: 'Reflections', tags: ['habit'] });
    expect(relatedScore(current, candidate)).toBe(1);
  });

  it('counts a shared tag once even when the candidate has a literal duplicate', () => {
    const current = essay({ category: 'Discipline', tags: ['prayer'] });
    const candidate = essay({ category: 'Reflections', tags: ['prayer', 'prayer'] });
    expect(relatedScore(current, candidate)).toBe(1);
  });
});

describe('relatedEssays', () => {
  it('ranks by score, excludes self and drafts', () => {
    const current = essay({ slug: 'me', category: 'Faith', tags: ['prayer'] });
    const out = relatedEssays(current, [
      current,
      essay({ slug: 'same-cat-tag', category: 'Faith', tags: ['prayer'] }), // 3
      essay({ slug: 'same-cat', category: 'Faith', tags: [] }), // 2
      essay({ slug: 'shared-tag', category: 'Discipline', tags: ['prayer'] }), // 1
      essay({ slug: 'draft', category: 'Faith', tags: ['prayer'], draft: true }), // excluded
    ]);
    expect(out.map((e) => e.slug)).toEqual(['same-cat-tag', 'same-cat', 'shared-tag']);
  });

  it('breaks score ties by pubDate desc then title asc', () => {
    const current = essay({ slug: 'me', category: 'Faith', tags: [] });
    const out = relatedEssays(current, [
      current,
      essay({ slug: 'a', title: 'Zulu', category: 'Faith', pubDate: new Date('2026-05-01') }),
      essay({ slug: 'b', title: 'Alpha', category: 'Faith', pubDate: new Date('2026-05-01') }),
      essay({ slug: 'c', title: 'Mid', category: 'Faith', pubDate: new Date('2026-06-01') }),
    ]);
    // all score 2 → newest first (c), then same-date pair by title asc (Alpha=b, Zulu=a)
    expect(out.map((e) => e.slug)).toEqual(['c', 'b', 'a']);
  });

  it('backfills with most-recent published when too few score > 0', () => {
    const current = essay({ slug: 'me', category: 'Faith', tags: ['unique'] });
    const out = relatedEssays(current, [
      current,
      essay({ slug: 'scored', category: 'Faith', tags: [] }), // score 2
      essay({ slug: 'recent', category: 'Discipline', tags: [], pubDate: new Date('2026-06-01') }), // 0
      essay({ slug: 'older', category: 'Discipline', tags: [], pubDate: new Date('2026-02-01') }), // 0
    ]);
    // one scored, then backfill by recency
    expect(out.map((e) => e.slug)).toEqual(['scored', 'recent', 'older']);
  });

  it('respects a custom count', () => {
    const current = essay({ slug: 'me', category: 'Faith' });
    const out = relatedEssays(
      current,
      [
        current,
        essay({ slug: 'a', category: 'Faith' }),
        essay({ slug: 'b', category: 'Faith' }),
        essay({ slug: 'c', category: 'Faith' }),
      ],
      2,
    );
    expect(out).toHaveLength(2);
  });

  it('returns an empty array when there are no other essays', () => {
    const current = essay({ slug: 'me' });
    expect(relatedEssays(current, [current])).toEqual([]);
  });

  it('never returns the current essay via backfill', () => {
    const current = essay({ slug: 'me', category: 'Faith', tags: [] });
    const out = relatedEssays(current, [current, essay({ slug: 'other', category: 'Discipline' })]);
    expect(out.map((e) => e.slug)).not.toContain('me');
  });
});
