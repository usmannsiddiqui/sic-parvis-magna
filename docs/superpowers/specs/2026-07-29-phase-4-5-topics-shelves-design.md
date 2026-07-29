# Phase 4.5 — Topics as Shelves (design spec)

**Status:** draft · **Date:** 2026-07-29
**Source mockup:** Claude Design project `b988125c-3a39-4ae3-bce1-b95576ecff10`,
file `Topics.dc.html` ("Topics index design").
**Supersedes:** the current `/topics` layout (bordered category pills + flat tag
list) shipped in Phase 3b.

Replaces the Topics index with a bookshelf metaphor: each category is a physical
shelf, each essay a titled spine standing on a ledge, with a frequency-sized tag
cloud below.

---

## 1. What carries over from the mockup unchanged

These are exact values from `Topics.dc.html`. Implement them as written.

**Header**

| Element | Spec |
| --- | --- |
| Eyebrow | sans 11px / 600 / ls 2px / uppercase / `--fire`, margin-bottom 14px |
| `h1` "Topics" | serif 600 / 46px / line-height 0.95 / ls −0.6px |
| Lede | serif 15px / line-height 1.5 / `--muted` / `max-width: 33ch` |

**Shelf header row** — `display: flex; align-items: baseline; gap: 12px; margin-bottom: 18px`

| Element | Spec |
| --- | --- |
| Category name | serif 600 / 24px / line-height 1 / ls 0.2px / `--text` |
| Count | sans 11px / 500 / uppercase / ls 1.6px / `--muted` |
| Rule | `flex: 1; height: 1px; background: var(--border)` |
| "Browse →" | sans 11px / 600 / uppercase / ls 1.2px, underline on hover |

**Titled spine** — the essay link

- Width 44–48px, height 184–208px, `border-radius: 2px 2px 0 0`
- `background: var(--spine-a|b|c)`, `color: var(--spine-ink)`
- `display: flex; flex-direction: column; align-items: center; padding: 12px 0`
- Two rules at `width: 56%`, `border-top: 2px solid color-mix(in srgb, var(--spine-ink) 42%, transparent)` — one above the title, one below
- Title: `writing-mode: vertical-rl; text-orientation: mixed`, serif 600 / 14.5px / line-height 1 / ls 0.2px, `flex: 1; margin: 9px 0`, centred both axes
- Rest shadow: `inset 1px 0 0 color-mix(in srgb, #fff 22%, transparent), -2px 0 6px -3px var(--ledge-edge)`
- Hover shadow: `-3px 0 12px -3px var(--ledge-edge), inset 1px 0 0 color-mix(in srgb, #fff 32%, transparent)`
- Transition: `box-shadow .18s ease`

**Filler book** — decorative, no title

- Width 13–16px, height 164–186px, same radius
- `background: color-mix(in srgb, var(--text) 10%, var(--surface))`
- Shadow: `inset 1px 0 0 color-mix(in srgb, #fff 24%, transparent), -2px 0 5px -3px var(--ledge-edge)`
- No hover state

**Book row** — `display: flex; align-items: flex-end; gap: 5px; padding: 0 6px; position: relative; z-index: 2`

**Ledge** — `height: 13px; background: var(--ledge); border-radius: 0 0 3px 3px;`
`box-shadow: inset 0 2px 0 color-mix(in srgb, #fff 26%, transparent), 0 12px 18px -12px var(--ledge-edge);`
`border-bottom: 2px solid color-mix(in srgb, var(--text) 20%, transparent)`

**Tag cloud** — `display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 18px`,
serif, `line-height: 1`. Sizes ramp 33px → 12px by descending frequency. Colours
cycle `--text` (majority) with periodic `--fire`, `--sage`, `--muted` accents.
Underline on hover. Section separated by `border-top: 1px solid var(--border)`,
`padding-top: 30px`, preceded by a "By tag" label (sans 11px / 600 / ls 2px /
uppercase / `--muted`).

**Footer line** — sans 11px / ls 0.4px / `--muted`, margin-top 26px.

---

## 2. New tokens

Add to `src/styles/tokens.css`. Every other token the mockup uses already exists
in the repo at identical values — do not redefine them.

```css
/* light */
--spine-a: #96591f;   /* == --fire  */
--spine-b: #3c5c48;   /* == --sage  */
--spine-c: #241f1a;   /* == --text  */
--spine-ink: #ffffff;
--ledge: #e7e1d7;
--ledge-edge: rgba(0, 0, 0, 0.16);

/* dark */
--spine-a: #d99a54;
--spine-b: #7ea08a;
--spine-c: #e7e2d6;
--spine-ink: #12161c;
--ledge: #232b35;
--ledge-edge: rgba(0, 0, 0, 0.5);
```

Spine colours are deliberately aliases of `--fire` / `--sage` / `--text` rather
than direct references, so the shelf palette can drift from the link palette
later without touching either.

### Contrast — verified, all pass

| Pair | Light | Dark |
| --- | --- | --- |
| `--spine-ink` on `--spine-a` | 5.61 | 7.52 |
| `--spine-ink` on `--spine-b` | 7.46 | 6.29 |
| `--spine-ink` on `--spine-c` | 16.33 | 14.04 |
| `--muted` on `--bg` (12px tags, footer) | 4.64 | 5.71 |
| `--muted` on coming-soon spine fill | **4.15 — FAILS** | 4.61 |
| `--muted-strong` on coming-soon spine fill | 5.24 | 4.61 |
| `--fire` on `--bg` | 5.61 | 7.52 |
| `--sage` on `--bg` | 7.46 | 6.29 |

