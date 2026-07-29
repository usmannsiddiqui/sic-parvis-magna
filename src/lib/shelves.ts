import { CATEGORIES } from '../content/schema';
import { collectTags, normalizeSlug } from './topics';
import type { EssayListItem } from './essays';

/** Minimum number of items (real spines + coming-soon placeholders) a shelf shows. */
const MIN_SHELF_ITEMS = 3;
/** Most recent essays rendered as real spines per shelf. */
const MAX_SPINES = 4;

export interface ShelfSpine {
  title: string;
  href: string;
}

export interface Shelf {
  label: string;
  slug: string;
  count: number;
  spines: ShelfSpine[];
  /** How many placeholder ("coming soon") spines to render alongside the real ones. */
  comingSoon: number;
  /** Deterministic filler-book widths (px), derived from `slug` — no randomness. */
  fillers: number[];
  /** Published essays in this category beyond what's shown as spines. */
  moreCount: number;
}

/**
 * Deterministic small-integer hash of a string (sum of char codes). Used only
 * to derive filler geometry — not a cryptographic or collision-resistant hash.
 */
function hashString(input: string): number {
  let total = 0;
  for (let i = 0; i < input.length; i += 1) total += input.charCodeAt(i);
  return total;
}

/**
 * Deterministic filler-book widths (px) for a shelf, derived from its slug.
 * 0-3 fillers, each 13-16px. Same slug always yields the same array (no
 * `Math.random()`/`Date.now()`), so the build is reproducible/snapshot-stable.
 */
function fillersFor(slug: string): number[] {
  const hash = hashString(slug);
  const count = hash % 4; // 0-3 fillers
  return Array.from({ length: count }, (_, i) => 13 + ((hash + i * 7) % 4)); // 13-16px
}

/**
 * One shelf per `CATEGORIES` member, always, in `CATEGORIES` order — a shelf
 * with zero essays still renders (as all coming-soon placeholders).
 */
export function buildShelves(published: EssayListItem[]): Shelf[] {
  return CATEGORIES.map((label) => {
    const slug = normalizeSlug(label);
    const essaysInCategory = published.filter((e) => e.category === label);
    const count = essaysInCategory.length;
    const spines = essaysInCategory.slice(0, MAX_SPINES).map((e) => ({
      title: e.title,
      href: `/writing/${e.slug}`,
    }));
    const comingSoon = Math.max(0, MIN_SHELF_ITEMS - spines.length);
    const moreCount = Math.max(0, count - spines.length);
    return { label, slug, count, spines, comingSoon, fillers: fillersFor(slug), moreCount };
  });
}

export type TagTone = 'text' | 'fire' | 'sage' | 'muted';

export interface TagFrequencyInfo {
  label: string;
  slug: string;
  count: number;
  /** Display size in px, ramped 33 (most frequent) -> 12 (least frequent). */
  size: number;
  tone: TagTone;
}

/** Deterministic accent cycling by 1-indexed frequency rank: mostly `text`. */
function toneForRank(rank: number): TagTone {
  if (rank % 5 === 0) return 'fire';
  if (rank % 7 === 0) return 'sage';
  if (rank % 11 === 0) return 'muted';
  return 'text';
}

/**
 * Tags from `collectTags`, re-sorted by frequency (count desc, then label asc
 * to break ties), with a display `size` (33px -> 12px ramp by rank) and a
 * periodic accent `tone`.
 */
export function tagsByFrequency(published: EssayListItem[]): TagFrequencyInfo[] {
  const tags = collectTags(published)
    .slice()
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.label.localeCompare(b.label)));
  const n = tags.length;
  return tags.map((tag, i) => ({
    ...tag,
    size: n <= 1 ? 33 : Math.round(33 - (i / (n - 1)) * (33 - 12)),
    tone: toneForRank(i + 1),
  }));
}
