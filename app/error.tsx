"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logger } from '@/lib/logger'

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorProps) => {
  useEffect(() => {
    // Log error to error reporting service
    logger.error("Application error:", { error });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-surface border-2 border-red-500/20 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h1 className="font-mono text-3xl md:text-4xl font-bold text-white">
            Something Went Wrong
          </h1>
          <p className="text-muted-2 text-lg max-w-md mx-auto">
            We're working on fixing this issue. Please try again in a moment.
          </p>
        </div>

        {/* Development Mode Error Details */}
        {isDevelopment && (
          <div className="bg-surface border border-border rounded-lg p-6 text-left">
            <h3 className="font-mono text-sm font-semibold text-red-400 mb-2">
              Error Details (Development Mode)
            </h3>
            <div className="space-y-2">
              <p className="font-mono text-xs text-muted-2 break-all">
                <span className="text-muted-3">Message:</span> {error.message}
              </p>
              {error.digest && (
                <p className="font-mono text-xs text-muted-2">
                  <span className="text-muted-3">Digest:</span> {error.digest}
                </p>
              )}
              {error.stack && (
                <details className="mt-4">
                  <summary className="font-mono text-xs text-muted-3 cursor-pointer hover:text-muted-2">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 font-mono text-xs text-muted-2 overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={reset}
            className="min-h-[44px] w-full sm:w-auto"
          >
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" size="lg" className="min-h-[44px] w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Support Info */}
        <div className="pt-8">
          <p className="text-muted-3 text-sm">
            If this problem persists,{" "}
            <Link
              href="/settings"
              className="text-accent hover:underline transition-colors"
            >
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
