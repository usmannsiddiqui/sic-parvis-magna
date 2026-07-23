import { z } from 'astro:content';
import type { SchemaContext } from 'astro:content';

/** Essay categories (design.md §6). Notes is deferred — do not add it. */
export const CATEGORIES = ['Discipline', 'Faith', 'Reflections'] as const;

/**
 * Essay frontmatter contract (design.md §6). A factory because `image()` and
 * `reference()` only exist inside Astro's build; tests inject string stubs.
 * `coverImage` stays optional (fallback card must always be legal); `author` is
 * a reference; `readingTime` is computed elsewhere — intentionally NOT here.
 */
export function essaySchema({
  image,
  reference,
}: {
  image: SchemaContext['image'];
  reference: (collection: string) => z.ZodTypeAny;
}) {
  return z.object({
    title: z.string(),
    description: z.string(), // authored; doubles as card excerpt + meta description
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string()).default([]),
    coverImage: image().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    series: z.string().optional(),
    author: reference('authors'),
  });
}
