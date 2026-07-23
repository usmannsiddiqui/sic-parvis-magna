import { describe, it, expect } from 'vitest';
import { buildToc } from '../../src/lib/toc';

const h = (depth: number, slug: string, text: string) => ({ depth, slug, text });

describe('buildToc', () => {
  it('returns an empty array for no headings', () => {
    expect(buildToc([])).toEqual([]);
  });

  it('promotes h2 to top level and ignores the h1 title', () => {
    const toc = buildToc([h(1, 'title', 'Title'), h(2, 'one', 'One'), h(2, 'two', 'Two')]);
    expect(toc.map((e) => e.slug)).toEqual(['one', 'two']);
    expect(toc.every((e) => e.children.length === 0)).toBe(true);
  });

  it('nests h3 under the preceding h2', () => {
    const toc = buildToc([h(2, 'a', 'A'), h(3, 'a1', 'A1'), h(3, 'a2', 'A2'), h(2, 'b', 'B')]);
    expect(toc).toHaveLength(2);
    expect(toc[0].children.map((c) => c.slug)).toEqual(['a1', 'a2']);
    expect(toc[1].children).toEqual([]);
  });

  it('drops an h3 that appears before any h2, and ignores h4+', () => {
    const toc = buildToc([h(3, 'orphan', 'Orphan'), h(2, 'a', 'A'), h(4, 'deep', 'Deep')]);
    expect(toc).toHaveLength(1);
    expect(toc[0].slug).toBe('a');
    expect(toc[0].children).toEqual([]);
  });
});
