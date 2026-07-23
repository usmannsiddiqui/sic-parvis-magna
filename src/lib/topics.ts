import { CATEGORIES } from '../content/schema';
import type { EssayListItem } from './essays';

/** URL-safe slug: lowercase, non-alphanumeric runs → single hyphen, trimmed. */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const CATEGORY_SLUGS: string[] = CATEGORIES.map(normalizeSlug);

export interface TagInfo {
  label: string;
  slug: string;
  count: number;
}

/** Deduped tags from published essays, category-colliding tags dropped, sorted by label. */
export function collectTags(published: EssayListItem[]): TagInfo[] {
  const bySlug = new Map<string, TagInfo>();
  for (const essay of published) {
    for (const raw of essay.tags) {
      const slug = normalizeSlug(raw);
      if (!slug || CATEGORY_SLUGS.includes(slug)) continue; // fold collisions into the category
      const existing = bySlug.get(slug);
      if (existing) existing.count += 1;
      else bySlug.set(slug, { label: raw, slug, count: 1 });
    }
  }
  return [...bySlug.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export type TopicResolution =
  | { type: 'category'; label: string; essays: EssayListItem[] }
  | { type: 'tag'; label: string; essays: EssayListItem[] };

/** Resolve a topic slug to its essays. Categories win over tags; null → 404. */
export function resolveTopic(slug: string, published: EssayListItem[]): TopicResolution | null {
  const catIdx = CATEGORY_SLUGS.indexOf(slug);
  if (catIdx >= 0) {
    const label = CATEGORIES[catIdx];
    return { type: 'category', label, essays: published.filter((e) => e.category === label) };
  }
  const tag = collectTags(published).find((t) => t.slug === slug);
  if (tag) {
    return {
      type: 'tag',
      label: tag.label,
      essays: published.filter((e) => e.tags.some((t) => normalizeSlug(t) === slug)),
    };
  }
  return null;
}

/** All buildable topic slugs (categories always present, plus every tag). */
export function topicSlugs(published: EssayListItem[]): string[] {
  return [...CATEGORY_SLUGS, ...collectTags(published).map((t) => t.slug)];
}
