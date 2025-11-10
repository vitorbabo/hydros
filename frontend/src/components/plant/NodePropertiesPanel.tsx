import React from 'react'
import { StatusIndicator } from '../shared/StatusIndicator'
import { MetricCard } from '../shared/MetricCard'
import {
  Settings,
  Activity,
  Droplets,
  Thermometer,
  Gauge,
  Zap,
  AlertTriangle,
  Wrench,
  X,
  TrendingUp
} from 'lucide-react'
import type { Node } from '@xyflow/react'
import type { Observation } from '../../types'
import { getIconByType } from '../../utils/moduleIcons'

interface NodePropertiesPanelProps {
  node: Node | null
  onClose: () => void
  onConfigChange?: (nodeId: string, config: any) => void
}

export function NodePropertiesPanel({ node, onClose, onConfigChange }: NodePropertiesPanelProps) {
  if (!node) {
    return null
  }

  const data = node.data
  const observations = data.realTimeData || {}
  const observationsList = Object.values(observations) as Observation[]

  const getMeasurementIcon = (measurement: string) => {
    const icons = {
      'level': Droplets,
      'flow_rate': Activity,
      'temperature': Thermometer,
      'pressure': Gauge,
      'turbidity': Droplets,
      'ph': Gauge,
      'conductivity': Zap,
      'dissolved_oxygen': Droplets,
      'motor_current': Zap,
      'motor_temperature': Thermometer,
      'vibration': Activity,
      'power_consumption': Zap,
      'run_status': Activity,
      'pump_speed': Activity,
      'mixer_speed': Activity,
      'dose_rate': Droplets,
      'chlorine_residual': Droplets,
    }
    return icons[measurement as keyof typeof icons] || Gauge
  }

  const getDisplayValue = (value: number, unit: string): string => {
    if (unit === 'bool') {
      return value > 0 ? 'ON' : 'OFF'
    }
    
    // Apply scaling correction for non-boolean values
    const scaledValue = value / 100
    
    // Format based on expected precision
    if (scaledValue < 1) {
      return scaledValue.toFixed(2)
    } else if (scaledValue < 100) {
      return scaledValue.toFixed(1)
    } else {
      return Math.round(scaledValue).toString()
    }
  }

  const getValueStatus = (observation: Observation): 'normal' | 'warning' | 'alarm' => {
    const scaledValue = observation.unit === 'bool' ? observation.value : observation.value / 100

    switch (observation.measurement) {
      case 'vibration':
        return scaledValue > 2.0 ? 'alarm' : scaledValue > 1.5 ? 'warning' : 'normal'
      case 'turbidity':
        return scaledValue > 15 ? 'alarm' : scaledValue > 10 ? 'warning' : 'normal'
      case 'level':
        return scaledValue < 0.5 || scaledValue > 5.0 ? 'alarm' : scaledValue < 1.0 || scaledValue > 4.5 ? 'warning' : 'normal'
      case 'temperature':
        return scaledValue > 40 ? 'alarm' : scaledValue > 35 ? 'warning' : 'normal'
      case 'motor_temperature':
        return scaledValue > 80 ? 'alarm' : scaledValue > 70 ? 'warning' : 'normal'
      case 'ph':
        return scaledValue < 6.5 || scaledValue > 8.5 ? 'alarm' : scaledValue < 7.0 || scaledValue > 8.0 ? 'warning' : 'normal'
      case 'motor_current':
        return scaledValue > 80 ? 'alarm' : scaledValue > 60 ? 'warning' : 'normal'
      case 'pressure':
        return scaledValue > 8 ? 'alarm' : scaledValue > 6 ? 'warning' : 'normal'
      default:
        return 'normal'
    }
  }

  const groupedObservations = React.useMemo(() => {
    const groups: Record<string, Observation[]> = {
      'sensors': [],
      'actuators': [],
      'status': []
    }

    observationsList.forEach(obs => {
      if (obs.parameter_type === 'sensor') {
        groups.sensors.push(obs)
      } else if (obs.parameter_type === 'actuator') {
        groups.actuators.push(obs)
      } else {
        groups.status.push(obs)
      }
    })

    return groups
  }, [observationsList])

  // Get icon component based on the icon type string
  const ModuleIconComponent = getIconByType(data.icon || data.type)

  return (
    <div className="w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-lg overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ModuleIconComponent className="w-5 h-5 text-primary" />
            {data.label}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <StatusIndicator status={data.status} showLabel />
            <span className="text-sm text-gray-500 dark:text-gray-400">{data.type}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Module Information */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Module Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Asset ID</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.assetId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Category</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{data.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Position</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ({Math.round(node.position.x)}, {Math.round(node.position.y)})
              </span>
            </div>
            {data.lastUpdate && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Last Update</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(data.lastUpdate).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Parameters */}
        {Object.keys(groupedObservations).map(group => {
          const groupObs = groupedObservations[group]
          if (groupObs.length === 0) return null

          return (
            <div key={group}>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 capitalize flex items-center gap-2">
                {group === 'sensors' && <Gauge className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                {group === 'actuators' && <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                {group === 'status' && <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                {group} ({groupObs.length})
              </h4>
              <div className="space-y-3">
                {groupObs.map((obs) => {
                  const Icon = getMeasurementIcon(obs.measurement)
                  const displayValue = getDisplayValue(obs.value, obs.unit)
                  const status = getValueStatus(obs)

                  return (
                    <div key={obs.sensor_id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white capitalize">
                            {obs.measurement.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <StatusIndicator status={status} size="sm" />
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {displayValue}
                        </span>
                        {obs.unit !== 'bool' && (
                          <span className="text-gray-500 dark:text-gray-400 font-medium">
                            {obs.unit}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Quality: {obs.quality}</span>
                        <span>Tag: {obs.raw_tag}</span>
                      </div>

                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(obs.ts).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* No Data State */}
        {observationsList.length === 0 && (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">No Real-time Data</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This module is not currently receiving telemetry data
            </p>
          </div>
        )}

        {/* Module Actions */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Actions</h4>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              View Historical Data
            </button>
            <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              Configure Module
            </button>
            <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2">
              <Wrench className="w-4 h-4" />
              Maintenance Mode
            </button>
          </div>
        </div>

        {/* Warnings */}
        {observationsList.some(obs => getValueStatus(obs) !== 'normal') && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Attention Required</span>
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-400">
              Some parameters are outside normal operating ranges.
              Review the measurements above and consider maintenance actions.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}