import React, { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin, Settings, AlertTriangle, Wifi, FlaskConical, ArrowRight, Maximize2, Droplets, Activity, Gauge } from 'lucide-react'
import { ModuleStatusCard } from '../../components/plant/ModuleStatusCard'
import { StatusIndicator } from '../../components/shared/StatusIndicator'
import type { PlantSite, ComponentStatus } from '../../types'
import { useTelemetryStore } from '../../store/telemetryStore'
import { useConfigurationStore } from '../../store/configurationStore'
import { getModuleIconComponent } from '../../utils/moduleIcons'

interface SiteOverviewProps {
  site: PlantSite
}

export function SiteOverview({ site }: SiteOverviewProps) {
  const navigate = useNavigate()
  const { getLatestByAsset, latest } = useTelemetryStore()
  const { plantConfigurations, moduleTemplates } = useConfigurationStore()

  // Get full configuration for this site
  const plantConfig = plantConfigurations[site.id]
  const siteInfo = plantConfig?.site_info || {}
  const operationalParams = plantConfig?.operational_parameters || {}
  const protocolClients = plantConfig?.protocol_clients || []
  const controlStrategies = plantConfig?.control_strategies || {}
  const alarmDefinitions = plantConfig?.alarm_definitions || {}

  // Use ref to cache flow rates (prevents flickering to zero without causing re-renders)
  const flowRateCacheRef = useRef<{ currentFlowRate: number, dailyTotalFlow: number }>({
    currentFlowRate: 0,
    dailyTotalFlow: 0
  })

  // Calculate current flow metrics with caching
  const { currentFlowRate, dailyTotalFlow, hasRecentData } = useMemo(() => {
    const siteObservations = Object.values(latest).filter(obs => obs.site_id === site.id)

    // Get current flow rate from telemetry
    const rawIntakeFlowObs = siteObservations.find(obs =>
      obs.asset_id === 'raw_intake' && obs.measurement === 'flow_rate'
    )

    // Get daily total flow
    const dailyTotalFlowObs = siteObservations.find(obs =>
      obs.asset_id === 'raw_intake' && obs.measurement === 'daily_flow_total'
    )

    // Get cached values
    const cachedValues = flowRateCacheRef.current

    // Use cached values if observations are missing (prevents flickering to zero)
    const newFlowRate = rawIntakeFlowObs ? rawIntakeFlowObs.value : cachedValues.currentFlowRate
    const newDailyTotal = dailyTotalFlowObs ? dailyTotalFlowObs.value : cachedValues.dailyTotalFlow

    // Update cache if we have new valid values
    if (rawIntakeFlowObs || dailyTotalFlowObs) {
      flowRateCacheRef.current = {
        currentFlowRate: rawIntakeFlowObs ? rawIntakeFlowObs.value : cachedValues.currentFlowRate,
        dailyTotalFlow: dailyTotalFlowObs ? dailyTotalFlowObs.value : cachedValues.dailyTotalFlow
      }
    }

    // Check if data is recent (within last 60 seconds)
    const recentDataTimestamps = siteObservations
      .map((obs) => obs && obs.ts ? new Date(obs.ts).getTime() : 0)
      .filter((timestamp) => timestamp > 0)

    const latestTimestamp = recentDataTimestamps.length > 0 ?
      Math.max(...recentDataTimestamps) : 0

    const timeDiffSeconds = latestTimestamp > 0 ?
      (Date.now() - latestTimestamp) / 1000 : Infinity

    const isRecentData = timeDiffSeconds < 60 // Within last 60 seconds

    return {
      currentFlowRate: newFlowRate,
      dailyTotalFlow: newDailyTotal,
      hasRecentData: isRecentData
    }
  }, [latest, site.id])

  // Calculate design flow rate from operational parameters
  const designFlowRate = operationalParams.design_flow_rate ||
    (site.design_capacity / 24) || 0

  // Get module information from configuration and templates
  const getModuleInfo = (moduleId: string) => {
    const module = plantConfig?.modules?.[moduleId]
    if (!module) {
      return {
        name: moduleId,
        icon: <Settings className="w-6 h-6" />,
        type: 'unknown',
        category: 'other'
      }
    }

    const template = moduleTemplates[module.template_id]
    if (!template) {
      return {
        name: moduleId,
        icon: <Settings className="w-6 h-6" />,
        type: 'unknown',
        category: 'other'
      }
    }

    // Get icon component based on template type and category
    const IconComponent = getModuleIconComponent(template.type, template.category)

    // Generate display name from moduleId (capitalize and remove underscores/numbers)
    const displayName = moduleId
      .replace(/_/g, ' ')
      .replace(/\d+$/, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim()

    return {
      name: displayName,
      icon: <IconComponent className="w-6 h-6" />,
      type: template.type,
      category: template.category || 'other'
    }
  }

  // Get module status and metrics from telemetry
  const getModuleStatus = (moduleId: string): { status: ComponentStatus; metrics: Array<{ label: string; value: string }> } => {
    // Get latest observations for this module
    const flowObs = getLatestByAsset(site.id, moduleId, 'flow_rate')
    const pressureObs = getLatestByAsset(site.id, moduleId, 'pressure')
    const levelObs = getLatestByAsset(site.id, moduleId, 'level')
    const turbidityObs = getLatestByAsset(site.id, moduleId, 'turbidity')
    const chlorineObs = getLatestByAsset(site.id, moduleId, 'chlorine_residual')

    const metrics: Array<{ label: string; value: string }> = []

    // Add relevant metrics based on available data
    if (flowObs && typeof flowObs.value === 'number') {
      metrics.push({ label: 'Flow', value: `${flowObs.value.toFixed(1)} ${flowObs.unit}` })
    }
    if (pressureObs && typeof pressureObs.value === 'number') {
      metrics.push({ label: 'Pressure', value: `${pressureObs.value.toFixed(1)} ${pressureObs.unit}` })
    }
    if (levelObs && typeof levelObs.value === 'number') {
      metrics.push({ label: 'Level', value: `${levelObs.value.toFixed(1)} ${levelObs.unit}` })
    }
    if (turbidityObs && typeof turbidityObs.value === 'number') {
      metrics.push({ label: 'Turbidity', value: `${turbidityObs.value.toFixed(2)} ${turbidityObs.unit}` })
    }
    if (chlorineObs && typeof chlorineObs.value === 'number') {
      metrics.push({ label: 'Cl', value: `${chlorineObs.value.toFixed(1)} ${chlorineObs.unit}` })
    }

    // Determine status based on data quality and thresholds
    let status: ComponentStatus = 'normal'

    if (!flowObs && !pressureObs && !levelObs) {
      status = 'offline'
    } else if (flowObs?.quality === 'bad' || pressureObs?.quality === 'bad') {
      status = 'alarm'
    } else if (flowObs?.quality === 'uncertain' || pressureObs?.quality === 'uncertain') {
      status = 'warning'
    }

    // Special case for reservoir level (from design example)
    if (moduleId === 'finished_water_tank' && levelObs && typeof levelObs.value === 'number' && levelObs.value > 95) {
      status = 'alarm'
    }

    // Special case for chlorine (from design example)
    if (moduleId === 'chlorination' && chlorineObs && typeof chlorineObs.value === 'number' && chlorineObs.value < 2.0) {
      status = 'warning'
    }

    return { status, metrics }
  }

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {site.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${site.status === 'connected' ? 'bg-green-500' : site.status === 'maintenance' ? 'bg-blue-500' : 'bg-red-500'}`} />
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Overall Status: {site.status === 'connected' ? 'Online & Nominal' : site.status === 'maintenance' ? 'Maintenance Mode' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Plant Schematic Section */}
      <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Plant Schematic
          </h3>
          <button
            onClick={() => navigate(`/sites/${site.id}/layout`)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="font-medium">Open Full Layout</span>
          </button>
        </div>

        {/* Module Flow - Flexible Grid Layout */}
        {plantConfig?.modules && Object.keys(plantConfig.modules).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {Object.keys(plantConfig.modules).map((moduleId) => {
              const moduleInfo = getModuleInfo(moduleId)
              const { status, metrics } = getModuleStatus(moduleId)

              return (
                <ModuleStatusCard
                  key={moduleId}
                  name={moduleInfo.name}
                  icon={moduleInfo.icon}
                  status={status}
                  metrics={metrics}
                  className="w-full"
                />
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No modules configured for this site. Visit the Configuration tab to add modules.
            </p>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Design Flow Rate */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Design Flow Rate
            </h4>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(designFlowRate / 1000).toFixed(1)}k
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            m³/h
          </p>
        </div>

        {/* Current Flow Rate */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Current Flow Rate
            </h4>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(currentFlowRate / 1000).toFixed(1)}k
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            m³/h {!hasRecentData && <span className="text-orange-500">⚠</span>}
          </p>
        </div>

        {/* Daily Total Flow */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Daily Total Flow
            </h4>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(dailyTotalFlow / 1000).toFixed(1)}k
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            m³
          </p>
        </div>
      </div>

      {/* Utilization Bar */}
      {designFlowRate > 0 && (
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Flow Utilization</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {((currentFlowRate / designFlowRate) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((currentFlowRate / designFlowRate) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Site Information */}
      {siteInfo.location && (
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Site Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Location</h4>
              <p className="text-gray-600 dark:text-gray-400">
                {siteInfo.location?.region}, {siteInfo.location?.country}
              </p>
              {siteInfo.location?.coordinates && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {siteInfo.location.coordinates[0].toFixed(4)}, {siteInfo.location.coordinates[1].toFixed(4)}
                </p>
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Design Parameters</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Capacity: {site.design_capacity.toLocaleString()} m³/day
              </p>
              <p className="text-gray-600 dark:text-gray-400">Type: {site.treatment_train}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Flow Rates</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Normal: {operationalParams.normal_flow_rate || 'N/A'} m³/h
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Design: {operationalParams.design_flow_rate || 'N/A'} m³/h
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Water Quality Parameters */}
      {operationalParams.raw_water_quality && operationalParams.treatment_targets && (
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Water Quality Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Raw Water Quality</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Turbidity Range:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {operationalParams.raw_water_quality.turbidity_range[0]} -{' '}
                    {operationalParams.raw_water_quality.turbidity_range[1]} NTU
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">pH Range:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {operationalParams.raw_water_quality.ph_range[0]} -{' '}
                    {operationalParams.raw_water_quality.ph_range[1]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Temperature Range:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {operationalParams.raw_water_quality.temperature_range[0]} -{' '}
                    {operationalParams.raw_water_quality.temperature_range[1]}°C
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Treatment Targets</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Finished Turbidity:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ≤ {operationalParams.treatment_targets.finished_turbidity} NTU
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Finished pH:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {operationalParams.treatment_targets.finished_ph[0]} -{' '}
                    {operationalParams.treatment_targets.finished_ph[1]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Chlorine Residual:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {operationalParams.treatment_targets.chlorine_residual[0]} -{' '}
                    {operationalParams.treatment_targets.chlorine_residual[1]} mg/L
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Protocol Clients */}
      {protocolClients.length > 0 && (
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-primary" />
            Protocol Clients
          </h3>
          <div className="space-y-4">
            {protocolClients.map((client: any, index: number) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{client.client_id}</h4>
                  <StatusIndicator
                    status={client.enabled ? 'connected' : 'disconnected'}
                    showLabel
                  />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{client.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Protocol:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {client.protocol}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Connection:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {client.connection.host}:{client.connection.port}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Modules Assigned:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {client.modules_assigned?.length || 0} modules
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Strategies */}
      {Object.keys(controlStrategies).length > 0 && (
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Control Strategies
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(controlStrategies).map(([strategyId, strategy]: [string, any]) => (
              <div
                key={strategyId}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {strategyId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{strategy.description}</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Inputs:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {strategy.inputs?.length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Outputs:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {strategy.outputs?.length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Algorithm:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {strategy.algorithm}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alarm Definitions */}
      {Object.keys(alarmDefinitions).length > 0 && (
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Alarm Definitions
          </h3>
          <div className="space-y-6">
            {Object.entries(alarmDefinitions).map(([category, alarms]: [string, any]) => (
              <div key={category}>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                  {category.replace(/_/g, ' ')}
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {Object.entries(alarms).map(([alarmId, alarm]: [string, any]) => (
                    <div
                      key={alarmId}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                          {alarmId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h5>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            alarm.severity === 'critical'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : alarm.severity === 'high'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                              : alarm.severity === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {alarm.severity}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Parameter: {alarm.parameter}</div>
                        <div>Threshold: {alarm.threshold}</div>
                        <div>Action: {alarm.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
