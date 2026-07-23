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
