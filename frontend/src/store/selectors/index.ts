/**
 * Store selectors index.
 *
 * Import selectors from here for better performance and cleaner code.
 *
 * Example usage:
 *   import { useSites, useAlarms, useObservation } from '@/store/selectors'
 *
 * Benefits:
 *   - Components only re-render when their specific data changes
 *   - Cleaner, more readable component code
 *   - Better performance with large state objects
 *   - Easier to test and maintain
 *
 * Writing a new selector:
 *   Zustand compares the selector's result with Object.is. A selector that
 *   builds a fresh array or object each call -- .filter(), .map(), .slice(),
 *   an object literal, a `|| []` fallback -- therefore looks changed on every
 *   store write and re-renders its consumers, which is the opposite of what
 *   these are for. Wrap those in `useShallow`:
 *
 *     export const useSiteAlerts = (siteId: string) =>
 *       useAlertStore(useShallow((state) =>
 *         state.activeAlerts.filter(a => a.siteId === siteId)))
 *
 *   Selectors returning a primitive or an existing state reference (a field,
 *   a .length, a .find()) need no wrapper.
 */

// Dashboard selectors
export * from './dashboardSelectors'

// Telemetry selectors
export * from './telemetrySelectors'

// Alert selectors
export * from './alertSelectors'

// Configuration selectors
export * from './configurationSelectors'

/**
 * Usage Examples:
 *
 * // Before (re-renders on ANY dashboard state change):
 * const { sites, alarms } = useDashboardStore()
 *
 * // After (only re-renders when sites or alarms change):
 * import { useSites, useAlarms } from '@/store/selectors'
 * const sites = useSites()
 * const alarms = useAlarms()
 *
 * // Get specific data:
 * const site = useSite('wtp-porto-01')
 * const observation = useObservation('site.asset.level')
 * const criticalAlerts = useCriticalAlarms()
 *
 * // Combined selectors for common patterns:
 * const summary = useDashboardSummary()
 * const metrics = useAssetMetrics('raw_intake')
 * const alertStats = useAlertStatistics()
 */
