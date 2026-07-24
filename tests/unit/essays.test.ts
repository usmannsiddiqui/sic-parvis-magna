import { describe, it, expect } from 'vitest';
import {
  publishedSorted,
  selectFeatured,
  latestEssays,
  chunk,
  type EssayListItem,
} from '../../src/lib/essays';

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

describe('publishedSorted', () => {
  it('drops drafts and sorts newest first', () => {
    const out = publishedSorted([
      essay({ slug: 'old', pubDate: new Date('2026-01-01') }),
      essay({ slug: 'draft', pubDate: new Date('2026-05-01'), draft: true }),
      essay({ slug: 'new', pubDate: new Date('2026-03-01') }),
    ]);
    expect(out.map((e) => e.slug)).toEqual(['new', 'old']);
  });

  it('breaks pubDate ties by title asc', () => {
    const out = publishedSorted([
      essay({ slug: 'b', title: 'Beta', pubDate: new Date('2026-01-01') }),
      essay({ slug: 'a', title: 'Alpha', pubDate: new Date('2026-01-01') }),
    ]);
    expect(out.map((e) => e.slug)).toEqual(['a', 'b']);
  });
});

describe('selectFeatured', () => {
  it('prefers a featured essay over the newest', () => {
    const published = publishedSorted([
      essay({ slug: 'newest', pubDate: new Date('2026-06-01') }),
      essay({ slug: 'flagged', pubDate: new Date('2026-02-01'), featured: true }),
    ]);
    expect(selectFeatured(published)?.slug).toBe('flagged');
  });

  it('falls back to the newest when none are featured', () => {
    const published = publishedSorted([
      essay({ slug: 'newest', pubDate: new Date('2026-06-01') }),
      essay({ slug: 'older', pubDate: new Date('2026-02-01') }),
    ]);
    expect(selectFeatured(published)?.slug).toBe('newest');
  });

  it('returns undefined for an empty list', () => {
    expect(selectFeatured([])).toBeUndefined();
  });
});

describe('latestEssays', () => {
  it('excludes the featured slug and caps at count', () => {
    const published = publishedSorted([
      essay({ slug: 'a', pubDate: new Date('2026-06-01') }),
      essay({ slug: 'b', pubDate: new Date('2026-05-01') }),
      essay({ slug: 'c', pubDate: new Date('2026-04-01') }),
    ]);
    expect(latestEssays(published, 'a', 2).map((e) => e.slug)).toEqual(['b', 'c']);
  });
});

describe('chunk', () => {
  it('paginates into fixed-size pages, last page short', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const pages = chunk(items, 10);
    expect(pages.map((p) => p.length)).toEqual([10, 10, 5]);
  });
  it('throws on non-positive size', () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
