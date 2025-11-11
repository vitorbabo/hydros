import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MetricCard } from '../components/shared/MetricCard'
import { useTelemetryStore } from '../store/telemetryStore'
import { useDashboardStore } from '../store/dashboardStore'
import {
  Server,
  Wifi,
  Activity,
  Gauge,
  AlertTriangle,
  Bell,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

/**
 * Dashboard page - High-level overview of system health and critical information
 * Focused on system-wide metrics, major alerts, and quick navigation
 */
export function Dashboard() {
  const { sites, connectionStatus, lastUpdate, alarms } = useDashboardStore()
  const { latest } = useTelemetryStore()

  // Calculate system-wide metrics
  const systemMetrics = useMemo(() => {
    const sitesList = Object.entries(sites)

    // Check connected sites based on recent telemetry data (within last 60 seconds)
    const connectedSites = sitesList.filter(([siteId]) => {
      const siteObservations = Object.values(latest).filter(obs => obs.site_id === siteId)
      if (siteObservations.length === 0) return false

      // Check if any data is recent
      const hasRecentData = siteObservations.some(obs => {
        if (!obs || !obs.ts) return false
        const obsTime = new Date(obs.ts).getTime()
        const timeDiff = Date.now() - obsTime
        return timeDiff < 60000 // Within last 60 seconds
      })

      return hasRecentData
    })

    // System data points
    const totalDataPoints = Object.keys(latest).length
    const dataPointsPerMinute = Math.floor(totalDataPoints * 0.8) // Estimate based on current data

    // Calculate system health based on connection status and active data
    const healthPercentage = connectedSites.length > 0
      ? ((connectedSites.length / Math.max(sitesList.length, 1)) * 100)
      : connectionStatus === 'connected' ? 95.0 : 0

    return {
      totalSites: sitesList.length,
      connectedSites: connectedSites.length,
      dataPointsPerMinute,
      systemHealth: healthPercentage,
    }
  }, [sites, latest, connectionStatus])

  // Filter for critical and unacknowledged alarms
  const criticalAlarms = alarms.filter(
    alarm => alarm.status === 'active' && !alarm.acknowledged && alarm.severity === 'critical'
  )
  const activeAlarms = alarms.filter(alarm => alarm.status === 'active' && !alarm.acknowledged)

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            System Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            High-level overview of your water treatment operations
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sites"
          value={systemMetrics.totalSites}
          icon={<Server className="w-6 h-6" />}
          status="normal"
        />
        <MetricCard
          title="Active Connections"
          value={systemMetrics.connectedSites}
          unit={`/ ${systemMetrics.totalSites}`}
          icon={<Wifi className="w-6 h-6" />}
          status={systemMetrics.connectedSites > 0 ? "normal" : "critical"}
        />
        <MetricCard
          title="Data Points/Min"
          value={systemMetrics.dataPointsPerMinute.toLocaleString()}
          icon={<Activity className="w-6 h-6" />}
          status={systemMetrics.dataPointsPerMinute > 0 ? "normal" : "warning"}
        />
        <MetricCard
          title="System Health"
          value={`${systemMetrics.systemHealth.toFixed(1)}%`}
          icon={<Gauge className="w-6 h-6" />}
          status={
            systemMetrics.systemHealth > 90
              ? "normal"
              : systemMetrics.systemHealth > 70
              ? "warning"
              : "critical"
          }
        />
      </div>

      {/* Critical Alerts Section */}
      {criticalAlarms.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-300">
              Critical Alerts Requiring Attention
            </h2>
            <span className="bg-red-600 dark:bg-red-700 text-white text-xs font-bold px-2 py-1 rounded-full">
              {criticalAlarms.length}
            </span>
          </div>
          <div className="space-y-3">
            {criticalAlarms.slice(0, 3).map(alarm => (
              <div
                key={alarm.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-300">{alarm.message}</p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {alarm.asset_id} • {alarm.site_id}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-red-600 dark:text-red-400">
                  {new Date(alarm.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {criticalAlarms.length > 3 && (
              <Link
                to="/alerts"
                className="block text-center text-sm text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium pt-2"
              >
                View {criticalAlarms.length - 3} more critical alerts →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* All Active Alerts */}
      <div className="bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Alerts</h3>
            {activeAlarms.length > 0 && (
              <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 text-xs font-medium px-2 py-1 rounded-full">
                {activeAlarms.length}
              </span>
            )}
          </div>
          <Link
            to="/alerts"
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {activeAlarms.length > 0 ? (
          <div className="space-y-3">
            {activeAlarms.slice(0, 5).map(alarm => (
              <div
                key={alarm.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  alarm.severity === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      alarm.severity === 'critical'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        alarm.severity === 'critical'
                          ? 'text-red-900 dark:text-red-300'
                          : 'text-yellow-900 dark:text-yellow-300'
                      }`}
                    >
                      {alarm.message}
                    </p>
                    <p
                      className={`text-sm ${
                        alarm.severity === 'critical'
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-yellow-700 dark:text-yellow-400'
                      }`}
                    >
                      {alarm.asset_id} • {alarm.severity}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs ${
                    alarm.severity === 'critical'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}
                >
                  {new Date(alarm.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {activeAlarms.length > 5 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
                ... and {activeAlarms.length - 5} more alerts
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            No active alerts at this time
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sites Quick Link */}
        <Link
          to="/sites"
          className="group bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Server className="w-8 h-8 text-primary" />
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            View All Sites
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Detailed monitoring and management for {systemMetrics.totalSites} treatment{' '}
            {systemMetrics.totalSites === 1 ? 'plant' : 'plants'}
          </p>
        </Link>

        {/* Analytics Quick Link */}
        <Link
          to="/analytics"
          className="group bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Performance Analytics
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analyze trends and optimize operations with AI-powered insights
          </p>
        </Link>

        {/* Alerts Quick Link */}
        <Link
          to="/alerts"
          className="group bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-8 h-8 text-primary" />
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Manage Alerts
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review and respond to system notifications and alerts
          </p>
        </Link>
      </div>
    </div>
  )
}
