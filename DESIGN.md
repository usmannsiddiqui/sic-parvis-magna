# Sic Parvis Magna — Design

## Color strategy
Restrained: near-neutral bg + one warm accent (firelight) used sparingly for
links/active states, one secondary (sage) for tags. Warmth comes from accent +
type + imagery, never from the body background (body is true white / deep navy).

## Tokens
Defined in `src/styles/tokens.css` as CSS custom properties, switched on
`[data-theme]`. Light is `:root` default; dark on `[data-theme="dark"]`.

## Type
Serif (Literata) carries the "read me slowly" register for body + headings.
Instrument Sans is the machine layer (nav, meta, tags, buttons). Amiri for
Arabic quotes (RTL, its own elevated typographic moment). Measure ~65–75ch.

## Motion
One signature move only: home-hero scroll-shrink (scale ~1→0.89 over ~420px),
progressive enhancement, disabled <760px, fully static under reduced-motion.
Elsewhere: gentle load fade + soft card-hover elevation. Article pages calm.

## Anti-slop guardrails (impeccable agrees)
No cream/sand body bg. No gradient text. No glassmorphism-by-default. No
tracked-uppercase eyebrows or 01/02/03 section numbers unless truly sequential.
Cards only where they are the best affordance.
