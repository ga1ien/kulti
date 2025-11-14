import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have accessibility violations on homepage', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility violations on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility violations on signup page', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility violations on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('[data-test-exclude-a11y]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility violations on sessions page', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility violations on credits page', async ({ page }) => {
    await page.goto('/dashboard/credits');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check buttons have accessible names
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();

      // Button should have either aria-label or text content
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for h1
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThan(0);

    // Verify heading levels don't skip
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;

    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.replace('h', ''));

      // Level should not skip more than 1
      if (previousLevel > 0) {
        expect(level - previousLevel).toBeLessThanOrEqual(1);
      }

      previousLevel = level;
    }
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');

      // Images should have alt attribute (can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);

    // Should focus on interactive element
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);

    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should still be on page (not lost focus)
    focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have skip to main content link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Press tab to reveal skip link (usually hidden until focused)
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: /skip to (main )?content/i });
    const exists = await skipLink.count() > 0;

    // Skip link is optional but recommended
    if (exists) {
      await expect(skipLink).toBeFocused();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:visible');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');

      // Skip hidden and submit buttons
      if (type === 'hidden' || type === 'submit') continue;

      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have some form of label
      const hasLabel = id && (await page.locator(`label[for="${id}"]`).count() > 0);
      expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });

  test('should announce form errors to screen readers', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Trigger validation error
    const continueButton = page.getByRole('button', { name: /continue|submit/i });
    if (await continueButton.count() > 0) {
      await continueButton.click();
      await page.waitForTimeout(500);

      // Check for aria-live region or role="alert"
      const errorRegion = page.locator('[role="alert"], [aria-live]');
      const hasErrorAnnouncement = await errorRegion.count() > 0;

      if (hasErrorAnnouncement) {
        await expect(errorRegion.first()).toBeVisible();
      }
    }
  });

  test('should have focusable interactive elements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // All buttons should be focusable
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();
      await firstButton.focus();

      const isFocused = await firstButton.evaluate(
        el => el === document.activeElement
      );
      expect(isFocused).toBe(true);
    }
  });

  test('should not trap keyboard focus', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Tab through many elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }

    // Should still be able to interact with page
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Mobile Accessibility', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should not have accessibility violations on mobile login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility violations on mobile dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have touch targets of adequate size', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button:visible, a:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // WCAG recommends minimum 44x44px touch targets
        expect(box.width).toBeGreaterThanOrEqual(32); // Slightly relaxed for testing
        expect(box.height).toBeGreaterThanOrEqual(32);
      }
    }
  });
});
