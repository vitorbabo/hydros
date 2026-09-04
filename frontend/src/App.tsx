import React, { Suspense, useCallback, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth, RequireRole } from './components/auth'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { LoadingFallback } from './components/shared/LoadingFallback'
import {
  // Core views (loaded immediately)
  Login,
  Dashboard,
  // Lazy-loaded views
  Sites,
  SiteDetail,
  SiteLayout,
  AlertsDashboard,
  AlertHistory,
  AlertConfiguration,
  ReportsDashboard,
  ReportBuilder,
  ReportTemplates,
  AnalyticsDashboard,
  CrossSiteComparison,
  EfficiencyMetrics,
  TrendAnalysis,
  Settings,
  UserManagement,
  RoleManagement,
  SiteAccessControl,
  AuditLogs,
} from './routes/LazyRoutes'
import { useDashboardStore } from './store/dashboardStore'
import { useTelemetryStore } from './store/telemetryStore'
import { useConfigurationStore } from './store/configurationStore'
import { useThemeStore } from './store/themeStore'
import { useAlertStore } from './store/alertStore'
import { useAuthStore } from './store/authStore'
import { useMqtt, type ConfigurationMessage, type Observation } from './hooks/useMqtt'

const DEFAULT_POLL_INTERVAL_MS = 2000
const MIN_POLL_INTERVAL_MS = 250
const POLL_LOOKBACK_SECONDS = 180
const POLL_OBSERVATION_LIMIT = 600

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
  const runtimeEnv = (import.meta as any).env || {}
  const apiBaseUrl = runtimeEnv.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'
  const telemetrySource = runtimeEnv.VITE_TELEMETRY_SOURCE || 'influx'
  const alertsSource = runtimeEnv.VITE_ALERTS_SOURCE || 'influx'
  // Guard against a non-numeric env value: NaN would turn setInterval into a
  // tight loop that hammers the API as fast as the browser will schedule it.
  const configuredPollInterval = Number(runtimeEnv.VITE_INFLUX_POLL_INTERVAL_MS)
  const pollingIntervalMs =
    Number.isFinite(configuredPollInterval) && configuredPollInterval >= MIN_POLL_INTERVAL_MS
      ? configuredPollInterval
      : DEFAULT_POLL_INTERVAL_MS

  const useInfluxTelemetry = telemetrySource === 'influx'
  const useInfluxAlerts = alertsSource === 'influx'

  const { setCurrentSite, updateLastUpdate, setConnectionStatus, setConnectionError, setSites } = useDashboardStore()
  const { addObservation, addObservations, clearOldData } = useTelemetryStore()
  const { updatePlantConfiguration, setModuleTemplates } = useConfigurationStore()
  const { addAlert, syncActiveAlerts } = useAlertStore()
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
    
    if (config.config_type === 'plant') {
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
    } else if (config.config_type === 'templates' || config.config_type === 'modules') {
      // Update module templates
      const templates = config.data as Record<string, any>
      setModuleTemplates(templates)
    }
  }, [updatePlantConfiguration, setModuleTemplates, setCurrentSite, updateLastUpdate, setConnectionStatus, setConnectionError, setSites])

  // Handle MQTT alert messages
  const handleMqttAlert = useCallback((topic: string, message: string) => {
    if (useInfluxAlerts) {
      return
    }

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
  }, [useInfluxAlerts, addAlert, updateLastUpdate, setConnectionStatus, setConnectionError])

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

    if (observation && !useInfluxTelemetry) {
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
  }, [useInfluxTelemetry, setCurrentSite, updateLastUpdate, setConnectionStatus, setConnectionError, addObservation, handleMqttAlert])

  // Clean up old telemetry data periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      clearOldData()
    }, 60000) // Clean up every minute

    return () => clearInterval(cleanupInterval)
  }, [clearOldData])

  // Poll Influx for telemetry and alerts (PoC migration path away from MQTT).
  useEffect(() => {
    if (!useInfluxTelemetry && !useInfluxAlerts) {
      return
    }

    let isCancelled = false
    // A poll slower than the interval must not stack another on top of it;
    // without this, a degraded backend gets an ever-growing pile of requests.
    let inFlight = false
    const controller = new AbortController()

    const pollInflux = async () => {
      if (inFlight) return
      inFlight = true

      try {
        const currentSite = useDashboardStore.getState().currentSite
        const params = new URLSearchParams({
          lookback_seconds: String(POLL_LOOKBACK_SECONDS),
          limit: String(POLL_OBSERVATION_LIMIT),
        })
        if (currentSite) {
          params.set('site_id', currentSite)
        }

        // One /snapshot call serves both streams off a single Influx query.
        // Hitting /telemetry/latest and /alerts/active separately cost three.
        const response = await fetch(`${apiBaseUrl}/api/influx/snapshot?${params}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Snapshot request failed (${response.status})`)
        }

        const payload = await response.json()

        if (isCancelled) return

        if (useInfluxTelemetry) {
          const observations: Observation[] = Array.isArray(payload?.observations)
            ? payload.observations
            : []

          // Batched: one store write and one index rebuild for the whole poll.
          addObservations(observations)

          if (!useDashboardStore.getState().currentSite) {
            const firstSiteId = observations.find(o => o.site_id)?.site_id
            if (firstSiteId) {
              setCurrentSite(firstSiteId)
            }
          }
        }

        if (useInfluxAlerts) {
          syncActiveAlerts(Array.isArray(payload?.alerts) ? payload.alerts : [])
        }

        updateLastUpdate()
        setConnectionStatus('connected')
        setConnectionError(null)
      } catch (error) {
        if (isCancelled || (error instanceof DOMException && error.name === 'AbortError')) {
          return
        }
        console.error('Influx polling failed:', error)
        setConnectionStatus('error')
        setConnectionError(error instanceof Error ? error.message : 'Influx polling failed')
      } finally {
        inFlight = false
      }
    }

    pollInflux()
    const interval = setInterval(pollInflux, pollingIntervalMs)

    return () => {
      isCancelled = true
      controller.abort()
      clearInterval(interval)
    }
  }, [
    useInfluxTelemetry,
    useInfluxAlerts,
    apiBaseUrl,
    pollingIntervalMs,
    addObservations,
    syncActiveAlerts,
    setCurrentSite,
    updateLastUpdate,
    setConnectionStatus,
    setConnectionError,
  ])

  // Initialize MQTT connection (config topics always; telemetry/alerts only when source is mqtt)
  const mqttTopics = [
    'wtp/+/configuration/+',
    'wtp/global/configuration/+'
  ]

  if (!useInfluxTelemetry) {
    mqttTopics.push('wtp/+/+/+/observation')
  }

  if (!useInfluxAlerts) {
    mqttTopics.push('wtp/+/alerts/+', 'wtp/+/+/alerts/+', 'wtp/global/alerts/+')
  }

  const { connected } = useMqtt({
    topics: mqttTopics,
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
      <Suspense fallback={<LoadingFallback />}>
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
            <Route path="/reports" element={<ReportsDashboard />} />
            <Route path="/reports/builder" element={<ReportBuilder />} />
            <Route path="/reports/templates" element={<ReportTemplates />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/analytics/comparison" element={<CrossSiteComparison />} />
            <Route path="/analytics/efficiency" element={<EfficiencyMetrics />} />
            <Route path="/analytics/trends" element={<TrendAnalysis />} />
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
      </Suspense>
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

