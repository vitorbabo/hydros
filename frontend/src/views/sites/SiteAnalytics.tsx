import React from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { PlantSite } from '../../types'
import { useTelemetryStore } from '../../store/telemetryStore'

interface SiteAnalyticsProps {
  site: PlantSite
}

export function SiteAnalytics({ site }: SiteAnalyticsProps) {
  const { getTimeSeriesData, availableAssets } = useTelemetryStore()

  // Get time series data for water quality metrics
  const getWaterQualityData = () => {
    // Get data for the last 24 hours
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000

    // Find relevant assets for this site
    const siteAssets = availableAssets.filter(asset => asset.startsWith(site.id))

    // Sample data structure (in production, this would come from actual time series)
    const mockData = Array.from({ length: 24 }, (_, i) => ({
      time: new Date(dayAgo + i * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      pH: 7.2 + Math.random() * 0.4,
      turbidity: 0.1 + Math.random() * 0.15,
      chlorine: 0.8 + Math.random() * 0.4,
    }))

    return mockData
  }

  // Get throughput data
  const getThroughputData = () => {
    const mockData = Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      inflow: 30 + Math.random() * 10,
      outflow: 28 + Math.random() * 10,
    }))

    return mockData
  }

  const waterQualityData = getWaterQualityData()
  const throughputData = getThroughputData()

  return (
    <div className="space-y-6">
      {/* Water Quality Trends */}
      <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Water Quality Trends (Last 24 Hours)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={waterQualityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="pH"
              stroke="#3B82F6"
              strokeWidth={2}
              name="pH"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="turbidity"
              stroke="#10B981"
              strokeWidth={2}
              name="Turbidity (NTU)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="chlorine"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Chlorine (ppm)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* System Throughput */}
      <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          System Throughput (Last 7 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={throughputData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="day"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              label={{ value: 'MGD', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Bar dataKey="inflow" fill="#3B82F6" name="Inflow" />
            <Bar dataKey="outflow" fill="#10B981" name="Outflow" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Average pH
          </h4>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            7.4
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Within target range
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Average Turbidity
          </h4>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            0.15
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            NTU - Excellent
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Average Throughput
          </h4>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            35.2
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            m³/h
          </p>
        </div>
      </div>
    </div>
  )
}
