import React, { useMemo, useState, useEffect, useRef } from 'react'
import { MetricCard } from '../components/shared/MetricCard'
import { StatusIndicator } from '../components/shared/StatusIndicator'
import { Modal } from '../components/shared/Modal'
import { PlantDetails } from './PlantDetails'
import { useTelemetryStore } from '../store/telemetryStore'
import { useConfigurationStore } from '../store/configurationStore'
import { useDashboardStore } from '../store/dashboardStore'
import {
  Server,
  Database,
  Wifi,
  AlertTriangle,
  Activity,
  Gauge,
  MapPin,
  ChevronRight
} from 'lucide-react'

export function SystemOverview() {
  const { plantConfigurations } = useConfigurationStore()
  const { assetGroups, latest, availableAssets } = useTelemetryStore()
  const { connectionStatus, lastUpdate, alarms } = useDashboardStore()

  // Modal state for plant details
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)

  // Use ref to cache flow rates (prevents flickering to zero without causing re-renders)
  const flowRateCacheRef = useRef<Record<string, { currentFlowRate: number, dailyTotalFlow: number }>>({})

  // Debug telemetry data
  // console.log('SystemOverview debug:', {
  //   plantConfigCount: Object.keys(plantConfigurations).length,
  //   latestDataCount: Object.keys(latest).length,
  //   connectionStatus,
  //   latestKeys: Object.keys(latest).slice(0, 5),
  //   sampleData: Object.keys(latest).length > 0 ? latest[Object.keys(latest)[0]] : null
  // })

  // Calculate system metrics from real data
  const systemMetrics = useMemo(() => {
    const sites = Object.entries(plantConfigurations)

    // Check connected sites based on recent telemetry data (within last 60 seconds)
    const connectedSites = sites.filter(([siteId]) => {
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
    // const healthPercentage = connectedSites.length > 0
    //   ? ((connectedSites.length / Math.max(sites.length, 1)) * 100)
    //   : connectionStatus === 'connected' ? 95.0 : 0
    const healthPercentage = 95

    const sitesList = sites.map(([siteId, config]) => {
      const siteObservations = Object.values(latest).filter(obs => obs.site_id === siteId)
      const hasRecentData = siteObservations.length > 0

      // Get raw intake flow data specifically for the site
      const rawIntakeFlowObs = siteObservations.find(obs =>
        obs.asset_id === 'raw_intake' && obs.measurement === 'flow_rate'
      )

      // Get daily total flow observation
      const dailyTotalFlowObs = siteObservations.find(obs =>
        obs.asset_id === 'raw_intake' && obs.measurement === 'daily_flow_total'
      )

      // Get cached values for this site
      const cachedValues = flowRateCacheRef.current[siteId] || { currentFlowRate: 0, dailyTotalFlow: 0 }

      // Current flow rate in m³/h - use cached value if observation is missing
      const currentFlowRate = rawIntakeFlowObs ? rawIntakeFlowObs.value : cachedValues.currentFlowRate

      // Daily total flow - use cached value if observation is missing
      const dailyTotalFlow = dailyTotalFlowObs ? dailyTotalFlowObs.value : cachedValues.dailyTotalFlow

      // Update cache with latest values (only if we have valid observations)
      if (rawIntakeFlowObs || dailyTotalFlowObs) {
        flowRateCacheRef.current[siteId] = {
          currentFlowRate: rawIntakeFlowObs ? rawIntakeFlowObs.value : cachedValues.currentFlowRate,
          dailyTotalFlow: dailyTotalFlowObs ? dailyTotalFlowObs.value : cachedValues.dailyTotalFlow
        }
      }

        // Extract site info from rich configuration data
        const siteInfo = (config as any)?.site_info
        const operationalParams = siteInfo?.operational_parameters

        // Use design_flow_rate from operational parameters (m³/h)
        const designFlowRate = operationalParams?.design_flow_rate ||
                               (siteInfo?.design_capacity / 24) || 0

        const location = siteInfo?.location
        
        // Better connection status based on recent data (within last 60 seconds)
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
        
        // Debug logging for connection status
        // if (siteId === 'wtp-porto-01') {
        //   console.log('Debug site connection:', {
        //     siteId,
        //     siteObservationsCount: siteObservations.length,
        //     latestTimestamp: latestTimestamp > 0 ? new Date(latestTimestamp) : 'No timestamp',
        //     timeDiffSeconds: timeDiffSeconds.toFixed(1),
        //     isRecentData,
        //     rawIntakeFlowValue: rawIntakeFlowObs ? rawIntakeFlowObs.value : 'N/A'
        //   })
        // }
        
      return {
        id: siteId,
        name: siteInfo?.name || config.name || `Plant ${siteId}`,
        location: location ? `${location.region}, ${location.country}` : 'Unknown Location',
        status: isRecentData ? 'connected' as const : 'disconnected' as const,
        designFlowRate: designFlowRate,
        currentFlowRate: currentFlowRate,
        dailyTotalFlow: dailyTotalFlow,
        moduleCount: Array.isArray(config.modules) ? config.modules.length : Object.keys(config.modules || {}).length,
        lastUpdate: isRecentData ? 'Just now' : 'No data',
        // Additional site info for detailed view
        treatmentTrain: siteInfo?.treatment_train || 'unknown',
        operationalParams: siteInfo?.operational_parameters,
        // Debug info
        debugInfo: {
          hasData: hasRecentData,
          siteObservationsCount: siteObservations.length,
          rawIntakeValue: rawIntakeFlowObs ? rawIntakeFlowObs.value : null,
          isRecent: isRecentData
        }
      }
    })

    return {
      totalSites: sites.length,
      connectedSites: connectedSites.length,
      dataPointsPerMinute,
      systemHealth: healthPercentage,
      sites: sitesList
    }
  }, [plantConfigurations, latest, connectionStatus])

  const activeAlarms = alarms.filter(alarm => alarm.status === 'active' && !alarm.acknowledged)

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
          // trend={systemMetrics.dataPointsPerMinute > 0 ? "up" : "down"}
          // trendValue={systemMetrics.dataPointsPerMinute > 100 ? 5.2 : -2.1}
          icon={<Activity className="w-6 h-6" />}
          status={systemMetrics.dataPointsPerMinute > 0 ? "normal" : "warning"}
        />
        <MetricCard
          title="System Health"
          value={`${systemMetrics.systemHealth.toFixed(1)}%`}
          // trend={systemMetrics.systemHealth > 90 ? "stable" : systemMetrics.systemHealth > 70 ? "down" : "down"}
          icon={<Gauge className="w-6 h-6" />}
          status={systemMetrics.systemHealth > 90 ? "normal" : systemMetrics.systemHealth > 70 ? "warning" : "critical"}
        />
      </div>

      {/* Plant Sites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {systemMetrics.sites.length > 0 ? (
          systemMetrics.sites.map(site => (
            <div
              key={site.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200"
              onClick={() => setSelectedPlantId(site.id)}
            >
              {/* Site Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                  <p className="text-sm text-gray-500">{site.id}</p>
                  {site.location && site.location !== 'Unknown Location' && (
                    <p className="text-xs text-gray-400">{site.location}</p>
                  )}
                </div>
                <StatusIndicator status={site.status} showLabel />
              </div>

              {/* Basic Site Info - 3 Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Design Flow</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {(site.designFlowRate / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-gray-500">m³/h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Flow</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {(site.currentFlowRate / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-gray-500">m³/h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Total</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {(site.dailyTotalFlow / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-gray-500">m³</p>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Utilization</span>
                  <span className="font-medium">
                    {((site.currentFlowRate / site.designFlowRate) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((site.currentFlowRate / site.designFlowRate) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Treatment Type */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-600">Treatment Process</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {site.treatmentTrain}
                </p>
              </div>

              {/* Module Count and Last Update */}
              <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
                <span className="text-gray-600">
                  <Database className="w-4 h-4 inline mr-1" />
                  {site.moduleCount} modules
                </span>
                <span className="text-gray-500">Updated {site.lastUpdate}</span>
              </div>

              {/* View Details Indicator */}
              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-100 text-blue-600 font-medium text-sm group-hover:text-blue-700">
                <span>View Details</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Plant Sites Configured</h3>
            <p className="text-gray-500">Connect to MQTT broker to receive plant configuration data</p>
          </div>
        )}
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
          {activeAlarms.length > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
              {activeAlarms.length}
            </span>
          )}
        </div>
        {activeAlarms.length > 0 ? (
          <div className="space-y-3">
            {activeAlarms.slice(0, 5).map(alarm => (
              <div key={alarm.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="font-medium text-red-900">{alarm.message}</p>
                    <p className="text-sm text-red-700">{alarm.asset_id} • {alarm.severity}</p>
                  </div>
                </div>
                <span className="text-xs text-red-600">
                  {new Date(alarm.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {activeAlarms.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                ... and {activeAlarms.length - 5} more alerts
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-8">
            No active alerts at this time
          </div>
        )}
      </div>

      {/* Plant Details Modal */}
      <Modal
        isOpen={selectedPlantId !== null}
        onClose={() => setSelectedPlantId(null)}
        title={selectedPlantId ? plantConfigurations[selectedPlantId]?.site_info?.name || plantConfigurations[selectedPlantId]?.name || selectedPlantId : ''}
        size="full"
      >
        {selectedPlantId && <PlantDetails siteId={selectedPlantId} onClose={() => setSelectedPlantId(null)} />}
      </Modal>
    </div>
  )
}