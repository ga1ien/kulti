import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object Model
 */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get welcomeMessage() {
    return this.getByTestId('welcome-message');
  }

  get userMenu() {
    return this.getByTestId('user-menu');
  }

  get logoutButton() {
    return this.getByRole('button', { name: /logout|sign out/i });
  }

  get navigationMenu() {
    return this.getByTestId('navigation-menu');
  }

  get creditsDisplay() {
    return this.getByTestId('header-credits-display');
  }

  get notificationBell() {
    return this.getByTestId('notification-bell');
  }

  // Navigation links
  get sessionsLink() {
    return this.getByRole('link', { name: /sessions/i });
  }

  get creditsLink() {
    return this.getByRole('link', { name: /credits/i });
  }

  get invitesLink() {
    return this.getByRole('link', { name: /invites/i });
  }

  get recordingsLink() {
    return this.getByRole('link', { name: /recordings/i });
  }

  get settingsLink() {
    return this.getByRole('link', { name: /settings/i });
  }

  // Actions
  async navigateToDashboard(): Promise<void> {
    await this.goto('/dashboard');
    await this.waitForLoad();
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.elementExists(this.userMenu);
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.waitForNavigation(/\/login/);
  }

  async getCreditsFromHeader(): Promise<number> {
    const text = await this.getText(this.creditsDisplay);
    return parseInt(text.replace(/\D/g, ''), 10);
  }

  async navigateToSessions(): Promise<void> {
    await this.sessionsLink.click();
    await this.waitForLoad();
  }

  async navigateToCredits(): Promise<void> {
    await this.creditsLink.click();
    await this.waitForLoad();
  }

  async navigateToInvites(): Promise<void> {
    await this.invitesLink.click();
    await this.waitForLoad();
  }

  async navigateToRecordings(): Promise<void> {
    await this.recordingsLink.click();
    await this.waitForLoad();
  }

  async navigateToSettings(): Promise<void> {
    await this.settingsLink.click();
    await this.waitForLoad();
  }

  async getWelcomeMessage(): Promise<string> {
    return await this.getText(this.welcomeMessage);
  }

  async hasNotifications(): Promise<boolean> {
    const badge = this.notificationBell.locator('[data-testid="notification-badge"]');
    return await this.elementExists(badge);
  }
}
