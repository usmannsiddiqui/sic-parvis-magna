---
created: 2026-07-22
project: sic-parvis-magna
type: adr
status: accepted
---
# ADR 0003 — Imagery as Core: Original AI-Assisted Pixel-Art Covers

## Status
Accepted — 2026-07-22

Supersedes the design doc §7 default recommendation of a typography-led site
with *no bespoke illustration at launch*. Imagery is now a first-class part of
the experience, not optional decoration.

## Context

Image-led article cards are the thing Muhammad most loves about the inspiration
site (`generalintelligencecompany.com/writing`): full-bleed cover art with an
overlaid text panel. He wants that to be central to Sic Parvis Magna, not a
nice-to-have.

Constraints:
- The mood-board images that inspired the look are watermarked to real artists
  and cannot ship in a public repo. Muhammad's Pinterest board stays a **private
  mood board only** — never an asset, never published.
- As a solo author, hand-commissioning a bespoke cover per essay is not
  sustainable, and it would pull focus onto art before essays exist.
- The blog's ethos is discipline, spirituality, reflection, groundedness — so
  the imagery approach was checked for values-congruence, not adopted by default.

## Decision

Every essay **normally** gets an **original cover image**, produced as
**AI-assisted pixel art generated from Muhammad's own detailed briefs**, in a
coherent house style.

- **Pinterest = private mood board only.** Not published, not an asset.
- **Cards borrow GIC's *structure*** (full-bleed art + overlaid text panel) but
  use **our own** palette, typography, metadata, and visual identity — not GIC's.
- **AI involvement is disclosed** somewhere on the site (honesty baked into the
  surface, congruent with the groundedness ethos). Muhammad is at peace with
  AI-assisted covers and has been going deep on AI tooling.
- **A polished image-free typographic fallback always exists.** `coverImage`
  stays **optional** in the Zod content schema, so missing art never blocks a
  build or a publish. "Every essay gets a cover" is an *editorial norm*, not a
  schema constraint.

## Consequences

**Positive:**
- Distinctive, image-forward identity — the part of GIC that Muhammad loves,
  made his own.
- Sustainable for a solo author (briefs + AI generation, not per-essay
  commissions).
- Honest, via disclosure — fits the blog's values rather than fighting them.
- Reinforced the **light-first warm** base direction: vivid pixel covers pop
  hardest against a light gallery (see design doc visual direction).

**Negative / accepted tradeoffs:**
- **Purely AI-generated images may not be copyrightable** (esp. US), so the ND
  term of the essay license is likely **unenforceable on the cover art itself**.
  The essay *text* it accompanies is still governed by CC BY-NC-ND — see
  [ADR 0002](0002-license-split-code-and-writing.md).
- **Style consistency must be actively maintained** — a coherent house style
  across covers, or the site reads as a grab-bag. (GIC deliberately varied style
  per post; whether we do the same or hold one style is parked for the visual
  pass.)
- Image weight on every card — mitigated by Astro's built-in image optimization
  pipeline.

## Open (parked for the visual-design pass)
- One coherent house style across all covers vs. deliberate per-essay variation.
- Which AI tool(s) / brief format produce the house style.
- Where and how prominently the AI-art disclosure appears.
