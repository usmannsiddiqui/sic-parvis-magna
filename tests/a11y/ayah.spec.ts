import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ESSAY = '/writing/sample-what-the-fast-teaches';

declare global {
  interface Window {
    __ayahAudio: HTMLAudioElement[];
    __playCalls: number;
  }
}

async function openPanel(page: Page) {
  await page.locator('.ayah__phrase').focus();
  await page.keyboard.press('Enter');
  await page.locator('.ayah__max').click();
  await expect(page.locator('dialog.ayah-panel')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route('https://everyayah.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.__ayahAudio = [];
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor() {
        super();
        window.__ayahAudio.push(this);
      }
    };
    HTMLMediaElement.prototype.play = function () {
      Object.defineProperty(this, 'paused', { configurable: true, value: false });
      Object.defineProperty(this, 'duration', { configurable: true, value: 60 });
      this.dispatchEvent(new Event('loadedmetadata'));
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      Object.defineProperty(this, 'paused', { configurable: true, value: true });
      this.dispatchEvent(new Event('pause'));
    };
  });
  await page.goto(ESSAY);
});

test('inline play toggles playing state without opening the popover', async ({ page }) => {
  const root = page.locator('[data-ayah]');
  const play = page.locator('.ayah__play');
  await play.click();
  await expect(root).toHaveAttribute('data-playing', 'true');
  await expect(play).toHaveAttribute('aria-label', 'Pause recitation of Yusuf 12:18');
  await expect(page.locator('.ayah__pop-play')).toHaveAttribute('aria-label', /^Pause/);
  await expect(page.locator('.ayah__pop')).toHaveAttribute('data-state', 'closed');
  expect(
    await page.evaluate(() => window.__ayahAudio.map((a) => ({ preload: a.preload, src: a.src }))),
  ).toEqual([{ preload: 'none', src: 'https://everyayah.com/data/Ali_Jaber_64kbps/012018.mp3' }]);
  await play.click();
  await expect(root).not.toHaveAttribute('data-playing');
  await expect(play).toHaveAttribute('aria-label', /^Play/);
});

test('only one verse plays at a time including cloned verses', async ({ page }) => {
  await page.locator('[data-ayah]').evaluate((root) => {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.dataset.audioSrc = 'https://everyayah.com/data/Ali_Jaber_64kbps/012053.mp3';
    root.after(clone);
  });
  const roots = page.locator('[data-ayah]');
  await roots.nth(0).locator('.ayah__play').click();
  await expect(roots.nth(0)).toHaveAttribute('data-playing', 'true');
  await roots.nth(1).locator('.ayah__play').click();
  await expect(roots.nth(0)).not.toHaveAttribute('data-playing');
  await expect(roots.nth(0).locator('.ayah__play')).toHaveAttribute('aria-label', /^Play/);
  await expect(roots.nth(1)).toHaveAttribute('data-playing', 'true');
  expect(await page.evaluate(() => window.__ayahAudio.length)).toBe(1);
  expect(await page.evaluate(() => window.__ayahAudio[0].src)).toContain('012053.mp3');
});

test('popover stays open while playing but Escape can close it', async ({ page }) => {
  await page.locator('.ayah__phrase').hover();
  await page.waitForTimeout(400);
  await page.locator('.ayah__pop-play').click();
  await expect(page.locator('[data-ayah]')).toHaveAttribute('data-playing', 'true');
  await page.locator('main h1').hover();
  await page.waitForTimeout(500);
  await expect(page.locator('.ayah__pop')).toHaveAttribute('data-state', 'open');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ayah__pop')).toHaveAttribute('data-state', 'closed');
});

test('language toggle swaps translations and pressed states', async ({ page }) => {
  await page.locator('.ayah__phrase').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-lang="ur"]').click();
  await expect(page.locator('.ayah__ur')).toBeVisible();
  await expect(page.locator('.ayah__en')).toBeHidden();
  await expect(page.locator('[data-lang="ur"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-lang="en"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-lang="en"]').click();
  await expect(page.locator('.ayah__en')).toBeVisible();
  await expect(page.locator('.ayah__ur')).toBeHidden();
});

