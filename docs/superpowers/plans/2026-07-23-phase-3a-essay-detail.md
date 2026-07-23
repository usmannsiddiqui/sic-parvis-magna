# Phase 3a — Essay Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the temporary raw-render route into a real, accessible essay reading experience — an `ArticleLayout` with meta header, optional cover + AI credit, in-page TOC for long pieces, styled footnotes, and the bespoke MDX components (`ArabicQuote`, inline `Ar`, `PullQuote`) plus dual-theme Shiki code.

**Architecture:** Astro 5 + MDX. `ArticleLayout.astro` wraps `BaseLayout`, renders essay chrome, and slots the MDX `<Content />`. Custom components are imported directly inside `.mdx` files. Prose styling uses `@tailwindcss/typography` (`prose`) re-themed to our design tokens. TOC is built from Astro's `render()` `headings` via a pure, unit-tested util. A shared `SiteNav` is extracted so essay pages and the home page share one nav.

**Tech Stack:** Astro 5 · `@astrojs/mdx` · `@tailwindcss/typography` · built-in Shiki (dual theme) · Vitest · pnpm · Node 24.16.0.

## Global Constraints

_(From build-order Global Constraints + locked decisions — every task implicitly includes these.)_

- **Package manager: pnpm.** Node 24.16.0 (`nvm use`).
- **Terminology:** "essay" never post/article; the section is "Writing". Categories are exactly Discipline · Faith · Reflections.
- **Type:** serif (Literata) body + headings; sans (Instrument Sans) for nav/meta/tags; Arabic = **Amiri**, `dir="rtl"`, `lang="ar"`. Body measure ~65–75ch (≈680px). Line-height ~1.7.
- **Palette:** use tokens only (`--fire` `#96591f`/`#d99a54`, `--sage` `#3c5c48`/`#7ea08a`, `--text`, `--bg`, `--surface`, `--muted`, `--faint`, `--border`). Never hard-code hex in components. Light default is stark white, never cream.
- **Motion:** article pages stay calm — **no hero scroll effect on essays**, load only. Fully static under `prefers-reduced-motion`.
- **Arabic (ADR 0005):** `<ArabicQuote>` block = Amiri + RTL + `lang="ar"` + optional translation line. Inline `<Ar>` = `<bdi>` + `lang="ar"` + Amiri (bidi isolation so it can't reorder surrounding Latin). Do NOT build general bidirectional mixed-paragraph layout.
- **Imagery (ADR 0003):** `coverImage` is OPTIONAL — the no-cover path must render cleanly. When a cover exists, show a quiet per-cover credit "Cover: original pixel art, AI-assisted". No AI badge on anything else.
- **Accessibility:** WCAG AA, semantic landmarks, one `<h1>` per page, real focus states, `dir`/`lang` correct on Arabic.
- **impeccable:** installed per-worktree (git-ignored). Essay detail IS a real UI surface — run `impeccable audit` on it (Task 3a.8). Locked decisions win; do NOT run `palette.mjs` or relitigate stack/type/color/motion. PRODUCT.md/DESIGN.md are the authority.
- **TDD:** the TOC util is red→green (Task 3a.2). Visual components are verified by build + `impeccable audit` + Playwright/axe — not classic unit tests.
- **Git:** branch `phase-3a-essay-detail` → PR → merge; never commit to main; **no `Co-Authored-By`/"Generated with" lines**. `docs/` stays prettier-ignored.

**Current state (main after Phase 2 + CI):**
- `src/pages/writing/[...slug].astro` is a TEMPORARY raw-render route — this phase replaces it.
- `BaseLayout.astro` exposes slots: `header` (inside `<header>`), default (inside `<main id="main">`), `footer`. Props `{ title, description? }`.
- `src/pages/index.astro` has inline nav markup: `<nav slot="header" class="site-nav">` with brand `Sic Parvis Magna` + a `Writing` link. Extract it to `SiteNav` in this phase.
- `global.css` imports tailwind + `@plugin '@tailwindcss/typography'` + tokens, and maps tokens to Tailwind theme (`text-fire`, `font-arabic`, etc. all work). `prose` is available but not yet themed.
- `astro.config.mjs` has no `markdown` block (Astro default Shiki, single theme).
- `render(entry)` from `astro:content` returns `{ Content, headings }`; `entry.body` is the raw markdown string; `entry.data` is the typed frontmatter.
- 3 seed essays exist; `sample-a-quiet-inventory` is `draft: true` (excluded from build).
- `readingTimeLabel(text)` in `src/lib/reading-time.ts`.

---

## File Structure

- **Modify** `astro.config.mjs` — dual-theme Shiki config.
- **Create** `src/lib/toc.ts` + `tests/unit/toc.test.ts` — TOC builder (TDD).
- **Create** `src/components/TableOfContents.astro`.
- **Create** `src/components/SiteNav.astro` — shared nav (+ refactor `index.astro` to use it).
- **Create** `src/components/ArabicQuote.astro`, `src/components/Ar.astro`, `src/components/PullQuote.astro`.
- **Create** `src/components/ArticleLayout.astro`.
- **Modify** `src/styles/global.css` — prose theming, footnote styles, Shiki dual-theme CSS.
- **Modify** `src/pages/writing/[...slug].astro` — use `ArticleLayout` (no longer temporary).
- **Modify** the seed `.mdx` essays — use the new components.
- **Create** `tests/a11y/essay.spec.ts` — essay-page axe + heading order + RTL.

---

### Task 3a.1: Dual-theme Shiki config + code styling

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add the dual-theme markdown config** to `astro.config.mjs` (add a `markdown` block alongside the existing keys)

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://sic-parvis-magna.pages.dev',
  trailingSlash: 'never',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false, // emit raw --shiki-light / --shiki-dark vars; we switch them by [data-theme]
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 2: Add Shiki dual-theme CSS** to the end of `src/styles/global.css`

```css
/* Code blocks: Shiki emits raw light/dark vars (defaultColor:false); switch by theme. */
.astro-code,
.astro-code span {
  color: var(--shiki-light);
  background-color: var(--shiki-light-bg);
}
[data-theme='dark'] .astro-code,
[data-theme='dark'] .astro-code span {
  color: var(--shiki-dark);
  background-color: var(--shiki-dark-bg);
}
.astro-code {
  padding: 16px 18px;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow-x: auto;
  font-size: 15px;
  line-height: 1.55;
}
```

- [ ] **Step 3: Verify the build still succeeds and a seed essay's code block renders in both themes**

Run: `pnpm build && pnpm dev`, open `/writing/sample-the-first-rep`, toggle theme — the JS code block recolors.
Expected: no build errors; code block readable in light and dark. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs src/styles/global.css
git commit -m "feat: dual-theme Shiki code highlighting"
```

---

### Task 3a.2: TOC builder util (TDD)

**Files:**
- Create: `src/lib/toc.ts`
- Test: `tests/unit/toc.test.ts`

**Interfaces:**
- Consumes: Astro `headings` array elements shaped `{ depth: number; slug: string; text: string }`.
- Produces: `buildToc(headings): TocEntry[]` where `TocEntry = { slug: string; text: string; children: TocEntry[] }`. Only `h2` become top-level entries; `h3` nest under the preceding `h2`; `h1` and `h4`+ are ignored. Consumed by `TableOfContents.astro` and `ArticleLayout.astro`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/toc.test.ts
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `../../src/lib/toc`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/toc.ts
export interface TocEntry {
  slug: string;
  text: string;
  children: TocEntry[];
}

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

/** Build a two-level TOC (h2 with nested h3) from Astro's `headings`. h1/h4+ ignored. */
export function buildToc(headings: Heading[]): TocEntry[] {
  const toc: TocEntry[] = [];
  for (const { depth, slug, text } of headings) {
    if (depth === 2) {
      toc.push({ slug, text, children: [] });
    } else if (depth === 3 && toc.length > 0) {
      toc[toc.length - 1].children.push({ slug, text, children: [] });
    }
  }
  return toc;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm test`
Expected: PASS (toc + schema + reading-time + theme).

- [ ] **Step 5: Commit**

```bash
git add src/lib/toc.ts tests/unit/toc.test.ts
git commit -m "feat: add TOC builder util (TDD)"
```

---

### Task 3a.3: TableOfContents component

**Files:**
- Create: `src/components/TableOfContents.astro`

**Interfaces:**
- Consumes: `TocEntry[]` from `src/lib/toc.ts`.
- Produces: `<TableOfContents entries={toc} />`. Rendered by `ArticleLayout` only when the essay is long enough (gate lives in `ArticleLayout`).

- [ ] **Step 1: Create the component**

```astro
---
import type { TocEntry } from '../lib/toc';

interface Props {
  entries: TocEntry[];
}
const { entries } = Astro.props;
---

<nav class="toc" aria-label="Table of contents">
  <p class="toc__title">Contents</p>
  <ol class="toc__list">
    {
      entries.map((e) => (
        <li>
          <a href={`#${e.slug}`}>{e.text}</a>
          {e.children.length > 0 && (
            <ol class="toc__sublist">
              {e.children.map((c) => (
                <li>
                  <a href={`#${c.slug}`}>{c.text}</a>
                </li>
              ))}
            </ol>
          )}
        </li>
      ))
    }
  </ol>
