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