test('maximise opens the panel; Escape, backdrop and close restore focus', async ({ page }) => {
  await openPanel(page);
  const dialog = page.locator('dialog.ayah-panel');
  await expect(dialog).toContainText('so patience is most fitting');
  await expect(dialog.locator('[lang="ur"].ayah-panel__ur')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.ayah__max')).toBeFocused();
  await page.locator('.ayah__max').click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.ayah__max')).toBeFocused();
  await page.locator('.ayah__max').click();
  await dialog.locator('.ayah-panel__close').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.ayah__max')).toBeFocused();
  await expect(page.locator('dialog.ayah-panel')).toHaveCount(1);
});

test('speed cycles and updates the shared audio', async ({ page }) => {
  await openPanel(page);
  const speed = page.locator('.ayah-panel__speed');
  await expect(speed).toHaveText('1×');
  for (const rate of [0.75, 1.25, 1]) {
    await speed.click();
    await expect(speed).toHaveText(`${rate}×`);
    expect(await page.evaluate(() => window.__ayahAudio[0].playbackRate)).toBe(rate);
  }
});

test('selected speed survives first playback and switching verses', async ({ page }) => {
  await openPanel(page);
  await page.locator('.ayah-panel__speed').click();
  await expect(page.locator('.ayah-panel__speed')).toHaveText('0.75×');
  await page.locator('.ayah-panel__play').click();
  expect(await page.evaluate(() => window.__ayahAudio[0].playbackRate)).toBe(0.75);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.locator('[data-ayah]').evaluate((root) => {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.dataset.audioSrc = 'https://everyayah.com/data/Ali_Jaber_64kbps/012053.mp3';
    root.after(clone);
  });
  await page.locator('.ayah__play').nth(1).click();
  expect(await page.evaluate(() => window.__ayahAudio[0].playbackRate)).toBe(0.75);
});

test('progress, seek, replay and ended synchronize both player views', async ({ page }) => {
  await openPanel(page);
  await page.locator('.ayah-panel__play').click();
  await expect(page.locator('.ayah-panel__play')).toHaveAttribute('aria-label', /^Pause/);
  await page.evaluate(() => {
    const audio = window.__ayahAudio[0];
    audio.currentTime = 15;
    audio.dispatchEvent(new Event('timeupdate'));
  });
  await expect(page.locator('.ayah-panel__elapsed')).toHaveText('0:15');
  await expect(page.locator('.ayah-panel__duration')).toHaveText('1:00');
  await expect(page.locator('.ayah__time')).toHaveText('0:15 / 1:00');
  await expect(page.locator('.ayah__fill')).toHaveAttribute('style', /width: 25%/);
  await page.locator('.ayah-panel__seek').fill('50');
  expect(await page.evaluate(() => window.__ayahAudio[0].currentTime)).toBe(30);
  await expect(page.locator('.ayah-panel__elapsed')).toHaveText('0:30');
  await page.locator('.ayah-panel__replay').click();
  expect(await page.evaluate(() => window.__ayahAudio[0].currentTime)).toBe(0);
  await page.evaluate(() => window.__ayahAudio[0].dispatchEvent(new Event('ended')));
  await expect(page.locator('[data-ayah]')).not.toHaveAttribute('data-playing');
  await expect(page.locator('.ayah-panel__play')).toHaveAttribute('aria-label', /^Play/);
  await expect(page.locator('.ayah__play')).toHaveAttribute('aria-label', /^Play/);
});

test('failed playback clears playing state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.evaluate(() => {
    window.__playCalls = 0;
    HTMLMediaElement.prototype.play = () => {
      window.__playCalls++;
      return Promise.reject(new Error('blocked'));
    };
  });
  await page.locator('.ayah__play').click();
  await expect.poll(() => page.evaluate(() => window.__playCalls)).toBe(1);
  await expect(page.locator('[data-ayah]')).not.toHaveAttribute('data-playing');
  await expect(page.locator('.ayah__play')).toHaveAttribute('aria-label', /^Play/);
  expect(errors).toEqual([]);
});

for (const theme of ['light', 'dark']) {
  test(`axe clean with panel open in ${theme}`, async ({ page }) => {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    await openPanel(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `.superpowers/sdd/2026-10-19-ayah-audio/panel-desktop-${theme}.png`,
    });
  });
}