</nav>

<style>
  .toc {
    max-width: 680px;
    margin: 40px auto 0;
    padding: 18px 22px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: var(--font-sans);
    font-size: 14px;
  }
  .toc__title {
    margin: 0 0 10px;
    font-weight: 600;
    color: var(--muted);
    text-transform: none;
  }
  .toc__list,
  .toc__sublist {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .toc__list > li {
    margin: 6px 0;
  }
  .toc__sublist {
    padding-left: 16px;
  }
  .toc a {
    color: var(--text);
  }
  .toc a:hover {
    color: var(--fire);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TableOfContents.astro
git commit -m "feat: add TableOfContents component"
```

---

### Task 3a.4: Extract shared SiteNav

**Files:**
- Create: `src/components/SiteNav.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Produces: `<SiteNav />` — the site's `<nav>` (brand + Writing link + theme toggle). Used via `slot="header"` by both `index.astro` and `ArticleLayout.astro`.

> **First read the current `src/pages/index.astro`** to copy its exact nav markup/classes (brand text "Sic Parvis Magna", the `Writing` link, and how `ThemeToggle` is placed) so the extraction is faithful.

- [ ] **Step 1: Create `SiteNav.astro`** — move the nav markup here. Base structure (match the existing classes/links from `index.astro`; include `ThemeToggle`):

```astro
---
import ThemeToggle from './ThemeToggle.astro';
---

<nav class="site-nav" aria-label="Primary">
  <a href="/" class="site-nav__brand">Sic Parvis Magna</a>
  <div class="site-nav__right">
    <a href="/writing" class="site-nav__link">Writing</a>
    <ThemeToggle />
  </div>
</nav>

<style>
  .site-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1080px;
    margin: 0 auto;
    padding: 22px 32px;
    font-family: var(--font-sans);
    font-size: 14px;
  }
  .site-nav__brand {
    color: var(--text);
    font-weight: 600;
  }
  .site-nav__right {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .site-nav__link {
    color: var(--text);
  }
  .site-nav__link:hover {
    color: var(--fire);
  }
</style>
```

- [ ] **Step 2: Refactor `index.astro`** to use `<SiteNav slot="header" />` instead of its inline nav. Import `SiteNav`, delete the inline `<nav slot="header">…</nav>` block and any now-duplicated nav styles. Leave the rest of the page unchanged.

- [ ] **Step 3: Verify home page nav is unchanged visually + toggle still works**

Run: `pnpm dev`, open `/`, confirm brand + Writing link render and theme toggle works. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/components/SiteNav.astro src/pages/index.astro
git commit -m "refactor: extract shared SiteNav from home page"
```

---

### Task 3a.5: Arabic + PullQuote MDX components

**Files:**
- Create: `src/components/ArabicQuote.astro`
- Create: `src/components/Ar.astro`
- Create: `src/components/PullQuote.astro`

**Interfaces:**
- `<ArabicQuote translation?="…" cite?="…">` — Arabic passage in the default slot (block; Amiri; RTL; `lang="ar"`; optional English translation + citation).
- `<Ar>صبر</Ar>` — inline Arabic run, bidi-isolated via `<bdi>` + `lang="ar"` + Amiri. Author supplies any transliteration alongside in normal markdown.
- `<PullQuote cite?="…">` — non-footnote emphasis quote, sage hairline.

- [ ] **Step 1: `ArabicQuote.astro`**

```astro
---
interface Props {
  translation?: string;
  cite?: string;
}
const { translation, cite } = Astro.props;
---

<figure class="arabic-quote">
  <blockquote class="arabic-quote__text" dir="rtl" lang="ar">
    <slot />
  </blockquote>
  {translation && <figcaption class="arabic-quote__translation">{translation}</figcaption>}
  {cite && <cite class="arabic-quote__cite">{cite}</cite>}
</figure>

<style>
  .arabic-quote {
    max-width: 680px;
    margin: 40px auto;
    padding: 0;
    text-align: center;
  }
  .arabic-quote__text {
    margin: 0;
    font-family: var(--font-arabic);
    font-size: 34px;
    line-height: 1.7;
    color: var(--text);
  }
  .arabic-quote__translation {
    margin-top: 12px;
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 18px;
    color: var(--muted);
  }
  .arabic-quote__cite {
    display: block;
    margin-top: 6px;
    font-family: var(--font-sans);
    font-style: normal;
    font-size: 13px;
    color: var(--faint);
  }
</style>
```

- [ ] **Step 2: `Ar.astro`** (inline)

```astro
---
// Inline Arabic run for single words/short terms inside LTR prose (ADR 0005).
// <bdi> + unicode-bidi:isolate keeps it from reordering surrounding Latin.
---

<bdi class="ar" lang="ar"><slot /></bdi>

<style>
  .ar {
    font-family: var(--font-arabic);
    unicode-bidi: isolate;
    font-size: 1.08em;
  }
</style>
```

- [ ] **Step 3: `PullQuote.astro`**

```astro
---
interface Props {
  cite?: string;
}
const { cite } = Astro.props;
---

<figure class="pull-quote">
  <blockquote class="pull-quote__text">
    <slot />
  </blockquote>
  {cite && <figcaption class="pull-quote__cite">— {cite}</figcaption>}
</figure>

<style>
  .pull-quote {
    max-width: 680px;
    margin: 38px auto;
    padding: 6px 0 6px 26px;
    border-left: 3px solid var(--sage);
  }
  .pull-quote__text {
    margin: 0;
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 24px;
    line-height: 1.45;
    color: var(--text);
  }
  .pull-quote__cite {
    margin-top: 10px;
    font-family: var(--font-sans);
    font-style: normal;
    font-size: 14px;
    color: var(--muted);
  }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ArabicQuote.astro src/components/Ar.astro src/components/PullQuote.astro
git commit -m "feat: add ArabicQuote, inline Ar, and PullQuote MDX components"
```

---

### Task 3a.6: Prose + footnote theming

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: a themed `.prose` and styled GFM footnotes used by `ArticleLayout`.

- [ ] **Step 1: Append prose + footnote styling** to `src/styles/global.css`

```css
/* Long-form prose: re-theme @tailwindcss/typography to design tokens. */
.prose {
  --tw-prose-body: var(--text);
  --tw-prose-headings: var(--text);
  --tw-prose-links: var(--fire);
  --tw-prose-bold: var(--text);
  --tw-prose-counters: var(--muted);
  --tw-prose-bullets: var(--faint);
  --tw-prose-hr: var(--border);
  --tw-prose-quotes: var(--text);
  --tw-prose-quote-borders: var(--sage);
  --tw-prose-captions: var(--muted);
  --tw-prose-code: var(--text);
  --tw-prose-pre-bg: transparent;
  max-width: 680px;
  margin-inline: auto;
  font-family: var(--font-serif);
  font-size: 19px;
  line-height: 1.7;
}
.prose :is(h2, h3) {
  font-family: var(--font-serif);
  scroll-margin-top: 24px;
}

/* GFM footnotes ([^1]) — real inline marker + endnote list (design.md §6). */
.prose .footnotes {
  max-width: 680px;
  margin: 50px auto 0;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  font-size: 15px;
  color: var(--muted);
}
.prose .footnotes h2 {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
}
.prose a[data-footnote-ref],
.prose sup a {
  color: var(--fire);
  text-decoration: none;
  font-variant-numeric: normal;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: theme prose and footnotes to design tokens"
```

---

### Task 3a.7: ArticleLayout + wire the real route + update seed essays

**Files:**
- Create: `src/components/ArticleLayout.astro`
- Modify: `src/pages/writing/[...slug].astro`
- Modify: `src/content/writing/sample-the-first-rep.mdx`, `sample-what-the-fast-teaches.mdx`, `sample-a-quiet-inventory.mdx`

**Interfaces:**
- Consumes: `CollectionEntry<'writing'>`, `render()` `headings`, `SiteNav`, `TableOfContents`, `buildToc`, `readingTimeLabel`, and `Image` from `astro:assets` (cover).
- Produces: `<ArticleLayout entry={entry} headings={headings}>…<Content /></ArticleLayout>`.

- [ ] **Step 1: Create `ArticleLayout.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';
import BaseLayout from '../layouts/BaseLayout.astro';
import SiteNav from './SiteNav.astro';
import TableOfContents from './TableOfContents.astro';
import { readingTimeLabel } from '../lib/reading-time';
import { buildToc } from '../lib/toc';

interface Props {
  entry: CollectionEntry<'writing'>;
  headings: { depth: number; slug: string; text: string }[];
}
const { entry, headings } = Astro.props;
const { data } = entry;
const toc = buildToc(headings);
const showToc = toc.length >= 3;
const fmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
---

<BaseLayout title={data.title} description={data.description}>
  <SiteNav slot="header" />

  <article class="essay">
    <header class="essay__header">
      <p class="essay__meta">
        <time datetime={data.pubDate.toISOString()}>{fmt.format(data.pubDate)}</time>
        <span aria-hidden="true"> · </span>{readingTimeLabel(entry.body ?? '')}
        <span aria-hidden="true"> · </span><span class="essay__category">{data.category}</span>
      </p>
      <h1 class="essay__title">{data.title}</h1>
      {data.updatedDate && <p class="essay__updated">Updated {fmt.format(data.updatedDate)}</p>}
    </header>

    {
      data.coverImage && (
        <figure class="essay__cover">
          <Image src={data.coverImage} alt="" widths={[720, 1080]} sizes="(min-width: 1080px) 1080px, 100vw" />
          <figcaption>Cover: original pixel art, AI-assisted</figcaption>
        </figure>
      )
    }

    {showToc && <TableOfContents entries={toc} />}

    <div class="essay__prose prose">
      <slot />
    </div>

    <footer class="essay__share">
      <span>Share this essay</span>
    </footer>
  </article>
</BaseLayout>

<style>
  .essay {
    padding-bottom: 90px;
  }
  .essay__header {
    max-width: 680px;
    margin: 56px auto 0;
    padding: 0 28px;
  }
  .essay__meta {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--muted);
    margin: 0 0 14px;
  }
  .essay__category {
    color: var(--fire);
  }
  .essay__title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(32px, 4.8vw, 52px);
    line-height: 1.1;
    color: var(--text);
    margin: 0;
    text-wrap: balance;
  }
  .essay__updated {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--faint);
    margin: 12px 0 0;
  }
  .essay__cover {
    max-width: 1080px;
    margin: 44px auto 0;
    padding: 0 28px;
  }
  .essay__cover :global(img) {
    width: 100%;
    height: auto;
    border-radius: 10px;
  }
  .essay__cover figcaption {
    margin-top: 8px;
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--faint);
  }
  .essay__prose {
    padding: 0 28px;
    margin-top: 44px;
  }
  .essay__share {
    max-width: 680px;
    margin: 50px auto 0;
    padding: 24px 28px 0;
    border-top: 1px solid var(--border);
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--muted);
  }
