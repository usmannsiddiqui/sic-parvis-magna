# Phase 0–1: Scaffold & Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every UI surface is built and reviewed with the **impeccable** skill; every unit of logic is built with **superpowers:test-driven-development**.

**Goal:** Take the Sic Parvis Magna repo from an empty scaffold to a themed, accessible, empty Astro shell — a static site that builds, serves, honors light/dark theming with a persisted toggle, self-hosts its fonts, and has its one signature home-hero motion prototyped behind a decision gate.

**Architecture:** Astro 5 static site (zero client JS by default). Styling via Tailwind v4 (Vite plugin) with design tokens expressed as CSS custom properties on `[data-theme]`. Exactly two client islands will exist by end of Phase 1: the theme toggle (vanilla TS) and the GSAP home-hero motion (island-scoped, progressive enhancement). Content, routes, and components come in later phases.

**Tech Stack:** Astro 5 · Tailwind v4 (`@tailwindcss/vite`) · `@tailwindcss/typography` · Fontsource (Literata, Instrument Sans, Amiri) · GSAP 3 (+ ScrollTrigger) · Vitest (logic) · Playwright + axe-core (a11y) · TypeScript (strict) · Prettier + ESLint · pnpm.

---

## Global Constraints

Every task's requirements implicitly include this section. Values copied from `build-order.md` (vault) and the synced ADRs in `docs/adr/`.

- **Package manager: pnpm.** Never npm or yarn. Commit `pnpm-lock.yaml`.
- **Stack is locked** — Astro (ADR 0001), **GSAP only, no Framer Motion** (ADR 0004). Zero client JS by default; islands only for the theme toggle and the home-hero motion.
- **Theme:** light is the **default** — stark white / true off-white `#ffffff`, **NOT cream** — with a **toggle** to dark navy `#12161c`. Honor `prefers-color-scheme` on first visit; persist the user's explicit choice. Fully static under `prefers-reduced-motion`.
- **Palette (canonical — from design.md §8 / build-order):**
  | Token | Light | Dark |
  |---|---|---|
  | Background | `#ffffff` | `#12161c` |
  | Text | `#241f1a` | `#e7e2d6` |
  | Accent — firelight | `#96591f` | `#d99a54` |
  | Accent-2 — sage | `#3c5c48` | `#7ea08a` |
  > The approved wireframe used lighter light-mode accents (`#c17f36` firelight, `#5f8570` sage). This plan uses the **locked docs values** (`#96591f`/`#3c5c48`) — they are darker and therefore higher-contrast on white. Task 1.7 (contrast gate) is the authority that confirms or tunes them; design.md explicitly marks the palette a "starting proposal, run through a real contrast checker."
- **Type:** serif body + headings = **Literata**; sans (nav/meta/tags/buttons) = **Instrument Sans** (confirmed 2026-07-22, supersedes the earlier "Inter/Public Sans" note in the docs — the wireframe shipped Instrument Sans and it was approved). Arabic = **Amiri**, RTL (ADR 0005). Body measure ~65–75ch, line-height ~1.6–1.7.
- **Motion:** restrained; exactly one signature move — a short **home-only** featured-hero scroll gesture (image starts near-full-width, settles to grid width as you scroll ~420px; scale ≈ 1 → 0.89). Progressive enhancement (static baseline, effect layers on top). **Prototype-gated in Phase 1** — if it reads gimmicky, downgrade without reopening motion direction. No pinned scroll, no scroll-jacking, no parallax. Disabled below 760px viewport width. Fully static under `prefers-reduced-motion`.
- **Accessibility:** WCAG AA minimum, semantic landmarks, skip-to-content link, real focus states, `dir="rtl"`/`lang="ar"` on Arabic, full reduced-motion support.
- **Terminology:** always "essay" (never post/article); the section is "Writing". Categories: Discipline · Faith · Reflections (Notes deferred). (Not exercised until Phase 2, but keep copy consistent.)
- **Licensing:** MIT (code) + CC BY-NC-ND 4.0 (essays) (ADR 0002). Public repo from commit one — docs/licensing/quality must hold up to outside eyes.
- **Git:** branch per task (kebab-case) → PR → merge commit; never commit to `main` directly. **No `Co-Authored-By` / "Generated with" lines** in commits or PR bodies.
- **Docs:** the Obsidian vault is the single source of truth; repo `docs/` holds one-way synced copies only. This plan is the exception — it is an executor artifact authored in-repo.

### impeccable governance (locked-decisions-win)

impeccable is installed (`.claude/skills/impeccable/`, v4.0.0-alpha.10) with its de-AI-slop detector hook wired. Use it for **craft quality and its anti-slop rules only**. Where any impeccable default conflicts with a locked decision above, **the locked decision wins**:

