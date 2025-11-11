import React from 'react'
import { Settings as SettingsIcon } from 'lucide-react'

/**
 * Settings page - Application settings
 * TODO: Implement settings management
 */
export function Settings() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure application settings and preferences
        </p>
      </div>

      {/* Placeholder */}
      <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
        <SettingsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Settings Page
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Settings management will be implemented soon
        </p>
      </div>
    </div>
  )
}
