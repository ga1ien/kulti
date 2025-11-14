import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Invite Page Object Model
 */
export class InvitePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get inviteCodesList() {
    return this.getByTestId('invite-codes-list');
  }

  get copyInviteLinkButton() {
    return this.getByRole('button', { name: /copy link/i });
  }

  get inviteCodeDisplay() {
    return this.getByTestId('invite-code-display');
  }

  get inviteUsageCount() {
    return this.getByTestId('invite-usage-count');
  }

  get remainingInvites() {
    return this.getByTestId('remaining-invites');
  }

  get generateCodeButton() {
    return this.getByRole('button', { name: /generate code/i });
  }

  // Actions
  async navigateToInvites(): Promise<void> {
    await this.goto('/dashboard/invites');
    await this.waitForLoad();
  }

  async getInviteCodes(): Promise<string[]> {
    const codeElements = this.inviteCodesList.locator('[data-testid="invite-code"]');
    const count = await codeElements.count();
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = await this.getText(codeElements.nth(i));
      codes.push(code);
    }

    return codes;
  }

  async copyInviteLink(codeIndex: number = 0): Promise<void> {
    const copyButtons = this.copyInviteLinkButton;
    await copyButtons.nth(codeIndex).click();
  }

  async getInviteCode(): Promise<string> {
    return await this.getText(this.inviteCodeDisplay);
  }

  async getInviteUsageCount(): Promise<number> {
    const text = await this.getText(this.inviteUsageCount);
    return parseInt(text.replace(/\D/g, ''), 10);
  }

  async getRemainingInvites(): Promise<number> {
    const text = await this.getText(this.remainingInvites);
    return parseInt(text.replace(/\D/g, ''), 10);
  }

  async generateNewCode(): Promise<void> {
    await this.generateCodeButton.click();
    await this.waitForLoad();
  }

  async hasInviteCode(code: string): Promise<boolean> {
    const codes = await this.getInviteCodes();
    return codes.includes(code);
  }
}
