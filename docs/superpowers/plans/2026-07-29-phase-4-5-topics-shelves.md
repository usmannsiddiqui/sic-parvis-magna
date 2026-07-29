# Phase 4.5 — Topics as Shelves (implementation plan)

**Goal:** Replace the `/topics` index with the bookshelf design — category
shelves of titled essay spines on ledges, plus a frequency-sized tag cloud.

**Design spec:** `docs/superpowers/specs/2026-07-29-phase-4-5-topics-shelves-design.md` — authoritative.

**Tech Stack:** Astro 5 (static) · Content Collections + Zod · Tailwind-free
scoped `<style>` + CSS custom-property tokens · Vitest (unit) · Playwright +
`@axe-core/playwright` (a11y) · pnpm.

---

## Global Constraints

- **Tokens only, never hard-code palette hex** outside `tokens.css`.
- Fonts via `--font-sans` (Instrument Sans) / `--font-serif` (Literata). Do not
  add a Google Fonts `<link>`; `BaseLayout` already loads both.
- **Titled spines are real published essays only.** Never fabricate a title.
- `draft: true` excluded everywhere (`publishedSorted` already enforces this).
- Fully static under `prefers-reduced-motion`.
- WCAG AA in both themes — the a11y gate is the arbiter, not local eyeballing.
- Commit per task. **No `Co-Authored-By` or "Generated with" trailers.**
- Package manager: pnpm. Confirm script names in `package.json` before first run.

---

## Task 1: Shelf-building helpers (TDD)

New `src/lib/shelves.ts`. Pure functions, no Astro imports, unit-testable.

Write `tests/unit/shelves.test.ts` **first**:

- `buildShelves(published)` returns **one entry per `CATEGORIES` member, always**,
  in `CATEGORIES` order. No category is ever omitted (spec §5). Result length is
  always `CATEGORIES.length`.
- Each shelf: `{ label, slug, count, spines, comingSoon, fillers, moreCount }`.
- `spines` = up to 4 most-recent published essays of that category, newest first.
  Every entry has a real `title` and `href`.
- `comingSoon` = how many placeholder spines to render, such that
  `spines.length + comingSoon >= 3`. Zero when the shelf already has ≥3 real
  spines.
- `moreCount` = `count - spines.length`, floored at 0. **Coming-soon spines never
  contribute to `moreCount`.**
- Given essays in only one category, the other categories still return shelves —
  with `count: 0`, `spines: []`, and `comingSoon: 3`.
- Given no published essays at all, all three shelves return `count: 0` and
  `comingSoon: 3`. There is no empty-page case.
- `count` is always the true number of published essays in that category.
- Drafts never appear in `spines`, and never contribute to `count`.
- **A coming-soon entry never carries a title or href.** Assert this — inventing
  a title on a placeholder is the one thing this design must not do.
- Filler geometry is **deterministic given the shelf slug** — no
  `Math.random()`, so the build is reproducible and snapshot-stable.

Then implement to green.

Also add `tagsByFrequency(published)` — reuses `collectTags` from
`src/lib/topics.ts`, re-sorted by `count` descending then `label` ascending, and
returns each tag's display `size` (33px → 12px ramp) and `tone`
(`text` | `fire` | `sage` | `muted`) so the template stays logic-free.

```bash
git add -A
git commit -m "feat: shelf + tag-frequency helpers for the topics index (TDD)"
```

---

## Task 2: Shelf tokens

Add the six new tokens per spec §2 to `src/styles/tokens.css`, in both the light
and `[data-theme='dark']` blocks, with the same comment style as `--shadow-card`.

No component consumes them yet — this commit is tokens only.

```bash
git add -A
git commit -m "feat: add shelf spine/ledge tokens for the topics index"
```

---

## Task 3: `BookSpine.astro` + `ShelfLedge.astro`

`src/components/BookSpine.astro`:

- Props: `title`, `href`, `tone` (`a` | `b` | `c` | `soon`), `width`, `height`.
- **Real spine** (`tone` a/b/c, `href` present): renders an `<a>` wrapping the
  full spine — the whole book is the hit target. Vertical title, the two 56%
  rules, rest/hover shadows, `.18s` transition, visible `:focus-visible` ring.
- **Coming-soon spine** (`tone: 'soon'`, no `href`): renders a non-interactive
  element — no `<a>`, no hover elevation, not focusable. Filler-fill background,
  text `--muted-strong` (**not** `--muted` — it fails AA at 4.15:1 in light
  mode, spec §2), and **no** 56% rules.
- Not `aria-hidden` — "Coming soon" must reach the accessibility tree.
- All geometry via CSS custom properties set inline from props, so the scoped
  `<style>` holds the real rules.

`src/components/ShelfLedge.astro`: the 13px ledge bar, `aria-hidden="true"`.

Both fully static under `prefers-reduced-motion`.

```bash
git add -A
git commit -m "feat: BookSpine and ShelfLedge components"
```

