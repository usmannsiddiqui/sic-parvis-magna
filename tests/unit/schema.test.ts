import { describe, it, expect } from 'vitest';
import { z } from 'astro/zod';
import { essaySchema } from '../../src/content/schema';

// image() and reference() are Astro-only; stub them as string validators for unit tests.
const schema = essaySchema({ image: () => z.string(), reference: () => z.string() });

const valid = {
  title: 'A Title',
  description: 'A description.',
  pubDate: '2026-01-01',
  category: 'Discipline',
  author: 'muhammad',
};

describe('essaySchema', () => {
  it('accepts a minimal valid essay and applies defaults', () => {
    const parsed = schema.parse(valid);
    expect(parsed.pubDate).toBeInstanceOf(Date);
    expect(parsed.tags).toEqual([]);
    expect(parsed.featured).toBe(false);
    expect(parsed.draft).toBe(false);
  });

  it('rejects a missing title', () => {
    const { title: _title, ...rest } = valid;
    expect(schema.safeParse(rest).success).toBe(false);
  });

  it('rejects an unknown category (Notes deferred)', () => {
    expect(schema.safeParse({ ...valid, category: 'Notes' }).success).toBe(false);
  });

  it('rejects a non-date pubDate', () => {
    expect(schema.safeParse({ ...valid, pubDate: 'not-a-date' }).success).toBe(false);
  });

  it('accepts optional fields when present', () => {
    const parsed = schema.parse({
      ...valid,
      updatedDate: '2026-02-01',
      series: 'On Habits',
      tags: ['focus'],
      featured: true,
      draft: true,
    });
    expect(parsed.updatedDate).toBeInstanceOf(Date);
    expect(parsed.series).toBe('On Habits');
    expect(parsed.tags).toEqual(['focus']);
    expect(parsed.featured).toBe(true);
    expect(parsed.draft).toBe(true);
  });
});
