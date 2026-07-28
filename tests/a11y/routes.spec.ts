import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/writing', '/topics', '/topics/discipline', '/topics/islam', '/about'];

for (const route of ROUTES) {
  test(`${route} — one h1, axe clean in both themes`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);

    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations, `${route} @ ${theme}`).toEqual([]);
    }
  });
}

test('404 page has one h1 and links home', async ({ page }) => {
  const res = await page.goto('/404');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /home page/i })).toBeVisible();
});

test('/writing card grid — list semantics, single-link cards, visible focus', async ({ page }) => {
  await page.goto('/writing');

  // The grid is a semantic list.
  const grid = page.locator('ul.grid');
  await expect(grid).toHaveCount(1);

  // Each list item holds exactly one focusable link (the whole card).
  const items = grid.locator(':scope > li');
  const itemCount = await items.count();
  expect(itemCount).toBeGreaterThan(0);
  for (let i = 0; i < itemCount; i++) {
    await expect(items.nth(i).locator('a')).toHaveCount(1);
  }

  // Keyboard focus lands on the first card link with a visible outline.
  const firstLink = items.first().locator('a');
  await firstLink.focus();
  await expect(firstLink).toBeFocused();
  const outlineWidth = await firstLink.evaluate(
    (el) => getComputedStyle(el).outlineWidth,
  );
  expect(parseFloat(outlineWidth)).toBeGreaterThan(0);
});

test('/writing cards render static under reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/writing');

  const firstLink = page.locator('ul.grid > li a').first();
  const transition = await firstLink.evaluate((el) => getComputedStyle(el).transitionDuration);
  // No hover transition when reduced motion is requested.
  expect(['0s', '0s, 0s']).toContain(transition);

  await context.close();
});
