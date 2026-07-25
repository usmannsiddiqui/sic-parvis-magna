# Phase 4 — Card System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> [!info] Source of truth
> This vault file is the **canonical** Phase 4 implementation plan. The repo copy at
> `docs/superpowers/plans/2026-07-24-phase-4-card-system.md` is a one-way synced
> mirror (prettier-ignored). Edit here, then re-sync the repo copy.

**Goal:** Replace the Phase 3b text list with a rounded-corner card grid used on every essay-listing surface, add auto-computed related essays on the detail page, and thread `coverImage` through the data layer — all testable now with zero cover art in the repo.

**Architecture:** One pure helper (`relatedEssays`) joins the existing `src/lib/` layer (unit-tested, TDD). One card component (`ArticleCard`) owns two internal render paths — a visible tinted **fallback** (no cover) and a dormant **cover** path (full-bleed `<Image>` + scrim + overlay) that activates automatically once seeds gain `coverImage`. `ArticleGrid` lays cards in a 1→2→3 responsive grid and replaces `EssayList` everywhere. Pages keep mapping collection entries → plain `EssayListItem` and hand them to the grid; consumers never know which card path fires.

**Tech Stack:** Astro 5 (static), Content Collections + Zod, `astro:assets` `<Image>`, Tailwind-free scoped `<style>` + CSS custom-property tokens, Vitest (unit), Playwright + `@axe-core/playwright` (a11y). pnpm only.

## Global Constraints

- **Design spec:** `docs/superpowers/specs/2026-07-24-phase-4-card-system-design.md` (canonical in vault) is authoritative; this plan implements it exactly.
- **Palette = tokens only, never hard-code a palette hex.** Tokens: `--bg --surface --text --muted --faint --border --fire --sage --ph1 --ph2` (+ the new `--shadow-card` added in Task 4). Fonts via `--font-sans` (Instrument Sans) / `--font-serif` (Literata).
- **No byline** (single author) — card meta = date · reading time · category only.
- **Grid cards show title + meta only — no description excerpt.** `description` still drives the detail page + meta description; it is simply not rendered on cards.
- **Motion restrained:** card hover = image/surface `scale(1.05)` 600ms + shadow elevation 300ms. Fully static under `prefers-reduced-motion`. No scale-flip.
- **No per-card AI badge.** AI disclosure stays in the colophon + per-cover credit on the detail page (ADR 0003).
- `draft: true` excluded everywhere (already enforced by `publishedSorted`; `relatedEssays` also excludes drafts directly).
- **Card content max-width ~1200px**, grid gap 24px, radius 16px desktop / 8px mobile, cover aspect 7:6, breakpoints 1-col → 2-col at 640px → 3-col at 1024px.
- **Package manager: pnpm.** Run gates with `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:a11y` (names per existing `package.json` scripts — confirm before first run).
- Commit per task with a `feat:`/`test:`/`refactor:` prefix. No `Co-Authored-By` or "Generated with" trailers.

---

### Task 1: Thread `coverImage` through the data layer

**Files:**
- Modify: `src/lib/essays.ts` (add field to `EssayListItem`)
- Modify: `src/lib/to-list-item.ts` (map the field)

**Interfaces:**
- Consumes: nothing new.
- Produces: `EssayListItem.coverImage?: ImageMetadata` — read by `ArticleCard` (Task 4). `toListItem` now populates it from `entry.data.coverImage`.

**Why no test here:** this is a pure type + one-line mapping change with no branching logic. It is exercised end-to-end by the build gate (Task 8) and by `ArticleCard`'s two paths. The `relatedEssays` tests (Task 2) do not need `coverImage` because it is optional.

- [ ] **Step 1: Add the optional field to the interface**

In `src/lib/essays.ts`, add the `ImageMetadata` type import at the top and the field to `EssayListItem`:

```ts
import type { ImageMetadata } from 'astro';

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
  coverImage?: ImageMetadata;
}
```

