import React, { useState, useMemo } from 'react'
import { History, Download, Search, Calendar, Trash2 } from 'lucide-react'
import { useAlertStore, Alert } from '../../store/alertStore'
import AlertSeverityBadge from '../../components/alerts/AlertSeverityBadge'
import { format, parseISO, isWithinInterval, subDays } from 'date-fns'

type DateRangePreset = '7days' | '30days' | '90days' | 'all' | 'custom'

const AlertHistory: React.FC = () => {
  const { alertHistory, clearHistory } = useAlertStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')

  // Filter alerts based on search and date range
  const filteredAlerts = useMemo(() => {
    let filtered = alertHistory

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(
        alert =>
          alert.title.toLowerCase().includes(lowerSearch) ||
          alert.description.toLowerCase().includes(lowerSearch) ||
          alert.siteName?.toLowerCase().includes(lowerSearch)
      )
    }

    // Apply severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === selectedSeverity)
    }

    // Apply date range filter
    if (dateRangePreset !== 'all') {
      const now = new Date()
      let startDate: Date

      if (dateRangePreset === 'custom') {
        if (customStartDate && customEndDate) {
          startDate = parseISO(customStartDate)
          const endDate = parseISO(customEndDate)
          filtered = filtered.filter(alert => {
            const alertDate = parseISO(alert.timestamp)
            return isWithinInterval(alertDate, { start: startDate, end: endDate })
          })
        }
      } else {
        const days = dateRangePreset === '7days' ? 7 : dateRangePreset === '30days' ? 30 : 90
        startDate = subDays(now, days)
        filtered = filtered.filter(alert => {
          const alertDate = parseISO(alert.timestamp)
          return isWithinInterval(alertDate, { start: startDate, end: now })
        })
      }
    }

    return filtered
  }, [alertHistory, searchTerm, selectedSeverity, dateRangePreset, customStartDate, customEndDate])

  // Statistics
  const stats = useMemo(() => {
    return {
      total: filteredAlerts.length,
      critical: filteredAlerts.filter(a => a.severity === 'critical').length,
      warning: filteredAlerts.filter(a => a.severity === 'warning').length,
      info: filteredAlerts.filter(a => a.severity === 'info').length,
      resolved: filteredAlerts.filter(a => a.resolved).length
    }
  }, [filteredAlerts])

  const handleExportCSV = () => {
    if (filteredAlerts.length === 0) {
      alert('No alerts to export')
      return
    }

    // Create CSV content
    const headers = [
      'Timestamp',
      'Severity',
      'Site',
      'Module',
      'Title',
      'Description',
      'Acknowledged By',
      'Acknowledged At',
      'Resolved',
      'Resolved At'
    ]

    const rows = filteredAlerts.map(alert => [
      format(parseISO(alert.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      alert.severity,
      alert.siteName || '',
      alert.moduleName || '',
      alert.title,
      alert.description,
      alert.acknowledgedByName || '',
      alert.acknowledgedAt ? format(parseISO(alert.acknowledgedAt), 'yyyy-MM-dd HH:mm:ss') : '',
      alert.resolved ? 'Yes' : 'No',
      alert.resolvedAt ? format(parseISO(alert.resolvedAt), 'yyyy-MM-dd HH:mm:ss') : ''
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alert-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all alert history? This action cannot be undone.')) {
      clearHistory()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Alert History
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and analyze historical alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredAlerts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Export CSV
            </button>
            {alertHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 size={18} />
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
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
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.resolved}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">Resolved</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              />
            </div>
          </div>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          {/* Date Range */}
          <select
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Custom Date Range */}
          {dateRangePreset === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              />
            </>
          )}
        </div>
      </div>

      {/* Alert Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        {filteredAlerts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(parseISO(alert.timestamp), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <AlertSeverityBadge severity={alert.severity} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {alert.siteName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {alert.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="max-w-md truncate">{alert.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      {alert.acknowledgedByName && (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Acknowledged
                        </span>
                      )}
                      {alert.resolved && (
                        <span className="text-blue-600 dark:text-blue-400">
                          ✓ Resolved
                        </span>
                      )}
                      {!alert.acknowledgedByName && !alert.resolved && (
                        <span className="text-gray-400 dark:text-gray-600">
                          Not acknowledged
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <History className="w-12 h-12 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No alert history
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              {alertHistory.length > 0
                ? 'No alerts match your current filter criteria.'
                : 'Alert history will appear here once alerts are dismissed or resolved.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AlertHistory
