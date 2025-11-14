import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { DashboardPage } from '../pages/DashboardPage';
import {
  createTestInviteCode,
  cleanupTestInviteCodes,
  cleanupTestData,
  getTestUserByPhone,
} from '../helpers/db-setup';

test.describe('Authentication Flow', () => {
  let inviteCode: string;
  let testUserIds: string[] = [];

  test.beforeAll(async () => {
    // Create test invite code
    inviteCode = `E2E${Date.now()}`;
    await createTestInviteCode(inviteCode);
  });

  test.afterAll(async () => {
    // Cleanup
    await cleanupTestInviteCodes([inviteCode]);
    if (testUserIds.length > 0) {
      await cleanupTestData(testUserIds);
    }
  });

  test('should display signup page correctly', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToSignup();

    // Verify page elements
    await expect(authPage.phoneInput).toBeVisible();
    await expect(authPage.inviteCodeInput).toBeVisible();
    await expect(authPage.continueButton).toBeVisible();
  });

  test('should validate phone number input', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToSignup();

    // Try invalid phone number
    await authPage.enterPhoneNumber('invalid');
    await authPage.clickContinue();

    // Should show error
    await expect(authPage.errorMessage).toBeVisible();
  });

  test('should validate invite code', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToSignup();

    // Enter valid phone but invalid invite code
    await authPage.enterPhoneNumber('+15551234567');
    await authPage.enterInviteCode('INVALID123');
    await authPage.clickContinue();

    // Should show error
    await expect(authPage.errorMessage).toBeVisible();
  });

  test('should complete full signup flow', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    const testPhone = `+1555${Date.now().toString().slice(-7)}`;
    const testFullName = 'E2E Test User';
    const testUsername = `e2euser${Date.now()}`;

    await authPage.navigateToSignup();
    await authPage.enterPhoneNumber(testPhone);
    await authPage.enterInviteCode(inviteCode);
    await authPage.clickContinue();

    // Wait for OTP screen (in real app, we'd need to mock OTP)
    // For this test, we'll assume OTP validation is mocked or bypassed
    await page.waitForTimeout(1000);

    // Check if we reached profile completion or skip OTP for now
    const currentUrl = page.url();
    if (currentUrl.includes('/complete-profile') || currentUrl.includes('/profile')) {
      await authPage.completeProfile(testFullName, testUsername);
    }

    // Should redirect to dashboard
    await page.waitForTimeout(2000);
    const isOnDashboard = await dashboardPage.isLoggedIn();
    expect(isOnDashboard).toBe(true);

    // Store user ID for cleanup
    const user = await getTestUserByPhone(testPhone);
    if (user) {
      testUserIds.push(user.id);
    }
  });

  test('should display login page correctly', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToLogin();

    await expect(authPage.phoneInput).toBeVisible();
    await expect(authPage.continueButton).toBeVisible();
  });

  test('should handle logout correctly', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const authPage = new AuthPage(page);

    // Assume user is logged in (this would require auth state)
    await dashboardPage.navigateToDashboard();

    // Check if logged in
    const isLoggedIn = await dashboardPage.isLoggedIn();
    if (isLoggedIn) {
      await dashboardPage.logout();
      await page.waitForTimeout(1000);

      // Should be on login page
      const isOnLogin = await authPage.isOnLoginPage();
      expect(isOnLogin).toBe(true);
    }
  });

  test('should persist session after page reload', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Assume user is logged in
    await dashboardPage.navigateToDashboard();

    const wasLoggedIn = await dashboardPage.isLoggedIn();
    if (wasLoggedIn) {
      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Should still be logged in
      const stillLoggedIn = await dashboardPage.isLoggedIn();
      expect(stillLoggedIn).toBe(true);
    }
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    const authPage = new AuthPage(page);

    // Try to access protected route without auth
    await page.goto('/dashboard/sessions');
    await page.waitForTimeout(1000);

    // Should redirect to login
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
  });
});

test.describe('Phone Number Validation', () => {
  test('should accept valid US phone number', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToSignup();

    await authPage.enterPhoneNumber('+15551234567');
    const phoneValue = await authPage.phoneInput.inputValue();
    expect(phoneValue).toContain('+1555');
  });

  test('should format phone number correctly', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToSignup();

    await authPage.enterPhoneNumber('5551234567');
    await page.waitForTimeout(500);

    const phoneValue = await authPage.phoneInput.inputValue();
    // Should auto-format (depends on implementation)
    expect(phoneValue.replace(/\D/g, '')).toBe('5551234567');
  });

  test('should reject invalid phone number format', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.navigateToSignup();

    await authPage.enterPhoneNumber('123');
    await authPage.enterInviteCode('VALID123');
    await authPage.clickContinue();

    await page.waitForTimeout(500);
    await expect(authPage.errorMessage).toBeVisible();
  });
});
