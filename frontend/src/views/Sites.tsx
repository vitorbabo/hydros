import React from 'react'
import { Link } from 'react-router-dom'
import { useDashboardStore } from '../store/dashboardStore'
import { StatusIndicator } from '../components/shared/StatusIndicator'
import { Building2, ArrowRight } from 'lucide-react'

/**
 * Sites List page - Shows all water treatment sites
 * Allows navigation to individual site detail pages
 */
export function Sites() {
  const { sites } = useDashboardStore()

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Water Treatment Sites
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor and manage all your water treatment plants
        </p>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(sites).map((site) => (
          <Link
            key={site.id}
            to={`/sites/${site.id}`}
            className="group bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg hover:border-primary/50 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {site.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {site.id}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>

            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-center gap-2">
                <StatusIndicator status={site.status} />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {site.status}
                </span>
              </div>

              {/* Capacity */}
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Capacity: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {site.design_capacity.toLocaleString()} m³/day
                </span>
              </div>

              {/* Modules Count */}
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Modules: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {site.modules.length}
                </span>
              </div>

              {/* Treatment Train */}
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Type: </span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {site.treatment_train}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(sites).length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No sites configured
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Sites will appear here once they are configured and connected.
          </p>
        </div>
      )}
    </div>
  )
}
