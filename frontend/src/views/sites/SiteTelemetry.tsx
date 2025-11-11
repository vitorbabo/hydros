import React, { useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { StatusIndicator } from '../../components/shared/StatusIndicator'
import { MetricCard } from '../../components/shared/MetricCard'
import { useTelemetryStore } from '../../store/telemetryStore'
import { useDashboardStore } from '../../store/dashboardStore'
import type { PlantSite } from '../../types'
import {
  Filter,
  TrendingUp,
  Gauge,
  Droplets,
  Thermometer,
  Activity,
  AlertTriangle,
  Zap,
  Beaker,
  Shield,
  Database,
  Layers,
} from 'lucide-react'

interface SiteTelemetryProps {
  site: PlantSite
}

const assetGroupConfig = {
  all: { name: 'All Assets', icon: Database },
  intake: { name: 'Intake System', icon: Droplets },
  pumps: { name: 'Pumping Equipment', icon: Activity },
  treatment: { name: 'Treatment Train', icon: Filter },
  chemical: { name: 'Chemical Dosing', icon: Beaker },
  filtration: { name: 'Filtration', icon: Layers },
  disinfection: { name: 'Disinfection', icon: Shield },
  storage: { name: 'Storage Systems', icon: Database },
}

const measurementIcons: Record<string, any> = {
  level: Droplets,
  temperature: Thermometer,
  turbidity: Filter,
  ph: Beaker,
  flow_rate: Activity,
  pressure: Gauge,
  vibration: Activity,
  motor_current: Zap,
  motor_temperature: Thermometer,
  power_consumption: Zap,
  chlorine_residual: Shield,
  conductivity: Zap,
  dissolved_oxygen: Droplets,
  run_status: Activity,
  pump_speed: Activity,
  mixer_speed: Activity,
  dose_rate: Beaker,
}

export function SiteTelemetry({ site }: SiteTelemetryProps) {
  const { connectionStatus } = useDashboardStore()
  const { latest, assetGroups, getTimeSeriesData } = useTelemetryStore()

  const [selectedAssetGroup, setSelectedAssetGroup] = React.useState<string>('all')
  const [selectedSensor, setSelectedSensor] = React.useState<string | null>(null)

  // Filter telemetry data for this site only
  const siteTelemetry = useMemo(() => {
    return Object.fromEntries(
      Object.entries(latest).filter(([_, obs]) => obs.site_id === site.id)
    )
  }, [latest, site.id])

  // Auto-select first sensor when data becomes available
  useEffect(() => {
    const availableSensors = Object.keys(siteTelemetry)
    if (availableSensors.length > 0 && !selectedSensor) {
      setSelectedSensor(availableSensors[0])
    }
  }, [siteTelemetry, selectedSensor])

  // Filter sensors based on selected asset group
  const filteredSensors = useMemo(() => {
    const allSensors = Object.keys(siteTelemetry).sort()

    if (selectedAssetGroup === 'all') {
      return allSensors
    }

    const assetsInGroup = assetGroups[selectedAssetGroup] || []
    return allSensors.filter((sensorKey) => {
      const [assetId] = sensorKey.split('.')
      return assetsInGroup.includes(assetId)
    })
  }, [siteTelemetry, selectedAssetGroup, assetGroups])

  // Get chart data for selected sensor
  const chartData = useMemo(() => {
    if (!selectedSensor) return []
    return getTimeSeriesData(selectedSensor).map((point) => ({
      time: point.ts,
      value: point.value,
      quality: point.quality,
      formattedTime: new Date(point.ts).toLocaleTimeString(),
    }))
  }, [selectedSensor, getTimeSeriesData])

  const currentObservation = selectedSensor ? siteTelemetry[selectedSensor] : null

  // Determine status based on measurement type and value
  const getStatusFromValue = (
    measurement: string,
    value: number,
    unit: string
  ): 'normal' | 'warning' | 'alarm' => {
    const scaledValue = unit === 'bool' ? value : value / 100

    switch (measurement) {
      case 'vibration':
        return scaledValue > 2.0 ? 'alarm' : scaledValue > 1.5 ? 'warning' : 'normal'
      case 'turbidity':
        return scaledValue > 15 ? 'alarm' : scaledValue > 10 ? 'warning' : 'normal'
      case 'level':
        return scaledValue < 0.5 || scaledValue > 5.0
          ? 'alarm'
          : scaledValue < 1.0 || scaledValue > 4.5
          ? 'warning'
          : 'normal'
      case 'temperature':
        return scaledValue > 40 ? 'alarm' : scaledValue > 35 ? 'warning' : 'normal'
      case 'motor_temperature':
        return scaledValue > 80 ? 'alarm' : scaledValue > 70 ? 'warning' : 'normal'
      case 'ph':
        return scaledValue < 6.5 || scaledValue > 8.5
          ? 'alarm'
          : scaledValue < 7.0 || scaledValue > 8.0
          ? 'warning'
          : 'normal'
      case 'motor_current':
        return scaledValue > 80 ? 'alarm' : scaledValue > 60 ? 'warning' : 'normal'
      case 'pressure':
        return scaledValue > 8 ? 'alarm' : scaledValue > 6 ? 'warning' : 'normal'
      case 'run_status':
        return 'normal'
      default:
        return 'normal'
    }
  }

  // Get display value with proper scaling
  const getDisplayValue = (value: number, unit: string): string => {
    if (unit === 'bool') {
      return value > 0 ? 'ON' : 'OFF'
    }

    const scaledValue = value / 100

    if (scaledValue < 1) {
      return scaledValue.toFixed(2)
    } else if (scaledValue < 100) {
      return scaledValue.toFixed(1)
    } else {
      return Math.round(scaledValue).toString()
    }
  }

  // Get available asset groups that have data for this site
  const availableGroups = useMemo(() => {
    return Object.keys(assetGroupConfig).filter((groupId) => {
      if (groupId === 'all') return Object.keys(siteTelemetry).length > 0
      return (assetGroups[groupId] || []).length > 0
    })
  }, [assetGroups, siteTelemetry])

  if (Object.keys(siteTelemetry).length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Sensor Telemetry
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Real-time monitoring and historical analysis for {site.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status={connectionStatus} showLabel />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {connectionStatus === 'connected' ? 'Waiting for data...' : 'Not connected'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-12 text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No telemetry data available
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Waiting for sensor observations from {site.name}...
          </p>
          {connectionStatus !== 'connected' && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Check that the Hydros system is running and MQTT broker is accessible.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Sensor Telemetry
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {Object.keys(siteTelemetry).length} sensors • Real-time monitoring for {site.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusIndicator status={connectionStatus} showLabel />
          <span className="text-sm text-gray-500 dark:text-gray-400">Live data</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-80 space-y-4">
          {/* Asset Group Filter */}
          <div className="bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Asset Groups ({availableGroups.length})
            </h3>
            <div className="space-y-2">
              {availableGroups.map((groupId) => {
                const group = assetGroupConfig[groupId as keyof typeof assetGroupConfig]
                const Icon = group.icon
                const count =
                  groupId === 'all' ? site.modules.length : (assetGroups[groupId] || []).length

                return (
                  <button
                    key={groupId}
                    onClick={() => setSelectedAssetGroup(groupId)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                      selectedAssetGroup === groupId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {group.name}
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sensor List */}
          <div className="bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Sensors ({filteredSensors.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSensors.map((sensorKey) => {
                const obs = siteTelemetry[sensorKey]
                const status = getStatusFromValue(obs.measurement, obs.value, obs.unit)
                const displayValue = getDisplayValue(obs.value, obs.unit)
                const [assetId] = sensorKey.split('.')

                return (
                  <button
                    key={sensorKey}
                    onClick={() => setSelectedSensor(sensorKey)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selectedSensor === sensorKey
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-white capitalize">
                        {obs.measurement.replace(/_/g, ' ')}
                      </span>
                      <StatusIndicator status={status} size="sm" />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">
                      {assetId.replace(/_/g, ' ')}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {displayValue} {obs.unit !== 'bool' ? obs.unit : ''}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(obs.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Quality: {obs.quality} • {obs.component_type}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Current Reading Card */}
          {currentObservation && (
            <MetricCard
              title={currentObservation.measurement.replace(/_/g, ' ').toUpperCase()}
              value={getDisplayValue(currentObservation.value, currentObservation.unit)}
              unit={currentObservation.unit !== 'bool' ? currentObservation.unit : ''}
              status={
                getStatusFromValue(
                  currentObservation.measurement,
                  currentObservation.value,
                  currentObservation.unit
                ) === 'normal'
                  ? 'normal'
                  : 'warning'
              }
              icon={React.createElement(
                measurementIcons[currentObservation.measurement] || Gauge,
                { className: 'w-6 h-6' }
              )}
            />
          )}
        </div>

        {/* Main Chart Area */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-900/50 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {currentObservation
                    ? `${currentObservation.measurement.replace(/_/g, ' ')} - ${currentObservation.asset_id.replace(/_/g, ' ')}`
                    : 'Select a sensor'}
                </h3>
                {currentObservation && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentObservation.component_type} • Quality: {currentObservation.quality} •
                    Tag: {currentObservation.raw_tag}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                {currentObservation &&
                  getStatusFromValue(
                    currentObservation.measurement,
                    currentObservation.value,
                    currentObservation.unit
                  ) !== 'normal' && (
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Warning</span>
                    </div>
                  )}
              </div>
            </div>

            <div className="h-96">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30 dark:opacity-20"
                      stroke="#9ca3af"
                    />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={['auto', 'auto']}
                      tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                      stroke="#6b7280"
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        currentObservation?.unit === 'bool'
                          ? value > 0
                            ? 'ON'
                            : 'OFF'
                          : (value / 100).toFixed(1)
                      }
                      stroke="#6b7280"
                    />
                    <Tooltip
                      labelFormatter={(time) => new Date(time).toLocaleString()}
                      formatter={(value: number) => {
                        const displayVal =
                          currentObservation?.unit === 'bool'
                            ? value > 0
                              ? 'ON'
                              : 'OFF'
                            : `${(value / 100).toFixed(2)} ${currentObservation?.unit || ''}`
                        return [displayVal, currentObservation?.measurement.replace(/_/g, ' ') || '']
                      }}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#135bec"
                      strokeWidth={2}
                      dot={{ fill: '#135bec', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Select a sensor to view telemetry data</p>
                    <p className="text-sm mt-2">
                      Historical data will appear as observations are received
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
