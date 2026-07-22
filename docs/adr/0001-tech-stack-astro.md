---
created: 2026-07-22
project: sic-parvis-magna
type: adr
status: accepted
---
# ADR 0001 — Tech Stack: Astro (content collections + MDX + Tailwind)

## Status
Accepted — 2026-07-22

> [!NOTE]
> 2026-07-22 — Island scope **expanded** by [ADR 0004](0004-animation-stack-gsap-only.md): in addition to the theme toggle and search box, scoped **animation islands** (GSAP) are permitted on pages that need cinematic motion. The zero-JS-default posture still holds everywhere else.

## Context

Sic Parvis Magna is a solo-authored, text-first essay blog. The writing is the
product; the site's job is to get out of its way while still feeling considered.
Core non-functional goals: fast, minimal unnecessary JavaScript, no CMS/backend
to run, an enforced content model, and first-class RSS/sitemap/SEO — closing the
gaps found in the inspiration-site audit (see the design doc §2).

The inspiration site (`generalintelligencecompany.com/writing`) runs Next.js App
Router + a Strapi headless CMS behind a custom `/api/blog` route. That backend is
overkill for a single author and reintroduces a server + database to maintain.

Alternatives considered: Next.js (static export) + Velite/Contentlayer2,
SvelteKit + mdsvex, Eleventy. Full write-up in the design doc §3–4.

## Decision

Build on **Astro**, with:
- Astro Content Collections (Zod-typed frontmatter) for essays, authored in MDX
- Tailwind CSS + a customized `@tailwindcss/typography` theme (own tokens)
- Shiki / `rehype-pretty-code` for code blocks
- `@astrojs/rss` + `@astrojs/sitemap` for feed + sitemap
- Pagefind for static, build-time full-text search (no backend, no third-party API)
- Interactive islands only for the theme toggle and search box; everything else
  ships as plain HTML

No CMS, no database, no server. Publishing an essay is a git commit.

## Consequences

**Positive:**
- Zero client JS by default — the "minimal JS" goal is the default, not a
  discipline to police (Astro's key advantage over Next.js static export here).
- Zod content collections make the content model *enforced*, not convention —
  the schema is the validation.
- RSS and sitemap are official integrations; the SEO plumbing the inspiration
  site skipped is first-class.
- Content lives as MDX in git — no CMS/DB/server to run or pay for.

**Negative / accepted tradeoffs:**
- Smaller "study the inspiration site's exact component code" story than
  Next.js would give — accepted, since we are deliberately *not* copying its
  CMS/custom-API architecture anyway.
- Astro is the less familiar framework of the two considered — accepted; the
  editorial surface is small (prose styles, cards, tag pills) and hand-built.

## Alternatives rejected

- **Next.js (static export) + Velite/Contentlayer2** — closest to the
  inspiration stack, but minimal-JS output takes discipline rather than being
  the default, and Contentlayer2's maintenance is less certain than Astro's
  first-party content collections.
- **SvelteKit + mdsvex** — lean output, but a smaller blog-starter reference
  ecosystem and a real learning curve.
- **Eleventy** — most minimal output, but a weak story for rich interactive
  components in prose (Arabic toggle / footnote popovers would be hand-wired
  vanilla JS).