test.describe('mobile panel', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  for (const theme of ['light', 'dark']) {
    test(`translations stack and controls fit in ${theme}`, async ({ page }) => {
      await page.evaluate(
        (value) => document.documentElement.setAttribute('data-theme', value),
        theme,
      );
      await openPanel(page);
      const panel = page.locator('dialog.ayah-panel');
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(12);
      expect(box.x + box.width).toBeLessThanOrEqual(378);
      expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      const en = (await panel.locator('.ayah-panel__en').boundingBox())!;
      const ur = (await panel.locator('.ayah-panel__ur').boundingBox())!;
      expect(ur.y).toBeGreaterThan(en.y + en.height);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `.superpowers/sdd/2026-10-19-ayah-audio/panel-mobile-${theme}.png`,
      });
    });
  }
});

test('popover IDs use deterministic sequence numbers', async ({ page }) => {
  await expect(page.locator('.ayah__pop')).toHaveAttribute('id', /^ayah-12-18-\d+$/);
});

test('keyboard opens and Esc closes with focus restored', async ({ page }) => {
  const phrase = page.locator('.ayah__phrase');
  const popover = page.locator('.ayah__pop');
  await phrase.focus();
  await page.keyboard.press('Enter');
  await expect(popover).toHaveAttribute('data-state', 'open');
  await expect(phrase).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.ayah__max').focus();
  await page.keyboard.press('Escape');
  await expect(popover).toHaveAttribute('data-state', 'closed');
  await expect(phrase).toBeFocused();
  await expect(phrase).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space');
  await expect(popover).toHaveAttribute('data-state', 'open');
  await page.keyboard.press('Space');
  await expect(popover).toHaveAttribute('data-state', 'closed');
});

test('hover opens after intent delay and survives the gap', async ({ page }) => {
  const phrase = page.locator('.ayah__phrase');
  const popover = page.locator('.ayah__pop');
  await phrase.hover();
  await expect(popover).toHaveAttribute('data-state', 'closed');
  await page.waitForTimeout(200);
  await expect(popover).toHaveAttribute('data-state', 'open');
  const triggerBox = (await phrase.boundingBox())!;
  const popBox = (await popover.boundingBox())!;
  // Pause in the actual empty space between trigger and popover.
  await page.mouse.move(
    triggerBox.x + triggerBox.width / 2,
    (popBox.y + popBox.height + triggerBox.y) / 2,
  );
  await page.waitForTimeout(100);
  await popover.hover();
  await page.waitForTimeout(400);
  await expect(popover).toHaveAttribute('data-state', 'open');
  await page.locator('main h1').hover();
  await expect(popover).toHaveAttribute('data-state', 'closed', { timeout: 500 });
});

test('only one popover opens at a time', async ({ page }) => {
  await page.locator('[data-ayah]').evaluate((root) => {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelector('.ayah__pop')!.id = 'second-ayah';
    clone.querySelector('.ayah__phrase')!.setAttribute('aria-controls', 'second-ayah');
    root.after(clone);
  });
  const phrases = page.locator('.ayah__phrase');
  await phrases.nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ayah__pop').nth(0)).toHaveAttribute('data-state', 'open');
  await phrases.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ayah__pop').nth(0)).toHaveAttribute('data-state', 'closed');
  await expect(page.locator('.ayah__pop').nth(1)).toHaveAttribute('data-state', 'open');
});

