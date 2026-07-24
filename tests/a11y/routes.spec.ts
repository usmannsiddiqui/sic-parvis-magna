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
