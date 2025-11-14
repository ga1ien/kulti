'use client'

import { Component, ReactNode } from 'react'
import { logger } from '@/lib/logger'

/**
 * React ErrorInfo type
 */
interface ErrorInfo {
  componentStack?: string
}

/**
 * Props interface
 */
interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

/**
 * State interface
 */
interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error('Error boundary caught', { error, errorInfo })
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReportIssue = () => {
    const subject = encodeURIComponent('Kulti Error Report')
    const body = encodeURIComponent(`Error: ${this.state.error?.message}\n\nStack: ${this.state.error?.stack}\n\nComponent Stack: ${this.state.errorInfo?.componentStack}`)
    window.open(`mailto:support@kulti.com?subject=${subject}&body=${body}`, '_blank')
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
          <div className="text-center max-w-md space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
              <p className="text-gray-400">
                We encountered an unexpected error. Don't worry, you can try again.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left bg-red-950/20 border border-red-900 rounded-lg p-4">
                <p className="text-red-400 text-sm font-mono mb-2">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-red-400/60 text-xs overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-lime-400 text-black rounded-lg font-semibold hover:bg-lime-500 transition-colors"
                aria-label="Try again"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                aria-label="Reload page"
              >
                Reload Page
              </button>
            </div>

            <button
              onClick={this.handleReportIssue}
              className="text-gray-500 hover:text-gray-400 text-sm underline transition-colors"
              aria-label="Report this issue"
            >
              Report Issue
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
