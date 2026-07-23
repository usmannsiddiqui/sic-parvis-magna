---
created: '2026-07-23'
project: sic-parvis-magna
type: plan
status: active
tags:
  - project/sic-parvis-magna
  - plan
  - phase-3b
---
> [!info] Source of truth
> This vault file is the **canonical** Phase 3b plan. The repo copy at
> `docs/superpowers/plans/2026-07-23-phase-3b-core-routes.md` is a one-way
> synced mirror (prettier-ignored). Edit here, then re-sync the repo copy.

# Phase 3b — Core Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining public routes — home (framing + featured + latest), `/writing` (index + pagination), `/topics` + `/topics/[topic]`, `/about` (+ colophon), and `/404` — reusing the `SiteNav`, `ArticleLayout`, and design tokens shipped in Phase 3a.

**Architecture:** All content-listing decisions live in pure, unit-tested helpers under `src/lib/` (taking plain-typed inputs, exactly like the existing `buildToc`/`readingTime`). Astro pages call `getCollection('writing')`, map each entry to a plain `EssayListItem`, and hand that to the helpers — so featured-selection, pagination, and topic-resolution are fully testable despite only two non-draft seed essays existing. A single `EssayCard` component is the permanent coverless listing unit (Phase 4 later adds a cover variant *on top of it* — this task does **not** build image/scrim/featured-layout abstractions).

**Tech Stack:** Astro 5 (static), Content Collections + Zod, MDX, Tailwind v4, built-in Shiki, Vitest (unit), Playwright + axe (a11y). pnpm only.

## Global Constraints

- **Package manager: pnpm only. Node `^24.16.0`.** Never npm/yarn.
- **Never commit to `main`.** One kebab-case branch → PR → merge commit. No `Co-Authored-By` / "Generated with Claude Code" lines.
- **Tokens only — never hard-code hex in components.** Use the CSS vars in `src/styles/tokens.css`: `--bg --surface --text --muted --faint --border --fire --sage --ph1 --ph2`.
- **Palette:** light default is **stark white `#ffffff`, never cream**; dark is `#12161c`.
- **Type:** serif body/headings = Literata (`var(--font-serif)`); sans nav/meta/tags = Instrument Sans (`var(--font-sans)`, **not Inter**); Arabic = Amiri (`var(--font-arabic)`).
- **Terminology:** always "essay" (never post/article); the section is "Writing". Category enum is exactly **Discipline · Faith · Reflections** (`CATEGORIES` in `src/content/schema.ts`) — never add Notes.
- **`draft: true` essays are excluded from every listing, count, and generated path.**
- **Motion:** exactly one signature move — the home-only featured-hero scroll gesture (already in `HomeHero.astro`, validated in Phase 1). Every other page is calm (load-only). Fully static under `prefers-reduced-motion`.
- **Accessibility:** WCAG AA. Semantic landmarks, one `<h1>` per page, real focus states, axe-clean in **both** themes.
- **Copy rule:** the executor ships **factual, unmistakably-temporary** About/colophon text (who the author is, why the site exists, factual colophon). It does **not** write imitation "on-voice" prose. Final owner-written copy is required before this phase merges (tracked in §Handoff, not a blocker for building the routes).

---

## File Structure

**Create:**
- `src/lib/essays.ts` — `EssayListItem` type + `publishedSorted`, `selectFeatured`, `latestEssays`, `chunk`.
- `src/lib/topics.ts` — `normalizeSlug`, `CATEGORY_SLUGS`, `TagInfo`, `collectTags`, `resolveTopic`, `topicSlugs`.
- `src/lib/format.ts` — `formatDate` (shared long-date formatter).
- `src/lib/to-list-item.ts` — `toListItem(entry)` maps a `CollectionEntry<'writing'>` → `EssayListItem` (the one place `entry.body`→reading-time + Date coercion happens).
- `src/components/EssayCard.astro` — coverless listing card (category · title · description · date · reading time).
- `src/components/EssayList.astro` — semantic `<ul>` wrapper rendering `EssayCard`s.
- `src/components/SiteFooter.astro` — footer with About / colophon-anchor / license line.
- `src/pages/writing/index.astro` — `/writing` page 1.
- `src/pages/writing/page/[page].astro` — `/writing/page/2…N`.
- `src/pages/topics/index.astro` — categories + tags index.
- `src/pages/topics/[topic].astro` — one category or tag.
- `src/pages/about.astro` — about + `#colophon` section.
- `src/pages/404.astro` — not-found.
- `tests/unit/essays.test.ts`, `tests/unit/topics.test.ts`, `tests/unit/format.test.ts` — unit tests.
- `tests/a11y/routes.spec.ts` — axe + single-h1 for the new pages, both themes.

**Modify:**
- `src/components/SiteNav.astro` — add Writing / Topics / About links.
- `src/pages/index.astro` — real featured + latest, replacing hardcoded `HomeHero` props.
- `src/layouts/BaseLayout.astro` — render a `footer` slot (so pages can pass `SiteFooter`).

