import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ESSAY = '/writing/sample-what-the-fast-teaches';

test('no axe violations in light theme', async ({ page }) => {
  await page.goto(ESSAY);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('no axe violations in dark theme', async ({ page }) => {
  await page.goto(ESSAY);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('has exactly one h1 and the Arabic block is RTL + lang=ar', async ({ page }) => {
  await page.goto(ESSAY);
  await expect(page.locator('h1')).toHaveCount(1);
  const arabic = page.locator('blockquote[lang="ar"]');
  await expect(arabic).toHaveAttribute('dir', 'rtl');
});
