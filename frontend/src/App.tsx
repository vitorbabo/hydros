import React, { useCallback, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './views/Dashboard'
import { Sites } from './views/Sites'
import { SiteDetail } from './views/sites/SiteDetail'
import { SiteLayoutFullscreen } from './views/sites/SiteLayoutFullscreen'
import { Alerts } from './views/Alerts'
import { Reports } from './views/Reports'
import { Analytics } from './views/Analytics'
import { Settings } from './views/Settings'
import { Admin } from './views/Admin'
import PlantLayout from './views/PlantLayout'
import { PlantConfiguration } from './views/PlantConfiguration'
import { Telemetry } from './views/Telemetry'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { useDashboardStore } from './store/dashboardStore'
import { useTelemetryStore } from './store/telemetryStore'
import { useConfigurationStore } from './store/configurationStore'
import { useThemeStore } from './store/themeStore'
import { useMqtt, type ConfigurationMessage } from './hooks/useMqtt'
import type { Observation } from './types'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
})

function AppContent() {
  const { setCurrentSite, updateLastUpdate, setConnectionStatus, setConnectionError, setSites } = useDashboardStore()
  const { addObservation, clearOldData } = useTelemetryStore()
  const { updatePlantConfiguration, setModuleTemplates } = useConfigurationStore()
  const { theme } = useThemeStore()

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Handle MQTT configuration messages
  const handleMqttConfiguration = useCallback((topic: string, config: ConfigurationMessage) => {
    console.log('Received configuration:', { topic, config })
    
    updateLastUpdate()
    setConnectionStatus('connected')
    setConnectionError(null)
    
    if (config.type === 'plant') {
      // Transform MQTT plant data to configuration store format
      const plantData = config.data as any
      
      const plantConfig = {
        site_id: config.site_id,
        name: plantData.site_info?.name || config.site_id,
        site_info: plantData.site_info,
        modules: Array.isArray(plantData.modules) 
          ? plantData.modules.reduce((acc: any, moduleId: string) => {
              acc[moduleId] = {
                template_id: moduleId,
                position: { x: 0, y: 0 },
                parameters: {},
                connections: []
              }
              return acc
            }, {})
          : plantData.modules || {},
        layout: {
          width: 800,
          height: 600
        },
        operational_parameters: plantData.operational_parameters,
        protocol_clients: plantData.protocol_clients,
        control_strategies: plantData.control_strategies,
        alarm_definitions: plantData.alarm_definitions,
        mqtt_config: plantData.mqtt_config,
        last_updated: config.timestamp
      }
      
      // Update plant configuration
      updatePlantConfiguration(config.site_id, plantConfig)

      // Also update dashboardStore.sites for the Sites page
      const currentSites = useDashboardStore.getState().sites
      const siteInfo = plantData.site_info || {}
      setSites({
        ...currentSites,
        [config.site_id]: {
          id: config.site_id,
          name: siteInfo.name || plantConfig.name || config.site_id,
          design_capacity: siteInfo.design_capacity || 0,
          treatment_train: siteInfo.treatment_train || 'unknown',
          modules: Array.isArray(plantData.modules) ? plantData.modules : Object.keys(plantData.modules || {}),
          operational_parameters: plantData.operational_parameters,
          protocol_clients: plantData.protocol_clients,
          status: 'connected',
          location: siteInfo.location,
          last_seen: config.timestamp,
        }
      })

      // Set current site if not already set
      if (!useDashboardStore.getState().currentSite) {
        setCurrentSite(config.site_id)
      }
    } else if (config.type === 'templates' || config.type === 'modules') {
      // Update module templates
      const templates = config.data as Record<string, any>
      setModuleTemplates(templates)
    }
  }, [updatePlantConfiguration, setModuleTemplates, setCurrentSite, updateLastUpdate, setConnectionStatus, setConnectionError, setSites])

  // Handle MQTT messages
  const handleMqttMessage = useCallback((topic: string, message: string, observation?: Observation) => {
    updateLastUpdate()
    setConnectionStatus('connected')
    setConnectionError(null)
    
    if (observation) {
      //console.log('Received observation:', observation)
      
      // Add observation to telemetry store
      addObservation(observation)
      
      // Set current site if not already set
      if (observation.site_id && !useDashboardStore.getState().currentSite) {
        setCurrentSite(observation.site_id)
      }
    } else {
      console.log('Received message on topic:', topic, message)
    }
  }, [setCurrentSite, updateLastUpdate, setConnectionStatus, setConnectionError, addObservation])

  // Clean up old telemetry data periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      clearOldData()
    }, 60000) // Clean up every minute

    return () => clearInterval(cleanupInterval)
  }, [clearOldData])

  // Initialize MQTT connection with both telemetry and configuration topics
  const { connected } = useMqtt({
    topics: [
      'wtp/+/+/+/observation',        // Telemetry data
      'wtp/+/configuration/+',        // Plant configurations
      'wtp/global/configuration/+'    // Global configurations like templates
    ],
    onMessage: handleMqttMessage,
    onConfiguration: handleMqttConfiguration,
  })

  // Update connection status based on MQTT state
  useEffect(() => {
    if (connected) {
      setConnectionStatus('connected')
    } else {
      setConnectionStatus('connecting')
    }
  }, [connected, setConnectionStatus])

  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          {/* New navigation structure */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/sites/:siteId/layout" element={<SiteLayoutFullscreen />} />
          <Route path="/sites/:siteId" element={<SiteDetail />} />
          <Route path="/sites/:siteId/:tab" element={<SiteDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />

          {/* Legacy routes (backward compatibility) */}
          <Route path="/layout" element={
            <div className="h-full">
              <PlantLayout />
            </div>
          } />
          <Route path="/configuration" element={
            <div className="max-w-7xl mx-auto p-6 h-full">
              <PlantConfiguration />
            </div>
          } />
          <Route path="/telemetry" element={
            <div className="max-w-7xl mx-auto p-6 h-full">
              <Telemetry />
            </div>
          } />
        </Route>
      </Routes>
    </Router>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

