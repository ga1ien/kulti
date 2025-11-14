import { test as base } from '@playwright/test';
import { createTestUser, cleanupTestData, type TestUser } from '../helpers/db-setup';

/**
 * Authentication fixture that provides test users
 */
export interface AuthFixture {
  testUser: TestUser;
  adminUser: TestUser;
  hostUser: TestUser;
}

export const test = base.extend<AuthFixture>({
  testUser: async ({ page: _page }, use) => {
    const user = await createTestUser({
      phone: `+1555${Date.now().toString().slice(-7)}`,
      full_name: 'E2E Test User',
      role: 'user',
      credits: 100,
    });

    await use(user);

    // Cleanup after test
    await cleanupTestData([user.id]);
  },

  adminUser: async ({ page: _page }, use) => {
    const user = await createTestUser({
      phone: `+1556${Date.now().toString().slice(-7)}`,
      full_name: 'E2E Admin User',
      role: 'admin',
      credits: 1000,
    });

    await use(user);

    // Cleanup after test
    await cleanupTestData([user.id]);
  },

  hostUser: async ({ page: _page }, use) => {
    const user = await createTestUser({
      phone: `+1557${Date.now().toString().slice(-7)}`,
      full_name: 'E2E Host User',
      role: 'host',
      credits: 500,
    });

    await use(user);

    // Cleanup after test
    await cleanupTestData([user.id]);
  },
});

export { expect } from '@playwright/test';
