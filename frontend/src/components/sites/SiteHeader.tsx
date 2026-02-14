/**
 * Site header with key metrics
 */
import React from 'react'
import { MapPin, Droplets, Activity, Gauge } from 'lucide-react'
import type { PlantSite } from '../../types'

interface SiteHeaderProps {
  site: PlantSite
  currentFlowRate: number
  dailyTotalFlow: number
  designFlowRate: number
  hasRecentData: boolean
  formatFlowValue: (value: number) => string
}

export function SiteHeader({
  site,
  currentFlowRate,
  dailyTotalFlow,
  designFlowRate,
  hasRecentData,
  formatFlowValue
}: SiteHeaderProps) {
  // Calculate utilization percentage
  const utilizationPercentage = designFlowRate > 0
    ? Math.min((currentFlowRate / designFlowRate) * 100, 100)
    : 0

  return (
    <div>
      {/* Site Name and Location */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {site.name}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">
              {site.location 
                ? `${site.location.region}, ${site.location.country}` 
                : 'Location not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Flow Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Current Flow Rate */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Current Flow
            </h4>
            <Droplets className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {hasRecentData ? formatFlowValue(currentFlowRate) : '--'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">m³/h</div>
          </div>
        </div>

        {/* Daily Total Flow */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Daily Total
            </h4>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {hasRecentData ? formatFlowValue(dailyTotalFlow) : '--'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">m³</div>
          </div>
        </div>

        {/* Utilization */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Utilization
            </h4>
            <Gauge className="w-5 h-5 text-purple-500" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {hasRecentData ? utilizationPercentage.toFixed(0) : '--'}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              of {formatFlowValue(designFlowRate)} m³/h capacity
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
