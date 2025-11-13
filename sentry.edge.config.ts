/**
 * Sentry Edge Configuration
 * This file configures Sentry for Edge runtime (middleware)
 */

import { initSentry } from "./lib/monitoring/sentry"

// Initialize Sentry on the edge
initSentry()
