import React from 'react'
import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import { StatusIndicator } from '../shared/StatusIndicator'
import {
  Settings,
  Activity,
  Droplets,
  Thermometer,
  Gauge,
  Zap
} from 'lucide-react'
import type { ComponentStatus, Observation } from '../../types'
import { getIconByType } from '../../utils/moduleIcons'

interface PlantModuleData extends Record<string, unknown> {
  label: string
  type: string
  icon: string
  category: string
  assetId: string
  status: ComponentStatus
  realTimeData: Record<string, Observation>
  lastUpdate?: string
}

type PlantModuleNodeType = Node<PlantModuleData>

export function PlantModuleNode({ data, selected }: NodeProps<PlantModuleNodeType>) {
  const getStatusColor = (status: ComponentStatus) => {
    switch (status) {
      case 'normal': return 'border-green-500 bg-green-50'
      case 'warning': return 'border-yellow-500 bg-yellow-50'
      case 'alarm': return 'border-red-500 bg-red-50'
      case 'offline': return 'border-gray-400 bg-gray-100'
      case 'maintenance': return 'border-purple-500 bg-purple-50'
      default: return 'border-gray-400 bg-gray-50'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'intake': return 'text-blue-600'
      case 'pumps': return 'text-green-600'
      case 'treatment': return 'text-purple-600'
      case 'chemical': return 'text-orange-600'
      case 'filtration': return 'text-indigo-600'
      case 'disinfection': return 'text-red-600'
      case 'storage': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  // Get key parameters for quick display
  const keyParams = React.useMemo(() => {
    const params: Array<{ label: string; value: string; icon: React.ComponentType<any> }> = []
    
    Object.values(data.realTimeData).forEach(obs => {
      const scaledValue = obs.unit === 'bool' 
        ? (obs.value > 0 ? 'ON' : 'OFF')
        : (obs.value / 100).toFixed(1)
      
      switch (obs.measurement) {
        case 'level':
          params.push({ 
            label: 'Level', 
            value: `${scaledValue} ${obs.unit !== 'bool' ? obs.unit : ''}`, 
            icon: Droplets 
          })
          break
        case 'flow_rate':
          params.push({ 
            label: 'Flow', 
            value: `${scaledValue} ${obs.unit !== 'bool' ? obs.unit : ''}`, 
            icon: Activity 
          })
          break
        case 'temperature':
          params.push({ 
            label: 'Temp', 
            value: `${scaledValue} ${obs.unit !== 'bool' ? obs.unit : ''}`, 
            icon: Thermometer 
          })
          break
        case 'pressure':
          params.push({ 
            label: 'Press', 
            value: `${scaledValue} ${obs.unit !== 'bool' ? obs.unit : ''}`, 
            icon: Gauge 
          })
          break
        case 'run_status':
          params.push({ 
            label: 'Status', 
            value: scaledValue, 
            icon: Zap 
          })
          break
      }
    })
    
    return params.slice(0, 3) // Show max 3 key parameters
  }, [data.realTimeData])

  const hasConnections = data.type !== 'chemical' // Chemical dosing usually connects from side

  // Get icon component based on the icon type string
  const ModuleIconComponent = getIconByType(data.icon || data.type)

  return (
    <div className={`
      plant-module-node relative min-w-[180px] rounded-lg border-2 p-3 shadow-lg transition-all duration-200
      ${getStatusColor(data.status)}
      ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
      hover:shadow-xl cursor-pointer
    `}>
      {/* Input Handle */}
      {hasConnections && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
        />
      )}

      {/* Module Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ModuleIconComponent className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm text-gray-900 leading-tight">
              {data.label}
            </div>
            <div className={`text-xs font-medium ${getCategoryColor(data.category)}`}>
              {data.category.replace('_', ' ')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StatusIndicator status={data.status} size="sm" />
          <Settings className="w-3 h-3 text-gray-400 hover:text-gray-600" />
        </div>
      </div>

      {/* Real-time Parameters */}
      {keyParams.length > 0 && (
        <div className="space-y-1 text-xs">
          {keyParams.map((param, index) => {
            const Icon = param.icon
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-gray-600">
                  <Icon className="w-3 h-3" />
                  <span>{param.label}:</span>
                </div>
                <span className="font-medium text-gray-900">
                  {param.value}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* No Data Indicator */}
      {Object.keys(data.realTimeData).length === 0 && (
        <div className="text-xs text-gray-500 italic text-center py-1">
          No live data
        </div>
      )}

      {/* Last Update */}
      {data.lastUpdate && (
        <div className="text-xs text-gray-400 mt-2 text-center">
          Updated: {new Date(data.lastUpdate).toLocaleTimeString()}
        </div>
      )}

      {/* Output Handle */}
      {hasConnections && (
        <Handle 
          type="source" 
          position={Position.Right}
          className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
        />
      )}

      {/* Chemical dosing special handles */}
      {data.type === 'chemical' && (
        <Handle 
          type="source" 
          position={Position.Bottom}
          className="w-3 h-3 !bg-orange-500 !border-2 !border-white"
        />
      )}
    </div>
  )
}

// Export for use with ReactFlow nodeTypes
export const plantModuleNodeType = {
  plantModule: PlantModuleNode,
}