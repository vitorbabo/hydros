import { create } from 'zustand'

// Alert severity levels
export type AlertSeverity = 'critical' | 'warning' | 'info'

// Alert condition types for rules
export type AlertCondition = 'above' | 'below' | 'equal' | 'between'

// Alert interface
export interface Alert {
  id: string
  siteId: string
  siteName?: string
  moduleId?: string
  moduleName?: string
  assetId?: string
  assetName?: string
  severity: AlertSeverity
  title: string
  description: string
  timestamp: string
  acknowledgedBy?: string
  acknowledgedByName?: string
  acknowledgedAt?: string
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  measurement?: string
  value?: number
  threshold?: number
}

// Alert rule interface
export interface AlertRule {
  id: string
  name: string
  description?: string
  siteId: string
  siteName?: string
  assetId: string
  assetName?: string
  measurement: string
  condition: AlertCondition
  threshold: number | [number, number]
  severity: AlertSeverity
  notificationChannels: string[]
  enabled: boolean
  createdBy?: string
  createdAt: string
  updatedAt?: string
}

// Alert store interface
interface AlertStore {
  // State
  activeAlerts: Alert[]
  alertHistory: Alert[]
  alertRules: AlertRule[]

  // Filters
  selectedSeverity: AlertSeverity | 'all'
  selectedSite: string | 'all'
  selectedModule: string | 'all'

  // Alert management
  addAlert: (alert: Alert) => void
  syncActiveAlerts: (alerts: Alert[]) => void
  dismissedAlertIds: string[]
  acknowledgeAlert: (alertId: string, userId: string, userName?: string) => void
  acknowledgeMultipleAlerts: (alertIds: string[], userId: string, userName?: string) => void
  dismissAlert: (alertId: string) => void
  dismissMultipleAlerts: (alertIds: string[]) => void
  resolveAlert: (alertId: string, userId: string) => void
  clearHistory: () => void

  // Alert rule management
  addAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void
  updateAlertRule: (ruleId: string, updates: Partial<AlertRule>) => void
  deleteAlertRule: (ruleId: string) => void
  toggleAlertRule: (ruleId: string, enabled: boolean) => void

  // Filter management
  setSelectedSeverity: (severity: AlertSeverity | 'all') => void
  setSelectedSite: (siteId: string | 'all') => void
  setSelectedModule: (moduleId: string | 'all') => void
  resetFilters: () => void

  // Getters
  getAlertsBySeverity: (severity: AlertSeverity) => Alert[]
  getAlertsBySite: (siteId: string) => Alert[]
  getUnacknowledgedAlerts: () => Alert[]
  getActiveAlertsCount: () => number
  getCriticalAlertsCount: () => number
  getFilteredAlerts: () => Alert[]
  getAlertRulesBySite: (siteId: string) => AlertRule[]
}

