import type { EssayListItem } from './essays';

/** Number of tags shared between two essays (each shared tag counted once). */
function sharedTagCount(a: EssayListItem, b: EssayListItem): number {
  const setA = new Set(a.tags);
  const setB = new Set(b.tags);
  return [...setB].filter((t) => setA.has(t)).length;
}

/** Relatedness score: +2 for the same category, +1 per shared tag. */
export function relatedScore(current: EssayListItem, candidate: EssayListItem): number {
  const category = candidate.category === current.category ? 2 : 0;
  return category + sharedTagCount(current, candidate);
}

/**
 * Essays related to `current`, best first, capped at `count` (default 3).
 * Scores by shared category/tags, excludes the current essay and all drafts,
 * and backfills with the most-recent published essays so the section is never
 * short on a small site.
 */
export function relatedEssays(
  current: EssayListItem,
  all: EssayListItem[],
  count = 3,
): EssayListItem[] {
  const candidates = all.filter((e) => e.slug !== current.slug && !e.draft);

  // Sort by score desc, then pubDate desc, then title asc (stable builds).
  const ranked = [...candidates].sort((a, b) => {
    const s = relatedScore(current, b) - relatedScore(current, a);
    if (s !== 0) return s;
    const d = b.pubDate.getTime() - a.pubDate.getTime();
    return d !== 0 ? d : a.title.localeCompare(b.title);
  });

  const scored = ranked.filter((e) => relatedScore(current, e) > 0);
  const picked = scored.slice(0, count);

  if (picked.length < count) {
    const pickedSlugs = new Set(picked.map((e) => e.slug));
    const backfill = ranked.filter((e) => !pickedSlugs.has(e.slug));
    picked.push(...backfill.slice(0, count - picked.length));
  }

  return picked;
}
