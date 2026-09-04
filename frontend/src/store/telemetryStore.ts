import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Observation } from '../types/schemas'

interface TelemetryData {
  latest: Record<string, Observation>
  timeSeries: Record<string, Array<{ ts: number; value: number; quality: string }>>
}

interface TelemetryStore extends TelemetryData {
  // Derived data
  availableAssets: string[]
  availableMeasurements: string[]
  assetGroups: Record<string, string[]>

  // Actions
  addObservation: (observation: Observation) => void
  addObservations: (observations: Observation[]) => void
  getLatestByAsset: (assetId: string) => Record<string, Observation>
  getTimeSeriesData: (sensorKey: string) => Array<{ ts: number; value: number; quality: string }>
  clearOldData: () => void
  cleanup: () => void

  // UI state
  selectedAssetGroup: string
  selectedSensor: string | null
  setSelectedAssetGroup: (group: string) => void
  setSelectedSensor: (sensor: string | null) => void
}

const MAX_TIME_SERIES_POINTS = 100

// Must comfortably exceed the slowest publisher interval, or slow signals are
// purged right before their next value lands and the tile flickers empty.
// AGGREGATION_PUBLISH_INTERVAL defaults to 300s, so 5 minutes was exactly on
// the boundary; VITE_MAX_OBSERVATION_AGE_MS lets a deployment retune it.
const MAX_OBSERVATION_AGE_MS =
  Number((import.meta as any).env?.VITE_MAX_OBSERVATION_AGE_MS) || 15 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 1000 // Run cleanup every minute

export const useTelemetryStore = create<TelemetryStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    latest: {},
    timeSeries: {},
    availableAssets: [],
    availableMeasurements: [],
    assetGroups: {},
    selectedAssetGroup: 'all',
    selectedSensor: null,

    // Actions
    addObservation: (observation) => set((state) => applyObservations(state, [observation])),

    // Batch entry point for polled snapshots. Applying a 600-observation poll
    // one at a time meant 600 store writes and 600 O(n) re-derivations of the
    // asset/measurement/group indexes; this collapses it to one of each.
    addObservations: (observations) =>
      set((state) => applyObservations(state, observations)),

    getLatestByAsset: (assetId) => {
      const state = get()
      const result: Record<string, Observation> = {}
      
      Object.entries(state.latest).forEach(([key, observation]) => {
        if (observation.asset_id === assetId) {
          result[key] = observation
        }
      })
      
      return result
    },

    getTimeSeriesData: (sensorKey) => {
      return get().timeSeries[sensorKey] || []
    },

    clearOldData: () => set((state) => {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago

      const filteredTimeSeries: Record<string, Array<{ ts: number; value: number; quality: string }>> = {}

      Object.entries(state.timeSeries).forEach(([key, series]) => {
        filteredTimeSeries[key] = series.filter(point => point.ts > cutoffTime)
      })

      return {
        ...state,
        timeSeries: filteredTimeSeries
      }
    }),

    cleanup: () => set((state) => {
      const now = Date.now()
      const cutoffTime = now - MAX_OBSERVATION_AGE_MS

      // Remove stale observations from latest
      const freshLatest: Record<string, Observation> = {}
      Object.entries(state.latest).forEach(([key, observation]) => {
        const observationTime = new Date(observation.ts).getTime()
        if (observationTime > cutoffTime) {
          freshLatest[key] = observation
        }
      })

      // Remove stale time series data
      const freshTimeSeries: Record<string, Array<{ ts: number; value: number; quality: string }>> = {}
      Object.entries(state.timeSeries).forEach(([key, series]) => {
        const freshSeries = series.filter(point => point.ts > cutoffTime)
        // Only keep time series if there's recent data
        if (freshSeries.length > 0) {
          freshTimeSeries[key] = freshSeries
        }
      })

      // Recalculate derived data with fresh observations
      const allObservations = Object.values(freshLatest)
      const assets = [...new Set(allObservations.map(obs => obs.asset_id))].sort()
      const measurements = [...new Set(allObservations.map(obs => obs.measurement))].sort()
      const groups = groupAssetsByType(allObservations)

      return {
        latest: freshLatest,
        timeSeries: freshTimeSeries,
        availableAssets: assets,
        availableMeasurements: measurements,
        assetGroups: groups,
      }
    }),

    // UI state actions
    setSelectedAssetGroup: (group) => set({ selectedAssetGroup: group, selectedSensor: null }),
    setSelectedSensor: (sensor) => set({ selectedSensor: sensor }),
  }))
)

type TimeSeriesPoint = { ts: number; value: number; quality: string }

