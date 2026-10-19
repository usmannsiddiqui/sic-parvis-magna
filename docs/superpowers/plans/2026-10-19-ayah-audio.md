# Ayah Audio Implementation Plan

> **For agentic workers:** Implement this plan task-by-task, TDD, in order. Steps use checkbox (`- [ ]`) syntax for tracking.

> [!info] Source of truth
> This vault file is the **canonical** plan. Task 1 copies it to
> `docs/superpowers/plans/2026-10-19-ayah-audio.md` in the repo as a one-way
> mirror (`docs/` is prettier-ignored). Edit the vault copy, then re-sync.

**Goal:** Readers can hover, tap or Tab to a Qur'an phrase inside essay prose to open a glass popover with the full verse's recitation and English/Urdu translations, and maximise it into a centred panel.

**Architecture:** A pure, unit-tested data layer (`src/lib/quran.ts`) fetches each verse once at build time from alquran.cloud and builds the EveryAyah audio URL. One component (`src/components/Ayah.astro`) renders the inline phrase, the popover and a `<template>` of the panel into static HTML. One bundled `<script>` in that component wires hover/tap/keyboard, a single shared `Audio` element, and a single shared `<dialog>` appended to `<body>`.

**Tech Stack:** Astro 5 (static), MDX, vanilla TS island, scoped CSS, Vitest, Playwright + `@axe-core/playwright`, `@fontsource-variable/noto-nastaliq-urdu`. pnpm only.

**Spec:** `specs/2026-10-19-ayah-audio-design.md` (vault, same project folder). Visual reference: `specs/2026-10-19-ayah-audio-mockup.html`. Vault root: `~/dev/NathanDrake/01-Projects/sic-parvis-magna/`.

## Global Constraints

- pnpm only. Work on the current branch in this worktree. Never commit to `main`. Open one PR at the end.
- Commit messages and PR body: **no** `Co-Authored-By` lines, **no** "Generated with" lines.
- **Do not edit** `src/components/ArabicQuote.astro`, `src/styles/tokens.css` or `src/styles/global.css`. A parallel `ui-polish` branch owns those. Glass tokens live inside `Ayah.astro` (Task 2).
- Colors come from existing tokens (`--bg --surface --text --muted --faint --border --fire --sage`) or the new component-scoped glass vars. No other literal colors.
- Fonts: `--font-serif` (Literata), `--font-sans` (Instrument Sans), `--font-arabic` (Amiri). Urdu: the family name `@fontsource-variable/noto-nastaliq-urdu` registers, falling back to `var(--font-arabic)`.
- No animation library (ADR 0004). All transitions off under `prefers-reduced-motion: reduce`.
- Inline Arabic: `<bdi lang="ar">` + `unicode-bidi: isolate` (ADR 0005). Urdu text: `lang="ur" dir="rtl"`.
- Build-time sources, exact:
  - Text API: `https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/editions/quran-uthmani,en.sahih,ur.jalandhry`
  - Audio: `https://everyayah.com/data/Ali_Jaber_64kbps/{SSS}{AAA}.mp3` (3-digit zero-padded)
  - Default reciter label: `Ali Jaber`
- Timings: hover-open delay `150ms`, hover-close delay `300ms`. Speed cycle `1 → 0.75 → 1.25`. Panel translations stack below `520px`.
- **Markup inside `<p>`:** `Ayah` renders inside MDX paragraphs. Use only phrasing elements (`span`, `bdi`, `button`, `template`). A `<div>`, `<p>`, `<h*>` or `<dialog>` there makes the HTML parser close the paragraph and break layout. The `<dialog>` is created by script on `<body>`.

## Review Focus

1. **Popover near a viewport edge.** A verse at the right edge, or the top of the screen on a 390px phone, must keep the popover fully on screen. Flip below when there's no room above, and clamp horizontally with a 12px margin. Covered by the Task 3 touch test (asserts the bounding box is inside the viewport).
2. **Moving the mouse from verse to popover.** The gap between them must not close it. The 300ms close delay is cancelled on entering the popover. Covered in Task 3.
3. **Bad ref in MDX** (`12:999`, `115:1`, `12-53`). The build must fail with a message naming the ref, never ship an empty popover. Covered in Task 1.
4. **Two verses on one page.** Starting the second stops the first, and both play icons reflect it. The demo has one verse, so the Task 4 test clones it in the page.
5. **Focus after closing.** Esc on the popover returns focus to the verse. Closing the panel returns focus to the maximise button. Covered in Tasks 3 and 4.

---

### Task 1: Verse data layer

**Files:**
- Create: `src/lib/quran.ts`
- Test: `tests/unit/quran.test.ts`
- Create: `docs/superpowers/plans/2026-10-19-ayah-audio.md` (copy of this vault file)

