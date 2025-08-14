import React, { useCallback, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigation } from './components/layout/Navigation'
import { SystemOverview } from './views/SystemOverview'
import { PlantLayout } from './views/PlantLayout'
import { Telemetry } from './views/Telemetry'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { useDashboardStore } from './store/dashboardStore'
import { useTelemetryStore } from './store/telemetryStore'
import { useMqtt } from './hooks/useMqtt'
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
  const { setCurrentSite, updateLastUpdate, setConnectionStatus, setConnectionError } = useDashboardStore()
  const { addObservation, clearOldData } = useTelemetryStore()

  // Handle MQTT messages
  const handleMqttMessage = useCallback((topic: string, message: string, observation?: Observation) => {
    updateLastUpdate()
    setConnectionStatus('connected')
    setConnectionError(null)
    
    if (observation) {
      console.log('Received observation:', observation)
      
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

  // Initialize MQTT connection
  const { connected } = useMqtt({
    topics: ['wtp/+/+/+/observation', 'plc/raw'],
    onMessage: handleMqttMessage,
  })

  // Update connection status based on MQTT state
  useEffect(() => {
    if (connected) {
      setConnectionStatus('connected')
    } else {
      setConnectionStatus('connecting')
    }
  }, [connected, setConnectionStatus])

  // Initialize mock site data
  useEffect(() => {
    // In a real implementation, this would load from configuration or API
    useDashboardStore.getState().setSites({
      'wtp-porto-01': {
        id: 'wtp-porto-01',
        name: 'Porto Municipal WTP',
        design_capacity: 50000,
        treatment_train: 'conventional',
        modules: ['raw_intake', 'intake_pump_1', 'coagulation_tank', 'clarifier_1', 'filter_bed_1', 'chlorination', 'finished_water_tank'],
        parameters: {
          normal_flow_rate: 35.0,
          raw_water_quality: {
            turbidity_range: [2.0, 15.0],
            ph_range: [7.2, 8.1],
            temperature_range: [12.0, 20.0]
          }
        },
        protocol_servers: [
          {
            protocol: 'modbus_tcp',
            enabled: true,
            host: '0.0.0.0',
            port: 5020
          }
        ],
        status: 'connected'
      },
      'wtp-regional-02': {
        id: 'wtp-regional-02',
        name: 'Regional WTP North',
        design_capacity: 200000,
        treatment_train: 'advanced',
        modules: ['raw_intake', 'intake_pump_1', 'intake_pump_2', 'coagulation_tank', 'clarifier_1', 'clarifier_2', 'filter_bed_1', 'filter_bed_2', 'chlorination', 'finished_water_tank'],
        parameters: {
          normal_flow_rate: 140.0,
          raw_water_quality: {
            turbidity_range: [1.0, 25.0],
            ph_range: [6.8, 8.3],
            temperature_range: [8.0, 24.0]
          }
        },
        protocol_servers: [
          {
            protocol: 'modbus_tcp',
            enabled: true,
            host: '0.0.0.0',
            port: 5020
          }
        ],
        status: 'maintenance'
      }
    })

    // Set default current site
    if (!useDashboardStore.getState().currentSite) {
      setCurrentSite('wtp-porto-01')
    }
  }, [setCurrentSite])

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<SystemOverview />} />
            <Route path="/layout" element={<PlantLayout />} />
            <Route path="/telemetry" element={<Telemetry />} />
          </Routes>
        </main>
      </div>
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

