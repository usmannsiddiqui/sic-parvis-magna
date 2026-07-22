---
created: 2026-07-22
project: sic-parvis-magna
type: adr
status: accepted
---
# ADR 0005 — Arabic Content Handling: Block Quotes + Lightweight Inline

## Status
Accepted — 2026-07-22

## Context

Arabic is a real, recurring part of this blog's writing (spirituality,
Islam-influenced reflection). It appears two ways:

1. **Full passages** — Qur'anic ayahs, hadith, duas, quotations — set apart from
   the English body.
2. **Individual words / short terms inside English sentences** — e.g. صبر
   (*sabr*), توكل, نية, تقوى — woven into otherwise-LTR prose.

**Routinely-mixed bilingual paragraphs are explicitly *not* a launch
requirement.** An early framing offered a false binary (block-quotes-only vs.
full bidirectional mixed layout); Muhammad correctly identified the sensible
middle. Getting RTL/bidi wrong is easy and visibly broken (reordered punctuation,
wrong font, wrong language metadata), so the handling is decided up front.

## Decision

Two authoring affordances, both from launch:

1. **`<ArabicQuote>` block component** — for ayahs, hadith, duas, and longer
   passages. An elevated typographic moment: larger size, the **Amiri** Arabic
   typeface, `dir="rtl"`, `lang="ar"`. Optionally paired with an English
   translation line beneath.

2. **Minimal inline Arabic mechanism** — for single words / short phrases inside
   English (LTR) sentences. Must set:
   - the **Amiri** font for the Arabic run,
   - `lang="ar"`,
   - **bidirectional isolation** via `<bdi>` / `unicode-bidi: isolate`, so the
     Arabic run cannot reorder surrounding Latin punctuation, numbers, or
     brackets.
   Commonly paired with a Latin transliteration in emphasis, e.g. صبر (*sabr*).

**Do not** build general bidirectional mixed-paragraph layout. If essays ever
routinely alternate languages mid-paragraph, revisit this ADR.

## Consequences

**Positive:**
- Natural, correct Arabic from day one — both set-apart passages and inline
  terms — without awkward transliteration-only writing.
- Small, contained scope: two well-defined components, not a general i18n system.

**Requires:**
- **Amiri self-hosted and subset for the Arabic range** in the font pipeline
  (the Latin body font is unaffected).
- Both components honor the same `lang` / `dir` / bidi-isolation contract.
- A seed essay must exercise **both** a block ayah and an inline term to verify
  rendering (part of the Phase 2 "exercise every feature" seed essay).