**Interfaces:**
- Produces:
  - `type AyahRef = { surah: number; ayah: number }`
  - `type AyahData = { ref: string; surahName: string; arabic: string; en: string; ur: string; audioUrl: string }`. `ref` is `"12:53"`, `surahName` is the API's `surah.englishName` (`"Yusuf"`).
  - `parseAyahRef(ref: string): AyahRef`. Throws `Error` whose message contains the input for anything not matching `^\d{1,3}:\d{1,3}$`, surah outside 1–114, or ayah `< 1`.
  - `everyAyahUrl(ref: AyahRef): string`
  - `fetchAyah(ref: string, fetchImpl?: typeof fetch): Promise<AyahData>`. Memoised per ref in a module-level `Map` (so `pnpm dev` and multi-page builds call the API once per verse). Throws `Error` containing the ref when the response isn't ok or `code !== 200`.
  - `clearAyahCache(): void` (tests only)

- [ ] **Step 1: Copy the plan mirror**

`cp ~/dev/NathanDrake/01-Projects/sic-parvis-magna/plans/2026-10-19-ayah-audio.md docs/superpowers/plans/`

- [ ] **Step 2: Write the failing tests** in `tests/unit/quran.test.ts`

Use a fixture shaped like the real 12:53 response: `{ code: 200, status: 'OK', data: [ {edition:{identifier:'quran-uthmani'}, text:'وَمَآ أُبَرِّئُ نَفْسِىٓ …', surah:{englishName:'Yusuf'}}, {edition:{identifier:'en.sahih'}, text:'And I do not acquit myself. …', …}, {edition:{identifier:'ur.jalandhry'}, text:'اور میں اپنے تئیں پاک صاف نہیں کہتا …', …} ] }`. Map by `edition.identifier`, not array order (test with the array shuffled).

```ts
it('parses a valid ref', () => expect(parseAyahRef('12:53')).toEqual({ surah: 12, ayah: 53 }));
it.each(['115:1', '0:1', '12:0', '12-53', '', 'abc'])('rejects %s', (r) =>
  expect(() => parseAyahRef(r)).toThrow(r || /ref/));
it('pads the EveryAyah url', () => {
  expect(everyAyahUrl({ surah: 12, ayah: 53 })).toBe('https://everyayah.com/data/Ali_Jaber_64kbps/012053.mp3');
  expect(everyAyahUrl({ surah: 2, ayah: 286 })).toBe('https://everyayah.com/data/Ali_Jaber_64kbps/002286.mp3');
});
it('maps editions by identifier regardless of order', async () => { /* shuffled fixture → arabic/en/ur/surahName/audioUrl */ });
it('requests the exact editions url', async () => { /* fetchImpl called with …/ayah/12:53/editions/quran-uthmani,en.sahih,ur.jalandhry */ });
it('throws with the ref on an API error', async () => {
  const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 404, status: 'NOT FOUND', data: 'out of range' }), { status: 404 }));
  await expect(fetchAyah('12:999', f)).rejects.toThrow('12:999');
});
it('fetches each ref once', async () => { /* two fetchAyah('12:53', f) calls → f called once */ });
```

`beforeEach(clearAyahCache)`.

- [ ] **Step 3:** Run `pnpm test -- quran`. Expected: FAIL (module not found).
- [ ] **Step 4:** Implement `src/lib/quran.ts` to the interfaces above. `fetchImpl` defaults to global `fetch`.
- [ ] **Step 5:** Run `pnpm test -- quran`. Expected: all PASS.
- [ ] **Step 6: Commit** `feat: build-time Quran verse data layer (alquran.cloud + EveryAyah)`

---

### Task 2: Static `Ayah` component + demo verse

**Files:**
- Create: `src/components/Ayah.astro`
- Modify: `src/content/writing/sample-what-the-fast-teaches.mdx` (import + one sentence after the صبر paragraph)
- Modify: `package.json` (add `@fontsource-variable/noto-nastaliq-urdu` (v5.3.0, exists))
- Test: `tests/a11y/ayah.spec.ts`

