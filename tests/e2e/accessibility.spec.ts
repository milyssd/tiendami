import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home has no detected WCAG A/AA violations in both themes and viewport sizes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      const current = await page.evaluate(
        () => document.documentElement.dataset.theme,
      );
      if (current !== theme)
        await page
          .getByRole('button', {
            name: theme === 'dark' ? 'Usar modo oscuro' : 'Usar modo claro',
          })
          .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(result.violations, `${theme} at ${width}px`).toEqual([]);
    }
  }
});
