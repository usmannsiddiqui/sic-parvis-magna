import type { CollectionEntry } from 'astro:content';
import { readingTimeLabel } from './reading-time';
import type { EssayListItem } from './essays';

/** Map a content-collection essay entry to the plain shape the lib helpers consume. */
export function toListItem(entry: CollectionEntry<'writing'>): EssayListItem {
  const { data } = entry;
  return {
    slug: entry.id,
    title: data.title,
    description: data.description,
    pubDate: data.pubDate,
    category: data.category,
    tags: data.tags,
    featured: data.featured,
    draft: data.draft,
    readingTimeLabel: readingTimeLabel(entry.body ?? ''),
  };
}