- Do **not** run `palette.mjs` to seed a brand color — our palette is committed (impeccable's own Setup step 6 says to skip it when committed brand colors exist).
- Do **not** let impeccable relitigate dark-vs-light, the stack, the fonts, or the motion budget.
- **Do** use impeccable's `craft`/`audit`/`polish` flows and its anti-slop bans (it already agrees with us: it flags cream body bg as the 2026 AI-slop tell — we chose white). Use OKLCH when expressing/refining color.

---

## Current state (already done this session — do not redo)

- Repo `main` is at `c680a22`; remote `origin` → `github.com/usmannsiddiqui/sic-parvis-magna` is wired; ADRs are synced into `docs/adr/`.
- **impeccable is installed** into `.claude/skills/impeccable/` (project scope, Claude provider) and its detector hook was merged into `.claude/settings.local.json` (PostToolUse on Edit/Write/MultiEdit + a Stop deep pass). This satisfies build-order's "wire impeccable into the repo" precondition. Task 0.1 decides how it is tracked in git.

---

## File Structure

Files created/modified across both phases, by responsibility:

```
sic-parvis-magna-main/
├─ .gitignore                        # 0.1 — ignore node_modules, dist, local settings, vendored skill
├─ .env.example                      # 0.5 — documented empty env template
├─ .npmrc                            # 0.2 — pin pnpm behavior (engine-strict, exact save off)
├─ package.json                      # 0.2 — pnpm scripts + deps
├─ pnpm-lock.yaml                    # 0.2 — committed lockfile
├─ tsconfig.json                     # 0.2 — extends astro/tsconfigs/strict
├─ astro.config.mjs                  # 0.2 (base) → 1.1 (tailwind vite plugin)
├─ .prettierrc.json                  # 0.3 — prettier + astro plugin
├─ .prettierignore                   # 0.3
├─ eslint.config.js                  # 0.3 — flat config, astro plugin
├─ LICENSE                           # 0.4 — MIT (code)
├─ LICENSE-content                   # 0.4 — CC BY-NC-ND 4.0 (essays)
├─ README.md                         # 0.6 — what this is, run locally, license split, design tooling
├─ playwright.config.ts              # 1.6 — a11y test runner config
├─ vitest.config.ts                  # 1.4 — unit test config
├─ public/
│  └─ favicon.svg                    # 0.2 — placeholder favicon (ember glyph later)
├─ src/
│  ├─ styles/
│  │  ├─ tokens.css                  # 1.1 — CSS custom properties per theme
│  │  └─ global.css                  # 1.1 — @import tailwind + tokens + base element styles
│  ├─ lib/
│  │  └─ theme.ts                    # 1.4 — pure theme-resolution logic (TESTED)
│  ├─ components/
│  │  ├─ ThemeToggle.astro           # 1.5 — toggle island markup + inline island script
│  │  └─ HomeHero.astro              # 1.9 — hero markup + GSAP island script
│  ├─ layouts/
│  │  └─ BaseLayout.astro            # 1.3 — html shell, landmarks, skip link, font preload, no-FOUC script
│  └─ pages/
│     └─ index.astro                 # 0.2 (blank) → 1.3/1.9 (shell + hero prototype)
└─ tests/
   ├─ unit/
   │  └─ theme.test.ts               # 1.4 — Vitest unit tests for theme.ts
   └─ a11y/
      └─ shell.spec.ts               # 1.6 — Playwright + axe: contrast (both themes), keyboard, reduced-motion
```

---

# PHASE 0 — Repo setup & scaffold

**Exit:** clean scaffold builds (`pnpm build`) and runs (`pnpm dev` serves a blank page); licenses + README in place; git hygiene set.

---

### Task 0.0: Catch the phase-zero worktree up to main

**Files:** none (git state only).

**Why:** `.worktrees/phase-zero` sits at `0a43c62` (pre-ADRs). It must match `main` before any implementation happens there.

- [ ] **Step 1: Inspect worktree state**

Run:
```bash
git worktree list
```
Expected: `.worktrees/phase-zero` shows commit `0a43c62 [phase-zero]`.

- [ ] **Step 2: Fast-forward the phase-zero branch to main**

Run:
```bash
git -C .worktrees/phase-zero fetch origin
git -C .worktrees/phase-zero merge --ff-only origin/main
```
Expected: `phase-zero` now points at the same commit as `origin/main` (currently `c680a22` or later). If ff-only fails (the worktree has divergent commits), stop and report — do not force.

- [ ] **Step 3: Verify**

Run:
```bash
git worktree list
```
Expected: `.worktrees/phase-zero` and the main working tree show the same commit hash.

> No commit in this task — it only advances an existing branch pointer.

---

### Task 0.1: Git hygiene — `.gitignore` and decide impeccable tracking

**Files:**
- Create: `.gitignore`

**Interfaces:**
- Produces: a repo that never stages `node_modules/`, `dist/`, local settings, the vendored impeccable skill, or test artifacts. Every later task's `git add` relies on this.

**Decision baked in (recommended):** the vendored impeccable skill (`.claude/skills/`) and local settings (`.claude/settings.local.json`) are **git-ignored**, not committed. Rationale: it is dev tooling, re-installable with one command, and this is a public *product* repo — keep it product-only. The install command is documented in the README (Task 0.6). If Muhammad prefers to vendor the skill into git instead, remove the two `.claude/` lines below and commit the tree — but confirm before doing so.

- [ ] **Step 1: Create `.gitignore`**

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
.astro/

# Environment
.env
.env.*
!.env.example

# Test artifacts
test-results/
playwright-report/
playwright/.cache/
coverage/

# Editor / OS
.DS_Store
*.log
.vscode/*
!.vscode/extensions.json

# Design tooling (impeccable) — installed locally via `npx impeccable install`, not vendored
.claude/skills/
.claude/settings.local.json
.impeccable/
```

- [ ] **Step 2: Verify the working tree is clean of ignored noise**

Run:
```bash
git status --short
```
Expected: the impeccable install under `.claude/` no longer appears as untracked; only intended files show.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore and keep design tooling untracked"
```

---

### Task 0.2: pnpm + Astro base scaffold

**Files:**
- Create: `package.json`, `.npmrc`, `tsconfig.json`, `astro.config.mjs`, `src/pages/index.astro`, `public/favicon.svg`
- Create (generated): `pnpm-lock.yaml`

**Interfaces:**
- Produces: `pnpm dev` / `pnpm build` / `pnpm preview` scripts; a strict TS project; a blank home page at `/`. All later tasks build on this scaffold.

We scaffold **manually** (deterministic) rather than via the interactive `create astro` wizard.

- [ ] **Step 1: Create `.npmrc`**

```ini
engine-strict=true
save-exact=false
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "sic-parvis-magna",
  "type": "module",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.11.0"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "typecheck": "astro check",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:a11y": "playwright test"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Create `astro.config.mjs` (base — Tailwind added in Task 1.1)**

```js
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://sic-parvis-magna.pages.dev', // placeholder; custom domain set in Phase 8
  trailingSlash: 'never',
});
```

- [ ] **Step 5: Create a placeholder favicon `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#12161c"/>
  <circle cx="16" cy="18" r="5" fill="#d99a54"/>
</svg>
```

- [ ] **Step 6: Create a blank home page `src/pages/index.astro`**

```astro
---
// Blank scaffold page — replaced by the themed shell in Phase 1.
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Sic Parvis Magna</title>
  </head>
  <body>
    <main>
      <p>Sic Parvis Magna — coming soon.</p>
    </main>
  </body>
</html>
```

- [ ] **Step 7: Install dependencies**

Run:
```bash
pnpm install
```
Expected: `node_modules/` created, `pnpm-lock.yaml` written, no errors.

- [ ] **Step 8: Verify the build succeeds**

Run:
```bash
pnpm build
```
Expected: `dist/index.html` produced; exit code 0.

- [ ] **Step 9: Verify the dev server serves the page**

Run:
```bash
pnpm dev &
sleep 4
curl -sf http://localhost:4321/ | grep -q "coming soon" && echo "DEV OK"
kill %1
```
Expected: prints `DEV OK`.

- [ ] **Step 10: Commit**

```bash
git add package.json .npmrc tsconfig.json astro.config.mjs pnpm-lock.yaml src/pages/index.astro public/favicon.svg
git commit -m "feat: scaffold Astro project with pnpm and strict TypeScript"
```

---

### Task 0.3: Prettier + ESLint

**Files:**
- Create: `.prettierrc.json`, `.prettierignore`, `eslint.config.js`
- Modify: `package.json` (add devDeps)

**Interfaces:**
- Produces: `pnpm format` / `pnpm format:check` / `pnpm lint` all run clean on the scaffold.

- [ ] **Step 1: Add dev dependencies**

Run:
```bash
pnpm add -D prettier prettier-plugin-astro eslint eslint-plugin-astro @eslint/js typescript-eslint astro-eslint-parser
```
Expected: added to `devDependencies`; lockfile updated.

- [ ] **Step 2: Create `.prettierrc.json`**

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-astro"],
  "overrides": [
    {
      "files": "*.astro",
      "options": { "parser": "astro" }
    }
  ]
}
```

- [ ] **Step 3: Create `.prettierignore`**

```gitignore
dist/
.astro/
pnpm-lock.yaml
node_modules/
.claude/
```

- [ ] **Step 4: Create `eslint.config.js` (flat config)**

```js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
  {
    ignores: ['dist/', '.astro/', 'node_modules/', '.claude/', 'playwright-report/', 'test-results/'],
  },
];
```

- [ ] **Step 5: Run formatter and linter**

Run:
```bash
pnpm format
pnpm lint
```
Expected: format rewrites files idempotently; `pnpm lint` exits 0 (no errors).

- [ ] **Step 6: Commit**

```bash
git add .prettierrc.json .prettierignore eslint.config.js package.json pnpm-lock.yaml
git commit -m "chore: add Prettier and ESLint with Astro support"
```

---

### Task 0.4: License files

**Files:**
- Create: `LICENSE` (MIT), `LICENSE-content` (CC BY-NC-ND 4.0 notice)

**Interfaces:**
- Produces: the code/writing license split (ADR 0002), referenced by the README in Task 0.6.

- [ ] **Step 1: Create `LICENSE` (MIT, code)**

```text
MIT License

Copyright (c) 2026 Muhammad Usman Siddiqui

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

NOTE: This MIT license covers the SOFTWARE only (site code, components, config,
styles). The essays and other prose content in this repository are licensed
separately under CC BY-NC-ND 4.0 — see LICENSE-content.
```

- [ ] **Step 2: Create `LICENSE-content` (CC BY-NC-ND 4.0, essays)**

```text
Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International
(CC BY-NC-ND 4.0)

Copyright (c) 2026 Muhammad Usman Siddiqui

The written content of this project — the essays and other prose, located
under src/content/ and any rendered form of it — is licensed under the
Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International
License.

You are free to:
  Share — copy and redistribute the material in any medium or format.

Under the following terms:
  Attribution   — You must give appropriate credit, provide a link to the
                  license, and indicate if changes were made.
  NonCommercial — You may not use the material for commercial purposes.
  NoDerivatives — If you remix, transform, or build upon the material, you may
                  not distribute the modified material.

Full license text: https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode

This content license does NOT cover the site's source code, which is licensed
separately under the MIT License — see LICENSE.
```

- [ ] **Step 3: Commit**

```bash
git add LICENSE LICENSE-content
git commit -m "docs: add MIT (code) and CC BY-NC-ND 4.0 (essays) licenses"
```

---

### Task 0.5: `.env.example`

**Files:**
- Create: `.env.example`

**Interfaces:**
- Produces: a documented, secret-free env template. `.env*` is git-ignored (Task 0.1) except this file.

> There are no runtime secrets in Phase 0–1 (static site, no CMS). This file exists as a placeholder + convention anchor so contributors know where env goes. Keep it empty of real values.

- [ ] **Step 1: Create `.env.example`**

```dotenv
# Sic Parvis Magna — environment template.
# Copy to `.env` for local overrides. No secrets are required to build or run
# the static site. Real secrets stay in `.env` (git-ignored) or a keychain,
# never committed.

# Public site URL used for canonical/OG links (overrides astro.config `site`).
# PUBLIC_SITE_URL="https://example.com"
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add .env.example template"
```

---

### Task 0.6: README

**Files:**
- Create/Modify: `README.md` (replaces the 86-byte stub)

**Interfaces:**
- Produces: the public-facing front door — what this is, how to run it, the license split, and the design-tooling install note (impeccable).

- [ ] **Step 1: Write `README.md`**

````markdown
# Sic Parvis Magna

A personal essay blog — field notes on discipline, faith, and self-accountability.
Static, text-first, no CMS: publishing an essay is a git commit.

> _Sic parvis magna_ — "greatness from small beginnings."

## Stack

Astro (static) · MDX content collections · Tailwind v4 · GSAP (island-scoped) ·
Pagefind (search) · deployed on Cloudflare Pages. See `docs/adr/` for the
decisions behind each choice.

## Run locally

Requires Node ≥ 20.11 and [pnpm](https://pnpm.io).

```bash
pnpm install     # install dependencies
pnpm dev         # start the dev server at http://localhost:4321
pnpm build       # production build to dist/
pnpm preview     # preview the production build
```

Quality gates:

```bash
pnpm typecheck   # astro check (types + template diagnostics)
pnpm lint        # ESLint
pnpm format      # Prettier (write)
pnpm test        # Vitest (unit)
pnpm test:a11y   # Playwright + axe (accessibility)
```

## Design tooling

UI work uses the [impeccable](https://github.com/pbakaus/impeccable) design skill.
It is not vendored into this repo; install it locally with:

```bash
npx impeccable install --providers=claude --scope=project
```

## License

Split license (see `LICENSE` and `LICENSE-content`):

- **Code** (site, components, config, styles): MIT.
- **Writing** (essays and prose under `src/content/`): CC BY-NC-ND 4.0 — share
  with attribution, no commercial use, no derivatives.
````

- [ ] **Step 2: Verify build + format still clean**

Run:
```bash
pnpm format:check && pnpm build
```
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: write project README with run steps and license split"
```

**PHASE 0 EXIT CHECK:** `pnpm build` succeeds, `pnpm dev` serves the blank page, `pnpm lint`/`pnpm format:check` clean, licenses + README present. Open a PR for the Phase 0 branch, merge to `main`.

---

# PHASE 1 — Foundation

**Depends on:** Phase 0. **Exit:** a themed, accessible, empty shell with a working persisted theme toggle (light default), self-hosted fonts, and the home-hero motion prototyped + gated. Contrast verified AA in both themes.

---

### Task 1.1: Tailwind v4 + design tokens

**Files:**
- Modify: `astro.config.mjs`, `package.json`
- Create: `src/styles/tokens.css`, `src/styles/global.css`

**Interfaces:**
- Produces: CSS custom properties `--bg --surface --text --muted --faint --border --fire --sage --ph1 --ph2` defined for both themes, switched by `[data-theme="light"|"dark"]`; a `global.css` that later layouts import. Consumed by Tasks 1.3, 1.5, 1.9.

- [ ] **Step 1: Add Tailwind v4 + typography**

Run:
```bash
pnpm add tailwindcss @tailwindcss/vite @tailwindcss/typography
```

- [ ] **Step 2: Wire the Tailwind Vite plugin in `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://sic-parvis-magna.pages.dev', // placeholder; custom domain in Phase 8
  trailingSlash: 'never',
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: Create `src/styles/tokens.css`**

Light is the default (`:root`); dark applies on `[data-theme="dark"]`. First-visit `prefers-color-scheme: dark` is handled by the no-FOUC script (Task 1.3) stamping `data-theme`, so tokens only key off the attribute.

```css
/* Design tokens — canonical palette from design.md §8 / build-order.
   Light is the default; dark is applied via [data-theme="dark"]. */
:root,
:root[data-theme='light'] {
  --bg: #ffffff;
  --surface: #f5f4f2;
  --text: #241f1a;
  --muted: rgba(36, 31, 26, 0.62);
  --faint: rgba(36, 31, 26, 0.4);
  --border: rgba(0, 0, 0, 0.1);
  --fire: #96591f; /* firelight accent — links, active states */
  --sage: #3c5c48; /* secondary accent — tags */
  --ph1: #ececea; /* cover placeholder gradient stop 1 */
  --ph2: #e2e1de; /* cover placeholder gradient stop 2 */
}

:root[data-theme='dark'] {
  --bg: #12161c;
  --surface: #1a2029;
  --text: #e7e2d6;
  --muted: rgba(231, 226, 214, 0.6);
  --faint: rgba(231, 226, 214, 0.32);
  --border: rgba(231, 226, 214, 0.12);
  --fire: #d99a54;
  --sage: #7ea08a;
  --ph1: #232a33;
  --ph2: #2b3540;
}
```

> `--muted` was bumped to 0.62 (light) / 0.6 (dark) from the wireframe's 0.55 as a pre-emptive contrast hedge; Task 1.7 confirms.

- [ ] **Step 4: Create `src/styles/global.css`**

```css
@import 'tailwindcss';
@plugin '@tailwindcss/typography';
@import './tokens.css';

/* Map tokens into Tailwind v4 theme so utilities like text-fire / bg-bg work. */
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-faint: var(--faint);
  --color-border: var(--border);
  --color-fire: var(--fire);
  --color-sage: var(--sage);
  --font-serif: 'Literata Variable', Georgia, serif;
  --font-sans: 'Instrument Sans Variable', system-ui, sans-serif;
  --font-arabic: 'Amiri', serif;
}

