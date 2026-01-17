/**
 * Water Quality Metrics Section
 */
import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface WaterQualityMetricsProps {
  isOpen: boolean
  onToggle: () => void
  rawWaterQuality?: Record<string, any>
  treatmentTargets?: Record<string, any>
}

export function WaterQualityMetrics({
  isOpen,
  onToggle,
  rawWaterQuality,
  treatmentTargets
}: WaterQualityMetricsProps) {
  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-xl"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Water Quality
        </h3>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="px-6 pb-6 space-y-6">
          {/* Raw Water Quality */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Raw Water Quality</h4>
            {rawWaterQuality && Object.keys(rawWaterQuality).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(rawWaterQuality).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                      {typeof value === 'object' && value !== null
                        ? `${value.value || '--'} ${value.unit || ''}`
                        : value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No raw water quality data configured
              </p>
            )}
          </div>

          {/* Treatment Targets */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Treatment Targets</h4>
            {treatmentTargets && Object.keys(treatmentTargets).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(treatmentTargets).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                      {typeof value === 'object' && value !== null
                        ? `${value.value || '--'} ${value.unit || ''}`
                        : value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No treatment targets configured
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
