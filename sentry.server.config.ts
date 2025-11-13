/**
 * Sentry Server Configuration
 * This file configures Sentry for the server-side (API routes, middleware, etc.)
 */

import { initSentry } from "./lib/monitoring/sentry"

// Initialize Sentry on the server
initSentry()
