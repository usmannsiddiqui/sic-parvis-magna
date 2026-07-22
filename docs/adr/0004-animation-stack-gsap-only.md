---
created: 2026-07-22
project: sic-parvis-magna
type: adr
status: accepted
---
# ADR 0004 — Animation Stack: GSAP Only (no Framer Motion / React)

## Status
Accepted — 2026-07-22

Expands the island scope set in [ADR 0001](0001-tech-stack-astro.md) (originally
"islands only for theme toggle + search") to include scoped animation islands.

## Context

Muhammad wants expressive, cinematic scroll-linked motion — a featured-hero
scale/dock effect and similar — inspired by the GIC site. Astro was chosen
specifically for **zero client JS by default** (ADR 0001), so any animation
library is a deliberate opt-in with a real payload cost. Gemini's spec suggested
**Framer Motion or GSAP**; Muhammad initially asked for both.

## Decision

Adopt **GSAP** (framework-free vanilla JS) as the **sole** animation library.

- Loaded **only in scoped Astro islands** on the pages that actually need it —
  never site-wide.
- Always gated by `prefers-reduced-motion`.
- **CSS scroll-driven animation** (`animation-timeline`) is preferred where it
  suffices (zero JS); GSAP is used where CSS can't yet express the effect.

**Do not adopt Framer Motion.** Its core strength is animating **React
components**; on a static Astro blog with almost no React, that strength has
nothing to grab, and using it drags a **React runtime** onto every page it
touches — directly undercutting the zero-JS-default rationale for choosing Astro.
It also duplicates GSAP's scroll capabilities. Running both is redundant weight
for one job.

## Consequences

**Positive:**
- Full cinematic motion capability, framework-agnostic, one tool to learn.
- No React runtime tax — keeps the zero-JS-default posture intact everywhere
  except the specific islands that opt in.

**Negative / accepted tradeoffs:**
- GSAP is still client JS (~tens of KB where used) — mitigated by island-scoping,
  using it only where CSS can't, and reduced-motion gating.

## Revisit if
- A genuinely React-driven interactive surface emerges later that needs
  declarative component animation — then Framer Motion may be added, **scoped to
  that one island**, not project-wide. Revisit this ADR at that point.

## Parked (visual-design pass)
- The *amount* and taste of motion (how cinematic vs. restrained) — a design
  decision, separate from this library choice.
