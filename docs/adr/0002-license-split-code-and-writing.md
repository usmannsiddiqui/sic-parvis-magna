---
created: 2026-07-22
project: sic-parvis-magna
type: adr
status: accepted
---
# ADR 0002 — License Split: MIT (code) + CC BY-NC-ND 4.0 (essays)

## Status
Accepted — 2026-07-22

## Context

The repo is public and open-source, but it contains two very different kinds of
work: the **site code/theme** and the **essays themselves**. A single repo
license would wrongly imply the same terms cover both — e.g. MIT on the repo
would let anyone republish or sell the writing.

Muhammad's intent for the writing, in his own words: he wants people to **read
and share it freely and benefit from it**, but **not make money off it**, and
**not change his words**. An early lean toward "all rights reserved" was
corrected in grilling: pure all-rights-reserved is the *opposite* of "share
freely" — it grants no redistribution permission at all (readers could only link
or quote small fair-use excerpts). The requirements mapped precisely onto a
specific Creative Commons license.

## Decision

Split the license by content type, stated explicitly in the README:

- **Code / theme → MIT.** Simplest permissive license; Apache-2.0's patent grant
  is irrelevant for a blog theme.
- **Essays / writing → CC BY-NC-ND 4.0.**
  - **BY** — reuse requires attribution.
  - **NC** — no commercial use ("no money off it").
  - **ND** — no derivatives; the text may only be shared unchanged ("don't
    change my words").
  - The license *proactively grants* redistribution of verbatim copies with
    credit — so people can share freely without asking each time.

The README must state the split clearly so nobody assumes MIT covers the writing.

## Consequences

**Positive:**
- Delivers exactly the stated intent: words protected (ND), free non-commercial
  sharing granted (BY-NC), integrity preserved.
- Contributors to the *code* get clean, familiar MIT terms.
- Legible to outside readers of a public OSS repo from the first commit.

**Negative / accepted tradeoffs:**
- **ND blocks translations, excerpting into new works, and remixes** — accepted;
  Muhammad prioritized keeping his words intact over adaptation reach.
- **"NonCommercial" is legally fuzzy in CC** (e.g. blog-with-ads, paid courses)
  and can chill some good-faith uses — accepted; the no-money intent is explicit
  and outweighs the soft edge.

## Implementation notes

- `LICENSE` (repo root) → MIT, covering code only, with a header line clarifying
  it does not cover `src/content/**` (or wherever essays live).
- `LICENSE-writing` (or a clearly-labeled section) → CC BY-NC-ND 4.0 text/link,
  covering the essay content.
- README states the split in plain language up top.
- Exact essay-content path to be fixed when the content collection is scaffolded
  (Phase 1–2).
- **Cover art is AI-generated** (see [ADR 0003](0003-imagery-as-core-ai-pixel-covers.md)). Purely AI-generated images may not be copyrightable, so the **ND term
  is likely unenforceable on the covers themselves** — but the essay *text* they
  accompany is still governed by CC BY-NC-ND.
