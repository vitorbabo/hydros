/**
 * Selectors for alertStore.
 *
 * Optimized selectors for alert management and filtering.
 */
import { useAlertStore, type Alert, type AlertRule, type AlertSeverity } from '../alertStore'

// ============================================================================
// Alert Selectors
// ============================================================================

/**
 * Get all active alerts
 */
export const useActiveAlerts = () =>
  useAlertStore((state) => state.activeAlerts)

/**
 * Get alert history
 */
export const useAlertHistory = () =>
  useAlertStore((state) => state.alertHistory)

/**
 * Get a specific alert by ID
 */
export const useAlert = (alertId: string) =>
  useAlertStore((state) =>
    state.activeAlerts.find(a => a.id === alertId) ||
    state.alertHistory.find(a => a.id === alertId)
  )

/**
 * Get alerts for a specific site
 */
export const useSiteAlerts = (siteId: string) =>
  useAlertStore((state) => state.activeAlerts.filter(a => a.siteId === siteId))

/**
 * Get alerts by severity
 */
export const useAlertsBySeverity = (severity: AlertSeverity) =>
  useAlertStore((state) => state.activeAlerts.filter(a => a.severity === severity))

/**
 * Get unacknowledged alerts
 */
export const useUnacknowledgedAlerts = () =>
  useAlertStore((state) => state.activeAlerts.filter(a => !a.acknowledgedAt && !a.resolved))

// ============================================================================
// Alert Rules Selectors
// ============================================================================

/**
 * Get all alert rules
 */
export const useAlertRules = () =>
  useAlertStore((state) => state.alertRules)

/**
 * Get enabled alert rules
 */
export const useEnabledAlertRules = () =>
  useAlertStore((state) => state.alertRules.filter(r => r.enabled))

/**
 * Get alert rules for a site
 */
export const useSiteAlertRules = (siteId: string) =>
  useAlertStore((state) => state.alertRules.filter(r => r.siteId === siteId))

/**
 * Get a specific alert rule by ID
 */
export const useAlertRule = (ruleId: string) =>
  useAlertStore((state) => state.alertRules.find(r => r.id === ruleId))

// ============================================================================
// Filter Selectors
// ============================================================================

/**
 * Get selected severity filter
 */
export const useSelectedSeverity = () =>
  useAlertStore((state) => state.selectedSeverity)

/**
 * Get selected site filter
 */
export const useSelectedAlertSite = () =>
  useAlertStore((state) => state.selectedSite)

/**
 * Get filtered alerts (applying current filters)
 */
export const useFilteredAlerts = () =>
  useAlertStore((state) => {
    let alerts = state.activeAlerts

    if (state.selectedSeverity !== 'all') {
      alerts = alerts.filter(a => a.severity === state.selectedSeverity)
    }

    if (state.selectedSite !== 'all') {
      alerts = alerts.filter(a => a.siteId === state.selectedSite)
    }

    return alerts
  })

// ============================================================================
// Statistics Selectors
// ============================================================================

/**
 * Get alert counts by severity
 */
export const useAlertCountsBySeverity = () =>
  useAlertStore((state) => {
    const alerts = state.activeAlerts
    return {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
    }
  })

/**
 * Get total active alert count
 */
export const useActiveAlertCount = () =>
  useAlertStore((state) => state.activeAlerts.filter(a => !a.resolved).length)

/**
 * Get unacknowledged alert count
 */
export const useUnacknowledgedAlertCount = () =>
  useAlertStore((state) => state.activeAlerts.filter(a => !a.acknowledgedAt && !a.resolved).length)

/**
 * Get alert statistics
 */
export const useAlertStatistics = () =>
  useAlertStore((state) => {
    const active = state.activeAlerts
    const history = state.alertHistory

    return {
      totalActive: active.filter(a => !a.resolved).length,
      unacknowledged: active.filter(a => !a.acknowledgedAt && !a.resolved).length,
      acknowledged: active.filter(a => !!a.acknowledgedAt && !a.resolved).length,
      totalHistory: history.length,
      resolved: history.filter(a => a.resolved).length,
      criticalCount: active.filter(a => a.severity === 'critical').length,
    }
  })