html {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-serif);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  color-scheme: light dark;
}

body {
  margin: 0;
  min-height: 100vh;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

a {
  color: var(--fire);
  text-decoration: none;
}
a:hover {
  color: var(--sage);
}

/* Visible focus for keyboard users (a11y baseline). */
:focus-visible {
  outline: 2px solid var(--fire);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Verify build compiles the CSS**

Run:
```bash
pnpm build
```
Expected: build succeeds (CSS is not yet imported by a page — that happens in Task 1.3; this step only proves the config compiles).

- [ ] **Step 6: Commit**

```bash
git add astro.config.mjs package.json pnpm-lock.yaml src/styles/tokens.css src/styles/global.css
git commit -m "feat: wire Tailwind v4 and define light/dark design tokens"
```

---

### Task 1.2: Self-hosted fonts (Literata, Instrument Sans, Amiri)

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: locally-served font files importable by the layout. Consumed by Task 1.3 (imports + preload).

Fontsource ships self-hosted files (satisfies "self-hosted"). Deeper custom subsetting is a Phase 7 perf task.

- [ ] **Step 1: Add Fontsource packages**

Run:
```bash
pnpm add @fontsource-variable/literata @fontsource-variable/instrument-sans @fontsource/amiri
```
Expected: all three added to `dependencies`.

- [ ] **Step 2: Confirm the woff2 files resolve (for the preload paths in Task 1.3)**

Run:
```bash
ls node_modules/@fontsource-variable/literata/files/*.woff2 | head -1
ls node_modules/@fontsource-variable/instrument-sans/files/*.woff2 | head -1
ls node_modules/@fontsource/amiri/files/*.woff2 | head -1
```
Expected: each prints at least one `.woff2` path. Note the exact `literata-latin-wght-normal.woff2` and `instrument-sans-latin-wght-normal.woff2` filenames — Task 1.3 imports the package entrypoints (which register `@font-face`), so no manual path wiring is needed beyond the imports.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add self-hosted Literata, Instrument Sans, and Amiri fonts"
```

---

### Task 1.3: Base layout shell (landmarks, skip link, no-FOUC theme script, font imports)

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro` (use the layout)

**Interfaces:**
- Consumes: `src/styles/global.css`, the three Fontsource packages, `src/lib/theme.ts` inline logic (Task 1.4 formalizes the module; the inline no-FOUC script here is a hand-inlined copy of `resolveInitialTheme` because it must run before hydration — Task 1.4 keeps the two in sync and tests the module).
- Produces: `<BaseLayout title description>` slot wrapper with `<header>`/`<main>`/`<footer>` landmarks, a skip link, font preloads, and a render-blocking theme-stamping script. Consumed by every page from here on.

- [ ] **Step 1: Create `src/layouts/BaseLayout.astro`**

```astro
---
import '@fontsource-variable/literata';
import '@fontsource-variable/instrument-sans';
import '@fontsource/amiri';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Field notes on discipline, faith, and self-accountability.' } =
  Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="description" content={description} />
    <title>{title}</title>

    {/* No-FOUC: stamp the resolved theme before first paint.
        Mirrors resolveInitialTheme() in src/lib/theme.ts (kept in sync + unit-tested there). */}
    <script is:inline>
      (function () {
        try {
          var stored = localStorage.getItem('spm-theme');
          var theme =
            stored === 'light' || stored === 'dark'
              ? stored
              : window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
          document.documentElement.setAttribute('data-theme', theme);
        } catch (e) {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      })();
    </script>
  </head>
  <body>
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2"
    >
      Skip to content
    </a>
    <header>
      <slot name="header" />
    </header>
    <main id="main">
      <slot />
    </main>
    <footer>
      <slot name="footer" />
    </footer>
  </body>
</html>
```

- [ ] **Step 2: Add the `.sr-only` utility to `src/styles/global.css`**

Append to `src/styles/global.css`:
```css
/* Screen-reader-only utility for the skip link (visible on focus). */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

- [ ] **Step 3: Rewrite `src/pages/index.astro` to use the layout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Sic Parvis Magna">
  <section style="max-width:820px;margin:34px auto;padding:0 32px;">
    <p style="font-size:20px;line-height:1.72;color:var(--muted);">
      A commonplace book made public. Field notes on discipline, faith, and
      self-accountability.
    </p>
  </section>
</BaseLayout>
```

- [ ] **Step 4: Verify the shell builds and renders with landmarks**

Run:
```bash
pnpm build
grep -q 'id="main"' dist/index.html && grep -q 'Skip to content' dist/index.html && echo "SHELL OK"
```
Expected: prints `SHELL OK`.

- [ ] **Step 5: Verify the theme attribute is stamped at runtime**

Run:
```bash
pnpm dev &
sleep 4
curl -sf http://localhost:4321/ | grep -q 'spm-theme' && echo "THEME SCRIPT OK"
kill %1
```
Expected: prints `THEME SCRIPT OK` (the inline script is present in the served HTML).

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages/index.astro src/styles/global.css
git commit -m "feat: add base layout shell with landmarks, skip link, and no-FOUC theme script"
```

---

### Task 1.4: Theme-resolution logic (TDD) + Vitest

**Files:**
- Create: `src/lib/theme.ts`, `tests/unit/theme.test.ts`, `vitest.config.ts`
- Modify: `package.json` (vitest already scripted in 0.2; add dep)

**Interfaces:**
- Produces: pure functions
  - `resolveInitialTheme(stored: string | null, prefersDark: boolean): 'light' | 'dark'`
  - `nextTheme(current: 'light' | 'dark'): 'light' | 'dark'`
  - `applyTheme(theme: 'light' | 'dark', doc: Document, storage: Pick<Storage,'setItem'>): void`
  Consumed by the ThemeToggle island (Task 1.5) and mirrored by the inline no-FOUC script (Task 1.3).

- [ ] **Step 1: Add Vitest**

Run:
```bash
pnpm add -D vitest jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Write the failing test `tests/unit/theme.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { resolveInitialTheme, nextTheme, applyTheme } from '../../src/lib/theme';

describe('resolveInitialTheme', () => {
  it('uses a valid stored value over system preference', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark');
    expect(resolveInitialTheme('light', true)).toBe('light');
  });

  it('falls back to system preference when nothing valid is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
  });

  it('defaults to light for a garbage stored value', () => {
    expect(resolveInitialTheme('purple', false)).toBe('light');
  });
});

describe('nextTheme', () => {
  it('toggles between light and dark', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });
});

describe('applyTheme', () => {
  it('sets the data-theme attribute and persists the choice', () => {
    const setItem = vi.fn();
    applyTheme('dark', document, { setItem });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(setItem).toHaveBeenCalledWith('spm-theme', 'dark');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run:
```bash
pnpm test
```
Expected: FAIL — cannot resolve `../../src/lib/theme` (module not found).

- [ ] **Step 5: Write the minimal implementation `src/lib/theme.ts`**

```ts
export type Theme = 'light' | 'dark';

/** First-visit resolution: explicit stored choice wins, else system preference, else light. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

export function applyTheme(
  theme: Theme,
  doc: Document,
  storage: Pick<Storage, 'setItem'>,
): void {
  doc.documentElement.setAttribute('data-theme', theme);
  try {
    storage.setItem('spm-theme', theme);
  } catch {
    /* storage unavailable (private mode) — attribute still applied */
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```bash
pnpm test
```
Expected: PASS — all cases green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/theme.ts tests/unit/theme.test.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add tested theme-resolution logic"
```

---

### Task 1.5: Theme-toggle island

**Files:**
- Create: `src/components/ThemeToggle.astro`
- Modify: `src/layouts/BaseLayout.astro` (render the toggle in the header slot via a nav), `src/pages/index.astro` (pass a minimal nav header)

**Interfaces:**
- Consumes: `src/lib/theme.ts` (`nextTheme`, `applyTheme`, `resolveInitialTheme`).
- Produces: a `<ThemeToggle />` button island that flips the theme, updates its icon, and persists the choice. Uses `data-theme` on `<html>` already stamped by the no-FOUC script.

Astro ships zero JS unless a `<script>` is present; the module `<script>` in this component is the only JS it adds (one of our two allowed islands).

- [ ] **Step 1: Create `src/components/ThemeToggle.astro`**

```astro
---
// Theme toggle island. Markup renders static; the module script hydrates the button.
---

<button id="theme-toggle" type="button" aria-label="Toggle color theme" class="theme-toggle">
  <svg class="icon-dark" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6" fill="var(--fire)"></circle>
    <circle cx="10.6" cy="6.4" r="5" fill="var(--bg)"></circle>
  </svg>
  <svg class="icon-light" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="4.4" fill="var(--fire)"></circle>
  </svg>
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    cursor: pointer;
  }
  /* Show the icon that represents the CURRENT theme. */
  :global(html[data-theme='dark']) .theme-toggle .icon-light {
    display: none;
  }
  :global(html[data-theme='light']) .theme-toggle .icon-dark {
    display: none;
  }
</style>

<script>
  import { nextTheme, applyTheme, type Theme } from '../lib/theme';

  const btn = document.getElementById('theme-toggle');
  btn?.addEventListener('click', () => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme) ?? 'light';
    applyTheme(nextTheme(current), document, localStorage);
  });
