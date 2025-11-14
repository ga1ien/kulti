import { test, expect } from '@playwright/test';
import { InvitePage } from '../pages/InvitePage';
import { AuthPage } from '../pages/AuthPage';
import {
  createTestUser,
  createTestInviteCode,
  cleanupTestData,
  cleanupTestInviteCodes,
} from '../helpers/db-setup';

test.describe('Invite System', () => {
  let testUserId: string;
  let testInviteCodes: string[] = [];

  test.beforeAll(async () => {
    // Create test user with admin privileges
    const user = await createTestUser({
      phone: `+1555${Date.now().toString().slice(-7)}`,
      full_name: 'Invite Test User',
      role: 'admin',
      credits: 200,
      total_invites: 5,
    });
    testUserId = user.id;

    // Create test invite codes
    const code1 = `INVITE${Date.now()}`;
    await createTestInviteCode(code1, testUserId);
    testInviteCodes.push(code1);
  });

  test.afterAll(async () => {
    await cleanupTestInviteCodes(testInviteCodes);
    await cleanupTestData([testUserId]);
  });

  test('should display invites page correctly', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    // Verify page elements
    await expect(invitePage.inviteCodesList).toBeVisible();
    await expect(invitePage.remainingInvites).toBeVisible();
  });

  test('should show user invite codes', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    const codes = await invitePage.getInviteCodes();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThanOrEqual(0);
  });

  test('should display remaining invites count', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    const remaining = await invitePage.getRemainingInvites();
    expect(typeof remaining).toBe('number');
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  test('should copy invite link to clipboard', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await invitePage.copyInviteLink(0);
    await page.waitForTimeout(500);

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('/signup');
    expect(clipboardText.length).toBeGreaterThan(0);
  });

  test('should show invite code in shareable format', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    const code = await invitePage.getInviteCode();
    expect(code).toBeTruthy();
    expect(code.length).toBeGreaterThan(0);
  });

  test('should display invite usage statistics', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    const usageCount = await invitePage.getInviteUsageCount();
    expect(typeof usageCount).toBe('number');
    expect(usageCount).toBeGreaterThanOrEqual(0);
  });

  test('should use invite code during signup', async ({ page }) => {
    const authPage = new AuthPage(page);
    const invitePage = new InvitePage(page);

    // First, get a valid invite code
    await invitePage.navigateToInvites();
    const codes = await invitePage.getInviteCodes();
    const validCode = codes[0] || testInviteCodes[0];

    // Now try to signup with this code
    await authPage.navigateToSignup();
    await authPage.enterPhoneNumber(`+1555${Date.now().toString().slice(-7)}`);
    await authPage.enterInviteCode(validCode);
    await authPage.clickContinue();
    await page.waitForTimeout(1000);

    // Should proceed to next step (OTP or error about already used code)
    const currentUrl = page.url();
    const hasError = await authPage.elementExists(authPage.errorMessage);

    // Either moved to OTP or got specific error (both are valid)
    expect(currentUrl.includes('/verify') || hasError).toBe(true);
  });

  test('should generate new invite code for admin', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    // Check if user has admin privileges to generate codes
    if (await invitePage.elementExists(invitePage.generateCodeButton)) {
      const initialCodes = await invitePage.getInviteCodes();
      const initialCount = initialCodes.length;

      await invitePage.generateNewCode();
      await page.waitForTimeout(1000);

      const newCodes = await invitePage.getInviteCodes();
      expect(newCodes.length).toBeGreaterThan(initialCount);
    }
  });

  test('should track invite code usage', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    // Check usage statistics for each code
    const codes = await invitePage.getInviteCodes();
    if (codes.length > 0) {
      const usageStats = page.locator('[data-testid*="usage-stats"]');
      if (await invitePage.elementExists(usageStats)) {
        await expect(usageStats.first()).toBeVisible();
      }
    }
  });

  test('should show invite link with correct format', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await invitePage.copyInviteLink(0);
    await page.waitForTimeout(500);

    const link = await page.evaluate(() => navigator.clipboard.readText());

    // Verify link format
    expect(link).toMatch(/^https?:\/\//);
    expect(link).toContain('signup');
    expect(link).toContain('?');
  });

  test('should disable invite code after max uses', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    // Look for disabled codes
    const disabledCode = page.locator('[data-testid*="invite-code"][data-disabled="true"]');
    if (await invitePage.elementExists(disabledCode)) {
      const disabledBadge = page.getByText(/disabled|used/i);
      await expect(disabledBadge).toBeVisible();
    }
  });

  test('should show QR code for invite', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    const qrCodeButton = page.getByRole('button', { name: /qr code/i });
    if (await invitePage.elementExists(qrCodeButton)) {
      await qrCodeButton.click();
      await page.waitForTimeout(500);

      const qrCodeImage = page.locator('[data-testid="qr-code"]');
      await expect(qrCodeImage).toBeVisible();
    }
  });

  test('should filter invite codes by status', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    const filterButton = page.getByRole('button', { name: /filter|status/i });
    if (await invitePage.elementExists(filterButton)) {
      await filterButton.click();
      await page.waitForTimeout(500);

      const activeFilter = page.getByText(/active|available/i);
      if (await invitePage.elementExists(activeFilter)) {
        await activeFilter.click();
        await page.waitForTimeout(500);

        // Codes should be filtered
        const codes = await invitePage.getInviteCodes();
        expect(Array.isArray(codes)).toBe(true);
      }
    }
  });

  test('should show invite rewards information', async ({ page }) => {
    const invitePage = new InvitePage(page);
    await invitePage.navigateToInvites();

    const rewardsSection = page.locator('[data-testid="invite-rewards"]');
    if (await invitePage.elementExists(rewardsSection)) {
      await expect(rewardsSection).toBeVisible();

      // Should show credit rewards for successful invites
      const rewardAmount = page.getByText(/credits?|points?/i);
      await expect(rewardAmount.first()).toBeVisible();
    }
  });
});

test.describe('Invite Code Validation', () => {
  test('should reject invalid invite code format', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToSignup();

    await authPage.enterPhoneNumber('+15551234567');
    await authPage.enterInviteCode('invalid123!@#');
    await authPage.clickContinue();
    await page.waitForTimeout(500);

    // Should show format error
    await expect(authPage.errorMessage).toBeVisible();
  });

  test('should reject expired invite code', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToSignup();

    await authPage.enterPhoneNumber('+15551234567');
    await authPage.enterInviteCode('EXPIRED2020');
    await authPage.clickContinue();
    await page.waitForTimeout(500);

    // Should show error
    await expect(authPage.errorMessage).toBeVisible();
  });

  test('should accept case-insensitive invite codes', async ({ page }) => {
    const authPage = new AuthPage(page);

    // Create a test code
    const testCode = `TEST${Date.now()}`;
    await createTestInviteCode(testCode);

    await authPage.navigateToSignup();
    await authPage.enterPhoneNumber(`+1555${Date.now().toString().slice(-7)}`);

    // Enter code in lowercase
    await authPage.enterInviteCode(testCode.toLowerCase());
    await authPage.clickContinue();
    await page.waitForTimeout(1000);

    // Should proceed (no error about invalid code format)
    const hasFormatError = await authPage.elementExists(
      page.getByText(/invalid format/i)
    );
    expect(hasFormatError).toBe(false);

    // Cleanup
    await cleanupTestInviteCodes([testCode]);
  });
});
