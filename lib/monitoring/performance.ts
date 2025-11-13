/**
 * Performance Monitoring Utilities
 *
 * Track key performance metrics for the Kulti application:
 * - Page load times
 * - API response times
 * - HMS connection times
 * - Component render times
 */

import { addBreadcrumb } from "./sentry"

/**
 * Measure API request duration
 */
export async function measureApiCall<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()

  try {
    const result = await apiCall()
    const duration = performance.now() - startTime

    addBreadcrumb(`API call to ${endpoint}`, {
      duration: `${duration.toFixed(2)}ms`,
      status: "success",
    })

    return result
  } catch (error) {
    const duration = performance.now() - startTime

    addBreadcrumb(`API call to ${endpoint} failed`, {
      duration: `${duration.toFixed(2)}ms`,
      status: "error",
    })

    throw error
  }
}

/**
 * Measure HMS connection time
 */
export function measureHMSConnection(roomId: string) {
  const startTime = performance.now()

  return {
    success: () => {
      const duration = performance.now() - startTime
      addBreadcrumb(`HMS connected to room ${roomId}`, {
        duration: `${duration.toFixed(2)}ms`,
        status: "success",
      })
    },
    fail: (error: Error) => {
      const duration = performance.now() - startTime
      addBreadcrumb(`HMS connection to room ${roomId} failed`, {
        duration: `${duration.toFixed(2)}ms`,
        status: "error",
        error: error.message,
      })
    },
  }
}

/**
 * Measure page load time
 */
export function measurePageLoad(pageName: string) {
  if (typeof window === "undefined") return

  // Wait for page to be fully loaded
  if (document.readyState === "complete") {
    finishPageLoad()
  } else {
    window.addEventListener("load", finishPageLoad)
  }

  function finishPageLoad() {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming

    if (navigation) {
      addBreadcrumb(`Page loaded: ${pageName}`, {
        domContentLoaded: `${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`,
        loadComplete: `${navigation.loadEventEnd - navigation.loadEventStart}ms`,
        totalTime: `${navigation.loadEventEnd - navigation.fetchStart}ms`,
      })
    }
  }
}

/**
 * Measure component render time
 */
export function measureComponentRender(componentName: string) {
  const startTime = performance.now()

  return () => {
    const duration = performance.now() - startTime
    addBreadcrumb(`Component rendered: ${componentName}`, {
      duration: `${duration.toFixed(2)}ms`,
    })
  }
}

/**
 * Report Web Vitals to Sentry
 */
export function reportWebVitals(metric: {
  id: string
  name: string
  value: number
  label: string
}) {
  addBreadcrumb(`Web Vital: ${metric.name}`, {
    id: metric.id,
    value: metric.value,
    label: metric.label,
  })
}

/**
 * Measure database query time
 */
export async function measureDatabaseQuery<T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()

  try {
    const result = await query()
    const duration = performance.now() - startTime

    addBreadcrumb(`Database query: ${queryName}`, {
      duration: `${duration.toFixed(2)}ms`,
      status: "success",
    })

    // Warn on slow queries
    if (duration > 1000) {
      addBreadcrumb(`SLOW QUERY: ${queryName}`, {
        duration: `${duration.toFixed(2)}ms`,
      })
    }

    return result
  } catch (error) {
    const duration = performance.now() - startTime

    addBreadcrumb(`Database query failed: ${queryName}`, {
      duration: `${duration.toFixed(2)}ms`,
      status: "error",
    })

    throw error
  }
}

/**
 * Measure HMS video quality metrics
 */
export function trackVideoQuality(metrics: {
  roomId: string
  bitrate: number
  packetsLost: number
  jitter: number
  resolution: string
}) {
  addBreadcrumb("HMS Video Quality", metrics)

  // Alert on poor quality
  if (metrics.packetsLost > 100 || metrics.jitter > 50) {
    addBreadcrumb("HMS Poor Video Quality Detected", {
      ...metrics,
      severity: "warning",
    })
  }
}
