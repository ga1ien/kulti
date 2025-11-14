import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object Model class
 * All page objects should extend this class
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get element by test ID
   */
  getByTestId(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  /**
   * Get element by text
   */
  getByText(text: string): Locator {
    return this.page.getByText(text);
  }

  /**
   * Get element by role
   */
  getByRole(
    role: Parameters<Page['getByRole']>[0],
    options?: Parameters<Page['getByRole']>[1]
  ): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get element by placeholder
   */
  getByPlaceholder(placeholder: string): Locator {
    return this.page.getByPlaceholder(placeholder);
  }

  /**
   * Get element by label
   */
  getByLabel(label: string): Locator {
    return this.page.getByLabel(label);
  }

  /**
   * Click element
   */
  async click(selector: string | Locator): Promise<void> {
    const element = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await element.click();
  }

  /**
   * Fill input field
   */
  async fill(selector: string | Locator, value: string): Promise<void> {
    const element = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await element.fill(value);
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string | Locator): Promise<void> {
    const element = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await element.waitFor({ state: 'visible' });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string | Locator): Promise<void> {
    const element = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await element.waitFor({ state: 'hidden' });
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(url?: string | RegExp): Promise<void> {
    if (url) {
      await this.page.waitForURL(url);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Get current URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * Go back
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  /**
   * Wait for timeout
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string | Locator): Promise<boolean> {
    try {
      const element = typeof selector === 'string' ? this.page.locator(selector) : selector;
      await element.waitFor({ state: 'attached', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get element text
   */
  async getText(selector: string | Locator): Promise<string> {
    const element = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return await element.textContent() || '';
  }

  /**
   * Press key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }
}
