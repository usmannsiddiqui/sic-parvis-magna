import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  '/',
  '/writing',
  '/writing/sample-the-first-rep',
  '/topics',
  '/topics/discipline',
  '/topics/islam',
  '/about',
];

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
  await expect(grid).toHaveRole('list');

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
  const outlineWidth = await firstLink.evaluate((el) => getComputedStyle(el).outlineWidth);
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

test('/topics real spines are single focusable links with the essay title as accessible name', async ({
  page,
}) => {
  await page.goto('/topics');

  const realEssays = [
    { title: 'The First Rep', slug: 'sample-the-first-rep' },
    { title: 'What the Fast Teaches', slug: 'sample-what-the-fast-teaches' },
  ];

  for (const { title, slug } of realEssays) {
    const spine = page.getByRole('link', { name: title, exact: true });
    await expect(spine).toHaveCount(1);
    await expect(spine).toHaveAttribute('href', `/writing/${slug}`);
    await spine.focus();
    await expect(spine).toBeFocused();
  }
});

test('/topics coming-soon spines are not links and not focusable', async ({ page }) => {
  await page.goto('/topics');

  // Reflections has no published essays today, so its shelf is all
  // coming-soon placeholders — a guaranteed non-empty sample.
  const reflectionsShelf = page.locator('.shelf', {
    has: page.getByRole('heading', { name: 'Reflections' }),
  });
  const soonSpines = reflectionsShelf.locator('.spine--soon');
  await expect(soonSpines.first()).toBeVisible();

  const comingSoonText = reflectionsShelf.getByText('Coming soon');
  await expect(comingSoonText.first()).toBeVisible();

  // None of the coming-soon spines are links or otherwise focusable.
  await expect(page.locator('.spine--soon a')).toHaveCount(0);
  const soonCount = await soonSpines.count();
  expect(soonCount).toBeGreaterThan(0);
  for (let i = 0; i < soonCount; i++) {
    const el = soonSpines.nth(i);
    await expect(el).not.toHaveJSProperty('tagName', 'A');
    await expect(el).not.toHaveAttribute('href', /.*/);
    await expect(el).not.toHaveAttribute('tabindex', /.*/);
    // The "Coming soon" text must stay in the accessibility tree — the
    // spine (and its title span) must NOT be aria-hidden.
    await expect(el).not.toHaveAttribute('aria-hidden', 'true');
    await expect(el.locator('.spine__title')).not.toHaveAttribute('aria-hidden', 'true');
  }
});

test('/topics has no title bleed between real and coming-soon spines', async ({ page }) => {
  await page.goto('/topics');

  // Coming-soon spines never carry a real essay title.
  await expect(
    page.locator('.spine--soon .spine__title', { hasText: 'The First Rep' }),
  ).toHaveCount(0);
  await expect(
    page.locator('.spine--soon .spine__title', { hasText: 'What the Fast Teaches' }),
  ).toHaveCount(0);

  // Real spines never render the "Coming soon" placeholder text.
  await expect(
    page.locator('.spine--a .spine__title, .spine--b .spine__title, .spine--c .spine__title', {
      hasText: 'Coming soon',
    }),
  ).toHaveCount(0);
});

test('/topics decorative elements are hidden from the accessibility tree', async ({ page }) => {
  await page.goto('/topics');

  for (const selector of ['.shelf__filler', '.ledge', '.shelf__more']) {
    const elements = page.locator(selector);
    const count = await elements.count();
    for (let i = 0; i < count; i++) {
      await expect(elements.nth(i)).toHaveAttribute('aria-hidden', 'true');
    }
  }
});

test('/topics heading levels — one h1, three shelf h2s in category order', async ({ page }) => {
  await page.goto('/topics');

  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Topics');

  const h2s = page.locator('h2');
  await expect(h2s).toHaveCount(3);
  await expect(h2s.nth(0)).toHaveText('Discipline');
  await expect(h2s.nth(1)).toHaveText('Faith');
  await expect(h2s.nth(2)).toHaveText('Reflections');

  await expect(page.locator('h3, h4, h5, h6')).toHaveCount(0);
});

test('/topics tag cloud links all have non-empty accessible names', async ({ page }) => {
  await page.goto('/topics');

  const tags = page.locator('.tag-cloud__item');
  const count = await tags.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const text = await tags.nth(i).textContent();
    expect(text?.trim()).not.toBe('');
  }
});

test('/topics spines render static under reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/topics');

  const firstSpine = page.locator('.spine--a, .spine--b, .spine--c').first();
  const transition = await firstSpine.evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(['0s', '0s, 0s']).toContain(transition);

  await context.close();
});
