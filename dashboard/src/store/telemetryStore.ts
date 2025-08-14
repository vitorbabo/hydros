import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Observation } from '../types'

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
  getLatestByAsset: (assetId: string) => Record<string, Observation>
  getTimeSeriesData: (sensorKey: string) => Array<{ ts: number; value: number; quality: string }>
  clearOldData: () => void
  
  // UI state
  selectedAssetGroup: string
  selectedSensor: string | null
  setSelectedAssetGroup: (group: string) => void
  setSelectedSensor: (sensor: string | null) => void
}

const MAX_TIME_SERIES_POINTS = 100

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
    addObservation: (observation) => set((state) => {
      const sensorKey = `${observation.asset_id}.${observation.sensor_id}`
      
      // Update latest values
      const newLatest = {
        ...state.latest,
        [sensorKey]: observation
      }

      // Update time series data
      const existingTimeSeries = state.timeSeries[sensorKey] || []
      const newTimePoint = {
        ts: new Date(observation.ts).getTime(),
        value: observation.value,
        quality: observation.quality
      }
      
      // Add new point and limit array size
      const newTimeSeries = [...existingTimeSeries, newTimePoint]
        .slice(-MAX_TIME_SERIES_POINTS)
        .sort((a, b) => a.ts - b.ts)

      const updatedTimeSeries = {
        ...state.timeSeries,
        [sensorKey]: newTimeSeries
      }

      // Derive available assets and measurements
      const allObservations = Object.values(newLatest)
      const assets = [...new Set(allObservations.map(obs => obs.asset_id))].sort()
      const measurements = [...new Set(allObservations.map(obs => obs.measurement))].sort()

      // Group assets by type for better organization
      const groups = groupAssetsByType(allObservations)

      return {
        latest: newLatest,
        timeSeries: updatedTimeSeries,
        availableAssets: assets,
        availableMeasurements: measurements,
        assetGroups: groups,
      }
    }),

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

    // UI state actions
    setSelectedAssetGroup: (group) => set({ selectedAssetGroup: group, selectedSensor: null }),
    setSelectedSensor: (sensor) => set({ selectedSensor: sensor }),
  }))
)

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