</style>
```

- [ ] **Step 2: Replace the temporary route** — overwrite `src/pages/writing/[...slug].astro`

```astro
---
import { getCollection, render } from 'astro:content';
import ArticleLayout from '../../components/ArticleLayout.astro';

export async function getStaticPaths() {
  const essays = await getCollection('writing', ({ data }) => !data.draft);
  return essays.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

const { entry } = Astro.props;
const { Content, headings } = await render(entry);
---

<ArticleLayout entry={entry} headings={headings}>
  <Content />
</ArticleLayout>
```

- [ ] **Step 3: Upgrade seed essays to use the components.** In each `.mdx`, add the imports at the top of the body (after frontmatter) and swap raw markup for components.

For `sample-what-the-fast-teaches.mdx` — replace the raw Arabic `<blockquote>` with `<ArabicQuote>` and add an inline `<Ar>` term. Body becomes:

```mdx
import ArabicQuote from '../../components/ArabicQuote.astro';
import Ar from '../../components/Ar.astro';

There is a line I return to when restraint feels pointless:[^ayah]

<ArabicQuote translation="Indeed, with hardship comes ease." cite="Qur'an 94:6">
  إِنَّ مَعَ الْعُسْرِ يُسْرًا
</ArabicQuote>

The fast is a rehearsal for that trust — a controlled, repeatable hardship you
choose, so the uncontrolled ones find you already practised. This is <Ar>صبر</Ar>
(_sabr_): patience as a discipline, not a mood.

Hunger is a small teacher. It says: you are not your appetites; you can watch a
craving arrive and let it pass without obeying it.

[^ayah]: Qur'an 94:6.
```

For `sample-the-first-rep.mdx` — add a `<PullQuote>` and keep the code block + footnote. Insert after the intro:

```mdx
import PullQuote from '../../components/PullQuote.astro';

<PullQuote>Motivation is a mood, and moods are weather. A practice has to survive the weather.</PullQuote>
```

(Keep this essay's existing code block and `[^1]` footnote as-is.)

For `sample-a-quiet-inventory.mdx` — no component changes needed (it's a draft; leave its markdown image as-is).

- [ ] **Step 4: Build and eyeball**

Run: `pnpm build`
Expected: succeeds; still 2 non-draft pages (draft excluded).
Run: `pnpm dev`, open `/writing/sample-what-the-fast-teaches` — check: meta line (date · N min read · Faith), title, the Arabic quote centered in Amiri RTL with translation + citation, the inline `صبر (sabr)` not breaking the sentence, footnote linked at bottom. Toggle theme; all readable. Open `/writing/sample-the-first-rep` — pull quote + code block styled. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/components/ArticleLayout.astro src/pages/writing/ src/content/writing/
git commit -m "feat: real ArticleLayout replaces temp route; seeds use MDX components"
```

---

### Task 3a.8: Accessibility test, audit, and exit gate

**Files:**
- Create: `tests/a11y/essay.spec.ts`

- [ ] **Step 1: Write the essay-page a11y test**

```ts
// tests/a11y/essay.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ESSAY = '/writing/sample-what-the-fast-teaches';

test('no axe violations in light theme', async ({ page }) => {
  await page.goto(ESSAY);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('no axe violations in dark theme', async ({ page }) => {
  await page.goto(ESSAY);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('has exactly one h1 and the Arabic block is RTL + lang=ar', async ({ page }) => {
  await page.goto(ESSAY);
  await expect(page.locator('h1')).toHaveCount(1);
  const arabic = page.locator('blockquote[lang="ar"]');
  await expect(arabic).toHaveAttribute('dir', 'rtl');
});
```

- [ ] **Step 2: Run the a11y suite**

Run: `pnpm test:a11y`
Expected: PASS (existing shell tests + new essay tests).

- [ ] **Step 3: Run impeccable audit on the essay detail surface**

Invoke the impeccable `audit` command on the essay detail page. Apply only in-scope craft fixes (spacing, rhythm, focus, contrast, anti-slop). **Do NOT** change locked decisions — no palette/token edits, no font/stack/motion changes, no `palette.mjs`. If the audit flags a locked decision, note it in the PR and skip it. Commit any craft fixes separately:

```bash
git add -A
git commit -m "polish: impeccable audit fixes on essay detail"
```

- [ ] **Step 4: Run the full gate**

```bash
pnpm test          # unit: toc + schema + reading-time + theme
pnpm typecheck     # astro check
pnpm build         # static build; draft still excluded
pnpm test:a11y     # shell + essay
pnpm lint
pnpm format:check
```

Expected: all green.

- [ ] **Step 5: Open the Phase 3a PR**

```bash
git push -u origin phase-3a-essay-detail
gh pr create --base main --head phase-3a-essay-detail \
  --title "Phase 3a — essay detail (ArticleLayout + MDX components)" \
  --body "Real ArticleLayout (meta, cover+credit, TOC, footnotes, share), ArabicQuote/Ar/PullQuote components, dual-theme Shiki, shared SiteNav. Replaces the temp route. See docs/superpowers/plans/2026-07-23-phase-3a-essay-detail.md. Wait for CI green before reporting."
```

---

## Self-Review

**Spec coverage (build-order Phase 3, essay-detail slice):**
- `ArticleLayout` (meta header, prose, in-page TOC for long pieces, footnotes, per-cover credit, share row) → 3a.7 + 3a.3 + 3a.6. ✓
- MDX components: footnotes (GFM, styled — real inline marker + endnote per design.md §6), `ArabicQuote`, inline `Ar` (ADR 0005), `PullQuote`, `CodeBlock` (dual-theme Shiki via config rather than a custom component — YAGNI; fenced code already highlights) → 3a.1, 3a.5. ✓
- a11y pass per page (axe both themes, single h1, RTL Arabic) → 3a.8. ✓

**Known deferrals (intentional):**
- `RelatedArticles` on the essay page → Phase 4 (card system owns the algorithm).
- `SEOHead` / JSON-LD / OG → Phase 6.
- `/`, `/writing` index + pagination, `/topics`, `/about`, `/404` → **Phase 3b** (next plan). `SiteNav` is extracted here so 3b builds on it.
- Real cover images → Phase 4; `coverImage` path is coded but seeds stay coverless (fallback).
- A custom `<CodeBlock>` wrapper (copy button etc.) → only if a real need appears (currently Astro's Shiki output is sufficient).

**Type consistency:** `buildToc(headings)` signature matches across `toc.ts`, `toc.test.ts`, `TableOfContents`, and `ArticleLayout`. `TocEntry` shape identical everywhere. `readingTimeLabel(entry.body)` matches Phase 2. `render()` returns `{ Content, headings }` — headings passed straight into `ArticleLayout`. Component prop names (`translation`, `cite`) match their usage in the seed `.mdx` files.

**Open confirmations for Muhammad (non-blocking):**
1. Arabic quote size is set to 34px (elevated per ADR 0005) — tune in `ArabicQuote.astro` if it reads too large against the 19px body.
2. TOC shows only when an essay has ≥3 top-level (`h2`) sections — adjust the `showToc` threshold in `ArticleLayout.astro` to taste.
3. Share row is a static label placeholder — real share links can land with SEO (Phase 6) or whenever you want them.
