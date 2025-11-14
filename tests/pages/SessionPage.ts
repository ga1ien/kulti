import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Session Page Object Model
 */
export class SessionPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get createSessionButton() {
    return this.getByRole('button', { name: /create session|new session/i });
  }

  get sessionTitleInput() {
    return this.getByTestId('session-title-input');
  }

  get sessionDescriptionInput() {
    return this.getByTestId('session-description-input');
  }

  get scheduleDateInput() {
    return this.getByTestId('schedule-date-input');
  }

  get saveSessionButton() {
    return this.getByRole('button', { name: /save|create/i });
  }

  get sessionsList() {
    return this.getByTestId('sessions-list');
  }

  get joinSessionButton() {
    return this.getByRole('button', { name: /join/i });
  }

  get waitingRoomMessage() {
    return this.getByTestId('waiting-room-message');
  }

  get endSessionButton() {
    return this.getByRole('button', { name: /end session/i });
  }

  get sessionStatusBadge() {
    return this.getByTestId('session-status-badge');
  }

  // Actions
  async navigateToSessions(): Promise<void> {
    await this.goto('/dashboard/sessions');
    await this.waitForLoad();
  }

  async clickCreateSession(): Promise<void> {
    await this.createSessionButton.click();
  }

  async fillSessionDetails(
    title: string,
    description: string,
    scheduleDate?: string
  ): Promise<void> {
    await this.sessionTitleInput.fill(title);
    await this.sessionDescriptionInput.fill(description);

    if (scheduleDate) {
      await this.scheduleDateInput.fill(scheduleDate);
    }
  }

  async saveSession(): Promise<void> {
    await this.saveSessionButton.click();
  }

  async createSession(
    title: string,
    description: string,
    scheduleDate?: string
  ): Promise<void> {
    await this.navigateToSessions();
    await this.clickCreateSession();
    await this.fillSessionDetails(title, description, scheduleDate);
    await this.saveSession();
    await this.waitForLoad();
  }

  async findSessionByTitle(title: string): Promise<boolean> {
    const sessionCard = this.page.locator(`[data-testid*="session-card"]`, {
      hasText: title,
    });
    return await sessionCard.count() > 0;
  }

  async joinSessionByTitle(title: string): Promise<void> {
    const sessionCard = this.page.locator(`[data-testid*="session-card"]`, {
      hasText: title,
    });
    await sessionCard.locator(this.joinSessionButton).click();
  }

  async waitForWaitingRoom(): Promise<void> {
    await this.waitForVisible(this.waitingRoomMessage);
  }

  async endSession(): Promise<void> {
    await this.endSessionButton.click();
    // Confirm dialog if present
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes/i });
    if (await this.elementExists(confirmButton)) {
      await confirmButton.click();
    }
  }

  async getSessionStatus(): Promise<string> {
    return await this.getText(this.sessionStatusBadge);
  }

  async isInWaitingRoom(): Promise<boolean> {
    return await this.elementExists(this.waitingRoomMessage);
  }

  async getSessionsCount(): Promise<number> {
    const cards = this.page.locator('[data-testid*="session-card"]');
    return await cards.count();
  }
}
