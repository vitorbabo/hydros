/**
 * Selectors for telemetryStore.
 *
 * These selectors optimize telemetry data access and prevent
 * unnecessary re-renders when only specific observations are needed.
 *
 * Usage:
 *   const observation = useObservation('site-01.tank.level')
 *   const assetObservations = useAssetObservations('raw_intake')
 */
import { useTelemetryStore } from '../telemetryStore'
import type { Observation } from '../../types/schemas'

// ============================================================================
// Observation Selectors
// ============================================================================

/**
 * Get a specific observation by sensor key
 */
export const useObservation = (sensorKey: string) =>
  useTelemetryStore((state) => state.latest[sensorKey])

/**
 * Get all observations for an asset
 */
export const useAssetObservations = (assetId: string) =>
  useTelemetryStore((state) => state.getLatestByAsset(assetId))

/**
 * Get observation value only (not the full observation object)
 */
export const useObservationValue = (sensorKey: string) =>
  useTelemetryStore((state) => state.latest[sensorKey]?.value)

/**
 * Get observation with timestamp
 */
export const useObservationWithTime = (sensorKey: string) =>
  useTelemetryStore((state) => {
    const obs = state.latest[sensorKey]
    return obs ? { value: obs.value, ts: obs.ts, quality: obs.quality } : null
  })

// ============================================================================
// Time Series Selectors
// ============================================================================

/**
 * Get time series data for a sensor
 */
export const useTimeSeries = (sensorKey: string) =>
  useTelemetryStore((state) => state.getTimeSeriesData(sensorKey))

/**
 * Get last N time series points
 */
export const useRecentTimeSeries = (sensorKey: string, count: number = 10) =>
  useTelemetryStore((state) => {
    const series = state.getTimeSeriesData(sensorKey)
    return series.slice(-count)
  })

// ============================================================================
// Asset Discovery Selectors
// ============================================================================

/**
 * Get available assets
 */
export const useAvailableAssets = () =>
  useTelemetryStore((state) => state.availableAssets)

/**
 * Get available measurements
 */
export const useAvailableMeasurements = () =>
  useTelemetryStore((state) => state.availableMeasurements)

/**
 * Get asset groups
 */
export const useAssetGroups = () =>
  useTelemetryStore((state) => state.assetGroups)

/**
 * Get assets for a specific group
 */
export const useAssetGroup = (groupName: string) =>
  useTelemetryStore((state) => state.assetGroups[groupName] || [])

// ============================================================================
// UI State Selectors
// ============================================================================

/**
 * Get selected asset group
 */
export const useSelectedAssetGroup = () =>
  useTelemetryStore((state) => state.selectedAssetGroup)

/**
 * Get selected sensor
 */
export const useSelectedSensor = () =>
  useTelemetryStore((state) => state.selectedSensor)

// ============================================================================
// Combined Selectors
// ============================================================================

/**
 * Get asset status (based on observations quality)
 */
export const useAssetStatus = (assetId: string) =>
  useTelemetryStore((state) => {
    const observations = state.getLatestByAsset(assetId)
    const values = Object.values(observations)

    if (values.length === 0) return 'offline'

    const hasBad = values.some(obs => obs.quality === 'bad')
    const hasUncertain = values.some(obs => obs.quality === 'uncertain')

    if (hasBad) return 'alarm'
    if (hasUncertain) return 'warning'
    return 'normal'
  })

/**
 * Get observations for a specific measurement type across all assets
 */
export const useMeasurementObservations = (measurement: string) =>
  useTelemetryStore((state) => {
    const result: Record<string, Observation> = {}

    Object.entries(state.latest).forEach(([key, obs]) => {
      if (obs.measurement === measurement) {
        result[key] = obs
      }
    })

    return result
  })

/**
 * Get asset metrics summary
 */
export const useAssetMetrics = (assetId: string) =>
  useTelemetryStore((state) => {
    const observations = state.getLatestByAsset(assetId)
    const values = Object.values(observations)

    return {
      totalObservations: values.length,
      goodQuality: values.filter(o => o.quality === 'good').length,
      uncertainQuality: values.filter(o => o.quality === 'uncertain').length,
      badQuality: values.filter(o => o.quality === 'bad').length,
      measurements: [...new Set(values.map(o => o.measurement))],
    }
  })

/**
 * Get all observations (use sparingly - subscribes to entire store)
 */
export const useAllObservations = () =>
  useTelemetryStore((state) => state.latest)

/**
 * Get observation count
 */
export const useObservationCount = () =>
  useTelemetryStore((state) => Object.keys(state.latest).length)
