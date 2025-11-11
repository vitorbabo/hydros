import React, { useState, useEffect } from 'react'
import { Bell, Filter, CheckCircle2, X, RefreshCw, AlertCircle } from 'lucide-react'
import { useAlertStore, mockAlerts, AlertSeverity } from '../../store/alertStore'
import { useDashboardStore } from '../../store/dashboardStore'
import AlertCard from '../../components/alerts/AlertCard'

const AlertsDashboard: React.FC = () => {
  const {
    activeAlerts,
    selectedSeverity,
    selectedSite,
    setSelectedSeverity,
    setSelectedSite,
    resetFilters,
    acknowledgeAlert,
    acknowledgeMultipleAlerts,
    dismissAlert,
    dismissMultipleAlerts,
    getFilteredAlerts,
    getUnacknowledgedAlerts,
    addAlert
  } = useAlertStore()

  const { sites } = useDashboardStore()

  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Load mock data on mount (for development)
  useEffect(() => {
    if (activeAlerts.length === 0) {
      mockAlerts.forEach(alert => addAlert(alert))
    }
  }, [])

  const filteredAlerts = getFilteredAlerts()
  const unacknowledgedAlerts = getUnacknowledgedAlerts()

  // Statistics
  const stats = {
    total: activeAlerts.length,
    critical: activeAlerts.filter(a => a.severity === 'critical').length,
    warning: activeAlerts.filter(a => a.severity === 'warning').length,
    info: activeAlerts.filter(a => a.severity === 'info').length,
    unacknowledged: unacknowledgedAlerts.length
  }

  const handleAcknowledge = (alertId: string) => {
    // TODO: Replace with actual user ID and name when auth is implemented
    acknowledgeAlert(alertId, 'current-user', 'Current User')
    setSelectedAlertIds(prev => prev.filter(id => id !== alertId))
  }

  const handleDismiss = (alertId: string) => {
    dismissAlert(alertId)
    setSelectedAlertIds(prev => prev.filter(id => id !== alertId))
  }

  const handleBulkAcknowledge = () => {
    if (selectedAlertIds.length > 0) {
      acknowledgeMultipleAlerts(selectedAlertIds, 'current-user', 'Current User')
      setSelectedAlertIds([])
    }
  }

  const handleBulkDismiss = () => {
    if (selectedAlertIds.length > 0) {
      dismissMultipleAlerts(selectedAlertIds)
      setSelectedAlertIds([])
    }
  }

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlertIds(prev =>
      prev.includes(alertId)
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    )
  }

  const handleSelectAll = () => {
    if (selectedAlertIds.length === filteredAlerts.length) {
      setSelectedAlertIds([])
    } else {
      setSelectedAlertIds(filteredAlerts.map(a => a.id))
    }
  }

  const handleSeverityFilter = (severity: AlertSeverity | 'all') => {
    setSelectedSeverity(severity)
    setSelectedAlertIds([])
  }

  const handleSiteFilter = (siteId: string | 'all') => {
    setSelectedSite(siteId)
    setSelectedAlertIds([])
  }

  const handleResetFilters = () => {
    resetFilters()
    setSelectedAlertIds([])
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Bell className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Active Alerts
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor and manage system alerts across all sites
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Alerts</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.critical}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">Critical</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.warning}
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">Warning</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.info}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Info</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.unacknowledged}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400">Unacknowledged</div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Severity Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Severity:
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => handleSeverityFilter(e.target.value as AlertSeverity | 'all')}
                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            {/* Site Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Site:
              </label>
              <select
                value={selectedSite}
                onChange={(e) => handleSiteFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              >
                <option value="all">All Sites</option>
                {Object.entries(sites).map(([siteId, site]) => (
                  <option key={siteId} value={siteId}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
              Reset
            </button>

            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAlerts.length} of {stats.total} alerts
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedAlertIds.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
              {selectedAlertIds.length} alert{selectedAlertIds.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkAcknowledge}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <CheckCircle2 size={16} />
                Acknowledge Selected
              </button>
              <button
                onClick={handleBulkDismiss}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <X size={16} />
                Dismiss Selected
              </button>
              <button
                onClick={() => setSelectedAlertIds([])}
                className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
        {filteredAlerts.length > 0 ? (
          <div className="space-y-3">
            {/* Select All */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={selectedAlertIds.length === filteredAlerts.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500 dark:focus:ring-primary-400"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Select all
              </label>
            </div>

            {/* Alerts */}
            {filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onDismiss={handleDismiss}
                selectable
                selected={selectedAlertIds.includes(alert.id)}
                onSelect={handleSelectAlert}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No alerts found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              {activeAlerts.length > 0
                ? 'No alerts match your current filter criteria. Try adjusting your filters.'
                : 'All systems are operating normally. No active alerts at this time.'}
            </p>
            {activeAlerts.length > 0 && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AlertsDashboard