**Interfaces:**
- Consumes: `fetchAyah`, `parseAyahRef` from Task 1.
- Produces (DOM contract Tasks 3–4 rely on):
  - Props: `ref: string; audio?: string; reciter?: string`. Audio src = `audio ?? data.audioUrl`. Reciter label = `reciter ?? (audio ? 'Recitation' : 'Ali Jaber')`.
  - Root `span.ayah[data-ayah][data-audio-src][data-ref]`
  - Trigger `bdi.ayah__phrase[lang="ar"][tabindex="0"][role="button"][aria-haspopup="dialog"][aria-expanded="false"][aria-controls=<popover id>]`, containing `<slot />`
  - Inline play `button.ayah__play[aria-label="Play recitation of Yusuf 12:53"]`
  - Popover `span.ayah__pop[role="dialog"][aria-label="Qur'an, Yusuf 12:53"][id][data-state="closed"]` containing: `button.ayah__pop-play`, label text, `span.ayah__bar > span.ayah__fill`, duration `span.ayah__time`, lang toggle `button[data-lang="en"|"ur"][aria-pressed]`, `span.ayah__en`, `span.ayah__ur[lang="ur"][dir="rtl"]`, `button.ayah__max[aria-label="Maximise verse"]`
  - `template.ayah__panel-tpl` with the panel markup (Task 4 fills behaviour)
  - Popover ids unique per instance (e.g. `ayah-12-53-<n>`)

- [ ] **Step 1: Write the failing a11y tests** in `tests/a11y/ayah.spec.ts` against `/writing/sample-what-the-fast-teaches`:
  - `the verse phrase is inline Arabic`: `page.locator('[data-ayah] bdi.ayah__phrase')` has `lang="ar"` and text `فَصَبْرٌ جَمِيلٌ`.
  - `the popover carries the full verse translations`: `.ayah__en` contains `so patience is most fitting`, `.ayah__ur` has `lang="ur"`.
  - `paragraph is not split`: the `[data-ayah]` element's closest `p` also contains the text `beautiful patience`.
- [ ] **Step 2:** Run `pnpm test:a11y -- ayah`. Expected: FAIL (no `[data-ayah]`).
- [ ] **Step 3: Implement `Ayah.astro`.** Frontmatter calls `await fetchAyah(ref)`. Match the mockup's look:
  - Phrase: Amiri, `1.1em`, dotted `1px` `--fire` underline, `cursor: help`.
  - Inline ▶: 18px circle, `--surface` fill, `--border` ring, `--fire` icon.
  - Popover: `width: min(340px, calc(100vw - 24px))`, radius 16px, glass background with `backdrop-filter: blur(18px) saturate(1.4)`, positioned above the phrase. Hidden by default (`data-state="closed"` → `opacity:0; pointer-events:none; visibility:hidden`). `data-state="open"` shows it.
  - Glass vars on `.ayah, .ayah-panel` (light) and `:root[data-theme='dark'] :is(.ayah, .ayah-panel)` (dark). Values from the mockup: `--glass` `rgba(255,255,255,.55)` / `rgba(26,32,41,.55)`, `--glass-strong` `.72` alpha of the same, `--glass-edge` `rgba(255,255,255,.7)` / `rgba(231,226,214,.14)`, `--scrim` `rgba(36,31,26,.28)` / `rgba(0,0,0,.45)`, `--glass-shadow` `0 18px 48px rgba(36,31,26,.18)` / `0 18px 48px rgba(0,0,0,.5)`.
  - `:global()` styles for the panel, since the script moves it into `<body>`.
  - Import the Urdu font CSS in this component only, so pages without verses don't load it.
- [ ] **Step 4: Add the demo** after the "This is <Ar>صبر</Ar> …" paragraph:

```mdx
Ya'qub met the worst news of his life with two words, <Ayah ref="12:18">فَصَبْرٌ جَمِيلٌ</Ayah> (_sabrun jamil_), beautiful patience.
```

- [ ] **Step 5:** Run `pnpm test:a11y -- ayah` then `pnpm test:a11y -- essay` (the existing axe tests must stay green). Expected: PASS.
- [ ] **Step 6: Commit** `feat: Ayah component renders verse popover markup at build time`

---

### Task 3: Popover behaviour (hover, tap, keyboard)

**Files:**
- Modify: `src/components/Ayah.astro` (`<script>`; Astro bundles and dedupes it per page)
- Test: `tests/a11y/ayah.spec.ts`

**Interfaces:**
- Consumes: Task 2 DOM contract.
- Produces: `open(root)` / `close(root, {returnFocus})` set `data-state` and `aria-expanded`. Only one popover open at a time.

- [ ] **Step 1: Write the failing tests:**
  - `keyboard opens and Esc closes`: focus `bdi.ayah__phrase`, press Enter → `.ayah__pop` has `data-state="open"` and trigger `aria-expanded="true"`. Press Escape → `closed`, and `bdi.ayah__phrase` is focused.
  - `hover opens after intent delay and survives the gap`: hover the phrase, wait 200ms → open. Move to `.ayah__pop` → still open after 400ms. Move to `h1` → closed within 500ms.
  - `touch: tap opens, tap outside closes, stays on screen` (`test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })`): tap phrase → open. The popover's `boundingBox()` sits within `[0, 390]` horizontally and `[0, 844]` vertically. Tap `h1` → closed.
  - `axe clean with popover open`, in light and dark (pattern from `essay.spec.ts`).
