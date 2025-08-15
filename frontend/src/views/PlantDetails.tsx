import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConfigurationStore } from '../store/configurationStore'
import { useTelemetryStore } from '../store/telemetryStore'
import { StatusIndicator } from '../components/shared/StatusIndicator'
import { MetricCard } from '../components/shared/MetricCard'
import { 
  ArrowLeft,
  MapPin,
  Settings,
  Droplets,
  Thermometer,
  Activity,
  AlertTriangle,
  Wifi,
  Database,
  Gauge,
  Zap,
  Filter,
  FlaskConical
} from 'lucide-react'

export function PlantDetails() {
  const { siteId } = useParams<{ siteId: string }>()
  const navigate = useNavigate()
  const { plantConfigurations } = useConfigurationStore()
  const { latest } = useTelemetryStore()

  const plantConfig = siteId ? plantConfigurations[siteId] : null

  if (!plantConfig) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Plant Details</h1>
        </div>
        <div className="text-center py-12">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Plant Not Found</h3>
          <p className="text-gray-500">The requested plant configuration could not be found.</p>
        </div>
      </div>
    )
  }

  // Enhanced plant data (assuming rich MQTT data structure)
  const siteInfo = plantConfig.site_info || {
    site_id: plantConfig.site_id,
    name: plantConfig.name,
    design_capacity: 50000,
    treatment_train: 'conventional',
    location: {
      region: 'Unknown',
      country: 'Unknown',
      coordinates: [0, 0]
    }
  }

  const operationalParams = plantConfig.operational_parameters || {
    normal_flow_rate: 35,
    design_flow_rate: 45,
    raw_water_quality: {
      turbidity_range: [2, 15],
      ph_range: [7.2, 8.1],
      temperature_range: [12, 20]
    },
    treatment_targets: {
      finished_turbidity: 0.3,
      finished_ph: [7, 8],
      chlorine_residual: [0.5, 2]
    }
  }

  const protocolClients = plantConfig.protocol_clients || []
  const controlStrategies = plantConfig.control_strategies || {}
  const alarmDefinitions = plantConfig.alarm_definitions || {}

  // Get current telemetry for this site
  const siteAssets = Object.keys(latest).filter(key => key.includes(siteId))
  const hasRecentData = siteAssets.length > 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{siteInfo.name}</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-500">{siteInfo.site_id}</p>
            <div className="flex items-center gap-1 text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>{siteInfo.location.region}, {siteInfo.location.country}</span>
            </div>
            <StatusIndicator status={hasRecentData ? 'connected' : 'disconnected'} showLabel />
          </div>
        </div>
      </div>

      {/* Plant Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Design Capacity"
          value={`${(siteInfo.design_capacity / 1000).toFixed(0)}k`}
          unit="m³/day"
          icon={<Droplets className="w-6 h-6" />}
          status="normal"
        />
        <MetricCard
          title="Normal Flow Rate"
          value={operationalParams.normal_flow_rate}
          unit="m³/h"
          icon={<Activity className="w-6 h-6" />}
          status="normal"
        />
        <MetricCard
          title="Treatment Train"
          value={siteInfo.treatment_train}
          icon={<Filter className="w-6 h-6" />}
          status="normal"
        />
        <MetricCard
          title="Active Modules"
          value={Object.keys(plantConfig.modules || {}).length}
          icon={<Database className="w-6 h-6" />}
          status="normal"
        />
      </div>

      {/* Site Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Site Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Location</h4>
            <p className="text-gray-600">{siteInfo.location.region}, {siteInfo.location.country}</p>
            <p className="text-sm text-gray-500 mt-1">
              {siteInfo.location.coordinates[0].toFixed(4)}, {siteInfo.location.coordinates[1].toFixed(4)}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Design Parameters</h4>
            <p className="text-gray-600">Capacity: {siteInfo.design_capacity.toLocaleString()} m³/day</p>
            <p className="text-gray-600">Type: {siteInfo.treatment_train}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Flow Rates</h4>
            <p className="text-gray-600">Normal: {operationalParams.normal_flow_rate} m³/h</p>
            <p className="text-gray-600">Design: {operationalParams.design_flow_rate} m³/h</p>
          </div>
        </div>
      </div>

      {/* Water Quality Parameters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FlaskConical className="w-5 h-5" />
          Water Quality Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Raw Water Quality</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Turbidity Range:</span>
                <span className="font-medium">{operationalParams.raw_water_quality.turbidity_range[0]} - {operationalParams.raw_water_quality.turbidity_range[1]} NTU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">pH Range:</span>
                <span className="font-medium">{operationalParams.raw_water_quality.ph_range[0]} - {operationalParams.raw_water_quality.ph_range[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Temperature Range:</span>
                <span className="font-medium">{operationalParams.raw_water_quality.temperature_range[0]} - {operationalParams.raw_water_quality.temperature_range[1]}°C</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Treatment Targets</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Finished Turbidity:</span>
                <span className="font-medium">≤ {operationalParams.treatment_targets.finished_turbidity} NTU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Finished pH:</span>
                <span className="font-medium">{operationalParams.treatment_targets.finished_ph[0]} - {operationalParams.treatment_targets.finished_ph[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Chlorine Residual:</span>
                <span className="font-medium">{operationalParams.treatment_targets.chlorine_residual[0]} - {operationalParams.treatment_targets.chlorine_residual[1]} mg/L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Clients */}
      {protocolClients.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Protocol Clients
          </h3>
          <div className="space-y-4">
            {protocolClients.map((client, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{client.client_id}</h4>
                  <StatusIndicator status={client.enabled ? 'connected' : 'disconnected'} showLabel />
                </div>
                <p className="text-gray-600 text-sm mb-3">{client.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Protocol:</span>
                    <span className="ml-2 font-medium">{client.protocol}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Connection:</span>
                    <span className="ml-2 font-medium">{client.connection.host}:{client.connection.port}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-500">Modules Assigned:</span>
                    <span className="ml-2">{client.modules_assigned?.length || 0} modules</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Strategies */}
      {Object.keys(controlStrategies).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Control Strategies
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(controlStrategies).map(([strategyId, strategy]) => (
              <div key={strategyId} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{strategyId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                <p className="text-gray-600 text-sm mb-3">{strategy.description}</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Inputs:</span>
                    <span className="ml-2">{strategy.inputs?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Outputs:</span>
                    <span className="ml-2">{strategy.outputs?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Algorithm:</span>
                    <span className="ml-2 font-medium">{strategy.algorithm}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alarm Definitions */}
      {Object.keys(alarmDefinitions).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alarm Definitions
          </h3>
          <div className="space-y-6">
            {Object.entries(alarmDefinitions).map(([category, alarms]) => (
              <div key={category}>
                <h4 className="font-medium text-gray-900 mb-3 capitalize">{category.replace(/_/g, ' ')}</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {Object.entries(alarms).map(([alarmId, alarm]) => (
                    <div key={alarmId} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 text-sm">{alarmId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
                        <span className={`px-2 py-1 text-xs rounded ${
                          alarm.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alarm.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          alarm.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alarm.severity}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
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