test('click pins a hover-open popover until outside click or a second phrase click', async ({
  page,
}) => {
  const phrase = page.locator('.ayah__phrase');
  const popover = page.locator('.ayah__pop');
  await phrase.hover();
  await page.waitForTimeout(400);
  await expect(popover).toHaveAttribute('data-state', 'open');
  await phrase.click();
  await expect(popover).toHaveAttribute('data-state', 'open');
  await page.locator('main h1').hover();
  await page.waitForTimeout(500);
  await expect(popover).toHaveAttribute('data-state', 'open');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await expect(popover).toHaveAttribute('data-state', 'closed');
  await phrase.hover();
  await page.waitForTimeout(400);
  await phrase.click();
  await expect(popover).toHaveAttribute('data-state', 'open');
  await phrase.click();
  await expect(popover).toHaveAttribute('data-state', 'closed');
});

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('tap opens, tap outside closes, stays on screen and flips at the top edge', async ({
    page,
  }) => {
    const phrase = page.locator('.ayah__phrase');
    await phrase.evaluate((element) => {
      element.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -24);
    });
    await phrase.tap();
    const popover = page.locator('.ayah__pop');
    await expect(popover).toHaveAttribute('data-state', 'open');
    const box = (await popover.boundingBox())!;
    const triggerBox = (await phrase.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(12);
    expect(box.x + box.width).toBeLessThanOrEqual(378);
    expect(box.y).toBeGreaterThanOrEqual(12);
    expect(box.y + box.height).toBeLessThanOrEqual(832);
    expect(box.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
    await page.locator('main h1').tap();
    await expect(popover).toHaveAttribute('data-state', 'closed');
  });
});

for (const theme of ['light', 'dark']) {
  test(`axe clean with popover open in ${theme}`, async ({ page }) => {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    await page.locator('.ayah__phrase').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.ayah__pop')).toHaveAttribute('data-state', 'open');
    await expect(page.locator('.ayah__pop')).toHaveCSS('opacity', '1');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test('the verse phrase is inline Arabic', async ({ page }) => {
  const phrase = page.locator('[data-ayah] bdi.ayah__phrase');
  await expect(phrase).toHaveAttribute('lang', 'ar');
  await expect(phrase).toHaveText('فَصَبْرٌ جَمِيلٌ');
  await expect(phrase).toHaveAttribute('role', 'button');
  await expect(phrase).toHaveAttribute('tabindex', '0');
  await expect(phrase).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(phrase).toHaveAttribute('aria-expanded', 'false');
});

test('the popover carries the full verse translations', async ({ page }) => {
  await expect(page.locator('.ayah__en')).toContainText('so patience is most fitting');
  await expect(page.locator('.ayah__ur')).toHaveAttribute('lang', 'ur');
  await expect(page.locator('.ayah__ur')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.ayah__ur')).not.toBeEmpty();
  const popover = page.locator('.ayah__pop');
  await expect(popover).toHaveAttribute('role', 'dialog');
  await expect(popover).toHaveAttribute('aria-label', "Qur'an, Yusuf 12:18");
  await expect(popover).toHaveAttribute('data-state', 'closed');
  await expect(popover).toBeHidden();
  await expect(page.locator('.ayah__phrase')).toHaveAttribute(
    'aria-controls',
    (await popover.getAttribute('id'))!,
  );
});

test('paragraph is not split', async ({ page }) => {
  const ayah = page.locator('[data-ayah]');
  await expect(ayah).toHaveCount(1);
  expect(await ayah.evaluate((element) => element.closest('p')?.textContent)).toContain(
    'beautiful patience',
  );
});

test('recitation metadata and panel template are rendered at build time', async ({ page }) => {
  await expect(page.locator('[data-ayah]')).toHaveAttribute('data-ref', '12:18');
  await expect(page.locator('[data-ayah]')).toHaveAttribute(
    'data-audio-src',
    'https://everyayah.com/data/Ali_Jaber_64kbps/012018.mp3',
  );
  await expect(page.locator('.ayah__play')).toHaveAttribute(
    'aria-label',
    'Play recitation of Yusuf 12:18',
  );
  await expect(page.locator('.ayah__pop')).toContainText('Ali Jaber');
  expect(
    await page.locator('template.ayah__panel-tpl').evaluate((element) => {
      const content = (element as HTMLTemplateElement).content;
      return {
        arabic: content.querySelector('[lang="ar"]')?.textContent,
        english: content.querySelector('[lang="en"]')?.textContent,
        urdu: content.querySelector('.ayah-panel__ur[lang="ur"]')?.getAttribute('dir'),
      };
    }),
  ).toEqual({
    arabic: expect.stringContaining('جَمِيلٌ'),
    english: expect.stringContaining('so patience is most fitting'),
    urdu: 'rtl',
  });
});
