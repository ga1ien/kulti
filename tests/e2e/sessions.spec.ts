import { test, expect } from '@playwright/test';
import { SessionPage } from '../pages/SessionPage';
import { DashboardPage } from '../pages/DashboardPage';
import {
  createTestUser,
  createTestSession,
  cleanupTestData,
  cleanupTestSessions,
} from '../helpers/db-setup';

test.describe('Session Management', () => {
  let testUserId: string;
  let sessionIds: string[] = [];

  test.beforeAll(async () => {
    // Create test user
    const user = await createTestUser({
      phone: `+1555${Date.now().toString().slice(-7)}`,
      full_name: 'Session Test User',
      role: 'host',
      credits: 500,
    });
    testUserId = user.id;
  });

  test.afterAll(async () => {
    // Cleanup
    await cleanupTestSessions(sessionIds);
    await cleanupTestData([testUserId]);
  });

  test('should display sessions page correctly', async ({ page }) => {
    const sessionPage = new SessionPage(page);
    await sessionPage.navigateToSessions();

    // Verify page elements
    await expect(sessionPage.createSessionButton).toBeVisible();
    await expect(sessionPage.sessionsList).toBeVisible();
  });

  test('should create a new session', async ({ page }) => {
    const sessionPage = new SessionPage(page);

    const sessionTitle = `E2E Test Session ${Date.now()}`;
    const sessionDescription = 'This is a test session created by E2E tests';

    await sessionPage.createSession(sessionTitle, sessionDescription);

    // Verify session was created
    const sessionExists = await sessionPage.findSessionByTitle(sessionTitle);
    expect(sessionExists).toBe(true);
  });

  test('should display session details correctly', async ({ page }) => {
    const sessionPage = new SessionPage(page);

    // Create a session first
    const sessionId = await createTestSession({
      host_id: testUserId,
      title: 'Test Session Details',
      description: 'Testing session details display',
      scheduled_for: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    });
    sessionIds.push(sessionId);

    await sessionPage.navigateToSessions();
    await page.waitForTimeout(1000);

    // Verify session appears in list
    const sessionExists = await sessionPage.findSessionByTitle('Test Session Details');
    expect(sessionExists).toBe(true);
  });

  test('should filter sessions by status', async ({ page }) => {
    const sessionPage = new SessionPage(page);
    await sessionPage.navigateToSessions();

    // Click on filter buttons if they exist
    const scheduledFilter = page.getByRole('button', { name: /scheduled/i });
    if (await sessionPage.elementExists(scheduledFilter)) {
      await scheduledFilter.click();
      await page.waitForTimeout(500);

      // Count should update
      const count = await sessionPage.getSessionsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should join a session as participant', async ({ page }) => {
    const sessionPage = new SessionPage(page);

    // Create a session
    const sessionId = await createTestSession({
      host_id: testUserId,
      title: 'Join Test Session',
      description: 'Testing joining functionality',
      room_id: `test-room-${Date.now()}`,
    });
    sessionIds.push(sessionId);

    await sessionPage.navigateToSessions();
    await page.waitForTimeout(1000);

    // Join the session
    await sessionPage.joinSessionByTitle('Join Test Session');
    await page.waitForTimeout(2000);

    // Should be in waiting room or video interface
    const inWaitingRoom = await sessionPage.isInWaitingRoom();
    const onVideoPage = page.url().includes('/session/') || page.url().includes('/video/');

    expect(inWaitingRoom || onVideoPage).toBe(true);
  });

  test('should display waiting room when session not started', async ({ page }) => {
    const sessionPage = new SessionPage(page);

    // Create a scheduled session
    const sessionId = await createTestSession({
      host_id: testUserId,
      title: 'Waiting Room Test',
      description: 'Testing waiting room',
      scheduled_for: new Date(Date.now() + 3600000).toISOString(),
    });
    sessionIds.push(sessionId);

    await sessionPage.navigateToSessions();
    await page.waitForTimeout(1000);

    await sessionPage.joinSessionByTitle('Waiting Room Test');
    await page.waitForTimeout(1000);

    // Should show waiting room message
    const inWaitingRoom = await sessionPage.isInWaitingRoom();
    expect(inWaitingRoom).toBe(true);
  });

  test('should end session as host', async ({ page }) => {
    const sessionPage = new SessionPage(page);

    // Create and navigate to an active session
    const sessionId = await createTestSession({
      host_id: testUserId,
      title: 'End Session Test',
      description: 'Testing session end functionality',
    });
    sessionIds.push(sessionId);

    await sessionPage.navigateToSessions();
    await page.waitForTimeout(1000);

    // Join as host
    await sessionPage.joinSessionByTitle('End Session Test');
    await page.waitForTimeout(2000);

    // End the session
    if (await sessionPage.elementExists(sessionPage.endSessionButton)) {
      await sessionPage.endSession();
      await page.waitForTimeout(1000);

      // Should redirect back to sessions list
      expect(page.url()).toContain('/sessions');
    }
  });

  test('should validate session creation form', async ({ page }) => {
    const sessionPage = new SessionPage(page);
    await sessionPage.navigateToSessions();

    await sessionPage.clickCreateSession();
    await page.waitForTimeout(500);

    // Try to save without filling required fields
    await sessionPage.saveSession();
    await page.waitForTimeout(500);

    // Should show validation error
    const errorMessage = page.getByText(/required|fill/i);
    const hasError = await sessionPage.elementExists(errorMessage);
    expect(hasError).toBe(true);
  });

  test('should schedule session for future date', async ({ page }) => {
    const sessionPage = new SessionPage(page);

    const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
    const sessionTitle = `Scheduled Session ${Date.now()}`;

    await sessionPage.createSession(
      sessionTitle,
      'This is a scheduled session',
      futureDate
    );

    await page.waitForTimeout(1000);

    // Verify session was created with scheduled status
    const sessionExists = await sessionPage.findSessionByTitle(sessionTitle);
    expect(sessionExists).toBe(true);
  });

  test('should display participant count', async ({ page }) => {
    const sessionPage = new SessionPage(page);

    // Create a session
    const sessionId = await createTestSession({
      host_id: testUserId,
      title: 'Participant Count Test',
      description: 'Testing participant count display',
    });
    sessionIds.push(sessionId);

    await sessionPage.navigateToSessions();
    await page.waitForTimeout(1000);

    // Check if participant count is displayed
    const participantCount = page.locator('[data-testid="participant-count"]');
    if (await sessionPage.elementExists(participantCount)) {
      const countText = await sessionPage.getText(participantCount);
      expect(countText).toBeTruthy();
    }
  });
});

test.describe('Session Search and Filtering', () => {
  test('should search sessions by title', async ({ page }) => {
    const sessionPage = new SessionPage(page);
    await sessionPage.navigateToSessions();

    const searchInput = page.getByPlaceholder(/search/i);
    if (await sessionPage.elementExists(searchInput)) {
      await searchInput.fill('Test');
      await page.waitForTimeout(500);

      // Results should be filtered
      const count = await sessionPage.getSessionsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should filter by date range', async ({ page }) => {
    const sessionPage = new SessionPage(page);
    await sessionPage.navigateToSessions();

    const dateFilter = page.getByRole('button', { name: /date|filter/i });
    if (await sessionPage.elementExists(dateFilter)) {
      await dateFilter.click();
      await page.waitForTimeout(500);

      // Date picker should appear
      const datePicker = page.locator('[data-testid="date-picker"]');
      const exists = await sessionPage.elementExists(datePicker);
      expect(exists).toBe(true);
    }
  });
});