</script>
```

- [ ] **Step 2: Render a minimal nav (with the toggle) via the header slot in `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ThemeToggle from '../components/ThemeToggle.astro';
---

<BaseLayout title="Sic Parvis Magna">
  <nav
    slot="header"
    style="display:flex;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto;padding:24px 32px;"
  >
    <a href="/" style="font-family:var(--font-serif);font-size:23px;font-weight:600;color:var(--text);">
      Sic Parvis Magna
    </a>
    <div style="display:flex;align-items:center;gap:30px;font-family:var(--font-sans);font-size:14px;">
      <a href="/writing" style="color:var(--text);">Writing</a>
      <ThemeToggle />
    </div>
  </nav>

  <section style="max-width:820px;margin:34px auto;padding:0 32px;">
    <p style="font-family:var(--font-serif);font-size:20px;line-height:1.72;color:var(--muted);">
      A commonplace book made public. Field notes on discipline, faith, and
      self-accountability.
    </p>
  </section>
</BaseLayout>
```

- [ ] **Step 3: Verify the toggle renders and ships its island script**

Run:
```bash
pnpm build
grep -q 'id="theme-toggle"' dist/index.html && echo "TOGGLE OK"
```
Expected: prints `TOGGLE OK`. (Interactive flip is asserted by the Playwright test in Task 1.6.)

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemeToggle.astro src/pages/index.astro
git commit -m "feat: add persisted theme-toggle island"
```

