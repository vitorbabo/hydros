import React, { useState } from 'react'
import { clsx } from 'clsx'
import { Search, Filter as FilterIcon } from 'lucide-react'
import type { PlantSite } from '../../types'

interface SiteEventsProps {
  site: PlantSite
}

interface Event {
  timestamp: string
  eventType: string
  severity: 'critical' | 'warning' | 'info' | 'nominal'
  description: string
}

export function SiteEvents({ site }: SiteEventsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  // Mock event data (in production, this would come from an API)
  const mockEvents: Event[] = [
    {
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      eventType: 'Alert',
      severity: 'critical',
      description: 'Reservoir level exceeded 98% capacity.',
    },
    {
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      eventType: 'Alert',
      severity: 'warning',
      description: 'Chlorine concentration at 1.8ppm, below target.',
    },
    {
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      eventType: 'Maintenance',
      severity: 'info',
      description: 'Filter backwash cycle started.',
    },
    {
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      eventType: 'System',
      severity: 'nominal',
      description: 'System restart completed successfully.',
    },
    {
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      eventType: 'Alert',
      severity: 'warning',
      description: 'Turbidity spike detected in raw intake.',
    },
    {
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      eventType: 'Maintenance',
      severity: 'info',
      description: 'Scheduled pump maintenance completed.',
    },
  ]

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getSeverityBadge = (severity: string) => {
    const badges = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      nominal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    }
    return badges[severity as keyof typeof badges] || badges.info
  }

  // Filter events
  const filteredEvents = mockEvents.filter((event) => {
    const matchesSearch =
      searchTerm === '' ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.eventType.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSeverity = filterSeverity === 'all' || event.severity === filterSeverity

    return matchesSearch && matchesSeverity
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <FilterIcon className="w-5 h-5 text-gray-400" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="nominal">Nominal</option>
          </select>
        </div>
      </div>

      {/* Event Log Table */}
      <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3">
                Timestamp
              </th>
              <th scope="col" className="px-6 py-3">
                Event Type
              </th>
              <th scope="col" className="px-6 py-3">
                Severity
              </th>
              <th scope="col" className="px-6 py-3">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event, index) => (
              <tr
                key={index}
                className="bg-white dark:bg-gray-900/50 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {formatTimestamp(event.timestamp)}
                </td>
                <td className="px-6 py-4">{event.eventType}</td>
                <td className="px-6 py-4">
                  <span
                    className={clsx(
                      'text-xs font-medium px-2.5 py-0.5 rounded-full',
                      getSeverityBadge(event.severity)
                    )}
                  >
                    {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">{event.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No events found</p>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredEvents.length} of {mockEvents.length} events
      </div>
    </div>
  )
}