// Shared reducer for single and batch observation ingestion. Returns the
// original state object when nothing changed so zustand skips the notify.
function applyObservations(
  state: TelemetryData & Pick<TelemetryStore, 'availableAssets' | 'availableMeasurements' | 'assetGroups'>,
  observations: Observation[]
): Partial<TelemetryStore> | typeof state {
  let newLatest: Record<string, Observation> | null = null
  let updatedTimeSeries: Record<string, TimeSeriesPoint[]> | null = null

  for (const observation of observations) {
    const sensorKey = `${observation.asset_id}.${observation.sensor_id}`
    const existingLatest = (newLatest ?? state.latest)[sensorKey]

    // Skip duplicate points to reduce unnecessary re-renders. Polling re-reads
    // the same `last()` rows until the next write lands, so most of a poll's
    // observations are duplicates.
    if (
      existingLatest &&
      existingLatest.ts === observation.ts &&
      existingLatest.value === observation.value &&
      existingLatest.quality === observation.quality
    ) {
      continue
    }

    newLatest = newLatest ?? { ...state.latest }
    updatedTimeSeries = updatedTimeSeries ?? { ...state.timeSeries }

    newLatest[sensorKey] = observation

    const newTimePoint: TimeSeriesPoint = {
      ts: new Date(observation.ts).getTime(),
      value: observation.value,
      quality: observation.quality,
    }

    updatedTimeSeries[sensorKey] = appendTimeSeriesPoint(
      updatedTimeSeries[sensorKey] || state.timeSeries[sensorKey] || [],
      newTimePoint
    )
  }

  if (!newLatest || !updatedTimeSeries) {
    return state
  }

  // Derived indexes are recomputed once for the whole batch, not per observation.
  const allObservations = Object.values(newLatest)

  return {
    latest: newLatest,
    timeSeries: updatedTimeSeries,
    availableAssets: [...new Set(allObservations.map(obs => obs.asset_id))].sort(),
    availableMeasurements: [...new Set(allObservations.map(obs => obs.measurement))].sort(),
    assetGroups: groupAssetsByType(allObservations),
  }
}

// Points arrive in ascending order almost always, so append-then-fix is O(1)
// in the common case instead of re-sorting the whole window on every insert.
function appendTimeSeriesPoint(
  series: TimeSeriesPoint[],
  point: TimeSeriesPoint
): TimeSeriesPoint[] {
  const next =
    series.length === 0 || point.ts >= series[series.length - 1].ts
      ? [...series, point]
      : [...series, point].sort((a, b) => a.ts - b.ts)

  return next.length > MAX_TIME_SERIES_POINTS
    ? next.slice(-MAX_TIME_SERIES_POINTS)
    : next
}

// Helper function to group assets by type based on naming patterns and measurements
function groupAssetsByType(observations: Observation[]): Record<string, string[]> {
  const assetsByType: Record<string, Set<string>> = {
    'intake': new Set(),
    'pumps': new Set(),
    'treatment': new Set(),
    'chemical': new Set(),
    'filtration': new Set(),
    'disinfection': new Set(),
    'storage': new Set(),
    'all': new Set(),
  }

  observations.forEach(obs => {
    const assetId = obs.asset_id
    assetsByType.all.add(assetId)

    // Group by asset naming patterns
    if (assetId.includes('intake')) {
      assetsByType.intake.add(assetId)
    } else if (assetId.includes('pump')) {
      assetsByType.pumps.add(assetId)
    } else if (assetId.includes('coagul') || assetId.includes('clarif') || assetId.includes('sediment')) {
      assetsByType.treatment.add(assetId)
    } else if (assetId.includes('dosing') || assetId.includes('chemical')) {
      assetsByType.chemical.add(assetId)
    } else if (assetId.includes('filter')) {
      assetsByType.filtration.add(assetId)
    } else if (assetId.includes('chlorin') || assetId.includes('uv') || assetId.includes('disinfect')) {
      assetsByType.disinfection.add(assetId)
    } else if (assetId.includes('tank') || assetId.includes('storage') || assetId.includes('reservoir')) {
      assetsByType.storage.add(assetId)
    } else {
      // Default grouping for unknown assets
      assetsByType.treatment.add(assetId)
    }
  })

  // Convert Sets to sorted arrays
  const result: Record<string, string[]> = {}
  Object.entries(assetsByType).forEach(([group, assetSet]) => {
    result[group] = Array.from(assetSet).sort()
  })

  return result
}

// Periodic cleanup keeps `latest` from growing without bound as sensors come
// and go. The handle is exported so tests (and HMR) can stop it -- an
// unreferenced module-level setInterval kept vitest workers alive.
let cleanupTimer: ReturnType<typeof setInterval> | null = null

export function startTelemetryCleanup(): void {
  if (cleanupTimer !== null) return
  cleanupTimer = setInterval(() => {
    useTelemetryStore.getState().cleanup()
  }, CLEANUP_INTERVAL_MS)
}

export function stopTelemetryCleanup(): void {
  if (cleanupTimer === null) return
  clearInterval(cleanupTimer)
  cleanupTimer = null
}

if (typeof window !== 'undefined' && !import.meta.env?.VITEST) {
  startTelemetryCleanup()

  if (import.meta.hot) {
    import.meta.hot.dispose(stopTelemetryCleanup)
  }
}