---

### Task 1.6: Accessibility harness (Playwright + axe) — contrast, keyboard, toggle, reduced-motion

**Files:**
- Create: `playwright.config.ts`, `tests/a11y/shell.spec.ts`
- Modify: `package.json` (deps)

**Interfaces:**
- Consumes: the running dev server and the shell from Tasks 1.3–1.5.
- Produces: an automated a11y gate covering both themes, keyboard operation of the toggle, and reduced-motion. Re-run in Task 1.9 after the hero lands.

- [ ] **Step 1: Add Playwright + axe**

Run:
```bash
pnpm add -D @playwright/test @axe-core/playwright
pnpm exec playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/a11y',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: Write the failing test `tests/a11y/shell.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('shell accessibility', () => {
  test('no axe violations in light theme', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('spm-theme', 'light'));
    await page.reload();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('no axe violations in dark theme', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('spm-theme', 'dark'));
    await page.reload();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('theme toggle is keyboard operable and persists', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('spm-theme', 'light'));
    await page.reload();
    await page.getByRole('button', { name: /toggle color theme/i }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const stored = await page.evaluate(() => localStorage.getItem('spm-theme'));
    expect(stored).toBe('dark');
  });

  test('skip link becomes visible on focus', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();
  });
});
```

- [ ] **Step 4: Run to verify it fails first, then passes**

Run:
```bash
pnpm test:a11y
```
Expected outcome: if any axe violation exists (e.g. a contrast failure), the test FAILS and names the offending node — fix the token/markup, then re-run to GREEN. This is the contrast gate handshake with Task 1.7. All four tests must pass before commit.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/a11y/shell.spec.ts package.json pnpm-lock.yaml
git commit -m "test: add Playwright + axe a11y harness for the shell"
```

