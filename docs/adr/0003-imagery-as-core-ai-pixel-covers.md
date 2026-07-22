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
- Reinforced a **light-first** direction — default base is **stark white / true
  off-white (chroma 0), NOT cream**: vivid pixel covers pop hardest against a
  clean light gallery. (Cream `#f6f1e6` was tried in the wireframes and rejected —
  Muhammad disliked it, and the impeccable skill flags a warm cream body bg as the
  2026 AI-slop tell. Warmth lives in covers, accents, and type, not the body bg.)
  A toggle switches to a full dark mode (navy `#12161c`). Default = light. See the
  design doc visual direction.

**Negative / accepted tradeoffs:**
- **Purely AI-generated images may not be copyrightable** (esp. US), so the ND
  term of the essay license is likely **unenforceable on the cover art itself**.
  The essay *text* it accompanies is still governed by CC BY-NC-ND — see
  [ADR 0002](0002-license-split-code-and-writing.md).
- **Style consistency must be actively maintained** — a coherent house style
  across covers, or the site reads as a grab-bag. (GIC deliberately varied style
  per post; we hold ONE coherent style — decided in the visual-design pass, see
  Resolved below.)
- Image weight on every card — mitigated by Astro's built-in image optimization
  pipeline.

## Resolved in the visual-design pass (Session 3 — 2026-07-22)
- **House style: one coherent style across all covers**, not per-essay variation.
  Constant — pixel medium, a cohesive warm/natural palette (firelight/sage/night/
  golden-hour/verdant, not strictly dark), and a felt sense of quiet vastness.
  Variable — the scene per essay, from two families: a solitary figure dwarfed by
  a large field, or a wide pixelated landscape/scenery (incl. brighter daytime).
  Painterly/anime references inform mood and lighting only; they are not an
  alternate cover medium.
- **AI-art disclosure: a colophon + a quiet per-cover credit.** A colophon (its
  own short page, or a section of `/about`) explains the imagery approach once;
  a small "Cover: original pixel art, AI-assisted" line sits under each essay's
  hero image; nothing appears on the `/writing` cards. Honest, not performative —
  no per-card badge.

## Still open
- Which AI tool(s) / brief format produce the house style — settled when covers
  are actually generated.