**Do NOT touch** (Phase 3a, merged): `ArticleLayout.astro`, `TableOfContents.astro`, `ArabicQuote.astro`, `Ar.astro`, `PullQuote.astro`, `src/pages/writing/[...slug].astro`, `src/lib/toc.ts`, `src/lib/reading-time.ts`.

**Deferral noted:** `ArticleLayout.astro` inlines its own `Intl.DateTimeFormat`. We add the shared `formatDate` for new code but do **not** refactor the merged 3a file — a later cleanup can adopt it (YAGNI now).

---

## Task 1: Essay-listing helpers (`src/lib/essays.ts`)

**Files:**
- Create: `src/lib/essays.ts`
- Test: `tests/unit/essays.test.ts`

**Interfaces:**
- Produces:
  - `interface EssayListItem { slug: string; title: string; description: string; pubDate: Date; category: string; tags: string[]; featured: boolean; draft: boolean; readingTimeLabel: string }`
  - `publishedSorted(essays: EssayListItem[]): EssayListItem[]` — drops `draft`, sorts `pubDate` desc, ties broken by `title` asc (deterministic builds).
  - `selectFeatured(published: EssayListItem[]): EssayListItem | undefined` — first `featured===true`, else first (newest), else `undefined`. **Assumes input already `publishedSorted`.**
  - `latestEssays(published: EssayListItem[], excludeSlug: string | undefined, count: number): EssayListItem[]` — filters out `excludeSlug`, returns first `count`.
  - `chunk<T>(items: T[], size: number): T[][]` — splits into pages of `size` (last page may be short; `size<=0` throws).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/essays.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- essays`
Expected: FAIL — `Cannot find module '../../src/lib/essays'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/essays.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- essays`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/essays.ts tests/unit/essays.test.ts
git commit -m "feat: essay-listing helpers (published/featured/latest/chunk)"
```

---

## Task 2: Shared date formatter (`src/lib/format.ts`)

**Files:**
- Create: `src/lib/format.ts`
- Test: `tests/unit/format.test.ts`

**Interfaces:**
- Produces: `formatDate(d: Date): string` — long US date, e.g. `January 14, 2026`. UTC-based so builds are timezone-stable.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '../../src/lib/format';