---

### Task 1.7: Contrast verification gate (both themes)

**Files:**
- Modify (only if needed): `src/styles/tokens.css`

**Interfaces:**
- Consumes: the palette in `tokens.css`.
- Produces: a written confirmation (in the commit message and PR) that text/accent pairs meet WCAG AA in both themes, with any tuned values.

This is the authority design.md deferred to ("run through a real contrast checker"). It runs after the axe harness exists so failures are caught mechanically.

- [ ] **Step 1: Compute the key contrast ratios**

Check these pairs (target: body text ≥ 4.5:1; large text / UI accents ≥ 3:1). Use any WCAG contrast tool or the axe output from Task 1.6.

| Pair | Light | Dark | Min |
|---|---|---|---|
| `--text` on `--bg` | #241f1a on #ffffff | #e7e2d6 on #12161c | 4.5:1 |
| `--muted` on `--bg` | rgba(36,31,26,.62) on #fff | rgba(231,226,214,.6) on #12161c | 4.5:1 |
| `--fire` (link) on `--bg` | #96591f on #fff | #d99a54 on #12161c | 4.5:1 |
| `--sage` on `--bg` | #3c5c48 on #fff | #7ea08a on #12161c | 3:1 |

- [ ] **Step 2: Tune any failing token toward the ink end and re-run axe**

If a pair fails, darken (light theme) or lighten (dark theme) the token minimally, then:
```bash
pnpm test:a11y
```
Expected: axe contrast checks pass in both themes.