- [ ] **Step 2:** Run `pnpm test:a11y -- ayah`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** Use `matchMedia('(hover: hover)')` to decide whether to bind `pointerenter`/`pointerleave` (with 150ms/300ms timers, close cancelled on entering the popover). On click/tap and Enter/Space, the trigger toggles. Document-level `pointerdown` outside any open `.ayah` closes it. Esc closes and returns focus. On open, measure and flip below or clamp horizontally (12px margin), using `top`/`left` set by inline style.
- [ ] **Step 4:** Run `pnpm test:a11y -- ayah`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: Ayah popover opens on hover, tap and keyboard`

---

### Task 4: Audio + maximise panel

**Files:**
- Modify: `src/components/Ayah.astro`
- Test: `tests/a11y/ayah.spec.ts`

**Interfaces:**
- Consumes: Task 2 DOM contract, Task 3 `open/close`.
- Produces: one module-level `HTMLAudioElement` (`preload="none"`). `play(root)` sets its `src` from `data-audio-src` and marks `root.dataset.playing = 'true'`. Every other root is cleared. Pause, `ended` and starting another verse all clear the flag. Play buttons swap icon and `aria-label` ("Play…" ↔ "Pause…"). One `<dialog class="ayah-panel">` is created lazily on `document.body` and filled from the instance's template on maximise.

- [ ] **Step 1: Write the failing tests.** Stub audio in the page with `page.addInitScript` replacing `HTMLMediaElement.prototype.play` with a resolved promise that dispatches `play`, and `pause` to dispatch `pause`. No real network audio in CI.
  - `inline play toggles playing state without opening the popover`: click `.ayah__play` → root `data-playing="true"`, label starts with `Pause`, popover still `closed`.
  - `only one verse plays at a time`: in the test, clone the `[data-ayah]` node into the same paragraph via `page.evaluate`. Re-dispatch init by importing nothing; the script must use event delegation on `document` so clones work. Play first, then second → first loses `data-playing`.
  - `popover stays open while playing`: hover, click `.ayah__pop-play`, move the mouse to `h1`, wait 500ms → still `open`.
  - `language toggle`: click `[data-lang="ur"]` → `.ayah__ur` visible, `.ayah__en` hidden, `aria-pressed` swapped.
  - `maximise opens the panel; Esc closes and restores focus`: open the popover, click `.ayah__max` → `dialog.ayah-panel[open]` contains `so patience is most fitting` and the Urdu text. Escape → no `dialog[open]`, `.ayah__max` focused. Backdrop click also closes.
  - `speed cycles`: panel speed button reads `1×` → `0.75×` → `1.25×` → `1×`, and the audio `playbackRate` matches.
  - `axe clean with the panel open`, light and dark.
- [ ] **Step 2:** Run `pnpm test:a11y -- ayah`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** Event delegation on `document` for all clicks. Progress: `timeupdate` sets the fill width and time text in both popover and panel. Panel seek uses `<input type="range" aria-label="Seek">`. Replay sets `currentTime = 0` and plays. Panel layout per the spec and mockup: max width 560px, radius 22px, `--glass-strong`, `::backdrop` with `--scrim` + `blur(4px)`, Arabic `clamp(28px, 7vw, 40px)` centred, translations in a 2-column grid that stacks below 520px.
- [ ] **Step 4:** Run `pnpm test:a11y -- ayah`. Expected: PASS.
- [ ] **Step 5: Manual check.** `pnpm dev`, open `/writing/sample-what-the-fast-teaches`. Press play and **hear Ali Jaber recite 12:18**. Try the maximise panel in both themes and at 390px width. Report what you heard and saw.
- [ ] **Step 6: Commit** `feat: Ayah audio playback and maximise panel`

---

### Task 5: Gates + PR

- [ ] **Step 1:** Run each gate and **paste the actual output tail** of each: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm test:a11y`. Fix anything red and commit.
- [ ] **Step 2:** `git push -u origin HEAD`, then `gh pr create` titled `feat: Ayah Audio — inline verse popover with recitation and EN/UR translations`. In the body, list the 8 spec decisions in one line each, plus how to author: `<Ayah ref="12:53">…</Ayah>`, optional `audio="/audio/x.mp3"` and `reciter="…"`.
- [ ] **Step 3:** Wait for CI, then run `gh pr checks <n>` and `gh pr view <n> --json mergeStateStatus` and paste both. "Done" means **CI green**, not local green. Do not merge.
