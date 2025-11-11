import React, { useCallback, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth, RequireRole } from './components/auth'
import { Login } from './views/Login'
import { Dashboard } from './views/Dashboard'
import { Sites } from './views/Sites'
import { SiteDetail } from './views/sites/SiteDetail'
import { SiteLayout } from './views/sites/SiteLayout'
import AlertsDashboard from './views/alerts/AlertsDashboard'
import AlertHistory from './views/alerts/AlertHistory'
import AlertConfiguration from './views/alerts/AlertConfiguration'
import { Reports } from './views/Reports'
import { Analytics } from './views/Analytics'
import { Settings } from './views/Settings'
import { UserManagement } from './views/admin/UserManagement'
import { RoleManagement } from './views/admin/RoleManagement'
import { SiteAccessControl } from './views/admin/SiteAccessControl'
import { AuditLogs } from './views/admin/AuditLogs'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { useDashboardStore } from './store/dashboardStore'
import { useTelemetryStore } from './store/telemetryStore'
import { useConfigurationStore } from './store/configurationStore'
import { useThemeStore } from './store/themeStore'
import { useAlertStore } from './store/alertStore'
import { useAuthStore } from './store/authStore'
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
  const { addAlert } = useAlertStore()
  const { theme } = useThemeStore()
  const { initializeAuth } = useAuthStore()

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

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

  // Handle MQTT alert messages
  const handleMqttAlert = useCallback((topic: string, message: string) => {
    try {
      const alertData = JSON.parse(message)

      // Parse topic to extract site_id and other info
      // Topic patterns: wtp/{site_id}/alerts/{alert_type}
      //                 wtp/{site_id}/{module_id}/alerts/{alert_type}
      //                 wtp/global/alerts/{alert_type}
      const topicParts = topic.split('/')

      let siteId = 'unknown'
      let moduleId: string | undefined

      if (topicParts[1] === 'global') {
        siteId = 'global'
      } else if (topicParts.length === 4) {
        // Site-level alert: wtp/{site_id}/alerts/{alert_type}
        siteId = topicParts[1]
      } else if (topicParts.length === 5) {
        // Module-level alert: wtp/{site_id}/{module_id}/alerts/{alert_type}
        siteId = topicParts[1]
        moduleId = topicParts[2]
      }

      // Get site name from dashboard store
      const sites = useDashboardStore.getState().sites
      const siteName = sites[siteId]?.name

      // Create alert object
      const alert = {
        id: alertData.id || `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        siteId,
        siteName,
        moduleId,
        moduleName: alertData.module_name,
        assetId: alertData.asset_id,
        assetName: alertData.asset_name,
        severity: alertData.severity || 'warning',
        title: alertData.title || 'Alert',
        description: alertData.description || '',
        timestamp: alertData.timestamp || new Date().toISOString(),
        resolved: false,
        measurement: alertData.measurement,
        value: alertData.value,
        threshold: alertData.threshold
      }

      console.log('Received alert:', alert)
      addAlert(alert)

      updateLastUpdate()
      setConnectionStatus('connected')
      setConnectionError(null)
    } catch (error) {
      console.error('Error parsing alert message:', error, message)
    }
  }, [addAlert, updateLastUpdate, setConnectionStatus, setConnectionError])

  // Handle MQTT messages
  const handleMqttMessage = useCallback((topic: string, message: string, observation?: Observation) => {
    updateLastUpdate()
    setConnectionStatus('connected')
    setConnectionError(null)

    // Check if this is an alert topic
    if (topic.includes('/alerts/')) {
      handleMqttAlert(topic, message)
      return
    }

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
  }, [setCurrentSite, updateLastUpdate, setConnectionStatus, setConnectionError, addObservation, handleMqttAlert])

  // Clean up old telemetry data periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      clearOldData()
    }, 60000) // Clean up every minute

    return () => clearInterval(cleanupInterval)
  }, [clearOldData])

  // Initialize MQTT connection with telemetry, configuration, and alert topics
  const { connected } = useMqtt({
    topics: [
      'wtp/+/+/+/observation',        // Telemetry data
      'wtp/+/configuration/+',        // Plant configurations
      'wtp/global/configuration/+',   // Global configurations like templates
      'wtp/+/alerts/+',               // Site-level alerts
      'wtp/+/+/alerts/+',             // Module-level alerts
      'wtp/global/alerts/+'           // System-wide alerts
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
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          {/* Main navigation */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/sites/:siteId/layout" element={<SiteLayout />} />
          <Route path="/sites/:siteId" element={<SiteDetail />} />
          <Route path="/sites/:siteId/:tab" element={<SiteDetail />} />
          <Route path="/alerts" element={<AlertsDashboard />} />
          <Route path="/alerts/history" element={<AlertHistory />} />
          <Route path="/alerts/configuration" element={<AlertConfiguration />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />

          {/* Admin routes - Only accessible by admin */}
          <Route
            path="/admin"
            element={
              <RequireRole roles={['admin']}>
                <Navigate to="/admin/users" replace />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole roles={['admin']}>
                <UserManagement />
              </RequireRole>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <RequireRole roles={['admin']}>
                <RoleManagement />
              </RequireRole>
            }
          />
          <Route
            path="/admin/access"
            element={
              <RequireRole roles={['admin']}>
                <SiteAccessControl />
              </RequireRole>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <RequireRole roles={['admin']}>
                <AuditLogs />
              </RequireRole>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
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