- [ ] **Step 3: Commit (only if tokens changed; otherwise record the pass in the PR)**

```bash
git add src/styles/tokens.css
git commit -m "fix: tune palette tokens to meet WCAG AA contrast in both themes"
```

---

### Task 1.8: Create impeccable design context (PRODUCT.md + DESIGN.md)

**Files:**
- Create: `PRODUCT.md`, `DESIGN.md` (repo root — impeccable's expected location)
- Modify: `.gitignore` (decide tracking — see note)

**Interfaces:**
- Produces: the authoritative product + design context impeccable reads via `context.mjs`, encoding our LOCKED decisions so impeccable never re-derives or overrides them.

`context.mjs` currently returns `NO_PRODUCT_MD`. Rather than run the interactive `/impeccable init` interview, we author these files directly from the locked docs (faster, and guarantees the locked-decisions-win rule). Keep them tracked in git (they are product docs, unlike the vendored skill).

- [ ] **Step 1: Write `PRODUCT.md`**

```markdown
# Sic Parvis Magna — Product

**What:** A solo-authored personal essay blog. Text-first, static, no CMS.
**Voice:** A commonplace book made public — read slowly, revisited, trusted.
**Register:** brand / editorial (the design IS the product surface).
**Platform:** web.

## Audience & job
Readers who want long-form, considered essays on discipline, faith, and
self-accountability. The design's job is to get out of the way while feeling
considered and bare.

## Locked decisions (authoritative — do not override)
- Stack: Astro static + MDX (ADR 0001). GSAP only, no Framer (ADR 0004).
- Theme: light default = true white #ffffff (NOT cream); dark toggle = #12161c.
- Type: Literata (serif body + headings); Instrument Sans (UI/meta); Amiri (Arabic).
- Palette: text #241f1a/#e7e2d6, firelight #96591f/#d99a54, sage #3c5c48/#7ea08a.
- Motion: restrained; ONE signature move (home-hero scroll-shrink), reduced-motion static.
- Imagery: original AI-assisted pixel covers, one house style; fallback card path always legal.
- License: MIT (code) + CC BY-NC-ND 4.0 (essays) (ADR 0002).

## Terminology
"Essay" (never post/article). Section = "Writing". Categories: Discipline · Faith · Reflections.
```

- [ ] **Step 2: Write `DESIGN.md`**

```markdown
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
```

- [ ] **Step 3: Verify impeccable now sees the context**

Run:
```bash
node .claude/skills/impeccable/scripts/context.mjs
```
Expected: prints the PRODUCT.md (and DESIGN.md) content instead of `NO_PRODUCT_MD`.

- [ ] **Step 4: Commit**

```bash
git add PRODUCT.md DESIGN.md
git commit -m "docs: add impeccable PRODUCT.md and DESIGN.md encoding locked decisions"
```

---

### Task 1.9: Home-hero motion prototype (GSAP) + decision gate

**Files:**
- Create: `src/components/HomeHero.astro`
- Modify: `src/pages/index.astro` (render the hero), `package.json` (gsap dep)

**Interfaces:**
- Consumes: tokens (`--ph1/--ph2/--border/--fire`), the layout.
- Produces: a `<HomeHero />` featured block with the scroll-shrink gesture (our second and final Phase 1 island). Static baseline renders without JS; GSAP layers the effect on top.

This is **prototype-gated**: build it, judge it against the "serious editorial, not atmospheric game site" bar, and if it reads gimmicky, downgrade (e.g. shorter travel or drop to a load fade) **without reopening motion direction**. Record the verdict.

- [ ] **Step 1: Add GSAP**

Run:
```bash
pnpm add gsap
```

- [ ] **Step 2: Create `src/components/HomeHero.astro` (static baseline first)**

```astro
---
interface Props {
  title: string;
  meta: string;
  href: string;
}
const { title, meta, href } = Astro.props;
---

<section class="hero-wrap">
  <a href={href} class="hero" data-hero>
    <div class="hero-scrim"></div>
    <div class="hero-body">
      <div class="hero-kicker">Featured</div>
      <h1 class="hero-title">{title}</h1>
      <div class="hero-meta">{meta}</div>
    </div>
  </a>
</section>

<style>
  .hero-wrap {
    max-width: 1200px;
    margin: 40px auto 0;
    padding: 0 32px;
  }
  .hero {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 16 / 7;
    overflow: hidden;
    border-radius: 2px;
    border: 1px solid var(--border);
    transform-origin: top center;
    will-change: transform;
    background:
      repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 18px),
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 18px),
      linear-gradient(150deg, var(--ph1) 0%, var(--ph2) 60%, var(--ph1) 100%);
  }
  .hero-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(9, 11, 15, 0.9) 0%,
      rgba(9, 11, 15, 0.45) 42%,
      transparent 72%
    );
  }
  .hero-body {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 0 24px 40px;
    text-align: center;
  }
  .hero-kicker {
    font-family: var(--font-sans);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fire);
    margin-bottom: 14px;
  }
  .hero-title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: clamp(30px, 4.4vw, 58px);
    line-height: 1.05;
    color: #f4efe4;
    margin: 0 auto;
    max-width: 760px;
    text-wrap: balance;
  }
  .hero-meta {
    font-family: var(--font-sans);
    font-size: 13.5px;
    color: rgba(244, 239, 228, 0.72);
    margin-top: 16px;
  }
</style>

<script>
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.querySelector<HTMLElement>('[data-hero]');

  // Progressive enhancement: only enhance on wide viewports, motion allowed, and element present.
  if (el && !prefersReduced && window.innerWidth >= 760) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(el, {
      scale: 0.89,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top top',
        end: '+=420',
        scrub: true,
      },
    });
  }
</script>
```

- [ ] **Step 3: Render the hero in `src/pages/index.astro`**

Insert `<HomeHero ... />` after the intro `<section>`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ThemeToggle from '../components/ThemeToggle.astro';
import HomeHero from '../components/HomeHero.astro';
---

<BaseLayout title="Sic Parvis Magna">
  <nav
    slot="header"
    style="display:flex;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto;padding:24px 32px;"
  >
    <a href="/" style="font-family:var(--font-serif);font-size:23px;font-weight:600;color:var(--text);">
      Sic Parvis Magna
    </a>
    <div style="display:flex;align-items:center;gap:30px;font-family:var(--font-sans);font-size:14px;">
      <a href="/writing" style="color:var(--text);">Writing</a>
      <ThemeToggle />
    </div>
  </nav>

  <section style="max-width:820px;margin:34px auto 0;padding:0 32px;">
    <p style="font-family:var(--font-serif);font-size:20px;line-height:1.72;color:var(--muted);">
      A commonplace book made public. Field notes on discipline, faith, and
      self-accountability.
    </p>
  </section>

  <HomeHero
    title="The Loop Invariant of Faith"
    meta="Oct 12, 2026 · 8 min read · Reflections"
    href="/writing"
  />
</BaseLayout>
```

- [ ] **Step 4: Verify build + static baseline (no-JS) renders the hero**

Run:
```bash
pnpm build
grep -q 'data-hero' dist/index.html && grep -q 'The Loop Invariant of Faith' dist/index.html && echo "HERO STATIC OK"
```
Expected: prints `HERO STATIC OK` (the hero is fully present in the static HTML before any JS runs).

- [ ] **Step 5: Add a reduced-motion assertion to the a11y suite**

Append to `tests/a11y/shell.spec.ts`:
```ts
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('hero has no scroll transform under reduced motion', async ({ page }) => {
    await page.goto('/');
    const el = page.locator('[data-hero]');
    await el.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    const transform = await el.evaluate((n) => getComputedStyle(n).transform);
    expect(transform === 'none' || transform === '').toBeTruthy();
  });
});
```

- [ ] **Step 6: Run the full a11y suite**

Run:
```bash
pnpm test:a11y
```
Expected: all tests pass, including the reduced-motion assertion (no transform applied).

- [ ] **Step 7: DECISION GATE — judge the effect**

Open `pnpm dev`, scroll the home page on a wide viewport. Judge against "serious editorial, not atmospheric game site." Record the verdict in the commit message and PR body:
- **Keep** as-is, or
- **Downgrade** (shorten travel / reduce scale delta / drop to a load fade) — apply the downgrade in this same task, then re-run Steps 4 & 6.

Either way the outcome is recorded; motion direction is not reopened.

- [ ] **Step 8: Commit**

```bash
git add src/components/HomeHero.astro src/pages/index.astro tests/a11y/shell.spec.ts package.json pnpm-lock.yaml
git commit -m "feat: prototype GSAP home-hero scroll gesture (gate: <keep|downgrade — verdict>)"
```

---

### Task 1.10: impeccable audit of the shell

**Files:** none (may produce follow-up fixes committed under their own message).

**Interfaces:**
- Consumes: the whole Phase 1 shell.
- Produces: an impeccable `audit` pass (a11y/perf/responsive) + `polish` on any findings, respecting locked-decisions-win.

- [ ] **Step 1: Run the impeccable audit**

Invoke the impeccable skill's `audit` on the home shell (`src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `src/components/*`). Read `.claude/skills/impeccable/reference/audit.md` first per the skill's Setup. Do NOT let it change locked tokens, fonts, stack, or motion budget.