// Generate unique ID
const generateId = () => `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Bounded so a long-running dashboard can't grow the dismissed set forever.
const MAX_DISMISSED_IDS = 500

// Fields a polled refresh can legitimately change. Compared explicitly so an
// unchanged alert keeps its object identity across polls.
const SYNCED_ALERT_FIELDS: Array<keyof Alert> = [
  'severity',
  'title',
  'description',
  'timestamp',
  'measurement',
  'value',
  'threshold',
  'siteId',
  'assetId',
]

function alertsEqual(a: Alert, b: Alert): boolean {
  return SYNCED_ALERT_FIELDS.every(field => a[field] === b[field])
}

// Create the alert store
export const useAlertStore = create<AlertStore>((set, get) => ({
  // Initial state
  activeAlerts: [],
  alertHistory: [],
  alertRules: [],
  dismissedAlertIds: [],
  selectedSeverity: 'all',
  selectedSite: 'all',
  selectedModule: 'all',

  // Alert management
  addAlert: (alert) => set((state) => {
    // Check if alert already exists
    const existingIndex = state.activeAlerts.findIndex(a => a.id === alert.id)

    if (existingIndex !== -1) {
      // Update existing alert
      const updatedAlerts = [...state.activeAlerts]
      updatedAlerts[existingIndex] = alert
      return { activeAlerts: updatedAlerts }
    } else {
      // Add new alert
      return { activeAlerts: [alert, ...state.activeAlerts] }
    }
  }),

  // Merge a polled snapshot into local state rather than replacing it.
  // A wholesale replace every 2s reverted acknowledgements within one poll and
  // resurrected alerts the operator had already dismissed.
  syncActiveAlerts: (alerts) => set((state) => {
    const dismissed = new Set(state.dismissedAlertIds)
    const existingById = new Map(state.activeAlerts.map(alert => [alert.id, alert]))

    const merged: Alert[] = []
    for (const incoming of alerts) {
      if (dismissed.has(incoming.id)) continue

      const existing = existingById.get(incoming.id)
      if (!existing) {
        merged.push(incoming)
        continue
      }

      // Operator-owned fields survive the refresh; everything else follows
      // the source. Reusing `existing` when nothing changed keeps referential
      // equality so memoized alert rows don't re-render on every poll.
      const next: Alert = {
        ...incoming,
        acknowledgedBy: existing.acknowledgedBy,
        acknowledgedByName: existing.acknowledgedByName,
        acknowledgedAt: existing.acknowledgedAt,
        resolved: existing.resolved,
        resolvedAt: existing.resolvedAt,
        resolvedBy: existing.resolvedBy,
      }

      merged.push(alertsEqual(existing, next) ? existing : next)
    }

    // Nothing changed: return the same array so subscribers stay quiet.
    if (
      merged.length === state.activeAlerts.length &&
      merged.every((alert, index) => alert === state.activeAlerts[index])
    ) {
      return state
    }

    return { activeAlerts: merged }
  }),

  acknowledgeAlert: (alertId, userId, userName) => set((state) => ({
    activeAlerts: state.activeAlerts.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            acknowledgedBy: userId,
            acknowledgedByName: userName,
            acknowledgedAt: new Date().toISOString()
          }
        : alert
    )
  })),

  acknowledgeMultipleAlerts: (alertIds, userId, userName) => set((state) => ({
    activeAlerts: state.activeAlerts.map(alert =>
      alertIds.includes(alert.id)
        ? {
            ...alert,
            acknowledgedBy: userId,
            acknowledgedByName: userName,
            acknowledgedAt: new Date().toISOString()
          }
        : alert
    )
  })),

  dismissAlert: (alertId) => set((state) => {
    const alert = state.activeAlerts.find(a => a.id === alertId)
    if (!alert) return state

    return {
      activeAlerts: state.activeAlerts.filter(a => a.id !== alertId),
      // Remembered so the next poll doesn't resurrect it, and appended once
      // rather than on every poll that still reports the alert.
      dismissedAlertIds: [alertId, ...state.dismissedAlertIds].slice(0, MAX_DISMISSED_IDS),
      alertHistory: [alert, ...state.alertHistory]
    }
  }),

  dismissMultipleAlerts: (alertIds) => set((state) => {
    const dismissedAlerts = state.activeAlerts.filter(a => alertIds.includes(a.id))
    if (dismissedAlerts.length === 0) return state

    return {
      activeAlerts: state.activeAlerts.filter(a => !alertIds.includes(a.id)),
      dismissedAlertIds: [
        ...dismissedAlerts.map(a => a.id),
        ...state.dismissedAlertIds,
      ].slice(0, MAX_DISMISSED_IDS),
      alertHistory: [...dismissedAlerts, ...state.alertHistory]
    }
  }),

  resolveAlert: (alertId, userId) => set((state) => {
    const alert = state.activeAlerts.find(a => a.id === alertId)
    if (!alert) return state

    const resolvedAlert = {
      ...alert,
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId
    }

    return {
      activeAlerts: state.activeAlerts.filter(a => a.id !== alertId),
      // Same reason as dismiss: the source still reports the underlying bad
      // quality, so without this the next poll re-adds the resolved alert.
      dismissedAlertIds: [alertId, ...state.dismissedAlertIds].slice(0, MAX_DISMISSED_IDS),
      alertHistory: [resolvedAlert, ...state.alertHistory]
    }
  }),

  clearHistory: () => set({ alertHistory: [] }),

  // Alert rule management
  addAlertRule: (rule) => set((state) => ({
    alertRules: [
      ...state.alertRules,
      {
        ...rule,
        id: generateId(),
        createdAt: new Date().toISOString()
      }
    ]
  })),

  updateAlertRule: (ruleId, updates) => set((state) => ({
    alertRules: state.alertRules.map(rule =>
      rule.id === ruleId
        ? {
            ...rule,
            ...updates,
            updatedAt: new Date().toISOString()
          }
        : rule
    )
  })),

  deleteAlertRule: (ruleId) => set((state) => ({
    alertRules: state.alertRules.filter(rule => rule.id !== ruleId)
  })),

  toggleAlertRule: (ruleId, enabled) => set((state) => ({
    alertRules: state.alertRules.map(rule =>
      rule.id === ruleId
        ? { ...rule, enabled, updatedAt: new Date().toISOString() }
        : rule
    )
  })),

  // Filter management
  setSelectedSeverity: (severity) => set({ selectedSeverity: severity }),
  setSelectedSite: (siteId) => set({ selectedSite: siteId }),
  setSelectedModule: (moduleId) => set({ selectedModule: moduleId }),
  resetFilters: () => set({
    selectedSeverity: 'all',
    selectedSite: 'all',
    selectedModule: 'all'
  }),

  // Getters
  getAlertsBySeverity: (severity) => {
    return get().activeAlerts.filter(alert => alert.severity === severity)
  },

  getAlertsBySite: (siteId) => {
    return get().activeAlerts.filter(alert => alert.siteId === siteId)
  },

  getUnacknowledgedAlerts: () => {
    return get().activeAlerts.filter(alert => !alert.acknowledgedBy)
  },

  getActiveAlertsCount: () => {
    return get().activeAlerts.length
  },

  getCriticalAlertsCount: () => {
    return get().activeAlerts.filter(alert => alert.severity === 'critical').length
  },

  getFilteredAlerts: () => {
    const { activeAlerts, selectedSeverity, selectedSite, selectedModule } = get()

    return activeAlerts.filter(alert => {
      const severityMatch = selectedSeverity === 'all' || alert.severity === selectedSeverity
      const siteMatch = selectedSite === 'all' || alert.siteId === selectedSite
      const moduleMatch = selectedModule === 'all' || alert.moduleId === selectedModule

      return severityMatch && siteMatch && moduleMatch
    })
  },

  getAlertRulesBySite: (siteId) => {
    return get().alertRules.filter(rule => rule.siteId === siteId)
  }
}))

// Mock data for development
export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    siteId: 'clear_creek',
    siteName: 'Clear Creek Water Treatment Plant',
    severity: 'critical',
    title: 'High Turbidity Detected',
    description: 'Raw water turbidity exceeded threshold of 5 NTU. Current value: 8.2 NTU',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    resolved: false,
    measurement: 'turbidity',
    value: 8.2,
    threshold: 5
  },
  {
    id: 'alert-2',
    siteId: 'riverside',
    siteName: 'Riverside Treatment Facility',
    moduleId: 'mod-chlorine',
    moduleName: 'Chlorine Injection',
    severity: 'warning',
    title: 'Low Chlorine Residual',
    description: 'Chlorine residual below target range. Current: 0.3 mg/L, Target: 0.5-1.0 mg/L',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    resolved: false,
    measurement: 'chlorine_residual',
    value: 0.3,
    threshold: 0.5
  },
  {
    id: 'alert-3',
    siteId: 'clear_creek',
    siteName: 'Clear Creek Water Treatment Plant',
    severity: 'info',
    title: 'Routine Maintenance Due',
    description: 'Filter backwash cycle recommended based on pressure differential',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resolved: false
  },
  {
    id: 'alert-4',
    siteId: 'clear_creek',
    siteName: 'Clear Creek Water Treatment Plant',
    severity: 'warning',
    title: 'Pump Vibration High',
    description: 'Abnormal vibration detected on Pump #2. Recommend inspection.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    acknowledgedBy: 'user-123',
    acknowledgedByName: 'John Smith',
    acknowledgedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    resolved: false
  }
]

export const mockAlertRules: AlertRule[] = [
  {
    id: 'rule-1',
    name: 'High Turbidity Alert',
    description: 'Trigger critical alert when raw water turbidity exceeds safe operating limits',
    siteId: 'clear_creek',
    siteName: 'Clear Creek Water Treatment Plant',
    assetId: 'raw-water-intake',
    assetName: 'Raw Water Intake',
    measurement: 'turbidity',
    condition: 'above',
    threshold: 5,
    severity: 'critical',
    notificationChannels: ['email', 'sms', 'push'],
    enabled: true,
    createdBy: 'admin',
    createdAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'rule-2',
    name: 'Low Chlorine Warning',
    description: 'Alert when chlorine residual drops below minimum threshold',
    siteId: 'riverside',
    siteName: 'Riverside Treatment Facility',
    assetId: 'treated-water',
    assetName: 'Treated Water',
    measurement: 'chlorine_residual',
    condition: 'below',
    threshold: 0.5,
    severity: 'warning',
    notificationChannels: ['email', 'push'],
    enabled: true,
    createdBy: 'admin',
    createdAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'rule-3',
    name: 'pH Out of Range',
    description: 'Alert when pH is outside acceptable range for drinking water',
    siteId: 'clear_creek',
    siteName: 'Clear Creek Water Treatment Plant',
    assetId: 'treated-water',
    assetName: 'Treated Water',
    measurement: 'pH',
    condition: 'between',
    threshold: [6.5, 8.5],
    severity: 'warning',
    notificationChannels: ['email'],
    enabled: true,
    createdBy: 'admin',
    createdAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'rule-4',
    name: 'Critical Chlorine High',
    description: 'Alert when chlorine exceeds maximum safe limit',
    siteId: 'clear_creek',
    siteName: 'Clear Creek Water Treatment Plant',
    assetId: 'treated-water',
    assetName: 'Treated Water',
    measurement: 'chlorine_residual',
    condition: 'above',
    threshold: 4.0,
    severity: 'critical',
    notificationChannels: ['email', 'sms', 'push'],
    enabled: true,
    createdBy: 'admin',
    createdAt: '2025-01-15T10:00:00Z'
  }
]
