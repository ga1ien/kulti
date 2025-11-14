# Kulti E2E Testing Infrastructure

## Overview

Comprehensive End-to-End (E2E) testing infrastructure for the Kulti application using Playwright.

## Test Structure

```
tests/
├── e2e/                    # End-to-End test suites
│   ├── auth.spec.ts       # Authentication flow tests
│   ├── sessions.spec.ts   # Session management tests
│   ├── credits.spec.ts    # Credits system tests
│   ├── invites.spec.ts    # Invite system tests
│   └── accessibility.spec.ts  # Accessibility compliance tests
├── integration/           # Integration tests
│   └── webhooks.spec.ts   # HMS webhook handling tests
├── helpers/               # Test utilities
│   └── db-setup.ts        # Database setup and cleanup
├── fixtures/              # Test fixtures
│   └── auth.fixture.ts    # Authentication fixtures
└── pages/                 # Page Object Models
    ├── BasePage.ts        # Base POM class
    ├── AuthPage.ts        # Authentication pages
    ├── SessionPage.ts     # Session pages
    ├── CreditsPage.ts     # Credits pages
    ├── InvitePage.ts      # Invite pages
    └── DashboardPage.ts   # Dashboard pages
```

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Specific Browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Mobile Tests
```bash
npm run test:e2e:mobile
```

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Headed Mode (see browser)
```bash
npm run test:e2e:headed
```

### Integration Tests Only
```bash
npm run test:integration
```

### Accessibility Tests Only
```bash
npm run test:accessibility
```

### Unit + E2E Tests
```bash
npm run test:all
```

### Full Coverage Report
```bash
npm run test:all:coverage
```

### View HTML Report
```bash
npm run test:e2e:report
```

## Test Configuration

### Environment Variables

Copy `.env.test` and configure:

```bash
# Supabase (use test database)
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_supabase_service_role_key

# HMS Configuration
NEXT_PUBLIC_HMS_APP_ID=your_hms_app_id
HMS_APP_ACCESS_KEY=your_hms_access_key
HMS_APP_SECRET=your_hms_app_secret
HMS_TEMPLATE_ID=your_hms_template_id

# Anthropic AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Playwright Configuration

See `playwright.config.ts` for:
- Timeout settings
- Browser configurations
- Screenshot/video settings
- Test parallelization
- Retry logic

## Test Coverage

Current E2E test coverage:

### Authentication (auth.spec.ts)
- User signup flow
- Phone number validation
- Invite code validation
- OTP verification
- Profile completion
- Login flow
- Logout functionality
- Session persistence
- Protected route access

### Session Management (sessions.spec.ts)
- Session creation
- Session listing
- Session joining
- Waiting room
- Session ending
- Form validation
- Date filtering
- Search functionality

### Credits System (credits.spec.ts)
- Balance display
- Tip sending
- Transaction history
- Milestone tracking
- Achievement unlocking
- Credit earning
- Validation (amount, recipient, self-tipping)
- Transaction filtering

### Invite System (invites.spec.ts)
- Invite code display
- Code copying
- Usage statistics
- Code generation (admin)
- QR code display
- Code validation
- Status filtering
- Rewards information

### Accessibility (accessibility.spec.ts)
- WCAG 2.0 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Touch target sizes (mobile)
- Form labels
- ARIA attributes
- Heading hierarchy
- Alt text for images
- Focus management

### Webhooks (webhooks.spec.ts)
- Signature verification
- Recording webhooks
- HLS stream webhooks
- Session lifecycle webhooks
- Error handling
- Deduplication
- Data persistence

## Page Object Model Pattern

All tests use the Page Object Model (POM) pattern for maintainability:

```typescript
// Example usage
import { test } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';

test('user can login', async ({ page }) => {
  const authPage = new AuthPage(page);
  await authPage.login('+15551234567');
  // Test continues...
});
```

## Test Database Setup

Tests use isolated database fixtures:

```typescript
import { createTestUser, cleanupTestData } from '../helpers/db-setup';

// Create test data
const user = await createTestUser({
  phone: '+15551234567',
  credits: 100,
});

// Cleanup after test
await cleanupTestData([user.id]);
```

## Best Practices

1. **Independent Tests**: Each test is isolated and can run independently
2. **Cleanup**: Always clean up test data in `afterAll` or `afterEach` hooks
3. **Page Objects**: Use Page Object Model for all UI interactions
4. **Selectors**: Prefer `data-testid` attributes for stable selectors
5. **Waiting**: Use `waitForLoadState` instead of arbitrary timeouts
6. **Assertions**: Use Playwright's built-in assertions for better error messages
7. **Mobile**: Test responsive designs with mobile viewports
8. **Accessibility**: Run accessibility tests on all major user flows

## CI/CD Integration

Tests run automatically in CI with:
- Retry on failure (2 retries)
- Screenshot capture on failure
- Video recording for failed tests
- HTML report generation
- Parallel execution disabled in CI for stability

## Debugging

### View Test Execution
```bash
npm run test:e2e:headed
```

### Step Through Tests
```bash
npm run test:e2e:debug
```

### View Trace
After test failure, traces are available in the HTML report:
```bash
npm run test:e2e:report
```

### Screenshots
Failed tests automatically capture screenshots in `test-results/`

## Coverage Targets

- **Overall Coverage**: 80%+
- **Critical Paths**: 100% (auth, payments, sessions)
- **UI Components**: 70%+
- **Accessibility**: WCAG 2.0 AA compliance

## Maintenance

### Adding New Tests

1. Create test file in appropriate directory
2. Import necessary Page Objects
3. Set up database fixtures
4. Write test cases
5. Add cleanup logic
6. Update this README

### Adding New Page Objects

1. Extend `BasePage` class
2. Define selectors as getters
3. Create action methods
4. Add to `tests/pages/` directory
5. Export from index if needed

### Updating Fixtures

1. Modify `tests/helpers/db-setup.ts`
2. Update cleanup logic
3. Document in comments
4. Test fixture creation/cleanup

## Support

For issues or questions:
1. Check Playwright documentation: https://playwright.dev
2. Review existing test examples
3. Check test output and traces
4. Consult team documentation

## License

Same as main project license.