Light `--muted` at 4.64 is the tightest margin on the page. Do not darken the
page background or lighten `--muted` without re-checking it.

---

## 3. What must change from the mockup

The mockup is a presentation artifact, not a page. These are not optional.

1. **Drop the two-card comparison shell.** The mockup renders light and dark
   side by side, each in a `[data-topic-root]` wrapper carrying its own token
   block, on a `#d8d4cd` stage. The real page is one instance using the site's
   existing `:root` / `:root[data-theme="dark"]` tokens. Delete the wrapper, the
   stage, and both "Light" / "Dark" pills.
2. **Delete the `<helmet>` font `<link>`.** Literata and Instrument Sans are
   already wired in `BaseLayout`. Loading Google Fonts again would be a second
   network round-trip and a FOUT.
3. **`style-hover="…"` is not real HTML.** It is a Claude Design `support.js`
   affordance. Every occurrence becomes a real `:hover` rule.
4. **Inline `style` attributes must become classes** in a scoped `<style>`
   block. Repo convention is Tailwind-free scoped styles + tokens (Phase 4).
5. **Spines must be links.** In the mockup a spine is a `<div>` and only
   "Browse →" is anchored. Each titled spine becomes an `<a>` to
   `/writing/<slug>` wrapping the whole spine, with a visible focus ring.
6. **`h3` → `h2`.** The mockup jumps `h1` → `h3` with nothing between. axe's
   `heading-order` is a best-practice rule and will not fail the current gate
   (`wcag2a` / `wcag2aa` / `wcag21aa`), but the skip is gratuitous.
7. **Decorative elements get `aria-hidden="true"`:** filler books, the ledge,
   and the "+N more" label. The shelf heading already states the real count, so
   "+N more" is redundant to a screen reader.
8. **Everything is computed, never hardcoded.** Counts, "+N more", the tag
   cloud, and the footer line all derive from the content collection.
9. **Reduced motion.** Keep the spine `box-shadow` transition behind
   `@media (prefers-reduced-motion: reduce)`, per the Phase 4 convention.

---

## 4. Copy

The mockup's eyebrow reads **"The Margins · Essays"** — placeholder from the
design tool, not this site. Ship **"Sic Parvis Magna · Essays"** unless the owner
supplies different wording.

Lede — the mockup's "…arranged on three shelves" hardcodes a count that is now
wrong (§5). Ship "Everything I've been working through, arranged on shelves."
Do not interpolate a shelf count into the lede; the footer already carries it.

Footer — `{N} essays across {M} shelves · last shelved {Month Year}`, all
computed. Omit the "last shelved" clause when there are zero published essays.

---

## 5. Coming-soon spines — owner decision, 2026-07-29

The mockup shows 14 / 9 / 23 essays across three stocked shelves. The site
currently has **one** real essay.

**Decision: always render all three shelves. Slots without a real essay get a
spine labelled "Coming soon".** No shelf is hidden, no ledge is left bare.

This is honest because the placeholder states plainly that nothing is there yet.
The rule that still holds absolutely: **a spine carrying an essay title must be
a real published essay.** Never invent a title. "Coming soon" is not a title —
it is the absence of one, said out loud.

Rules:

- **Every `CATEGORIES` member renders a shelf, always**, in `CATEGORIES` order.
  There is no hidden-shelf case and no page-level empty state.
- **Real spines first** — up to 4 titled spines, newest first, each an `<a>` to
  its essay.
- **Pad with coming-soon spines** until the shelf holds at least 3 books. A
  coming-soon spine is **not a link** and has no hover elevation.
- **"+N more"** appears only when real `count` exceeds the real spines shown.
  Coming-soon spines never contribute to it.
- **Thin decorative fillers** (`aria-hidden`, untitled, unlinked) may still
  interleave for texture, but they are optional once coming-soon spines carry
  the shelf. Never use an untitled filler to imply an unwritten essay.
- **The count label always states the true published count.** When a category
  has zero published essays the label reads **"Coming soon"** rather than
  "0 essays".

### Coming-soon spine treatment

- Background: `color-mix(in srgb, var(--text) 10%, var(--surface))` — the filler
  fill, so it reads as an unlabelled book rather than a coloured one. Never
  `--spine-a/b/c`; those are reserved for real essays.
- Text: vertical, serif 600 / 14.5px like a real spine, colour **`--muted-strong`**.
- **Not `--muted`.** `--muted` on this background is **4.15:1** in light mode and
  fails WCAG AA. `--muted-strong` measures **5.24:1** light / **4.61:1** dark and
  passes. This is exactly the case `--muted-strong` was added for in Phase 4.
- Omit the two 56% rules that real spines carry — the placeholder should read as
  a blank book, not a bound one.
- No `aria-hidden`: "Coming soon" is meaningful information, not decoration. It
  must reach the accessibility tree. It simply is not focusable or clickable.

### Copy

Default to **"Coming soon"** on every placeholder spine. If the owner wants
variety later, vary it *per shelf*, not per spine — three different jokes on one
ledge reads as noise. Candidates the owner may swap in: "Being written",
"Not yet", "In the margins", "Soon, God willing".

Consequences for §4 copy: the lede must not say "three shelves"; the footer's
shelf count is `CATEGORIES.length` and its essay count is the true published
total.

---

## 6. Out of scope

- `/topics/[topic].astro` (the per-topic page) is untouched.
- `WritingPanel.dc.html` and `Directions B and C.dc.html` in the same Design
  project are not part of this phase.
- The homepage cover image and the "coming soon" card state are separate work.
