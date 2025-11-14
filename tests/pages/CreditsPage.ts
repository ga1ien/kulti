import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Credits Page Object Model
 */
export class CreditsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get creditBalance() {
    return this.getByTestId('credit-balance');
  }

  get sendTipButton() {
    return this.getByRole('button', { name: /send tip/i });
  }

  get recipientInput() {
    return this.getByTestId('tip-recipient-input');
  }

  get tipAmountInput() {
    return this.getByTestId('tip-amount-input');
  }

  get tipMessageInput() {
    return this.getByTestId('tip-message-input');
  }

  get confirmTipButton() {
    return this.getByRole('button', { name: /confirm|send/i });
  }

  get transactionHistory() {
    return this.getByTestId('transaction-history');
  }

  get milestonesSection() {
    return this.getByTestId('milestones-section');
  }

  // Actions
  async navigateToCredits(): Promise<void> {
    await this.goto('/dashboard/credits');
    await this.waitForLoad();
  }

  async getCreditBalance(): Promise<number> {
    const balanceText = await this.getText(this.creditBalance);
    return parseInt(balanceText.replace(/\D/g, ''), 10);
  }

  async sendTip(recipient: string, amount: number, message?: string): Promise<void> {
    await this.sendTipButton.click();
    await this.recipientInput.fill(recipient);
    await this.tipAmountInput.fill(amount.toString());

    if (message) {
      await this.tipMessageInput.fill(message);
    }

    await this.confirmTipButton.click();
    await this.waitForLoad();
  }

  async getLatestTransaction(): Promise<{
    amount: number;
    type: string;
    description: string;
  } | null> {
    const firstTransaction = this.transactionHistory
      .locator('[data-testid="transaction-item"]')
      .first();

    if (!(await this.elementExists(firstTransaction))) {
      return null;
    }

    const amountText = await this.getText(
      firstTransaction.locator('[data-testid="transaction-amount"]')
    );
    const typeText = await this.getText(
      firstTransaction.locator('[data-testid="transaction-type"]')
    );
    const descriptionText = await this.getText(
      firstTransaction.locator('[data-testid="transaction-description"]')
    );

    return {
      amount: parseInt(amountText.replace(/\D/g, ''), 10),
      type: typeText,
      description: descriptionText,
    };
  }

  async getTransactionCount(): Promise<number> {
    const transactions = this.transactionHistory.locator(
      '[data-testid="transaction-item"]'
    );
    return await transactions.count();
  }

  async getMilestones(): Promise<string[]> {
    const milestones = this.milestonesSection.locator(
      '[data-testid="milestone-item"]'
    );
    const count = await milestones.count();
    const result: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await this.getText(milestones.nth(i));
      result.push(text);
    }

    return result;
  }

  async hasMilestone(milestone: string): Promise<boolean> {
    const milestones = await this.getMilestones();
    return milestones.some((m) => m.includes(milestone));
  }
}
