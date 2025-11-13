/**
 * Centralized error message system for consistent, user-friendly messaging
 */

export const ErrorMessages = {
  // Network & Connection
  NETWORK_ERROR: "Connection lost. Check your internet and try again.",
  TIMEOUT: "Request timed out. Please try again.",
  SERVER_ERROR: "Something went wrong on our end. Please try again later.",

  // Authentication
  AUTH_REQUIRED: "Please log in to continue.",
  AUTH_EXPIRED: "Your session has expired. Please log in again.",
  AUTH_INVALID: "Invalid credentials. Please try again.",
  OTP_INVALID: "Invalid verification code. Please try again.",
  OTP_EXPIRED: "Verification code expired. Request a new one.",
  PHONE_INVALID: "Please enter a valid phone number.",

  // Authorization
  PERMISSION_DENIED: "You don't have permission to do that.",
  FEATURE_LOCKED: "This feature is not available on your account.",

  // Validation
  REQUIRED_FIELD: (field: string) => `${field} is required.`,
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_FORMAT: (field: string) => `${field} format is invalid.`,
  TOO_SHORT: (field: string, min: number) => `${field} must be at least ${min} characters.`,
  TOO_LONG: (field: string, max: number) => `${field} must be less than ${max} characters.`,

  // Credits & Payments
  INSUFFICIENT_CREDITS: (needed: number, have: number) =>
    `You need ${needed - have} more credits to do that.`,
  PAYMENT_FAILED: "Payment failed. Please check your payment method.",

  // Session Errors
  SESSION_NOT_FOUND: "Session not found or has ended.",
  SESSION_FULL: "This session is full.",
  SESSION_ENDED: "This session has ended.",
  JOIN_FAILED: "Failed to join session. Please try again.",
  ALREADY_IN_SESSION: "You're already in another session.",

  // Rate Limiting
  RATE_LIMIT: (seconds: number) =>
    `Too many requests. Please wait ${seconds} seconds and try again.`,
  TOO_MANY_ATTEMPTS: "Too many attempts. Please try again later.",

  // File Upload
  FILE_TOO_LARGE: (maxSize: string) => `File is too large. Maximum size is ${maxSize}.`,
  INVALID_FILE_TYPE: (allowed: string) => `Invalid file type. Allowed: ${allowed}`,
  UPLOAD_FAILED: "Upload failed. Please try again.",

  // Resource Not Found
  NOT_FOUND: "The requested resource was not found.",
  USER_NOT_FOUND: "User not found.",
  ROOM_NOT_FOUND: "Room not found.",

  // General
  SOMETHING_WENT_WRONG: "Something went wrong. Please try again.",
  FEATURE_UNAVAILABLE: "This feature is temporarily unavailable.",
  MAINTENANCE: "System is under maintenance. Please try again soon.",
} as const

export const SuccessMessages = {
  // Auth
  LOGIN_SUCCESS: "Welcome back!",
  LOGOUT_SUCCESS: "Logged out successfully.",
  SIGNUP_SUCCESS: "Account created successfully!",
  OTP_SENT: "Verification code sent.",

  // Session
  SESSION_CREATED: "Session created successfully!",
  SESSION_JOINED: "Joined session successfully.",
  SESSION_ENDED: "Session ended successfully.",

  // Credits
  TIP_SENT: "Tip sent successfully!",
  CREDITS_EARNED: (amount: number) => `Earned ${amount} credits!`,

  // Profile
  PROFILE_UPDATED: "Profile updated successfully.",
  SETTINGS_SAVED: "Settings saved successfully.",

  // General
  SAVED: "Saved successfully.",
  DELETED: "Deleted successfully.",
  COPIED: "Copied to clipboard.",
} as const

/**
 * Get a user-friendly error message from an error object
 */
export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('fetch')) {
      return ErrorMessages.NETWORK_ERROR
    }
    if (error.message.includes('timeout')) {
      return ErrorMessages.TIMEOUT
    }
    return error.message
  }

  return ErrorMessages.SOMETHING_WENT_WRONG
}

/**
 * Parse API error response
 */
export const parseApiError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json()

    // Check for standard error field
    if (data.error) {
      return typeof data.error === 'string' ? data.error : ErrorMessages.SOMETHING_WENT_WRONG
    }

    // Check for message field
    if (data.message) {
      return data.message
    }
  } catch {
    // Failed to parse JSON
  }

  // Handle by status code
  switch (response.status) {
    case 400:
      return "Invalid request. Please check your input."
    case 401:
      return ErrorMessages.AUTH_REQUIRED
    case 403:
      return ErrorMessages.PERMISSION_DENIED
    case 404:
      return ErrorMessages.NOT_FOUND
    case 409:
      return "This action conflicts with existing data."
    case 429:
      return ErrorMessages.RATE_LIMIT(60)
    case 500:
    case 502:
    case 503:
      return ErrorMessages.SERVER_ERROR
    default:
      return ErrorMessages.SOMETHING_WENT_WRONG
  }
}
