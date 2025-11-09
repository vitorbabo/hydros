import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDashboardStore } from '../store/dashboardStore'
import { useTelemetryStore } from '../store/telemetryStore'
import { StatusIndicator } from '../components/shared/StatusIndicator'
import { Building2, Database, MapPin, ChevronRight } from 'lucide-react'

/**
 * Sites List page - Shows all water treatment sites with real-time data
 * Allows navigation to individual site detail pages
 */
export function Sites() {
  const { sites, lastUpdate } = useDashboardStore()
  const { latest } = useTelemetryStore()

  // Enhance sites with real-time telemetry data
  const enhancedSites = useMemo(() => {
    return Object.entries(sites).map(([siteId, site]) => {
      const siteObservations = Object.values(latest).filter(obs => obs.site_id === siteId)

      // Get raw intake flow data specifically for the site
      const rawIntakeFlowObs = siteObservations.find(obs =>
        obs.asset_id === 'raw_intake' && obs.measurement === 'flow_rate'
      )

      // Use raw intake flow rate (convert from m³/h to m³/day)
      const currentFlow = rawIntakeFlowObs ? rawIntakeFlowObs.value : 0

      // Check for recent data (within last 60 seconds)
      const recentDataTimestamps = siteObservations
        .map((obs) => {
          return obs && obs.ts ? new Date(obs.ts).getTime() : 0
        })
        .filter((timestamp) => timestamp > 0)

      const latestTimestamp = recentDataTimestamps.length > 0 ?
        Math.max(...recentDataTimestamps) : 0

      const timeDiffSeconds = latestTimestamp > 0 ?
        (Date.now() - latestTimestamp) / 1000 : Infinity

      const isRecentData = timeDiffSeconds < 60 // Within last 60 seconds

      // Format location
      const location = site.location ?
        `${site.location.region}, ${site.location.country}` :
        null

      return {
        ...site,
        id: siteId,
        currentFlow,
        status: isRecentData ? 'connected' as const : 'disconnected' as const,
        lastUpdate: isRecentData ? 'Just now' : 'No data',
        location,
        utilization: site.design_capacity > 0 ? (currentFlow / site.design_capacity) * 100 : 0
      }
    })
  }, [sites, latest])

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Water Treatment Sites
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor and manage all your water treatment plants
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {enhancedSites.map((site) => (
          <Link
            key={site.id}
            to={`/sites/${site.id}`}
            className="group bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-200"
          >
            {/* Site Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{site.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{site.id}</p>
                {site.location && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    <p className="text-xs text-gray-400 dark:text-gray-500">{site.location}</p>
                  </div>
                )}
              </div>
              <StatusIndicator status={site.status} showLabel />
            </div>

            {/* Basic Site Info */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Design Capacity</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {(site.design_capacity / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m³/day</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Flow</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {(site.currentFlow / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m³/day</p>
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Utilization</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {site.utilization.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(site.utilization, 100)}%` }}
                />
              </div>
            </div>

            {/* Treatment Type */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Treatment Process</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {site.treatment_train}
              </p>
            </div>

            {/* Module Count and Last Update */}
            <div className="flex justify-between items-center text-sm border-t border-gray-100 dark:border-gray-800 pt-3">
              <span className="text-gray-600 dark:text-gray-400">
                <Database className="w-4 h-4 inline mr-1" />
                {site.modules.length} modules
              </span>
              <span className="text-gray-500 dark:text-gray-400">Updated {site.lastUpdate}</span>
            </div>

            {/* View Details Indicator */}
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-primary font-medium text-sm">
              <span>View Details</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(sites).length === 0 && (
        <div className="bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Plant Sites Configured
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Connect to MQTT broker to receive plant configuration data
          </p>
        </div>
      )}
    </div>
  )
}
