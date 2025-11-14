import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Authentication Page Object Model
 */
export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get phoneInput() {
    return this.getByTestId('phone-input');
  }

  get inviteCodeInput() {
    return this.getByTestId('invite-code-input');
  }

  get continueButton() {
    return this.getByRole('button', { name: /continue|next/i });
  }

  get otpInputs() {
    return this.page.locator('[data-testid^="otp-input-"]');
  }

  get verifyButton() {
    return this.getByRole('button', { name: /verify/i });
  }

  get fullNameInput() {
    return this.getByTestId('full-name-input');
  }

  get usernameInput() {
    return this.getByTestId('username-input');
  }

  get completeProfileButton() {
    return this.getByRole('button', { name: /complete|finish/i });
  }

  get errorMessage() {
    return this.getByTestId('error-message');
  }

  // Actions
  async navigateToSignup(): Promise<void> {
    await this.goto('/signup');
    await this.waitForLoad();
  }

  async navigateToLogin(): Promise<void> {
    await this.goto('/login');
    await this.waitForLoad();
  }

  async enterPhoneNumber(phone: string): Promise<void> {
    await this.phoneInput.fill(phone);
  }

  async enterInviteCode(code: string): Promise<void> {
    await this.inviteCodeInput.fill(code);
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }

  async enterOTP(otp: string): Promise<void> {
    const otpDigits = otp.split('');
    const inputs = await this.otpInputs.all();

    for (let i = 0; i < otpDigits.length && i < inputs.length; i++) {
      await inputs[i].fill(otpDigits[i]);
    }
  }

  async clickVerify(): Promise<void> {
    await this.verifyButton.click();
  }

  async completeProfile(fullName: string, username: string): Promise<void> {
    await this.fullNameInput.fill(fullName);
    await this.usernameInput.fill(username);
    await this.completeProfileButton.click();
  }

  async signup(
    phone: string,
    inviteCode: string,
    fullName: string,
    username: string
  ): Promise<void> {
    await this.navigateToSignup();
    await this.enterPhoneNumber(phone);
    await this.enterInviteCode(inviteCode);
    await this.clickContinue();

    // Wait for OTP screen
    await this.waitForVisible(this.otpInputs.first());

    // For testing, we'll use a mock OTP
    await this.enterOTP('123456');
    await this.clickVerify();

    // Wait for profile completion screen
    await this.waitForVisible(this.fullNameInput);
    await this.completeProfile(fullName, username);

    // Wait for redirect to dashboard
    await this.waitForNavigation(/\/dashboard/);
  }

  async login(phone: string): Promise<void> {
    await this.navigateToLogin();
    await this.enterPhoneNumber(phone);
    await this.clickContinue();

    // Wait for OTP screen
    await this.waitForVisible(this.otpInputs.first());

    // For testing, we'll use a mock OTP
    await this.enterOTP('123456');
    await this.clickVerify();

    // Wait for redirect to dashboard
    await this.waitForNavigation(/\/dashboard/);
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isOnLoginPage(): Promise<boolean> {
    return this.getUrl().includes('/login');
  }

  async isOnSignupPage(): Promise<boolean> {
    return this.getUrl().includes('/signup');
  }

  async isOnDashboard(): Promise<boolean> {
    return this.getUrl().includes('/dashboard');
  }
}
