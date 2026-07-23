import { describe, it, expect } from 'vitest';
import {
  normalizeSlug,
  CATEGORY_SLUGS,
  collectTags,
  resolveTopic,
  topicSlugs,
} from '../../src/lib/topics';
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

describe('normalizeSlug', () => {
  it('lowercases, hyphenates runs, trims edges', () => {
    expect(normalizeSlug('Year in Review!')).toBe('year-in-review');
    expect(normalizeSlug('  Islam  ')).toBe('islam');
    expect(normalizeSlug('C++ & Rust')).toBe('c-rust');
  });
});

describe('CATEGORY_SLUGS', () => {
  it('is the three category slugs', () => {
    expect(CATEGORY_SLUGS).toEqual(['discipline', 'faith', 'reflections']);
  });
});

describe('collectTags', () => {
  const published = publishedSorted([
    essay({ slug: 'a', tags: ['habits', 'Discipline'] }), // 'Discipline' tag collides with category slug
    essay({ slug: 'b', tags: ['habits', 'islam'] }), // 'habits' duplicate
  ]);
  it('dedupes by slug and drops category-colliding tags', () => {
    const tags = collectTags(published);
    expect(tags.map((t) => t.slug)).toEqual(['habits', 'islam']);
  });
  it('counts occurrences', () => {
    const tags = collectTags(published);
    expect(tags.find((t) => t.slug === 'habits')?.count).toBe(2);
  });
});

describe('resolveTopic', () => {
  const published = publishedSorted([
    essay({ slug: 'rep', category: 'Discipline', tags: ['habits'] }),
    essay({ slug: 'fast', category: 'Faith', tags: ['islam', 'patience'] }),
  ]);
  it('resolves a category slug (case: Discipline)', () => {
    const r = resolveTopic('discipline', published);
    expect(r?.type).toBe('category');
    expect(r?.label).toBe('Discipline');
    expect(r?.essays.map((e) => e.slug)).toEqual(['rep']);
  });
  it('resolves an empty category to zero essays, not null', () => {
    const r = resolveTopic('reflections', published);
    expect(r?.type).toBe('category');
    expect(r?.essays).toEqual([]);
  });
  it('resolves a tag slug', () => {
    const r = resolveTopic('islam', published);
    expect(r?.type).toBe('tag');
    expect(r?.label).toBe('islam');
    expect(r?.essays.map((e) => e.slug)).toEqual(['fast']);
  });
  it('returns null for an unknown topic', () => {
    expect(resolveTopic('nope', published)).toBeNull();
  });
});

describe('topicSlugs', () => {
  it('always includes all category slugs plus tag slugs', () => {
    const published = publishedSorted([
      essay({ slug: 'rep', category: 'Discipline', tags: ['habits'] }),
    ]);
    expect(topicSlugs(published).sort()).toEqual(
      ['discipline', 'faith', 'habits', 'reflections'].sort(),
    );
  });
});
