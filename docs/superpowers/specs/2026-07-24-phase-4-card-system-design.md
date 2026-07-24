---
created: '2026-07-24'
project: sic-parvis-magna
type: spec
status: active
tags:
  - project/sic-parvis-magna
  - spec
  - phase-4
---

> [!info] Source of truth
> This vault file is the **canonical** Phase 4 design spec. The repo copy at
> `docs/superpowers/specs/2026-07-24-phase-4-card-system-design.md` is a one-way
> synced mirror (prettier-ignored). Edit here, then re-sync the repo copy.

# Phase 4 — Card System Design Spec

**Status:** design approved 2026-07-24; next step is the detailed TDD implementation plan (writing-plans).

## Context

Phases 0–3 are merged. The site has real routes (`/`, `/writing` + pagination,
`/topics` + `/topics/[topic]`, essay detail via `ArticleLayout`, `/about`, `/404`)
built on pure `src/lib/` helpers + Astro pages. Phase 3b shipped essays as a
**text list** (`EssayCard` + `EssayList`): a stacked `<ul>` of category · title ·
description · meta rows separated by hairlines.

Phase 4 builds the **card system** from the master roadmap: a rounded-corner image
card grid (the [[design]] "the card *is* the image" treatment), a fallback card for
essays with no cover, and auto-computed related articles.

**Reference:** the visual target is the General Intelligence Company `/writing`
grid (`generalintelligencecompany.com/writing`), measured live on 2026-07-24 — the
same site [[design]] was reverse-engineered from. We **adapt its geometry, not its
content decisions** (GIC shows a byline, is dark-only, uses its own palette; our
locked decisions drop the byline, default light, use our own palette).

## Goals

- A single rounded card component used across every essay-listing surface, so the
  grid "reads as one authored set" ([[design]] §7).
- Match GIC's measured card geometry exactly (radius, aspect, grid, gaps, hover).
- Auto-computed related articles on the essay detail page (shared tags/category +
  recency), fully unit-tested.
- Everything testable **now**, with zero cover art in the repo.

## Non-goals / deferred

- **Cover image art.** No covers exist yet (deferred open item, AI-brief per
  [[0003-imagery-as-core-ai-pixel-covers|ADR 0003]]). The owner has generated some
  art personally — request it when the cover treatment is wired. The cover +
  scrim + overlaid-title variant is built **thin and dormant** in Phase 4 and only
  becomes visible once real covers land.
- Featured-slot rework. The home featured treatment is already `HomeHero` (the
  locked one-gesture scroll piece) + `selectFeatured` from 3b; it gains a cover
  later. Phase 4 does **not** rebuild it.
- Search, SEO/feeds, RSS — later phases.

## Locked decisions (carried in)

- Terminology "essay"; categories Discipline · Faith · Reflections. Never byline
  (single author) — surface date · reading time · category instead ([[design]] §8).
- Palette = tokens only, never hard-code hex. Sans = **Instrument Sans** (not
  Inter); serif = Literata. Light-first + dark toggle. See [[spm-locked-visual-decisions]].
- Motion restrained: card hover = image-zoom + shadow elevation only (no
  scale-flip). Fully static under `prefers-reduced-motion`.
- No per-card "AI-generated" badge; AI disclosure lives in the colophon + a quiet
  per-cover credit on the detail page ([[0003-imagery-as-core-ai-pixel-covers|ADR 0003]]).
- `draft: true` excluded everywhere (enforced in `publishedSorted`).

## Measured GIC card geometry (viewport 1512, 2026-07-24)

| Property | Value | Adopt as |
|----------|-------|----------|
| Grid columns | `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3` | 1 → 2 → 3 |
| Column width / gap | 400px columns, **24px gap**, content ~1248px | 24px gap, content max ~1200px |
| Card radius | `sm:rounded-2xl` = **16px** (8px `rounded-lg` mobile) | 16px desktop / 8px mobile |
| Cover aspect | img 380×333 = **1.14:1** near-square | **7:6** (1.167 — visually identical, brief-friendly) |
| Title + meta | overlaid, centered, 24px bottom inset, white on scrim | same, minus byline |
| Title type | 18px / weight 500 / leading 130% | our sans scale, tokens |
| Hover | img `scale(1.05)` 600ms + shadow elevation 300ms | same, reduced-motion static |
| Featured (top) | bigger slot: serif title above large cover + CTA | already = `HomeHero`, out of scope |

## Card anatomy

**`ArticleCard`** — one component, two internal render paths keyed on whether the
essay has a `coverImage`:

