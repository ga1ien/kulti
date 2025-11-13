/**
 * Formatting Utilities
 *
 * Shared helpers for formatting dates, numbers, and other data types.
 */

/**
 * Format a date string to a human-readable format
 * @example formatDate('2024-01-15') => 'Jan 15, 2024'
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a time string to human-readable format
 * @example formatTime('2024-01-15T14:30:00') => '2:30 PM'
 */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format a date and time together
 * @example formatDateTime('2024-01-15T14:30:00') => 'Jan 15, 2024 at 2:30 PM'
 */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return 'just now'
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  } else {
    return formatDate(date)
  }
}

/**
 * Format a duration in seconds to human-readable format
 * @example formatDuration(125) => '2m 5s'
 * @example formatDuration(3665) => '1h 1m 5s'
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * Format a number with commas
 * @example formatNumber(1234567) => '1,234,567'
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format credits with appropriate suffix
 * @example formatCredits(1234) => '1,234 credits'
 * @example formatCredits(1) => '1 credit'
 */
export function formatCredits(amount: number): string {
  return `${formatNumber(amount)} credit${amount !== 1 ? 's' : ''}`
}

/**
 * Format a percentage
 * @example formatPercentage(0.8567) => '85.7%'
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Format a file size in bytes to human-readable format
 * @example formatFileSize(1536) => '1.5 KB'
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}
