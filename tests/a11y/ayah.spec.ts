import { test, expect } from '@playwright/test';

const ESSAY = '/writing/sample-what-the-fast-teaches';

test.beforeEach(async ({ page }) => {
  await page.goto(ESSAY);
});

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