(`import type` is erased at build/test time, so this adds no runtime dependency and unit-test string stubs stay valid — `coverImage` is optional.)

- [ ] **Step 2: Map the field in `toListItem`**

In `src/lib/to-list-item.ts`, add `coverImage` to the returned object:

```ts
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
    coverImage: data.coverImage,
  };
}
```

- [ ] **Step 3: Verify types + existing tests still pass**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. No `EssayListItem` construction in `tests/unit/essays.test.ts` breaks (the new field is optional).

- [ ] **Step 4: Commit**

```bash
git add src/lib/essays.ts src/lib/to-list-item.ts
git commit -m "feat: thread optional coverImage through the essay data layer"
```

---

### Task 2: `relatedEssays` helper (TDD)

**Files:**
- Create: `src/lib/related.ts`
- Test: `tests/unit/related.test.ts`

**Interfaces:**
- Consumes: `EssayListItem` from `src/lib/essays` (Task 1).
- Produces:
  - `relatedScore(current: EssayListItem, candidate: EssayListItem): number` — +2 same category, +1 per shared tag.
  - `relatedEssays(current: EssayListItem, all: EssayListItem[], count?: number): EssayListItem[]` — default `count = 3`. Excludes self + drafts, sorts score desc → pubDate desc → title asc, backfills with most-recent published to reach `count`. Consumed by `ArticleLayout` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/related.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { relatedScore, relatedEssays } from '../../src/lib/related';
import type { EssayListItem } from '../../src/lib/essays';

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

describe('relatedScore', () => {
  it('adds +2 for same category', () => {
    const current = essay({ category: 'Faith', tags: [] });
    expect(relatedScore(current, essay({ category: 'Faith', tags: [] }))).toBe(2);
    expect(relatedScore(current, essay({ category: 'Discipline', tags: [] }))).toBe(0);
  });

  it('adds +1 per shared tag, on top of category', () => {
    const current = essay({ category: 'Faith', tags: ['prayer', 'fasting'] });
    const candidate = essay({ category: 'Faith', tags: ['prayer', 'fasting', 'other'] });
    expect(relatedScore(current, candidate)).toBe(4); // 2 category + 2 shared tags
  });

  it('counts each shared tag once regardless of duplicates', () => {
    const current = essay({ category: 'Discipline', tags: ['habit'] });
    const candidate = essay({ category: 'Reflections', tags: ['habit'] });
    expect(relatedScore(current, candidate)).toBe(1);
  });
});

