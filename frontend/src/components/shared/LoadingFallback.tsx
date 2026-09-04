/**
 * Loading fallback for lazy-loaded routes
 *
 * Displayed while route components are being loaded
 */
import React from 'react'

export function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        {/* Spinner */}
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>

        {/* Loading text */}
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Loading...
        </p>
      </div>
    </div>
  )
}

/**
 * Inline loading spinner for smaller components
 */
export function InlineLoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
    </div>
  )
}