- **Fallback path (visible now, no cover):** a `7:6`, 16px-radius, `overflow:hidden`
  box filled with a tinted surface (a subtle sage/firelight token wash) + the
  recurring ember/lantern glyph, with **category · title · date · reading time** as
  text inside. This is the permanent no-cover card, not a placeholder to throw away.
- **Cover path (dormant until art lands):** the same box, filled with a full-bleed
  optimized `<Image>` + a bottom gradient scrim + the title · meta overlaid,
  centered, bottom-inset — the GIC treatment. Thin and well-specified; unused while
  the repo has zero covers.

Both paths share the box, radius, aspect, hover (image/surface zoom + shadow), and
focus treatment, so a cover drops into an already-correct grid later.

**Consequence (approved):** grid cards show **title + meta only — no description
excerpt** (the faithful GIC look). The authored `description` still drives the
essay detail page and the meta description; it is simply not shown on cards.

**`ArticleGrid`** — semantic `<ul role="list">` laying `ArticleCard`s out in the
1 → 2 → 3 responsive grid with 24px gaps and an `empty` message slot. Replaces
`EssayList` as the listing unit.

## Grid application (approved)

The card grid replaces the 3b text list on **every** surface that lists essays:

- `/writing` index and `/writing/page/[page]`
- home "Latest" section
- `/topics/[topic]` (category + tag pages)

The 3b `EssayCard`/`EssayList` are retired as page-level units; their content
(category · title · meta) lives on inside `ArticleCard`'s fallback path.

## RelatedArticles

Pure helper `relatedEssays(current, all, count = 3): EssayListItem[]`:

- Score each candidate: **+2** if same category, **+1** per shared tag.
- Exclude the current essay and all drafts.
- Sort by score desc, tiebreak `pubDate` desc, then `title` asc (stable builds).
- **Backfill** with the most-recent published essays if fewer than `count` score > 0,
  so the section is never empty (small-site friendly).

Renders as a compact `ArticleGrid` in a "Related" section at the foot of
`ArticleLayout` (essay detail, from Phase 3a).

## Data-layer changes

- Add `coverImage?: ImageMetadata` to the `EssayListItem` interface (`src/lib/essays.ts`).
- Map it in `toListItem` (`src/lib/to-list-item.ts`) — the single place `entry.data`
  → `EssayListItem` coercion happens.
- New files: `src/lib/related.ts` (+ `tests/unit/related.test.ts`),
  `src/components/ArticleCard.astro`, `src/components/ArticleGrid.astro`.
- Rewire pages: `/writing/index.astro`, `/writing/page/[page].astro`, `index.astro`
  (home Latest), `/topics/[topic].astro` from `EssayList` → `ArticleGrid`.

## Architecture / boundaries

- **Logic stays pure and unit-tested** under `src/lib/` (`relatedEssays` joins
  `publishedSorted`/`selectFeatured`/`collectTags`/`resolveTopic`). Astro pages map
  collection entries → plain `EssayListItem` and hand them to helpers + components.
- **`ArticleCard` is the one card boundary:** its consumers (`ArticleGrid`, pages)
  pass a plain `EssayListItem` and never know which render path fires. A cover is
  purely internal state — adding covers later changes no consumer.

## Testing strategy

- **TDD (unit):** `relatedEssays` — scoring, category vs tag weight, tiebreak
  determinism, self/draft exclusion, backfill to `count`, empty input.
- **Build:** grid renders on all surfaces with zero covers (fallback path legal);
  drafts excluded; no `/writing/page/*` for < PAGE_SIZE seeds.
- **A11y (extend `tests/a11y/routes.spec.ts`):** card grid axe-clean in **both**
  themes; each card is a single keyboard-focusable link with a visible focus state;
  `<ul role="list">` semantics; reduced-motion renders fully static (no hover zoom).

## Deferred handoff (covers)

When cover art is ready:
1. Request the owner's generated pixel covers.
2. Add `coverImage` to seed frontmatter; drop assets under `src/assets/` (or per
   Astro image convention).
3. The dormant cover path in `ArticleCard` activates automatically. Add the quiet
   per-cover credit line on the essay detail hero (ADR 0003). Re-audit a11y
   (scrim contrast of overlaid title in both themes).

## Open items

- Exact tinted-surface token recipe for the fallback card (sage vs firelight wash,
  opacity) — settle visually during implementation `audit`; tokens only, no hex.
- Ember/lantern glyph asset — one small recurring motif ([[design]] §7); reuse the
  section-end mark if it exists, else a lightweight inline SVG.
