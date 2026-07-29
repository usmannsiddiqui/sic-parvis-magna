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

- `buildShelves(published)` returns one entry per `CATEGORIES` member **that has
  at least one published essay**, in `CATEGORIES` order. Categories with zero
  published essays are omitted from the result entirely (spec §5).
- Each shelf: `{ label, slug, count, spines, fillers, moreCount }`.
- `spines` = up to 4 most-recent published essays of that category, newest first.
- `moreCount` = `count - spines.length`, floored at 0.
- Given essays in only one category, the result has **length 1**, not
  `CATEGORIES.length`.
- Given no published essays at all, the result is `[]` — the page renders its
  single empty state, not a list of empty ledges.
- A shelf with 1–2 essays yields those spines plus enough fillers to reach the
  minimum row width; with ≥3 it interleaves per the spec.
- `count` is always the true number of published essays in that category.
- Drafts never appear, and never contribute to `count`.
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

- Props: `title`, `href`, `tone` (`a` | `b` | `c`), `width`, `height`.
- Renders an `<a>` wrapping the full spine — the whole book is the hit target.
- Vertical title, the two 56% rules, rest/hover shadows, `.18s` transition.
- Visible focus ring (`:focus-visible`), not just the hover shadow.
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

- Filler books: `aria-hidden="true"`, no link, no hover.
- "+N more": `aria-hidden="true"`, rendered only when `moreCount > 0`.
- `Shelf` has **no empty state** — `buildShelves` never emits an empty shelf
  (spec §5). The page-level empty state lives in Task 5.
- Books overflow horizontally on narrow viewports without breaking the ledge —
  the row scrolls, the page body does not.

```bash
git add -A
git commit -m "feat: Shelf component with spines, fillers, and empty state"
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
- Footer shelf count = number of **rendered** shelves, not `CATEGORIES.length`.
- When `buildShelves` returns `[]`, render the page-level empty state
  ("Nothing shelved yet.") in place of the shelf list. The header and tag cloud
  sections still render; the tag cloud will simply be empty.

With today's content this page renders **one** shelf. That is correct, not a
bug — do not pad it to three.

```bash
git add -A
git commit -m "feat: rebuild the topics index as bookshelves"
```

---

## Task 6: a11y + unit coverage

Extend `tests/a11y/routes.spec.ts` with a `/topics` contract:

- Each titled spine is exactly one focusable link, and its accessible name is
  the essay title.
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
- **Sparse shelves: settled by the owner on 2026-07-29** — render only shelves
  that have essays; new shelves appear as categories get used (spec §5). No
  empty ledges, and Phase 4.5 is not held for more content.
- The `.thumbnail`, `WritingPanel.dc.html`, and `Directions B and C.dc.html`
  files in the Design project are unread and out of scope.
