# Phase 2 — Content Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the site a typed, build-enforced content model — an MDX `writing` collection with a Zod schema, a single-author reference, seed essays that exercise every feature, and a tested reading-time util.

**Architecture:** Astro 5 Content Layer. Two collections defined in `src/content.config.ts` via the `glob()` loader — `writing` (MDX essays) and `authors` (JSON data). The essay frontmatter schema lives in its own module (`src/content/schema.ts`) so it can be unit-tested in Vitest, with `astro:content` aliased to a tiny stub in the test runner. Reading time is a pure util computed from body word count. A **temporary** raw-render route proves essays render; Phase 3 replaces it with the real `ArticleLayout`.

**Tech Stack:** Astro 5 · `@astrojs/mdx` · `astro:content` (Zod via `astro/zod`) · Vitest · pnpm · Node 24.16.0.

## Global Constraints

_(Copied from build-order Global Constraints — every task's requirements implicitly include these.)_

- **Package manager: pnpm.** Never npm/yarn. Run under Node 24.16.0 (`nvm use` reads `.nvmrc`).
- **Terminology (enforced in code):** always "essay" (never post/article); the section is "Writing". Categories enum = exactly **Discipline · Faith · Reflections** (Notes is deferred — do NOT add it).
- **Schema fidelity (design.md §6):** `coverImage` MUST stay optional (the fallback-card path must always be legal). `author` is modeled as a **reference**, not a string, so guest essays never force a schema change. `readingTime` is **computed, never authored** — it is not a frontmatter field.
- **Footnotes are structural, not a frontmatter field** — GitHub-flavoured `[^1]` markdown footnotes for now (Astro enables GFM by default); the bespoke `<Footnote>`/`<References>` MDX components arrive in Phase 3. Do not add a footnotes frontmatter field.
- **TDD for all logic:** red → green for the schema (accept/reject) and reading-time. Frontmatter validation failures must be build errors.
- **Stack is locked** — do not add libraries beyond `@astrojs/mdx`. No remark/rehype plugins this phase (GFM is already on). No CMS, no DB.
- **Git:** branch per phase (kebab-case) → PR → merge commit; never commit to `main`; **no `Co-Authored-By` / "Generated with" lines**.
- **Docs:** `docs/` stays in `.prettierignore` (never reformat the synced vault copies).
- **impeccable:** installed per-worktree, git-ignored. No UI surfaces of consequence this phase, so no `craft`/`audit` gate here (the temp route is throwaway). Locked decisions still win.

**Current state (main @ `c94fde1`, after Phase 0–1):**
- Astro 5 scaffold, Tailwind v4, tokens + theme toggle, BaseLayout, fonts — all done.
- `BaseLayout.astro` props: `{ title: string; description?: string }`.
- `vitest.config.ts`: `{ test: { environment: 'jsdom', include: ['tests/unit/**/*.test.ts'] } }`.
- No content collections, no MDX integration, no `zod` in deps yet.
- Scripts: `test` = `vitest run`, `typecheck` = `astro check`, `test:a11y` = `playwright test`.

---

## File Structure

- **Create** `src/lib/reading-time.ts` — pure `readingTimeMinutes` / `readingTimeLabel` from word count.
- **Create** `tests/unit/reading-time.test.ts` — reading-time TDD.
- **Create** `tests/stubs/astro-content.ts` — re-exports `z` from `astro/zod` so schema tests resolve `astro:content` in Vitest.
- **Create** `src/content/schema.ts` — `essaySchema({ image, reference })` factory (the testable Zod object).
- **Create** `tests/unit/schema.test.ts` — schema accept/reject TDD.
- **Create** `src/content.config.ts` — `writing` + `authors` collections.
- **Create** `src/content/authors/muhammad.json` — the single author entry.
- **Create** `src/content/writing/sample-*.mdx` — 3 seed essays.
- **Create** `src/pages/writing/[...slug].astro` — TEMPORARY raw-render route (deleted/replaced in Phase 3).
- **Modify** `astro.config.mjs` — add the `@astrojs/mdx` integration.
- **Modify** `vitest.config.ts` — alias `astro:content` → the stub.

---

### Task 2.1: Add and wire the MDX integration

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json` (via the installer)

- [ ] **Step 1: Install `@astrojs/mdx`**

```bash
pnpm astro add mdx --yes
```

Expected: adds `@astrojs/mdx` to dependencies AND injects `integrations: [mdx()]` into `astro.config.mjs`.

- [ ] **Step 2: Verify `astro.config.mjs` matches this exactly** (fix by hand if `astro add` formatted it differently)

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://sic-parvis-magna.pages.dev', // placeholder; custom domain set in Phase 8
  trailingSlash: 'never',
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: Verify the build still passes with no content yet**

Run: `pnpm build`
Expected: build succeeds (the empty `src/content/` doesn't exist yet — that's fine).

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs package.json pnpm-lock.yaml
git commit -m "feat: add @astrojs/mdx integration"
```

---

### Task 2.2: Reading-time util (TDD)

**Files:**
- Create: `src/lib/reading-time.ts`
- Test: `tests/unit/reading-time.test.ts`

**Interfaces:**
- Produces: `readingTimeMinutes(text: string): number` (min 1, rounds up at 200 wpm) and `readingTimeLabel(text: string): string` (`"N min read"`). The temp route in Task 2.6 consumes `readingTimeLabel`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/reading-time.test.ts
import { describe, it, expect } from 'vitest';
import { readingTimeMinutes, readingTimeLabel } from '../../src/lib/reading-time';

describe('readingTimeMinutes', () => {
  it('returns at least 1 minute for empty or short text', () => {
    expect(readingTimeMinutes('')).toBe(1);
    expect(readingTimeMinutes('one two three')).toBe(1);
  });

  it('rounds up to the next minute at 200 wpm', () => {
    expect(readingTimeMinutes('word '.repeat(200))).toBe(1);
    expect(readingTimeMinutes('word '.repeat(201))).toBe(2);
    expect(readingTimeMinutes('word '.repeat(400))).toBe(2);
    expect(readingTimeMinutes('word '.repeat(401))).toBe(3);
  });

  it('ignores extra whitespace', () => {
    expect(readingTimeMinutes('  a   b  ')).toBe(1);
  });
});

describe('readingTimeLabel', () => {
  it('formats as "N min read"', () => {
    expect(readingTimeLabel('word '.repeat(401))).toBe('3 min read');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `../../src/lib/reading-time`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/reading-time.ts
const WORDS_PER_MINUTE = 200;

/** Whole minutes to read `text`, from word count, rounded up, never below 1. */
export function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Human label, e.g. "3 min read". */
export function readingTimeLabel(text: string): string {
  return `${readingTimeMinutes(text)} min read`;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm test`
Expected: PASS (reading-time + the existing theme tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reading-time.ts tests/unit/reading-time.test.ts
git commit -m "feat: add reading-time util (TDD)"
```

---

### Task 2.3: Essay frontmatter schema + Vitest stub (TDD)

**Files:**
- Create: `tests/stubs/astro-content.ts`
- Modify: `vitest.config.ts`
- Create: `src/content/schema.ts`
- Test: `tests/unit/schema.test.ts`

**Interfaces:**
- Produces: `essaySchema({ image, reference }): ZodObject` and `CATEGORIES` (`readonly ['Discipline','Faith','Reflections']`). Consumed by `src/content.config.ts` (Task 2.4). The schema is a factory because `image()` and `reference()` are only real inside Astro's build — tests pass stubs.

**Why a stub:** `src/content/schema.ts` imports `z` from the virtual module `astro:content`, which doesn't exist in Vitest. Aliasing it to a file that re-exports Astro's own bundled Zod (`astro/zod`) lets the schema be unit-tested with the *same* Zod the build uses — no version drift, no extra dependency.

- [ ] **Step 1: Create the test stub**

```ts
// tests/stubs/astro-content.ts
// Vitest-only shim for the `astro:content` virtual module.
// Re-exports Astro's bundled Zod so schema tests use the exact same validator as the build.
export { z } from 'astro/zod';
```

- [ ] **Step 2: Alias `astro:content` to the stub in `vitest.config.ts`**

Replace the whole file with:

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'astro:content': fileURLToPath(new URL('./tests/stubs/astro-content.ts', import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Write the failing schema test**

```ts
// tests/unit/schema.test.ts
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

  it('rejects an unknown category (Notes is deferred)', () => {
    expect(schema.safeParse({ ...valid, category: 'Notes' }).success).toBe(false);
  });

  it('rejects a non-date pubDate', () => {
    expect(schema.safeParse({ ...valid, pubDate: 'not-a-date' }).success).toBe(false);
  });

  it('accepts the optional fields when present', () => {
    const parsed = schema.parse({
      ...valid,
      updatedDate: '2026-02-01',
      series: 'On Habits',
      tags: ['patience', 'solitude'],
      featured: true,
    });
    expect(parsed.series).toBe('On Habits');
    expect(parsed.tags).toEqual(['patience', 'solitude']);
    expect(parsed.featured).toBe(true);
  });
});
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `../../src/content/schema`.

- [ ] **Step 5: Write the schema module**

```ts
// src/content/schema.ts
import { z } from 'astro:content';
import type { SchemaContext } from 'astro:content';

/** The one primary shelf an essay sits on. Small and curated — Notes is deferred (glossary). */
export const CATEGORIES = ['Discipline', 'Faith', 'Reflections'] as const;

/**
 * Essay frontmatter contract (design.md §6). A factory because `image()` and
 * `reference()` only exist inside Astro's build; tests inject string stubs.
 * `coverImage` stays optional (fallback card must always be legal); `author` is a
 * reference; `readingTime` is computed elsewhere and is intentionally NOT here.
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
```

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `pnpm test`
Expected: PASS (schema + reading-time + theme).

- [ ] **Step 7: Commit**

```bash
git add tests/stubs/astro-content.ts vitest.config.ts src/content/schema.ts tests/unit/schema.test.ts
git commit -m "feat: add essay frontmatter schema with unit tests (TDD)"
```

---

### Task 2.4: Content collections config + author entry

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/authors/muhammad.json`

**Interfaces:**
- Consumes: `essaySchema`, `CATEGORIES` from `src/content/schema.ts`.
- Produces: collections `writing` and `authors`. `getCollection('writing')` and `reference('authors')` become available to routes (Task 2.6, and Phase 3).

- [ ] **Step 1: Create the author data entry**

```json
{
  "name": "Muhammad"
}
```

Path: `src/content/authors/muhammad.json`. (Display name is editable later; `bio` is optional per the schema below and can be added when the About page needs it.)

- [ ] **Step 2: Create the collections config**

```ts
// src/content.config.ts
import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { essaySchema } from './content/schema';

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    bio: z.string().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: ({ image }) => essaySchema({ image, reference }),
});

export const collections = { writing, authors };
```

- [ ] **Step 3: Regenerate content types**

Run: `pnpm astro sync`
Expected: succeeds, writes `.astro/` collection types (git-ignored). No essays yet, so `writing` is empty — fine.

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/authors/muhammad.json
git commit -m "feat: define writing + authors content collections"
```

---

### Task 2.5: Seed essays

**Files:**
- Create: `src/content/writing/sample-the-first-rep.mdx`
- Create: `src/content/writing/sample-what-the-fast-teaches.mdx`
- Create: `src/content/writing/sample-a-quiet-inventory.mdx`

**Interfaces:**
- Consumes: the `writing` schema (Task 2.4).
- Produces: 3 entries with ids `sample-the-first-rep`, `sample-what-the-fast-teaches`, `sample-a-quiet-inventory`. Between them they exercise: all three categories, `featured: true`, `draft: true`, `updatedDate`, `series`, tags, a code block, a markdown image, an Arabic RTL blockquote, and GFM footnotes.

> **These are seed essays** — placeholder content that exists to exercise the schema and render path. Muhammad replaces them with real writing; delete these files when real essays land. Keep them clearly generic.

- [ ] **Step 1: Essay 1 — featured, Discipline, code block + footnote**

```mdx
---
title: 'The First Rep'
description: 'Why the hardest part of any practice is the one you can start today.'
pubDate: 2026-01-06
category: 'Discipline'
tags: ['habits', 'patience']
featured: true
author: muhammad
---

Discipline is not the grand gesture. It is the first repetition, done on a day
you did not feel like doing it.[^1]

The mistake is to wait for motivation. Motivation is a mood, and moods are
weather. A practice has to survive the weather.

## What "showing up" actually costs

The cost is almost never the work itself. It is the friction before the work —
the deciding, the postponing, the small negotiations with yourself. Remove the
negotiation and the work is ordinary.

```js
// the smallest honest version of a habit loop
const showUp = (day) => (day.tired ? doItAnyway() : doIt());
```

Do the smallest honest version. Then do it again tomorrow.

[^1]: This is the whole essay, really. The rest is commentary.
```

- [ ] **Step 2: Essay 2 — Faith, Arabic RTL blockquote, series, footnote**

```mdx
---
title: 'What the Fast Teaches'
description: 'Hunger as a small, deliberate lesson in restraint.'
pubDate: 2026-02-18
updatedDate: 2026-02-20
category: 'Faith'
tags: ['islam', 'restraint', 'patience']
series: 'On Practice'
author: muhammad
---

There is a line I return to when restraint feels pointless:[^ayah]

<blockquote dir="rtl" lang="ar">
  إِنَّ مَعَ الْعُسْرِ يُسْرًا
</blockquote>

_"Indeed, with hardship comes ease."_ The fast is a rehearsal for that trust —
a controlled, repeatable hardship you choose, so the uncontrolled ones find you
already practised.

Hunger is a small teacher. It says: you are not your appetites; you can watch a
craving arrive and let it pass without obeying it.

[^ayah]: Qur'an 94:6. Rendered here as a plain blockquote — the dedicated
`ArabicQuote` component arrives in Phase 3.
```

- [ ] **Step 3: Essay 3 — Reflections, draft, image, updatedDate**

```mdx
---
title: 'A Quiet Inventory'
description: 'An end-of-year accounting that has nothing to do with productivity.'
pubDate: 2026-03-01
updatedDate: 2026-03-05
category: 'Reflections'
tags: ['solitude', 'reflection']
draft: true
author: muhammad
---

Once a year I take a quiet inventory. Not of what I produced — of what I became.

![A single lamp in a dark room](https://placehold.co/1200x630/12161c/d99a54?text=placeholder)

The questions are plain. Was I kinder or only busier? Did I keep the promises I
made to no one but myself? Draft status keeps this one out of the build until it
is ready — which is the honest state of most reflection.
```

- [ ] **Step 4: Sync + typecheck to validate all three against the schema**

Run: `pnpm astro sync && pnpm typecheck`
Expected: PASS — frontmatter validates. If any field is wrong, `astro check` reports it as an error (this is the "validation failures are build errors" guarantee).

- [ ] **Step 5: Commit**

```bash
git add src/content/writing/
git commit -m "feat: add seed essays exercising the full schema"
```

---

### Task 2.6: Temporary raw-render route + exit verification

**Files:**
- Create: `src/pages/writing/[...slug].astro`

**Interfaces:**
- Consumes: `getCollection`/`render` from `astro:content`, `BaseLayout` (`{ title, description? }`), `readingTimeLabel`.
- Produces: a page per non-draft essay at `/writing/<id>`. **Temporary** — Phase 3 replaces this with the real `ArticleLayout`. It exists only to prove essays render raw and that draft exclusion works.

- [ ] **Step 1: Create the temporary route**

```astro
---
// TEMPORARY raw-render route — replaced by the real ArticleLayout in Phase 3.
// Exists only to prove Phase 2 essays validate and render, and that drafts are excluded.
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { readingTimeLabel } from '../../lib/reading-time';

export async function getStaticPaths() {
  const essays = await getCollection('writing', ({ data }) => !data.draft);
  return essays.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
---

<BaseLayout title={entry.data.title} description={entry.data.description}>
  <article>
    <h1>{entry.data.title}</h1>
    <p>{entry.data.category} · {readingTimeLabel(entry.body ?? '')}</p>
    <Content />
  </article>
</BaseLayout>
```

- [ ] **Step 2: Build and confirm the drafted essay is excluded**

Run: `pnpm build`
Expected: build succeeds. In the output there is a page for `writing/sample-the-first-rep` and `writing/sample-what-the-fast-teaches`, but **NOT** `writing/sample-a-quiet-inventory` (it's `draft: true`).

- [ ] **Step 3: Eyeball the render**

Run: `pnpm dev`, open `http://localhost:4321/writing/sample-what-the-fast-teaches`
Expected: title, `Faith · N min read`, prose, the Arabic blockquote rendered RTL, and the footnote linked at the bottom. Stop the dev server when done.

- [ ] **Step 4: Run the full gate**

Run each and confirm green:
```bash
pnpm test          # unit: reading-time + schema + theme
pnpm typecheck     # astro check — frontmatter validates
pnpm build         # static build succeeds
pnpm test:a11y     # existing Playwright/axe suite still passes
pnpm lint          # eslint clean
pnpm format:check  # prettier clean (docs/ excluded)
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/writing/
git commit -m "feat: temporary raw-render route for seed essays"
```

- [ ] **Step 6: Open the Phase 2 PR**

```bash
git push -u origin phase-2-content-model
gh pr create --base main --head phase-2-content-model \
  --title "Phase 2 — content model" \
  --body "Astro content collections (writing + authors), tested Zod schema, reading-time util, seed essays, temporary raw-render route. See docs/superpowers/plans/2026-07-23-phase-2-content-model.md."
```

---

## Self-Review

**Spec coverage (build-order Phase 2):**
- Zod content-collection schema, all §6 fields, `coverImage` optional, `author` as reference → Task 2.3 + 2.4. ✓
- 2–3 seed essays exercising every feature (Arabic quote, footnotes, code, image, long prose) → Task 2.5 (3 essays; Arabic via RTL blockquote, footnotes via GFM, code fence, markdown image — bespoke MDX components deferred to Phase 3 per build-order). ✓
- Computed `readingTime` util → Task 2.2. ✓
- Test strategy: schema accept/reject (2.3), reading-time from word count (2.2), frontmatter failures are build errors (2.4/2.5 via `astro check`). ✓
- Exit: seed essays validate and render raw; schema is the enforced contract → Task 2.6. ✓

**Known deferrals (intentional, per build-order):**
- Bespoke `<Footnote>`/`<References>`/`<ArabicQuote>`/`<PullQuote>`/`<CodeBlock>` MDX components → Phase 3.
- Real `/writing/[slug]` `ArticleLayout`, TOC, share row → Phase 3 (the route here is explicitly temporary).
- `readingTime` markdown-stripping refinement → Phase 7 if word counts drift.
- Real cover images (exercising `image()` with an asset) → Phase 4 card system; Phase 2 seeds use the fallback (no `coverImage`) path.
- `RelatedArticles` / `featured` slot logic → Phase 4 (the `featured` field is set here, consumed there).

**Type consistency:** `essaySchema({ image, reference })` signature is identical in schema.ts, the test, and content.config.ts. `readingTimeLabel(text)` used in the temp route matches its definition. Author id `muhammad` in seeds matches `src/content/authors/muhammad.json`. Category strings match `CATEGORIES` exactly.

**Open confirmations for Muhammad (non-blocking):**
1. Author display name is set to "Muhammad" — change `src/content/authors/muhammad.json` if you want a full name or pen name.
2. Seed essays are placeholder — replace with real writing when ready; delete the `sample-*.mdx` files then.
