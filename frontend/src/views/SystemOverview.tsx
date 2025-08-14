import React from 'react'
import { MetricCard } from '../components/shared/MetricCard'
import { StatusIndicator } from '../components/shared/StatusIndicator'
import { 
  Server, 
  Database, 
  Wifi, 
  AlertTriangle,
  Activity,
  Gauge
} from 'lucide-react'

export function SystemOverview() {
  // Mock data - will be replaced with real data from store
  const mockSites = [
    {
      id: 'wtp-porto-01',
      name: 'Porto Municipal WTP',
      status: 'connected' as const,
      capacity: 50000,
      currentFlow: 35000,
      assets: 18,
      lastUpdate: '2 mins ago'
    },
    {
      id: 'wtp-regional-02',
      name: 'Regional WTP North',
      status: 'maintenance' as const,
      capacity: 200000,
      currentFlow: 120000,
      assets: 42,
      lastUpdate: '5 mins ago'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor all water treatment plant sites and system health
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sites"
          value={mockSites.length}
          icon={<Server className="w-6 h-6" />}
          status="normal"
        />
        <MetricCard
          title="Active Connections"
          value={mockSites.filter(s => s.status === 'connected').length}
          unit={`/ ${mockSites.length}`}
          icon={<Wifi className="w-6 h-6" />}
          status="normal"
        />
        <MetricCard
          title="Data Points/Min"
          value="1,247"
          trend="up"
          trendValue={5.2}
          icon={<Activity className="w-6 h-6" />}
          status="normal"
        />
        <MetricCard
          title="System Health"
          value="98.5%"
          trend="stable"
          icon={<Gauge className="w-6 h-6" />}
          status="normal"
        />
      </div>

      {/* Plant Sites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockSites.map(site => (
          <div key={site.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            {/* Site Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                <p className="text-sm text-gray-500">{site.id}</p>
              </div>
              <StatusIndicator status={site.status} showLabel />
            </div>

            {/* Site Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Design Capacity</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(site.capacity / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-gray-500">m³/day</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Current Flow</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(site.currentFlow / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-gray-500">m³/day</p>
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Utilization</span>
                <span className="font-medium">
                  {((site.currentFlow / site.capacity) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(site.currentFlow / site.capacity) * 100}%` }}
                />
              </div>
            </div>

            {/* Asset Count and Last Update */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                <Database className="w-4 h-4 inline mr-1" />
                {site.assets} assets
              </span>
              <span className="text-gray-500">Updated {site.lastUpdate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
        </div>
        <div className="text-sm text-gray-500 text-center py-8">
          No active alerts at this time
        </div>
      </div>
    </div>
  )
}