- [ ] **Step 2: Apply only in-scope fixes**

Fix genuine craft/a11y/responsive issues it surfaces (e.g. spacing rhythm, focus states, responsive nav). Skip any recommendation that conflicts with a locked decision; note why in the PR.

- [ ] **Step 3: Re-verify**

Run:
```bash
pnpm build && pnpm test && pnpm test:a11y
```
Expected: all green.

- [ ] **Step 4: Commit (if fixes were made)**

```bash
git add -A
git commit -m "polish: address impeccable audit findings on the shell"
```

**PHASE 1 EXIT CHECK:** themed accessible shell; persisted theme toggle (light default, honors `prefers-color-scheme`); self-hosted fonts; AA contrast confirmed both themes; home-hero motion prototyped + gated + reduced-motion static; `pnpm build`, `pnpm test`, `pnpm test:a11y` all green. Open the Phase 1 PR, merge to `main`.

---

## Self-Review

**Spec coverage (build-order Phase 0 & 1):**
- Phase 0 — pnpm+Astro scaffold (0.2), TS config (0.2), Prettier/ESLint (0.3), README (0.6), LICENSE + LICENSE-content (0.4), .gitignore (0.1), .env.example (0.5), worktree catch-up (0.0), impeccable wiring (done + tracked decision in 0.1/1.8). ✓
- Phase 1 — Tailwind + typography + tokens both themes (1.1), base layout shell w/ landmarks + skip link (1.3), self-hosted subsetted variable fonts w/ preload + swap (1.2/1.3 — deeper subsetting deferred to Phase 7, noted), theme-toggle island light-default + prefers-color-scheme + persisted (1.3/1.4/1.5), hero-motion GSAP prototype + gate (1.9), a11y (axe/Playwright contrast both themes, keyboard, reduced-motion) (1.6/1.9), toggle unit-tested (1.4). ✓
- Test strategy: TDD on theme logic (1.4); visual/shell verified via build + impeccable audit + Playwright/axe (1.6/1.10) — matches build-order's "visual components verified differently." ✓

**Known deferrals (intentional, per build-order):**
- Deep font subsetting → Phase 7 (perf). Fontsource self-hosts now.
- OG images, RSS, sitemap, JSON-LD → Phase 6.
- Real content/schema → Phase 2 (index page uses placeholder hero copy).

**Open confirmations for Muhammad (non-blocking; recommendations attached):**
1. impeccable tracking — recommend git-ignore the vendored skill + document the install command (Task 0.1). Confirm or switch to vendoring.
2. impeccable version — installer pulled `4.0.0-alpha.10` (an alpha) vs the `3.9.1` in the local SKILL.md file. Recommend keeping the installed latest (official installer's choice); pin/downgrade later if it proves flaky.
3. Font decision (Instrument Sans) and the light-accent palette (docs values over wireframe) should be synced back into design.md §8 / build-order on the next vault→repo doc pass.
```