// jest.setup.js
import '@testing-library/jest-dom'

// Set up environment variables for HMS tests
process.env.HMS_APP_ACCESS_KEY = process.env.HMS_APP_ACCESS_KEY || 'test-access-key'
process.env.HMS_APP_SECRET = process.env.HMS_APP_SECRET || 'test-secret-key'
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kulti.com'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}))

// Mock HMS SDK
jest.mock('@100mslive/react-sdk', () => ({
  HMSRoomProvider: ({ children }) => children,
  useHMSActions: () => ({
    join: jest.fn(),
    leave: jest.fn(),
  }),
  useHMSStore: () => null,
  selectIsConnectedToRoom: jest.fn(),
  useHMSNotifications: () => null,
  HMSNotificationTypes: {},
}))

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
