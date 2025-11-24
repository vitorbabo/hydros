/**
 * Selectors for dashboardStore.
 *
 * These selectors prevent unnecessary re-renders by allowing components
 * to subscribe only to the specific pieces of state they need.
 *
 * Usage:
 *   const sites = useSites()
 *   const alarms = useAlarms()
 *
 * Instead of:
 *   const { sites, alarms } = useDashboardStore() // Re-renders on ANY change
 */
import { useDashboardStore } from '../dashboardStore'
import type { Site, Alarm, ProtocolClient } from '../../types'

// ============================================================================
// Site Selectors
// ============================================================================

/**
 * Get all sites
 */
export const useSites = () =>
  useDashboardStore((state) => state.sites)

/**
 * Get a specific site by ID
 */
export const useSite = (siteId: string) =>
  useDashboardStore((state) => state.sites.find(s => s.id === siteId))

/**
 * Get current site
 */
export const useCurrentSite = () =>
  useDashboardStore((state) => state.currentSite)

/**
 * Get site count
 */
export const useSiteCount = () =>
  useDashboardStore((state) => state.sites.length)

// ============================================================================
// Alarm Selectors
// ============================================================================

/**
 * Get all alarms
 */
export const useAlarms = () =>
  useDashboardStore((state) => state.alarms)

/**
 * Get active alarms only
 */
export const useActiveAlarms = () =>
  useDashboardStore((state) => state.alarms.filter(a => a.status === 'active'))

/**
 * Get alarms for a specific site
 */
export const useSiteAlarms = (siteId: string) =>
  useDashboardStore((state) => state.alarms.filter(a => a.siteId === siteId))

/**
 * Get critical alarms
 */
export const useCriticalAlarms = () =>
  useDashboardStore((state) => state.alarms.filter(a => a.severity === 'critical'))

/**
 * Get alarm count
 */
export const useAlarmCount = () =>
  useDashboardStore((state) => state.alarms.length)

/**
 * Get active alarm count
 */
export const useActiveAlarmCount = () =>
  useDashboardStore((state) => state.alarms.filter(a => a.status === 'active').length)

// ============================================================================
// Connection Selectors
// ============================================================================

/**
 * Get connection status
 */
export const useConnectionStatus = () =>
  useDashboardStore((state) => state.connectionStatus)

/**
 * Check if connected
 */
export const useIsConnected = () =>
  useDashboardStore((state) => state.connectionStatus === 'connected')

/**
 * Get connection error
 */
export const useConnectionError = () =>
  useDashboardStore((state) => state.connectionError)

/**
 * Get last update timestamp
 */
export const useLastUpdate = () =>
  useDashboardStore((state) => state.lastUpdate)

// ============================================================================
// Combined Selectors (for common patterns)
// ============================================================================

/**
 * Get dashboard summary data
 */
export const useDashboardSummary = () =>
  useDashboardStore((state) => ({
    siteCount: state.sites.length,
    alarmCount: state.alarms.length,
    activeAlarmCount: state.alarms.filter(a => a.status === 'active').length,
    criticalAlarmCount: state.alarms.filter(a => a.severity === 'critical' && a.status === 'active').length,
    connectionStatus: state.connectionStatus,
  }))

/**
 * Get site with its alarms
 */
export const useSiteWithAlarms = (siteId: string) =>
  useDashboardStore((state) => ({
    site: state.sites.find(s => s.id === siteId),
    alarms: state.alarms.filter(a => a.siteId === siteId),
  }))
