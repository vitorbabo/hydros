import { create } from 'zustand'
import { DashboardState, AlarmState, SystemMetrics, ConnectionStatus, PlantSite } from '../types'

interface DashboardStore extends DashboardState {
  // State setters
  setCurrentSite: (siteId: string) => void
  setSelectedModule: (moduleId: string | null) => void
  setViewMode: (mode: 'overview' | 'layout' | 'telemetry') => void
  setSystemMetrics: (metrics: SystemMetrics) => void
  updateLastUpdate: () => void
  
  // Alarm management
  addAlarm: (alarm: AlarmState) => void
  acknowledgeAlarm: (alarmId: string, acknowledgedBy: string) => void
  clearAlarm: (alarmId: string) => void
  
  // Site management
  sites: Record<string, PlantSite>
  setSites: (sites: Record<string, PlantSite>) => void
  updateSiteStatus: (siteId: string, status: ConnectionStatus) => void
  
  // Connection status
  connectionStatus: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void
  connectionError: string | null
  setConnectionError: (error: string | null) => void
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Initial state
  currentSite: null,
  selectedModule: null,
  viewMode: 'overview',
  alarms: [],
  systemMetrics: null,
  lastUpdate: null,
  sites: {},
  connectionStatus: 'connecting',
  connectionError: null,

  // State setters
  setCurrentSite: (siteId) => set({ currentSite: siteId }),
  setSelectedModule: (moduleId) => set({ selectedModule: moduleId }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),
  updateLastUpdate: () => set({ lastUpdate: new Date().toISOString() }),

  // Alarm management
  addAlarm: (alarm) => set((state) => ({
    alarms: [...state.alarms.filter(a => a.id !== alarm.id), alarm]
  })),
  
  acknowledgeAlarm: (alarmId, acknowledgedBy) => set((state) => ({
    alarms: state.alarms.map(alarm => 
      alarm.id === alarmId 
        ? { 
            ...alarm, 
            acknowledged: true, 
            acknowledged_by: acknowledgedBy,
            acknowledged_at: new Date().toISOString()
          }
        : alarm
    )
  })),
  
  clearAlarm: (alarmId) => set((state) => ({
    alarms: state.alarms.map(alarm =>
      alarm.id === alarmId
        ? { ...alarm, status: 'cleared' as const }
        : alarm
    )
  })),

  // Site management
  setSites: (sites) => set({ sites }),
  
  updateSiteStatus: (siteId, status) => set((state) => ({
    sites: {
      ...state.sites,
      [siteId]: {
        ...state.sites[siteId],
        status,
        last_seen: new Date().toISOString()
      }
    }
  })),

  // Connection management
  setConnectionStatus: (status) => set((state) => {
    if (state.connectionStatus !== status) {
      return { connectionStatus: status }
    }
    return state
  }),
  setConnectionError: (error) => set((state) => {
    if (state.connectionError !== error) {
      return { connectionError: error }
    }
    return state
  }),
}))