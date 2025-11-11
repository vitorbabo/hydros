import React from 'react'
import { FileText } from 'lucide-react'

/**
 * Reports page - Generate and manage reports
 * TODO: Implement in Phase 5
 */
export function Reports() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reports
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate and manage operational reports
        </p>
      </div>

      {/* Placeholder */}
      <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Reports Page
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          This feature will be implemented in Phase 5
        </p>
      </div>
    </div>
  )
}
