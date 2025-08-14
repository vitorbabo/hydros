// Enhanced TypeScript interfaces for the Hydros dashboard

export interface Observation {
  site_id: string
  asset_id: string
  sensor_id: string
  measurement: string
  ts: string
  value: number
  unit: string
  quality: 'good' | 'bad' | 'uncertain'
  raw_tag: string
  source: string
  seq: number
  parameter_type: 'sensor' | 'actuator' | 'status' | 'setpoint' | 'alarm'
  component_type: 'sensor' | 'actuator' | 'status' | 'setpoint' | 'alarm'
}

export interface PlantSite {
  id: string
  name: string
  design_capacity: number
  treatment_train: string
  modules: string[]
  parameters: {
    normal_flow_rate: number
    raw_water_quality: {
      turbidity_range: [number, number]
      ph_range: [number, number]
      temperature_range: [number, number]
    }
  }
  protocol_servers: ProtocolServer[]
  status: ConnectionStatus
  last_seen?: string
}

export interface ProtocolServer {
  protocol: 'modbus_tcp' | 'opcua' | 's7_server'
  enabled: boolean
  host: string
  port: number
  device_id?: number
  description?: string
}

export interface Module {
  id: string
  type: 'intake' | 'pump' | 'chemical_treatment' | 'chemical_dosing' | 'sedimentation' | 'filtration' | 'disinfection' | 'storage'
  description: string
  required_sensors: string[]
  optional_sensors?: string[]
  actuators?: string[]
  alarms?: string[]
  position?: { x: number; y: number }
  status: ComponentStatus
}

export interface Sensor {
  asset_id: string
  sensor_id: string
  measurement: string
  unit: string
  data_type: 'REAL' | 'BOOL' | 'INT16' | 'UINT16' | 'INT32' | 'UINT32' | 'STRING'
  component_type: 'sensor' | 'actuator' | 'status'
  tag_address: string
  protocol: string
  plc_connection: string
  scale_factor: number
  offset: number
  description: string
  quality?: DataQuality
  last_value?: number
  last_update?: string
}

export interface PLCConnection {
  connection_id: string
  protocol: 'modbus_tcp' | 'opcua' | 's7'
  ip_address?: string
  port?: number
  endpoint_url?: string
  enabled: boolean
  status: ConnectionStatus
  last_communication?: string
  error_count: number
}

export interface SystemMetrics {
  total_sites: number
  active_connections: number
  observations_per_minute: number
  data_quality_score: number
  uptime_percentage: number
  active_alarms: number
  last_update: string
}

export interface AlarmState {
  id: string
  site_id: string
  asset_id: string
  sensor_id: string
  alarm_type: 'high' | 'low' | 'deviation' | 'equipment'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: string
  acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  status: 'active' | 'cleared' | 'suppressed'
}

export interface KPI {
  id: string
  name: string
  value: number
  unit: string
  target?: number
  trend: 'up' | 'down' | 'stable'
  category: 'quality' | 'efficiency' | 'reliability' | 'sustainability'
  timestamp: string
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'maintenance'
export type ComponentStatus = 'normal' | 'warning' | 'alarm' | 'offline' | 'maintenance'
export type DataQuality = 'good' | 'bad' | 'uncertain' | 'stale'

export interface DashboardState {
  currentSite: string | null
  selectedModule: string | null
  viewMode: 'overview' | 'layout' | 'telemetry'
  alarms: AlarmState[]
  systemMetrics: SystemMetrics | null
  lastUpdate: string | null
}

// React Flow types for plant layout
export interface PlantNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    module: Module
    status: ComponentStatus
    sensors: Sensor[]
    realTimeData: Record<string, Observation>
  }
}

export interface PlantEdge {
  id: string
  source: string
  target: string
  type: 'default' | 'step' | 'smoothstep'
  data?: {
    flow_rate?: number
    flow_direction: 'forward' | 'backward' | 'bidirectional'
  }
}

// Configuration types matching YAML structure
export interface PlantConfig {
  site_configurations: Record<string, PlantSite>
  module_templates: Record<string, ModuleTemplate>
  control_strategies: Record<string, any>
  alarm_definitions: Record<string, any>
  data_quality: any
}

export interface ModuleTemplate {
  type: string
  description: string
  required_sensors: string[]
  optional_sensors?: string[]
  actuators?: string[]
  alarms?: string[]
  chemicals?: string[]
  control_logic?: string
  safety_systems?: string[]
  maintenance?: any
  replacement_indicators?: any
  regulatory?: string
}

export interface EdgeGatewayConfig {
  site_id: string
  mqtt: {
    host: string
    port: number
    client_id: string
  }
  plcs: PLCConnection[]
  tags: Sensor[]
}