describe('formatDate', () => {
  it('formats a date as long US month day, year', () => {
    expect(formatDate(new Date('2026-01-14T00:00:00Z'))).toBe('January 14, 2026');
  });
  it('is timezone-stable at day boundaries (UTC)', () => {
    expect(formatDate(new Date('2026-02-18T00:00:00Z'))).toBe('February 18, 2026');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- format`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/format.ts
const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Long US date, e.g. "January 14, 2026". UTC-based for stable static builds. */
export function formatDate(d: Date): string {
  return DATE_FMT.format(d);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts tests/unit/format.test.ts
git commit -m "feat: shared UTC-stable formatDate helper"
```

---

## Task 3: Topics helpers (`src/lib/topics.ts`)

**Files:**
- Create: `src/lib/topics.ts`
- Test: `tests/unit/topics.test.ts`

**Interfaces:**
- Consumes: `EssayListItem` (Task 1); `CATEGORIES` from `src/content/schema.ts`.
- Produces:
  - `normalizeSlug(input: string): string` — lowercase; any run of non-`[a-z0-9]` → single `-`; trim leading/trailing `-`.
  - `CATEGORY_SLUGS: string[]` — `CATEGORIES.map(normalizeSlug)` → `['discipline','faith','reflections']`.
  - `interface TagInfo { label: string; slug: string; count: number }`
  - `collectTags(published: EssayListItem[]): TagInfo[]` — dedupe tags by slug, **drop any tag whose slug collides with a category slug** (folded into the category), keep first-seen label, sort by label asc.
  - `type TopicResolution = { type: 'category'; label: string; essays: EssayListItem[] } | { type: 'tag'; label: string; essays: EssayListItem[] }`
  - `resolveTopic(slug: string, published: EssayListItem[]): TopicResolution | null` — resolves categories **before** tags; `null` → caller 404s.
  - `topicSlugs(published: EssayListItem[]): string[]` — every category slug (always, even if empty) + every tag slug, for `getStaticPaths`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/topics.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeSlug, CATEGORY_SLUGS, collectTags, resolveTopic, topicSlugs } from '../../src/lib/topics';
import { publishedSorted, type EssayListItem } from '../../src/lib/essays';

function essay(over: Partial<EssayListItem>): EssayListItem {
  return {
    slug: 't', title: 'T', description: 'd', pubDate: new Date('2026-01-01'),
    category: 'Discipline', tags: [], featured: false, draft: false,
    readingTimeLabel: '1 min read', ...over,
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
    essay({ slug: 'b', tags: ['habits', 'islam'] }),      // 'habits' duplicate
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
    const published = publishedSorted([essay({ slug: 'rep', category: 'Discipline', tags: ['habits'] })]);
    expect(topicSlugs(published).sort()).toEqual(['discipline', 'faith', 'habits', 'reflections'].sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- topics`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/topics.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- topics`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/topics.ts tests/unit/topics.test.ts
git commit -m "feat: topics helpers (slug normalize, tag collection, topic resolution)"
```

---

## Task 4: Entry → list-item mapper (`src/lib/to-list-item.ts`)

**Files:**
- Create: `src/lib/to-list-item.ts`

**Interfaces:**
- Consumes: `CollectionEntry<'writing'>` (astro:content); `readingTimeLabel` (`src/lib/reading-time.ts`); `EssayListItem` (Task 1).
- Produces: `toListItem(entry: CollectionEntry<'writing'>): EssayListItem` — the single place where `entry.body`→reading-time and frontmatter→`EssayListItem` mapping happens. Pages use this to feed the helpers.

*(No unit test: this is thin glue over `astro:content` types that only resolve inside Astro's build; its correctness is covered by `pnpm build` + the a11y specs in Task 12. TDD applies to the pure helpers it feeds.)*

- [ ] **Step 1: Write the implementation**

```ts
// src/lib/to-list-item.ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (the file only compiles inside Astro's project graph, which `astro check` provides).

- [ ] **Step 3: Commit**

```bash
git add src/lib/to-list-item.ts
git commit -m "feat: toListItem mapper (entry -> EssayListItem)"
```

---

## Task 5: `EssayCard` + `EssayList` components

**Files:**
- Create: `src/components/EssayCard.astro`, `src/components/EssayList.astro`

**Interfaces:**
- Consumes: `EssayListItem` (Task 1); `formatDate` (Task 2); `normalizeSlug` (Task 3).
- Produces:
  - `EssayCard` props: `{ essay: EssayListItem }` — renders category badge (links to `/topics/<category-slug>`), title (links to `/writing/<slug>`), description, and a `date · reading time` meta line.
  - `EssayList` props: `{ essays: EssayListItem[]; empty?: string }` — a semantic `<ul>` of `EssayCard`s, or the `empty` message when the list is empty.

This card is the **permanent coverless listing unit** — Phase 4 adds a cover variant on top of it. Do **not** add image, scrim, or featured-layout props here.

- [ ] **Step 1: Write `EssayCard.astro`**

```astro
---
import type { EssayListItem } from '../lib/essays';
import { formatDate } from '../lib/format';
import { normalizeSlug } from '../lib/topics';

interface Props {
  essay: EssayListItem;
}
const { essay } = Astro.props;
---

<article class="card">
  <a class="card__category" href={`/topics/${normalizeSlug(essay.category)}`}>{essay.category}</a>
  <h2 class="card__title">
    <a href={`/writing/${essay.slug}`}>{essay.title}</a>
  </h2>
  <p class="card__desc">{essay.description}</p>
  <p class="card__meta">
    <time datetime={essay.pubDate.toISOString()}>{formatDate(essay.pubDate)}</time>
    <span aria-hidden="true"> · </span>{essay.readingTimeLabel}
  </p>
</article>

<style>
  .card {
    padding: 26px 0;
    border-bottom: 1px solid var(--border);
  }
  .card__category {
    font-family: var(--font-sans);
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--sage);
  }
  .card__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(22px, 3vw, 30px);
    line-height: 1.2;
    margin: 8px 0 10px;
    text-wrap: balance;
  }
  .card__title a {
    color: var(--text);
  }
  .card__title a:hover {
    color: var(--fire);
  }
  .card__desc {
    font-family: var(--font-serif);
    font-size: 18px;
    line-height: 1.6;
    color: var(--muted);
    margin: 0 0 12px;
  }
  .card__meta {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--muted);
    margin: 0;
  }
</style>
```

- [ ] **Step 2: Write `EssayList.astro`**

```astro
---
import type { EssayListItem } from '../lib/essays';
import EssayCard from './EssayCard.astro';

interface Props {
  essays: EssayListItem[];
  empty?: string;
}
const { essays, empty = 'No essays here yet.' } = Astro.props;
---

{
  essays.length === 0 ? (
    <p class="empty">{empty}</p>
  ) : (
    <ul class="list" role="list">
      {essays.map((essay) => (
        <li>
          <EssayCard essay={essay} />
        </li>
      ))}
    </ul>
  )
}

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .empty {
    font-family: var(--font-sans);
    color: var(--muted);
    padding: 26px 0;
  }
</style>
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed. (Components aren't rendered by a page yet; this confirms they compile.)

- [ ] **Step 4: Commit**

```bash
git add src/components/EssayCard.astro src/components/EssayList.astro
git commit -m "feat: EssayCard + EssayList listing components (coverless)"
```

---

## Task 6: `SiteNav` links + `SiteFooter` + `BaseLayout` footer slot

**Files:**
- Modify: `src/components/SiteNav.astro`, `src/layouts/BaseLayout.astro`
- Create: `src/components/SiteFooter.astro`

**Interfaces:**
- Produces: `SiteFooter` (no props) — renders in `BaseLayout`'s new `footer` slot; links Writing / Topics / About / `#colophon`, plus the license line.
- `BaseLayout` gains a `<slot name="footer" />` after `<main>`.

- [ ] **Step 1: Update `SiteNav.astro` links**

Replace the `.site-nav__links` block (lines 7–10) so all three sections are present:

```astro
  <div class="site-nav__links">
    <a href="/writing" class="site-nav__link">Writing</a>
    <a href="/topics" class="site-nav__link">Topics</a>
    <a href="/about" class="site-nav__link">About</a>
    <ThemeToggle />
  </div>
```

- [ ] **Step 2: Create `SiteFooter.astro`**

```astro
---
const year = 2026; // static build; bump manually or wire to build date in Phase 8
---

<footer class="site-footer" aria-label="Site footer">
  <nav class="site-footer__nav" aria-label="Footer">
    <a href="/writing">Writing</a>
    <a href="/topics">Topics</a>
    <a href="/about">About</a>
    <a href="/about#colophon">Colophon</a>
  </nav>
  <p class="site-footer__legal">
    © {year} Muhammad Usman Siddiqui. Code under MIT; essays under CC BY-NC-ND 4.0.
  </p>
</footer>

<style>
  .site-footer {
    max-width: 1200px;
    margin: 80px auto 0;
    padding: 28px 32px 48px;
    border-top: 1px solid var(--border);
    font-family: var(--font-sans);
    font-size: 14px;
  }
  .site-footer__nav {
    display: flex;
    flex-wrap: wrap;
    gap: 22px;
    margin-bottom: 12px;
  }
  .site-footer__nav a {
    color: var(--text);
  }
  .site-footer__nav a:hover {
    color: var(--fire);
  }
  .site-footer__legal {
    color: var(--muted);
    margin: 0;
  }
  @media (max-width: 640px) {
    .site-footer {
      padding: 24px 20px 40px;
    }
  }
</style>
```

- [ ] **Step 3: Add the footer slot to `BaseLayout.astro`**

`BaseLayout.astro` currently renders a `header` slot, then `<main id="main">` with the default slot. Add a `footer` slot immediately **after** the closing `</main>` tag:

```astro
    </main>
    <slot name="footer" />
```

(Keep the existing `header` slot and `<main>` exactly as they are — only add the one `footer` slot line after `</main>`.)

- [ ] **Step 4: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: success. Nav now shows Writing / Topics / About on the existing home + essay pages; footer slot is unused until pages opt in.

- [ ] **Step 5: Commit**

```bash
git add src/components/SiteNav.astro src/components/SiteFooter.astro src/layouts/BaseLayout.astro
git commit -m "feat: nav Topics/About links, SiteFooter, BaseLayout footer slot"
```

---

## Task 7: Home page — real featured + latest

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCollection` (astro:content); `toListItem` (Task 4); `publishedSorted`/`selectFeatured`/`latestEssays` (Task 1); `formatDate` (Task 2); `HomeHero` (existing), `SiteNav`, `SiteFooter`, `EssayList`.

Featured feeds `HomeHero` (keeps the one signature motion). Latest = newest non-draft excluding the featured, cap 6, via `EssayList`.

- [ ] **Step 1: Rewrite `index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import HomeHero from '../components/HomeHero.astro';
import SiteNav from '../components/SiteNav.astro';
import SiteFooter from '../components/SiteFooter.astro';
import EssayList from '../components/EssayList.astro';
import { toListItem } from '../lib/to-list-item';
import { publishedSorted, selectFeatured, latestEssays } from '../lib/essays';
import { formatDate } from '../lib/format';

const LATEST_COUNT = 6;
const published = publishedSorted((await getCollection('writing')).map(toListItem));
const featured = selectFeatured(published);
const latest = latestEssays(published, featured?.slug, LATEST_COUNT);
---

<BaseLayout title="Sic Parvis Magna">
  <SiteNav slot="header" />

  <section class="intro">
    <p class="intro__lede">
      A commonplace book made public. Field notes on discipline, faith, and self-accountability.
    </p>
  </section>

  {
    featured && (
      <HomeHero
        title={featured.title}
        meta={`${formatDate(featured.pubDate)} · ${featured.readingTimeLabel} · ${featured.category}`}
        href={`/writing/${featured.slug}`}
      />
    )
  }

  <section class="latest">
    <h2 class="latest__heading">Latest</h2>
    <EssayList essays={latest} empty="Essays are on the way." />
  </section>

  <SiteFooter slot="footer" />
</BaseLayout>

<style>
  .intro {
    max-width: 820px;
    margin: 34px auto 0;
    padding: 0 32px;
  }
  .intro__lede {
    font-family: var(--font-serif);
    font-size: 20px;
    line-height: 1.72;
    color: var(--muted);
  }
  .latest {
    max-width: 820px;
    margin: 64px auto 0;
    padding: 0 32px;
  }
  .latest__heading {
    font-family: var(--font-sans);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 8px;
  }
  @media (max-width: 640px) {
    .intro,
    .latest {
      padding: 0 20px;
    }
    .intro {
      margin-top: 24px;
    }
    .intro__lede {
      font-size: 18px;
    }
  }
</style>
```

- [ ] **Step 2: Build + eyeball the data wiring**

Run: `pnpm build`
Expected: success. Then `pnpm dev` and open `/` — featured hero shows "The First Rep" (the only `featured` seed); "Latest" lists "What the Fast Teaches" (the draft "A Quiet Inventory" must **not** appear).

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: home wires real featured + latest essays"
```

---

## Task 8: `/writing` index + pagination

**Files:**
- Create: `src/pages/writing/index.astro`, `src/pages/writing/page/[page].astro`

**Interfaces:**
- Consumes: `getCollection`; `toListItem`; `publishedSorted`, `chunk` (Task 1); `EssayList`, `SiteNav`, `SiteFooter`.
- Page 1 lives at `/writing`; pages 2..N at `/writing/page/2`… (two-segment path can't collide with the single-segment `/writing/[...slug]` essay route). `PAGE_SIZE = 10`.

A shared render is duplicated across the two files intentionally (Astro pages can't share a layout component that owns `getStaticPaths`); both delegate list rendering to `EssayList`, so the duplication is a thin header + pager, not logic.

- [ ] **Step 1: Create `src/pages/writing/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SiteNav from '../../components/SiteNav.astro';
import SiteFooter from '../../components/SiteFooter.astro';
import EssayList from '../../components/EssayList.astro';
import { toListItem } from '../../lib/to-list-item';
import { publishedSorted, chunk } from '../../lib/essays';

const PAGE_SIZE = 10;
const published = publishedSorted((await getCollection('writing')).map(toListItem));
const pages = chunk(published, PAGE_SIZE);
const items = pages[0] ?? [];
const hasNext = pages.length > 1;
---

<BaseLayout title="Writing — Sic Parvis Magna">
  <SiteNav slot="header" />

  <section class="index">
    <h1 class="index__title">Writing</h1>
    <EssayList essays={items} empty="Essays are on the way." />
    {
      hasNext && (
        <nav class="pager" aria-label="Pagination">
          <a class="pager__next" href="/writing/page/2">Older essays →</a>
        </nav>
      )
    }
  </section>

  <SiteFooter slot="footer" />
</BaseLayout>

<style>
  .index {
    max-width: 820px;
    margin: 48px auto 0;
    padding: 0 32px;
  }
  .index__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(30px, 4vw, 44px);
    color: var(--text);
    margin: 0 0 12px;
  }
  .pager {
    display: flex;
    justify-content: space-between;
    margin-top: 32px;
    font-family: var(--font-sans);
    font-size: 15px;
  }
  .pager__next {
    margin-left: auto;
  }
  @media (max-width: 640px) {
    .index {
      padding: 0 20px;
    }
  }
</style>
```

- [ ] **Step 2: Create `src/pages/writing/page/[page].astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../../layouts/BaseLayout.astro';
import SiteNav from '../../../components/SiteNav.astro';
import SiteFooter from '../../../components/SiteFooter.astro';
import EssayList from '../../../components/EssayList.astro';
import { toListItem } from '../../../lib/to-list-item';
import { publishedSorted, chunk } from '../../../lib/essays';

const PAGE_SIZE = 10;

export async function getStaticPaths() {
  const published = publishedSorted((await getCollection('writing')).map(toListItem));
  const pages = chunk(published, PAGE_SIZE);
  // Page 1 lives at /writing; generate 2..N here.
  return pages.slice(1).map((items, i) => ({
    params: { page: String(i + 2) },
    props: { items, pageNum: i + 2, lastPage: pages.length },
  }));
}

const { items, pageNum, lastPage } = Astro.props;
const prevHref = pageNum === 2 ? '/writing' : `/writing/page/${pageNum - 1}`;
const hasNext = pageNum < lastPage;
---

<BaseLayout title={`Writing (page ${pageNum}) — Sic Parvis Magna`}>
  <SiteNav slot="header" />

  <section class="index">
    <h1 class="index__title">Writing</h1>
    <p class="index__page">Page {pageNum} of {lastPage}</p>
    <EssayList essays={items} />
    <nav class="pager" aria-label="Pagination">
      <a class="pager__prev" href={prevHref}>← Newer essays</a>
      {hasNext && <a class="pager__next" href={`/writing/page/${pageNum + 1}`}>Older essays →</a>}
    </nav>
  </section>

  <SiteFooter slot="footer" />
</BaseLayout>

<style>
  .index {
    max-width: 820px;
    margin: 48px auto 0;
    padding: 0 32px;
  }
  .index__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(30px, 4vw, 44px);
    color: var(--text);
    margin: 0 0 4px;
  }
  .index__page {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--muted);
    margin: 0 0 12px;
  }
  .pager {
    display: flex;
    justify-content: space-between;
    margin-top: 32px;
    font-family: var(--font-sans);
    font-size: 15px;
  }
  .pager__next {
    margin-left: auto;
  }
  @media (max-width: 640px) {
    .index {
      padding: 0 20px;
    }
  }
</style>
```

- [ ] **Step 3: Verify pagination logic against a stubbed list**

The pagination *helpers* are already unit-tested (Task 1 `chunk`). Confirm the routes build with the 2 real seeds (only `/writing` generated, no `/writing/page/*`):

Run: `pnpm build`
Expected: success; `dist/writing/index.html` exists; no `dist/writing/page/` directory (2 essays < PAGE_SIZE). Open `/writing` in `pnpm dev` — both non-draft essays listed, no pager (nothing older).

- [ ] **Step 4: Commit**

```bash
git add src/pages/writing/index.astro src/pages/writing/page/
git commit -m "feat: /writing index + /writing/page/[page] pagination"
```

---

## Task 9: `/topics` index

**Files:**
- Create: `src/pages/topics/index.astro`

**Interfaces:**
- Consumes: `getCollection`; `toListItem`; `publishedSorted` (Task 1); `CATEGORIES` (schema); `normalizeSlug`, `collectTags` (Task 3); `SiteNav`, `SiteFooter`.

Categories shown first (all three, always), then deduped tags.

- [ ] **Step 1: Create `src/pages/topics/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SiteNav from '../../components/SiteNav.astro';
import SiteFooter from '../../components/SiteFooter.astro';
import { CATEGORIES } from '../../content/schema';
import { toListItem } from '../../lib/to-list-item';
import { publishedSorted } from '../../lib/essays';
import { normalizeSlug, collectTags } from '../../lib/topics';

const published = publishedSorted((await getCollection('writing')).map(toListItem));
const tags = collectTags(published);
---

<BaseLayout title="Topics — Sic Parvis Magna">
  <SiteNav slot="header" />

  <section class="topics">
    <h1 class="topics__title">Topics</h1>

    <h2 class="topics__heading">Shelves</h2>
    <ul class="shelves" role="list">
      {
        CATEGORIES.map((category) => (
          <li>
            <a class="shelf" href={`/topics/${normalizeSlug(category)}`}>{category}</a>
          </li>
        ))
      }
    </ul>

    {
      tags.length > 0 && (
        <>
          <h2 class="topics__heading">Tags</h2>
          <ul class="tags" role="list">
            {tags.map((tag) => (
              <li>
                <a class="tag" href={`/topics/${tag.slug}`}>
                  {tag.label} <span class="tag__count">{tag.count}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )
    }
  </section>

  <SiteFooter slot="footer" />
</BaseLayout>

<style>
  .topics {
    max-width: 820px;
    margin: 48px auto 0;
    padding: 0 32px;
  }
  .topics__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(30px, 4vw, 44px);
    color: var(--text);
    margin: 0 0 24px;
  }
  .topics__heading {
    font-family: var(--font-sans);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin: 32px 0 12px;
  }
  .shelves,
  .tags {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .shelf {
    font-family: var(--font-serif);
    font-size: 20px;
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 8px 16px;
  }
  .shelf:hover {
    color: var(--fire);
    border-color: var(--fire);
  }
  .tag {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--sage);
  }
  .tag__count {
    color: var(--muted);
  }
  @media (max-width: 640px) {
    .topics {
      padding: 0 20px;
    }
  }
</style>
```

- [ ] **Step 2: Build + eyeball**

Run: `pnpm build`
Expected: success. `pnpm dev` → `/topics` shows Discipline/Faith/Reflections shelves and tags `discipline`-collision-free (`habits`, `islam`, `patience`, `restraint`); no `reflection`/`year-in-review` (draft-only).

- [ ] **Step 3: Commit**

```bash
git add src/pages/topics/index.astro
git commit -m "feat: /topics index (shelves + tags)"
```

---

## Task 10: `/topics/[topic]` — one category or tag

**Files:**
- Create: `src/pages/topics/[topic].astro`

**Interfaces:**
- Consumes: `getCollection`; `toListItem`; `publishedSorted` (Task 1); `topicSlugs`, `resolveTopic` (Task 3); `EssayList`, `SiteNav`, `SiteFooter`.
- `getStaticPaths` emits every category slug (always) + every tag slug. Unknown slug is never generated → Astro serves `/404` for it.

- [ ] **Step 1: Create `src/pages/topics/[topic].astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SiteNav from '../../components/SiteNav.astro';
import SiteFooter from '../../components/SiteFooter.astro';
import EssayList from '../../components/EssayList.astro';
import { toListItem } from '../../lib/to-list-item';
import { publishedSorted } from '../../lib/essays';
import { topicSlugs, resolveTopic } from '../../lib/topics';

export async function getStaticPaths() {
  const published = publishedSorted((await getCollection('writing')).map(toListItem));
  return topicSlugs(published).map((topic) => ({ params: { topic } }));
}

const { topic } = Astro.params;
const published = publishedSorted((await getCollection('writing')).map(toListItem));
const resolved = resolveTopic(topic!, published);
if (!resolved) return Astro.redirect('/404');

const kind = resolved.type === 'category' ? 'Shelf' : 'Tag';
---

<BaseLayout title={`${resolved.label} — Topics — Sic Parvis Magna`}>
  <SiteNav slot="header" />

  <section class="topic">
    <p class="topic__kind">{kind}</p>
    <h1 class="topic__title">{resolved.label}</h1>
    <EssayList essays={resolved.essays} empty={`No essays under ${resolved.label} yet.`} />
    <p class="topic__back"><a href="/topics">← All topics</a></p>
  </section>

  <SiteFooter slot="footer" />
</BaseLayout>

<style>
  .topic {
    max-width: 820px;
    margin: 48px auto 0;
    padding: 0 32px;
  }
  .topic__kind {
    font-family: var(--font-sans);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 6px;
  }
  .topic__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(30px, 4vw, 44px);
    color: var(--text);
    margin: 0 0 16px;
  }
  .topic__back {
    margin-top: 28px;
    font-family: var(--font-sans);
    font-size: 15px;
  }
  @media (max-width: 640px) {
    .topic {
      padding: 0 20px;
    }
  }
</style>
```

- [ ] **Step 2: Build + eyeball category/tag/empty cases**

Run: `pnpm build`
Expected: success; `dist/topics/discipline/index.html`, `dist/topics/faith/index.html`, `dist/topics/reflections/index.html` (empty state — only draft essay), plus `dist/topics/habits/`, `dist/topics/islam/`, `dist/topics/patience/`, `dist/topics/restraint/`. `pnpm dev` → `/topics/reflections` shows the empty message; `/topics/islam` lists "What the Fast Teaches"; `/topics/nope` serves the 404.

- [ ] **Step 3: Commit**

```bash
git add src/pages/topics/\[topic\].astro
git commit -m "feat: /topics/[topic] category + tag pages"
```

---

## Task 11: `/about` (+ colophon) and `/404`

**Files:**
- Create: `src/pages/about.astro`, `src/pages/404.astro`

**Interfaces:**
- Consumes: `SiteNav`, `SiteFooter`, `BaseLayout`.

About/colophon copy is **factual and explicitly temporary** (per the Global Constraints copy rule). Final owner-written copy replaces it before merge.

- [ ] **Step 1: Create `src/pages/about.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SiteNav from '../components/SiteNav.astro';
import SiteFooter from '../components/SiteFooter.astro';
---

<BaseLayout title="About — Sic Parvis Magna">
  <SiteNav slot="header" />

  <article class="about">
    <h1 class="about__title">About</h1>

    <!-- PLACEHOLDER COPY — factual, temporary. Replace with owner-written prose before merge. -->
    <div class="about__prose prose">
      <p>
        Sic Parvis Magna is a solo-authored essay site by Muhammad Usman Siddiqui. It collects
        long-form writing on discipline, faith, self-accountability, and reflection.
      </p>
      <p>
        The site is static and text-first: essays are written in MDX and published by committing to
        a public git repository. There is no comment system, tracking, or newsletter.
      </p>

      <h2 id="colophon">Colophon</h2>
      <p>
        Built with Astro. Type is set in Literata (body and headings), Instrument Sans (interface
        text), and Amiri (Arabic quotations). Cover art, where present, is original pixel art,
        AI-assisted; each cover carries its own credit.
      </p>
      <p>
        The site code is licensed under the MIT License. The essays are licensed under Creative
        Commons Attribution-NonCommercial-NoDerivatives 4.0 (CC BY-NC-ND 4.0).
      </p>
    </div>
  </article>

  <SiteFooter slot="footer" />
</BaseLayout>

<style>
  .about {
    max-width: 680px;
    margin: 56px auto 0;
    padding: 0 28px;
  }
  .about__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(32px, 4.8vw, 52px);
    color: var(--text);
    margin: 0 0 24px;
  }
</style>
```

- [ ] **Step 2: Create `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SiteNav from '../components/SiteNav.astro';
import SiteFooter from '../components/SiteFooter.astro';
---

<BaseLayout title="Not found — Sic Parvis Magna">
  <SiteNav slot="header" />

  <section class="notfound">
    <p class="notfound__code">404</p>
    <h1 class="notfound__title">This page wandered off.</h1>
    <p class="notfound__body">
      The page you asked for isn't here. Try the <a href="/writing">writing index</a> or the
      <a href="/">home page</a>.
    </p>
  </section>

  <SiteFooter slot="footer" />
</BaseLayout>

<style>
  .notfound {
    max-width: 680px;
    margin: 80px auto 0;
    padding: 0 28px;
    text-align: center;
  }
  .notfound__code {
    font-family: var(--font-sans);
    font-size: 14px;
    letter-spacing: 3px;
    color: var(--fire);
    margin: 0 0 8px;
  }
  .notfound__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(28px, 4vw, 40px);
    color: var(--text);
    margin: 0 0 14px;
  }
  .notfound__body {
    font-family: var(--font-serif);
    font-size: 18px;
    line-height: 1.6;
    color: var(--muted);
  }
</style>
```

- [ ] **Step 3: Build + eyeball**

Run: `pnpm build`
Expected: success; `dist/about/index.html` and `dist/404.html` exist. `pnpm dev` → `/about` shows the colophon under `#colophon`; footer "Colophon" link jumps to it; visiting a bad URL renders the 404.

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.astro src/pages/404.astro
git commit -m "feat: /about (+ colophon) and /404 (placeholder about copy)"
```

---

## Task 12: a11y coverage for the new routes

**Files:**
- Create: `tests/a11y/routes.spec.ts`

**Interfaces:**
- Consumes: the routes from Tasks 7–11 (dev server via existing `playwright.config.ts`).

Mirrors the Phase 3a `essay.spec.ts` pattern: axe-clean in both themes + exactly one `<h1>` per page.

- [ ] **Step 1: Write the spec**

```ts
// tests/a11y/routes.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/writing', '/topics', '/topics/discipline', '/topics/islam', '/about'];

for (const route of ROUTES) {
  test(`${route} — one h1, axe clean in both themes`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);

    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations, `${route} @ ${theme}`).toEqual([]);
    }
  });
}

test('404 page has one h1 and links home', async ({ page }) => {
  const res = await page.goto('/404');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /home page/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the a11y suite**

Run: `pnpm test:a11y`
Expected: PASS. If axe flags contrast on `--muted`/`--sage`/`--fire` against `--surface`/`--bg` in either theme, adjust the token usage in the offending component (do not hard-code hex) until clean — this is the same class of fix Phase 3a applied (`--faint`→`--muted`).

- [ ] **Step 3: Commit**

```bash
git add tests/a11y/routes.spec.ts
git commit -m "test: a11y coverage for home, writing, topics, about, 404"
```

---

## Task 13: Full gate + format

**Files:** none (verification + formatting only).

- [ ] **Step 1: Run the complete quality gate (the CI bar)**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm lint && pnpm format:check && pnpm test:a11y`
Expected: every command exits 0. (A gate counts only if the tool actually executes — see the Phase 1 silent-red lesson.)

- [ ] **Step 2: If `format:check` fails, format and re-run the gate**

Run: `pnpm format && pnpm format:check`
Expected: clean.

- [ ] **Step 3: Commit any formatting**

```bash
git add -A
git commit -m "chore: prettier formatting; full gate green"
```

---

## Self-Review (planner ran this before dispatch)

**Spec coverage** (Phase 3b scope from `build-order.md` §Phase 3 + handoff §7):
- Home framing + featured + latest → Task 7. ✅
- `/writing` index + pagination → Task 8. ✅
- `/topics` → Task 9; `/topics/[topic]` (category **and** tag, collisions folded, unknown→404) → Tasks 3 + 10. ✅
- `/about` + colophon (`#colophon` anchor) → Task 11. ✅
- `/404` → Task 11. ✅
- Reuse `SiteNav`/`ArticleLayout` patterns; nav gains Topics/About → Task 6. ✅
- Coverless listing unit that Phase 4 upgrades in place → Task 5. ✅
- a11y per page, both themes → Task 12. ✅
- draft exclusion everywhere → enforced in `publishedSorted` (Task 1), used by every page. ✅

**Placeholder scan:** About/colophon copy is intentionally temporary and flagged inline + in Global Constraints + Handoff; every code step contains complete code. No `TODO`/"handle edge cases"/"similar to Task N". ✅

**Type consistency:** `EssayListItem` shape identical across Tasks 1/3/4/5/7/8/10; `normalizeSlug`/`collectTags`/`resolveTopic`/`topicSlugs` signatures match between Task 3 definition and Tasks 9/10 usage; `chunk` (Task 1) reused in Task 8. ✅

## Execution Handoff (devsesh)

This plan is dispatched to the **executor** worktree via `send-to-executor`, not executed by the planner. The executor uses **superpowers:executing-plans** (batch with checkpoints) on a fresh `phase-3b-core-routes` branch. Cold-start handoff (branch setup + orientation reads + guardrails + plan pointer) is sent separately by the planner. Owner-written About/colophon copy is required before the phase PR merges.