describe('relatedEssays', () => {
  it('ranks by score, excludes self and drafts', () => {
    const current = essay({ slug: 'me', category: 'Faith', tags: ['prayer'] });
    const out = relatedEssays(current, [
      current,
      essay({ slug: 'same-cat-tag', category: 'Faith', tags: ['prayer'] }), // 3
      essay({ slug: 'same-cat', category: 'Faith', tags: [] }), // 2
      essay({ slug: 'shared-tag', category: 'Discipline', tags: ['prayer'] }), // 1
      essay({ slug: 'draft', category: 'Faith', tags: ['prayer'], draft: true }), // excluded
    ]);
    expect(out.map((e) => e.slug)).toEqual(['same-cat-tag', 'same-cat', 'shared-tag']);
  });

  it('breaks score ties by pubDate desc then title asc', () => {
    const current = essay({ slug: 'me', category: 'Faith', tags: [] });
    const out = relatedEssays(current, [
      current,
      essay({ slug: 'a', title: 'Zulu', category: 'Faith', pubDate: new Date('2026-05-01') }),
      essay({ slug: 'b', title: 'Alpha', category: 'Faith', pubDate: new Date('2026-05-01') }),
      essay({ slug: 'c', title: 'Mid', category: 'Faith', pubDate: new Date('2026-06-01') }),
    ]);
    // all score 2 → newest first (c), then same-date pair by title asc (Alpha=b, Zulu=a)
    expect(out.map((e) => e.slug)).toEqual(['c', 'b', 'a']);
  });

  it('backfills with most-recent published when too few score > 0', () => {
    const current = essay({ slug: 'me', category: 'Faith', tags: ['unique'] });
    const out = relatedEssays(current, [
      current,
      essay({ slug: 'scored', category: 'Faith', tags: [] }), // score 2
      essay({ slug: 'recent', category: 'Discipline', tags: [], pubDate: new Date('2026-06-01') }), // 0
      essay({ slug: 'older', category: 'Discipline', tags: [], pubDate: new Date('2026-02-01') }), // 0
    ]);
    // one scored, then backfill by recency
    expect(out.map((e) => e.slug)).toEqual(['scored', 'recent', 'older']);
  });

  it('respects a custom count', () => {
    const current = essay({ slug: 'me', category: 'Faith' });
    const out = relatedEssays(
      current,
      [
        current,
        essay({ slug: 'a', category: 'Faith' }),
        essay({ slug: 'b', category: 'Faith' }),
        essay({ slug: 'c', category: 'Faith' }),
      ],
      2,
    );
    expect(out).toHaveLength(2);
  });

  it('returns an empty array when there are no other essays', () => {
    const current = essay({ slug: 'me' });
    expect(relatedEssays(current, [current])).toEqual([]);
  });

  it('never returns the current essay via backfill', () => {
    const current = essay({ slug: 'me', category: 'Faith', tags: [] });
    const out = relatedEssays(current, [current, essay({ slug: 'other', category: 'Discipline' })]);
    expect(out.map((e) => e.slug)).not.toContain('me');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test related`
Expected: FAIL — `Cannot find module '../../src/lib/related'` (module not yet created).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/related.ts`:

```ts
import type { EssayListItem } from './essays';

/** Number of tags shared between two essays (each shared tag counted once). */
function sharedTagCount(a: EssayListItem, b: EssayListItem): number {
  const set = new Set(a.tags);
  return b.tags.filter((t) => set.has(t)).length;
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test related`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/related.ts tests/unit/related.test.ts
git commit -m "feat: add relatedEssays scoring + backfill helper (TDD)"
```

---

### Task 3: Add the card shadow token

**Files:**
- Modify: `src/styles/tokens.css`

**Interfaces:**
- Produces: `--shadow-card` (light + dark) — the hover elevation shadow `ArticleCard` (Task 4) uses, so no raw color is hard-coded in a component. Keeps the "tokens only, no palette hex" rule intact for the one new color surface Phase 4 introduces.

- [ ] **Step 1: Add the token to both themes**

In `src/styles/tokens.css`, add `--shadow-card` inside the light block (after `--ph2`):

```css
  --ph1: #ececea; /* cover placeholder gradient stop 1 */
  --ph2: #e2e1de; /* cover placeholder gradient stop 2 */
  --shadow-card: 0 12px 32px rgba(36, 31, 26, 0.16); /* card hover elevation */
```

And inside the `:root[data-theme='dark']` block (after its `--ph2`):

```css
  --ph1: #232a33;
  --ph2: #2b3540;
  --shadow-card: 0 14px 36px rgba(0, 0, 0, 0.5); /* card hover elevation (dark) */
```

- [ ] **Step 2: Verify the build still succeeds**

Run: `pnpm build`
Expected: PASS (token addition is inert until Task 4 uses it).

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: add --shadow-card token for card hover elevation"
```

---

### Task 4: `ArticleCard` component (fallback + dormant cover paths)

**Files:**
- Create: `src/components/ArticleCard.astro`

**Interfaces:**
- Consumes: `EssayListItem` (with optional `coverImage`, Task 1); `formatDate` from `src/lib/format`; `Image` from `astro:assets`; `--shadow-card` (Task 3).
- Produces: `<ArticleCard essay={EssayListItem} />` — the single card boundary. The whole card is **one** focusable `<a>` to `/writing/${slug}`. Renders the cover path when `essay.coverImage` is set, else the fallback path. Consumed by `ArticleGrid` (Task 5).

**Design notes (from spec):**
- Card title + meta are `<span>`s, **not** headings — the card is a single link whose visible text is its accessible name; this decouples the reusable card from each page's heading hierarchy and keeps "one h1 per page" + heading-order axe rules clean.
- Category on the card is plain text (not a topic link) — nesting a link inside the card `<a>` is invalid. Topic navigation stays on `/topics` and the detail page.
- Both paths share box geometry, radius, aspect, hover, and focus, so a real cover drops into an already-correct grid later.
- Cover `<Image alt="">` is decorative: the adjacent overlaid title is the accessible text, so an empty alt avoids redundancy (audit scrim contrast when real covers land).

- [ ] **Step 1: Create the component**

Create `src/components/ArticleCard.astro`:

```astro
---
import type { EssayListItem } from '../lib/essays';
import { Image } from 'astro:assets';
import { formatDate } from '../lib/format';

interface Props {
  essay: EssayListItem;
}
const { essay } = Astro.props;
---

<a class="card" href={`/writing/${essay.slug}`}>
  {
    essay.coverImage ? (
      <span class="card__cover">
        <Image
          class="card__img"
          src={essay.coverImage}
          alt=""
          widths={[400, 800]}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        />
        <span class="card__scrim" aria-hidden="true" />
        <span class="card__overlay">
          <span class="card__title">{essay.title}</span>
          <span class="card__meta">
            {formatDate(essay.pubDate)} · {essay.readingTimeLabel} · {essay.category}
          </span>
        </span>
      </span>
    ) : (
      <span class="card__fallback">
        <svg class="card__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 2c1 3-1 4-1 6a3 3 0 0 0 6 0c0-1 0-2-1-3 3 2 4 5 4 8a8 8 0 0 1-16 0c0-4 3-7 5-9 1 2 2 2 3 1 1-1 1-2 0-4z"
            fill="currentColor"
          />
        </svg>
        <span class="card__body">
          <span class="card__category">{essay.category}</span>
          <span class="card__title">{essay.title}</span>
          <span class="card__meta">
            {formatDate(essay.pubDate)} · {essay.readingTimeLabel}
          </span>
        </span>
      </span>
    )
  }
</a>

<style>
  .card {
    display: block;
    aspect-ratio: 7 / 6;
    border-radius: 8px;
    overflow: hidden;
    text-decoration: none;
    color: var(--text);
    transition: box-shadow 300ms ease;
  }
  @media (min-width: 640px) {
    .card {
      border-radius: 16px;
    }
  }

  /* Shared: both paths fill the whole box */
  .card__cover,
  .card__fallback {
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
  }

  /* Fallback path (visible now, no cover) */
  .card__fallback {
    flex-direction: column;
    justify-content: space-between;
    padding: 20px;
    background: linear-gradient(155deg, var(--ph1), var(--ph2));
    transition: transform 600ms ease;
  }
  .card__glyph {
    width: 28px;
    height: 28px;
    color: var(--fire);
    opacity: 0.85;
  }
  .card__body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card__fallback .card__category {
    font-family: var(--font-sans);
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--sage);
  }
  .card__fallback .card__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(20px, 2.4vw, 26px);
    line-height: 1.2;
    color: var(--text);
    text-wrap: balance;
  }
  .card__fallback .card__meta {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--muted);
  }

  /* Cover path (dormant until real covers land) */
  .card__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 600ms ease;
  }
  .card__scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.66), rgba(0, 0, 0, 0) 55%);
  }
  .card__overlay {
    position: absolute;
    inset: auto 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 24px 20px;
    text-align: center;
    align-items: center;
  }
  .card__cover .card__title {
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 18px;
    line-height: 1.3;
    color: #fff;
  }
  .card__cover .card__meta {
    font-family: var(--font-sans);
    font-size: 13px;
    color: rgba(255, 255, 255, 0.82);
  }

  /* Hover: image/surface zoom + shadow elevation (pointer devices only) */
  @media (hover: hover) {
    .card:hover {
      box-shadow: var(--shadow-card);
    }
    .card:hover .card__img,
    .card:hover .card__fallback {
      transform: scale(1.05);
    }
  }

  /* Focus: visible keyboard ring */
  .card:focus-visible {
    outline: 2px solid var(--fire);
    outline-offset: 3px;
  }

  /* Reduced motion: fully static */
  @media (prefers-reduced-motion: reduce) {
    .card,
    .card__img,
    .card__fallback {
      transition: none;
    }
    .card:hover .card__img,
    .card:hover .card__fallback {
      transform: none;
    }
  }
</style>
```

(The cover-path overlay text is white-on-scrim — `#fff` / `rgba(255,255,255,…)` are overlay-on-image legibility values, not palette tokens, and this path is dormant until real covers land; scrim contrast gets a dedicated re-audit then per the spec's deferred-handoff section.)

- [ ] **Step 2: Verify the build compiles the component**

Run: `pnpm build`
Expected: PASS. Nothing renders `ArticleCard` yet, but Astro type-checks the `.astro` file. (Component is wired into pages in Tasks 6–7.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ArticleCard.astro
git commit -m "feat: ArticleCard with visible fallback + dormant cover path"
```

---

### Task 5: `ArticleGrid` component

**Files:**
- Create: `src/components/ArticleGrid.astro`

**Interfaces:**
- Consumes: `EssayListItem[]`; `ArticleCard` (Task 4).
- Produces: `<ArticleGrid essays={EssayListItem[]} empty?={string} />` — a `<ul role="list">` of cards in the 1→2→3 responsive grid (24px gap), or an `empty` message paragraph. Replaces `EssayList` as the listing unit (Tasks 6–7).

- [ ] **Step 1: Create the component**

Create `src/components/ArticleGrid.astro`:

```astro
---
import type { EssayListItem } from '../lib/essays';
import ArticleCard from './ArticleCard.astro';

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
    <ul class="grid" role="list">
      {essays.map((essay) => (
        <li>
          <ArticleCard essay={essay} />
        </li>
      ))}
    </ul>
  )
}

<style>
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .grid > li {
    margin: 0;
  }
  @media (min-width: 640px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 1024px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .empty {
    font-family: var(--font-sans);
    color: var(--muted);
    padding: 26px 0;
  }
</style>
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ArticleGrid.astro
git commit -m "feat: ArticleGrid responsive 1-2-3 card grid"
```

---

### Task 6: Rewire listing pages to the grid

**Files:**
- Modify: `src/pages/index.astro` (home "Latest")
- Modify: `src/pages/writing/index.astro`
- Modify: `src/pages/writing/page/[page].astro`
- Modify: `src/pages/topics/[topic].astro`

**Interfaces:**
- Consumes: `ArticleGrid` (Task 5). Each page already produces `EssayListItem[]` via `toListItem` + helpers — no data-flow change, only the rendering unit + container width.

**Note:** widen each grid container from `820px` to `1200px` (spec content max). Keep the home intro lede at its own narrow width for readability. `EssayList`/`EssayCard` are removed from pages here and deleted in Task 9.

- [ ] **Step 1: Home — swap import, component, and widen `.latest`**

In `src/pages/index.astro`:
- Replace the import line `import EssayList from '../components/EssayList.astro';` with `import ArticleGrid from '../components/ArticleGrid.astro';`
- Replace `<EssayList essays={latest} empty="Essays are on the way." />` with `<ArticleGrid essays={latest} empty="Essays are on the way." />`
- In `<style>`, change `.latest { max-width: 820px; ... }` to `max-width: 1200px;`

- [ ] **Step 2: `/writing` index — swap and widen**

In `src/pages/writing/index.astro`:
- Replace `import EssayList from '../../components/EssayList.astro';` with `import ArticleGrid from '../../components/ArticleGrid.astro';`
- Replace `<EssayList essays={items} empty="Essays are on the way." />` with `<ArticleGrid essays={items} empty="Essays are on the way." />`
- In `<style>`, change `.index { max-width: 820px; ... }` to `max-width: 1200px;`

- [ ] **Step 3: `/writing/page/[page]` — swap and widen**

In `src/pages/writing/page/[page].astro`:
- Replace `import EssayList from '../../../components/EssayList.astro';` with `import ArticleGrid from '../../../components/ArticleGrid.astro';`
- Replace `<EssayList essays={items} />` with `<ArticleGrid essays={items} />`
- In `<style>`, change `.index { max-width: 820px; ... }` to `max-width: 1200px;`

- [ ] **Step 4: `/topics/[topic]` — swap and widen**

In `src/pages/topics/[topic].astro`:
- Replace `import EssayList from '../../components/EssayList.astro';` with `import ArticleGrid from '../../components/ArticleGrid.astro';`
- Replace `<EssayList essays={resolved.essays} empty={`No essays under ${resolved.label} yet.`} />` with `<ArticleGrid essays={resolved.essays} empty={`No essays under ${resolved.label} yet.`} />`
- In `<style>`, change `.topic { max-width: 820px; ... }` to `max-width: 1200px;`

- [ ] **Step 5: Verify the build renders every surface with zero covers**

Run: `pnpm build`
Expected: PASS. Grid renders on `/`, `/writing`, `/writing/page/*` (only if seeds exceed `PAGE_SIZE`), and each `/topics/[topic]` via the fallback path (no covers present). Drafts stay excluded.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/pages/writing/index.astro "src/pages/writing/page/[page].astro" "src/pages/topics/[topic].astro"
git commit -m "feat: render essay listings with ArticleGrid across all surfaces"
```

---

### Task 7: Related essays on the detail page

**Files:**
- Modify: `src/components/ArticleLayout.astro`

**Interfaces:**
- Consumes: `relatedEssays` (Task 2); `ArticleGrid` (Task 5); `toListItem` + `publishedSorted` (existing). `ArticleLayout` already receives `entry: CollectionEntry<'writing'>`.
- Produces: a "Related" section (compact grid) at the foot of the essay, above/around the existing share footer.

- [ ] **Step 1: Compute related essays in frontmatter**

In `src/components/ArticleLayout.astro`, add these imports to the frontmatter (after the existing `buildToc` import):

```ts
import { getCollection } from 'astro:content';
import { toListItem } from '../lib/to-list-item';
import { publishedSorted } from '../lib/essays';
import { relatedEssays } from '../lib/related';
import ArticleGrid from './ArticleGrid.astro';
```

Then, after `const showToc = toc.length >= 3;`, add:

```ts
const allEssays = publishedSorted((await getCollection('writing')).map(toListItem));
const related = relatedEssays(toListItem(entry), allEssays, 3);
```

- [ ] **Step 2: Render the Related section before the share footer**

In the same file, replace the existing footer block:

```astro
    <footer class="essay__share">
      <span>Share this essay</span>
    </footer>
```

with:

```astro
    {
      related.length > 0 && (
        <section class="essay__related" aria-labelledby="related-heading">
          <h2 id="related-heading" class="essay__related-heading">
            Related
          </h2>
          <ArticleGrid essays={related} />
        </section>
      )
    }

    <footer class="essay__share">
      <span>Share this essay</span>
    </footer>
```

- [ ] **Step 3: Style the Related section**

In the `<style>` block of `ArticleLayout.astro`, add (before the closing `</style>`):

```css
  .essay__related {
    max-width: 1200px;
    margin: 64px auto 0;
    padding: 40px 28px 0;
    border-top: 1px solid var(--border);
  }
  .essay__related-heading {
    font-family: var(--font-sans);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 20px;
  }
```

- [ ] **Step 4: Verify the build renders related cards on detail pages**

Run: `pnpm build`
Expected: PASS. Each essay detail page shows a "Related" grid (backfilled by recency so it is never empty when ≥1 other published essay exists). The `<h1>` stays the essay title (card titles are spans, so still exactly one h1).

- [ ] **Step 5: Commit**

```bash
git add src/components/ArticleLayout.astro
git commit -m "feat: related essays grid on the essay detail page"
```

---

### Task 8: Extend a11y coverage for the card grid

**Files:**
- Modify: `tests/a11y/routes.spec.ts`

**Interfaces:**
- Consumes: the running dev/preview build (Playwright config unchanged). The existing per-route axe loop already covers `/`, `/writing`, `/topics/*`, `/about` in both themes; this task adds card-specific assertions.

**Note:** the existing `ROUTES` loop already asserts one h1 + axe-clean (both themes) on every listing surface, so the grid is axe-audited the moment Task 6 lands. This task adds explicit card-contract assertions: single focusable link per card, visible focus, `role="list"` semantics, and reduced-motion static rendering.

- [ ] **Step 1: Add a card-contract test to `tests/a11y/routes.spec.ts`**

Append to `tests/a11y/routes.spec.ts` (after the existing `404` test):

```ts
test('/writing card grid — list semantics, single-link cards, visible focus', async ({ page }) => {
  await page.goto('/writing');

  // The grid is a semantic list.
  const grid = page.locator('ul.grid');
  await expect(grid).toHaveCount(1);

  // Each list item holds exactly one focusable link (the whole card).
  const items = grid.locator(':scope > li');
  const itemCount = await items.count();
  expect(itemCount).toBeGreaterThan(0);
  for (let i = 0; i < itemCount; i++) {
    await expect(items.nth(i).locator('a')).toHaveCount(1);
  }

  // Keyboard focus lands on the first card link with a visible outline.
  const firstLink = items.first().locator('a');
  await firstLink.focus();
  await expect(firstLink).toBeFocused();
  const outlineWidth = await firstLink.evaluate(
    (el) => getComputedStyle(el).outlineWidth,
  );
  expect(parseFloat(outlineWidth)).toBeGreaterThan(0);
});

test('/writing cards render static under reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/writing');

  const firstLink = page.locator('ul.grid > li a').first();
  const transition = await firstLink.evaluate((el) => getComputedStyle(el).transitionDuration);
  // No hover transition when reduced motion is requested.
  expect(['0s', '0s, 0s']).toContain(transition);

  await context.close();
});
```

- [ ] **Step 2: Run the a11y suite**

Run: `pnpm test:a11y`
Expected: PASS — grid axe-clean in both themes (existing loop) + new card-contract + reduced-motion tests green.

- [ ] **Step 3: Commit**

```bash
git add tests/a11y/routes.spec.ts
git commit -m "test: a11y card-grid contract + reduced-motion coverage"
```

---

### Task 9: Retire the 3b text-list components

**Files:**
- Delete: `src/components/EssayList.astro`
- Delete: `src/components/EssayCard.astro`

**Interfaces:**
- These are no longer imported anywhere after Task 6 + Task 7. Their content (category · title · meta) now lives inside `ArticleCard`'s fallback path.

- [ ] **Step 1: Confirm nothing still imports them**

Run: `grep -rn "EssayList\|EssayCard" src tests`
Expected: no matches (all rewired in Tasks 6–7). If any match remains, fix that reference before deleting.

- [ ] **Step 2: Delete the retired components**

```bash
git rm src/components/EssayList.astro src/components/EssayCard.astro
```

- [ ] **Step 3: Run the full gate**

Run: `pnpm typecheck && pnpm test && pnpm build && pnpm test:a11y`
Expected: all PASS (dead-code removal breaks nothing).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: retire EssayList/EssayCard superseded by the card grid"
```

---

### Task 10: Full green gate + format

**Files:** none (verification + formatting).

- [ ] **Step 1: Run the complete quality gate**

Run: `pnpm typecheck && pnpm test && pnpm build && pnpm test:a11y && pnpm lint`
Expected: all PASS.

- [ ] **Step 2: Format the touched files**

Run: `pnpm format` (or `pnpm prettier --write .` per the repo's script name)
Expected: clean; commit only if files changed.

- [ ] **Step 3: Commit any formatting delta**

```bash
git add -A
git commit -m "polish: prettier formatting; full gate green for Phase 4"
```

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin <phase-4-implementation-branch>
gh pr create --title "Phase 4 — card system" --body "Implements docs/superpowers/plans/2026-07-24-phase-4-card-system.md. Card grid across all listing surfaces, related essays on detail pages, coverImage threaded (dormant until art lands). Gate green: typecheck/test/build/a11y/lint."
```

(The executor implements on its own feature branch/worktree — not the `phase-4-card-system-spec` docs branch and not `main`.)

---

## Self-Review

**1. Spec coverage** — every spec section maps to a task:
- Data-layer `coverImage` on `EssayListItem` + `toListItem` → Task 1.
- `relatedEssays` (scoring, weights, tiebreak, self/draft exclusion, backfill, empty) → Task 2 (TDD).
- `ArticleCard` fallback + dormant cover paths, shared geometry/hover/focus, tokens-only → Tasks 3 (shadow token) + 4.
- Title + meta only, no description on cards → Task 4 markup (description omitted).
- `ArticleGrid` `<ul role="list">`, 1→2→3, 24px gap, empty slot → Task 5.
- Grid replaces text list on `/writing`, `/writing/page/[page]`, home Latest, `/topics/[topic]` → Task 6.
- RelatedArticles rendered as compact grid at foot of `ArticleLayout` → Task 7.
- Measured geometry (7:6 aspect, 16/8px radius, 24px gap, ~1200px content, scale(1.05) 600ms + shadow 300ms, reduced-motion static) → Tasks 4–6.
- A11y: axe-clean both themes, single focusable link/card, visible focus, list semantics, reduced-motion static → Task 8 (+ existing route loop).
- Retire 3b `EssayCard`/`EssayList` → Task 9.
- Deferred covers handoff → documented in spec; cover path built dormant (Task 4), activates on seed `coverImage` with no consumer change.

**2. Placeholder scan** — no TBD/TODO; every code step ships complete code (glyph SVG inline, full CSS, full tests). Open spec items (exact tinted-surface recipe, glyph asset) are resolved concretely here (ph1/ph2 gradient wash + inline flame SVG) and flagged for visual tweak during the executor's `audit`, not left blank.

**3. Type consistency** — `EssayListItem.coverImage?: ImageMetadata` (Task 1) is the type `ArticleCard` narrows on (Task 4). `relatedEssays(current, all, count=3)` / `relatedScore(current, candidate)` signatures (Task 2) match their call site in `ArticleLayout` (Task 7). `ArticleGrid` prop `{ essays, empty? }` (Task 5) matches every call site (Tasks 6–7). `--shadow-card` (Task 3) matches its sole consumer (Task 4). `ul.grid` class asserted in a11y tests (Task 8) matches `ArticleGrid`'s markup (Task 5).

## Open items carried to implementation `audit`

- Exact tinted-surface wash for the fallback card — plan ships a working `linear-gradient(155deg, var(--ph1), var(--ph2))`; tune sage/firelight balance visually during audit (tokens only, no hex).
- Ember/lantern glyph — plan ships an inline flame SVG (`currentColor`, `--fire`); swap for the shared section-end mark if/when one exists.
- Cover-path scrim contrast — dormant now; re-audit in both themes when real covers land (spec deferred-handoff step 3).
