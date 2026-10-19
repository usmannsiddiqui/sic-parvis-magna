import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ESSAY = '/writing/sample-what-the-fast-teaches';

test.beforeEach(async ({ page }) => {
  await page.goto(ESSAY);
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
