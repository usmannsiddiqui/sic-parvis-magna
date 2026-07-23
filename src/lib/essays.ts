export interface EssayListItem {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  category: string;
  tags: string[];
  featured: boolean;
  draft: boolean;
  readingTimeLabel: string;
}

/** Non-draft essays, newest first; pubDate ties broken by title asc (stable builds). */
export function publishedSorted(essays: EssayListItem[]): EssayListItem[] {
  return essays
    .filter((e) => !e.draft)
    .sort((a, b) => {
      const d = b.pubDate.getTime() - a.pubDate.getTime();
      return d !== 0 ? d : a.title.localeCompare(b.title);
    });
}

/** First featured essay, else the newest. Assumes input is already publishedSorted. */
export function selectFeatured(published: EssayListItem[]): EssayListItem | undefined {
  return published.find((e) => e.featured) ?? published[0];
}

/** Newest essays excluding `excludeSlug`, capped at `count`. */
export function latestEssays(
  published: EssayListItem[],
  excludeSlug: string | undefined,
  count: number,
): EssayListItem[] {
  return published.filter((e) => e.slug !== excludeSlug).slice(0, count);
}

/** Split `items` into pages of `size` (last may be short). */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error(`chunk size must be positive, got ${size}`);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}