---

## Task 4: `Shelf.astro`

Composes one category row: header (h2 + count + hairline + "Browse →"), the book
row, and the ledge.

- Header count label: `{n} essays` when `count >= 1`; **"Coming soon"** when
  `count === 0` (spec §5). Never "0 essays".
- Real spines first, then `comingSoon` placeholder spines.
- Filler books: `aria-hidden="true"`, no link, no hover. Optional texture only —
  never used to imply an unwritten essay.
- "+N more": `aria-hidden="true"`, rendered only when `moreCount > 0`.
- `Shelf` has **no empty state** — every shelf always renders books, real or
  coming-soon (spec §5). There is no page-level empty state either.
- Books overflow horizontally on narrow viewports without breaking the ledge —
  the row scrolls, the page body does not.

```bash
git add -A
git commit -m "feat: Shelf component with real and coming-soon spines"
```

---

## Task 5: Rewrite `/topics`

Rewire `src/pages/topics/index.astro` to the new composition: header (eyebrow,
h1, lede) → one `<Shelf>` per entry returned by `buildShelves` → tag cloud →
computed footer line.

Delete the old `.shelves` / `.shelf` / `.tags` / `.tag` styles and markup
entirely. Keep `max-width` consistent with the rest of the site.

Everything computed — counts, "+N more", tag sizes, footer. Nothing hardcoded.

- Eyebrow copy: "Sic Parvis Magna · Essays".
- Lede: "Everything I've been working through, arranged on shelves." — no shelf
  count interpolated (spec §4).
- Footer: essay count is the true published total; shelf count is
  `CATEGORIES.length`. Omit the "last shelved" clause when the total is 0.
- The tag cloud renders only real tags from real essays. If there are none, omit
  the whole "By tag" section rather than showing an empty row.

With today's content this page renders **three** shelves: one holding a real
spine plus coming-soon placeholders, two holding coming-soon placeholders only.
That is correct.

```bash
git add -A
git commit -m "feat: rebuild the topics index as bookshelves"
```

---

## Task 6: a11y + unit coverage

Extend `tests/a11y/routes.spec.ts` with a `/topics` contract:

- Each **real** titled spine is exactly one focusable link, and its accessible
  name is the essay title.
- **Coming-soon spines are not links and not focusable**, but their text IS in
  the accessibility tree (not `aria-hidden`).
- No coming-soon spine renders an essay title, and no real essay title appears
  on a non-link spine.
- Filler books, ledges, and "+N more" are hidden from the accessibility tree.
- Exactly one `h1`; shelf headings are `h2`.
- Tag cloud links have non-empty accessible names.
- `/topics` is axe-clean at `wcag2a` / `wcag2aa` / `wcag21aa` in **both** themes.
  Note: the per-theme loop fails fast, so after fixing a light-theme violation,
  re-run before assuming dark is clean.
- Reduced-motion: spine `transition-duration` computes to `0s`.

```bash
git add -A
git commit -m "test: a11y + semantics contract for the topics shelves"
```

---

## Task 7: Full green gate + format

Confirm the real script names in `package.json`, then:

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm test:a11y && pnpm lint
pnpm format
```

Every gate must genuinely execute. A missing script or a silent skip is a
**failure**, not a pass. Report actual output.

```bash
git add -A
git commit -m "polish: prettier formatting; full gate green for Phase 4.5"
```

---

## Finishing

1. Whole-branch review vs `origin/main`; resolve Critical/Important, re-review.
2. `superpowers:finishing-a-development-branch`.
3. Push and open the PR:

```bash
git push -u origin <phase-4-5-implementation-branch>
gh pr create --title "Phase 4.5 — topics as shelves" --body "Implements docs/superpowers/plans/2026-07-29-phase-4-5-topics-shelves.md. Rebuilds /topics as category bookshelves with titled essay spines, decorative fillers, and a frequency-sized tag cloud. Gate green: typecheck/test/build/a11y/lint."
```

4. Watch CI with `gh pr checks --watch` until green. **Verify via `gh`, not a
   local gate run** — local-green has twice not meant CI-green on this repo.

The executor implements on its own fresh feature branch/worktree cut from
updated `main` — not this docs branch, not `main`.

---

## Open items carried to implementation

- **Eyebrow copy** is an assumption ("Sic Parvis Magna · Essays"). The mockup's
  "The Margins · Essays" is design-tool placeholder. Owner may override.
- **Sparse shelves: settled by the owner on 2026-07-29** — all three shelves
  always render; slots without a real essay show a "Coming soon" spine
  (spec §5). No hidden shelves, no empty ledges, and Phase 4.5 is not held for
  more content.
- **Placeholder copy** defaults to "Coming soon" on every shelf. Owner may swap
  in per-shelf variants later (spec §5) — vary per shelf, never per spine.
- The `.thumbnail`, `WritingPanel.dc.html`, and `Directions B and C.dc.html`
  files in the Design project are unread and out of scope.
