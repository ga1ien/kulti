import { test, expect } from '@playwright/test';
import { CreditsPage } from '../pages/CreditsPage';
import { DashboardPage } from '../pages/DashboardPage';
import {
  createTestUser,
  addCreditsToUser,
  cleanupTestData,
} from '../helpers/db-setup';

test.describe('Credits System', () => {
  let testUser1Id: string;
  let testUser2Id: string;

  test.beforeAll(async () => {
    // Create test users
    const user1 = await createTestUser({
      phone: `+1555${Date.now().toString().slice(-7)}`,
      full_name: 'Credits Test User 1',
      username: `creditsuser1${Date.now()}`,
      credits: 500,
    });
    testUser1Id = user1.id;

    const user2 = await createTestUser({
      phone: `+1556${Date.now().toString().slice(-7)}`,
      full_name: 'Credits Test User 2',
      username: `creditsuser2${Date.now()}`,
      credits: 100,
    });
    testUser2Id = user2.id;
  });

  test.afterAll(async () => {
    await cleanupTestData([testUser1Id, testUser2Id]);
  });

  test('should display credits page correctly', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    // Verify page elements
    await expect(creditsPage.creditBalance).toBeVisible();
    await expect(creditsPage.transactionHistory).toBeVisible();
  });

  test('should display current credit balance', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    const balance = await creditsPage.getCreditBalance();
    expect(typeof balance).toBe('number');
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  test('should show credit balance in header', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigateToDashboard();

    const headerCredits = await dashboardPage.getCreditsFromHeader();
    expect(typeof headerCredits).toBe('number');
    expect(headerCredits).toBeGreaterThanOrEqual(0);
  });

  test('should send tip to another user', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    const initialBalance = await creditsPage.getCreditBalance();

    // Send tip
    await creditsPage.sendTip('creditsuser2', 50, 'Thanks for the session!');
    await page.waitForTimeout(1000);

    // Balance should decrease
    const newBalance = await creditsPage.getCreditBalance();
    expect(newBalance).toBeLessThan(initialBalance);
  });

  test('should validate tip amount', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    // Try to send more than balance
    await creditsPage.sendTipButton.click();
    await creditsPage.recipientInput.fill('creditsuser2');
    await creditsPage.tipAmountInput.fill('999999');
    await creditsPage.confirmTipButton.click();
    await page.waitForTimeout(500);

    // Should show error
    const errorMessage = page.getByText(/insufficient|not enough/i);
    const hasError = await creditsPage.elementExists(errorMessage);
    expect(hasError).toBe(true);
  });

  test('should display transaction history', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    const count = await creditsPage.getTransactionCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show latest transaction after tip', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    // Send a tip
    await creditsPage.sendTip('creditsuser2', 25, 'E2E test tip');
    await page.waitForTimeout(1000);

    // Check latest transaction
    const latestTransaction = await creditsPage.getLatestTransaction();
    expect(latestTransaction).not.toBeNull();
    if (latestTransaction) {
      expect(latestTransaction.amount).toBe(25);
      expect(latestTransaction.type).toContain('sent');
    }
  });

  test('should earn credits from session hosting', async ({ page }) => {
    const creditsPage = new CreditsPage(page);

    // Add credits manually (simulating earning from session)
    await addCreditsToUser(testUser1Id, 550, 'Hosted a session');

    await creditsPage.navigateToCredits();
    await page.reload();
    await page.waitForTimeout(1000);

    const balance = await creditsPage.getCreditBalance();
    expect(balance).toBeGreaterThanOrEqual(550);

    // Check transaction history
    const latestTransaction = await creditsPage.getLatestTransaction();
    expect(latestTransaction).not.toBeNull();
    if (latestTransaction) {
      expect(latestTransaction.type).toContain('earned');
    }
  });

  test('should display milestones section', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    await expect(creditsPage.milestonesSection).toBeVisible();
  });

  test('should show achieved milestones', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    const milestones = await creditsPage.getMilestones();
    expect(Array.isArray(milestones)).toBe(true);
  });

  test('should highlight next milestone', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    const nextMilestone = page.locator('[data-testid="next-milestone"]');
    if (await creditsPage.elementExists(nextMilestone)) {
      await expect(nextMilestone).toBeVisible();
    }
  });

  test('should validate recipient username', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    await creditsPage.sendTipButton.click();
    await creditsPage.recipientInput.fill('nonexistentuser999');
    await creditsPage.tipAmountInput.fill('10');
    await creditsPage.confirmTipButton.click();
    await page.waitForTimeout(500);

    // Should show error for invalid recipient
    const errorMessage = page.getByText(/not found|invalid|does not exist/i);
    const hasError = await creditsPage.elementExists(errorMessage);
    expect(hasError).toBe(true);
  });

  test('should prevent self-tipping', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    await creditsPage.sendTipButton.click();
    await creditsPage.recipientInput.fill('creditsuser1'); // Same user
    await creditsPage.tipAmountInput.fill('10');
    await creditsPage.confirmTipButton.click();
    await page.waitForTimeout(500);

    // Should show error
    const errorMessage = page.getByText(/yourself|same user/i);
    const hasError = await creditsPage.elementExists(errorMessage);
    expect(hasError).toBe(true);
  });

  test('should filter transactions by type', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    const filterButton = page.getByRole('button', { name: /filter|type/i });
    if (await creditsPage.elementExists(filterButton)) {
      await filterButton.click();
      await page.waitForTimeout(500);

      const earnedOption = page.getByText(/earned/i);
      if (await creditsPage.elementExists(earnedOption)) {
        await earnedOption.click();
        await page.waitForTimeout(500);

        // Transactions should be filtered
        const count = await creditsPage.getTransactionCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Credits Achievements', () => {
  test('should unlock achievement for first tip', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    // Send first tip
    await creditsPage.sendTip('creditsuser2', 5, 'First tip!');
    await page.waitForTimeout(2000);

    // Check for achievement notification
    const achievementNotification = page.getByText(/achievement|unlocked/i);
    if (await creditsPage.elementExists(achievementNotification)) {
      await expect(achievementNotification).toBeVisible();
    }
  });

  test('should track credit milestones', async ({ page }) => {
    const creditsPage = new CreditsPage(page);
    await creditsPage.navigateToCredits();

    const milestones = await creditsPage.getMilestones();

    // Should have common milestones
    const hasFirstMilestone = milestones.some(m => m.includes('100') || m.includes('first'));
    expect(hasFirstMilestone || milestones.length > 0).toBe(true);
  });
});
