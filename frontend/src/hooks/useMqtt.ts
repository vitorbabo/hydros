import { useEffect, useRef, useCallback } from 'react'
import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import {
  safeValidateObservation,
  safeValidateConfigurationMessage,
  type Observation,
  type ConfigurationMessage
} from '../types/schemas'

// Re-export types for consumers
export type { ConfigurationMessage, Observation }

interface UseMqttOptions {
  topics?: string[]
  onMessage?: (topic: string, message: string, observation?: Observation) => void
  onConfiguration?: (topic: string, config: ConfigurationMessage) => void
  reconnectPeriod?: number
  keepalive?: number
}

export function useMqtt({
  topics = [
    'wtp/+/+/+/observation', 
    'wtp/+/configuration/+',
    'wtp/global/configuration/+',
  ],
  onMessage,
  onConfiguration,
  reconnectPeriod = 2000,
  keepalive = 60
}: UseMqttOptions = {}) {
  const clientRef = useRef<MqttClient | null>(null)
  const lastMessageRef = useRef<Record<string, number>>({})
  
  // Get WebSocket URL
  const wsUrl = (() => {
    const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname
    const port = import.meta.env.VITE_MQTT_PORT || '9001'
    const url = `ws://${host}:${port}`
    return url
  })()

  const handleMessage = useCallback((topic: string, payload: Buffer) => {
    try {
      const message = payload.toString()
      
      // Track message frequency for health monitoring
      const now = Date.now()
      lastMessageRef.current[topic] = now
      
      // Parse configuration if it's a configuration topic
      if (topic.includes('/configuration/')) {
        try {
          const topicParts = topic.split('/')
          if (topicParts.length < 4) {
            console.warn('Invalid configuration topic format:', topic)
            return
          }

          const siteId = topicParts[1]
          const configType = topicParts[3] // plant, modules, templates, or parameters

          const backendMessage = JSON.parse(message)
          console.log('MQTT parsing config message:', { topic, configType, backendMessage })

          // Prepare configuration message for validation
          const configMessage = {
            site_id: siteId,
            config_type: configType,
            timestamp: backendMessage.timestamp || new Date().toISOString(),
            data: backendMessage.data || backendMessage,
            source: backendMessage.source,
            seq: backendMessage.seq,
            version: backendMessage.version
          }

          // Validate configuration message
          const validationResult = safeValidateConfigurationMessage(configMessage)

          if (validationResult.success && validationResult.data) {
            // Valid configuration - pass to handler
            onConfiguration?.(topic, validationResult.data)
          } else {
            // Invalid configuration - log errors but still try to process
            console.error('Invalid configuration message received:', {
              topic,
              errors: validationResult.error?.errors,
              rawMessage: backendMessage
            })
            // Still try to call handler with unvalidated data (for backwards compatibility)
            onConfiguration?.(topic, configMessage as ConfigurationMessage)
          }
        } catch (parseError) {
          console.warn('Failed to parse configuration:', parseError)
        }
      }
      // Parse observation if it's a telemetry topic
      else if (topic.startsWith('wtp/') && topic.endsWith('/observation')) {
        try {
          const rawData = JSON.parse(message)
          const validationResult = safeValidateObservation(rawData)

          if (validationResult.success && validationResult.data) {
            // Valid observation - pass to handler
            onMessage?.(topic, message, validationResult.data)
          } else {
            // Invalid observation - log error details
            console.error('Invalid observation received:', {
              topic,
              errors: validationResult.error?.errors,
              rawData
            })
            // Still call onMessage but without parsed observation
            onMessage?.(topic, message)
          }
        } catch (parseError) {
          console.warn('Failed to parse observation JSON:', parseError)
          onMessage?.(topic, message)
        }
      } else {
        onMessage?.(topic, message)
      }
    } catch (error) {
      console.error('Error handling MQTT message:', error)
    }
  }, [onMessage, onConfiguration])

  // Initialize connection
  useEffect(() => {
    if (clientRef.current?.connected) {
      return
    }

    console.log('Connecting to MQTT broker at', wsUrl)

    const client = mqtt.connect(wsUrl, {
      keepalive,
      reconnectPeriod,
      connectTimeout: 10000,
      clientId: `hydros-dashboard-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      resubscribe: false
    })

    client.on('connect', () => {
      console.log('MQTT Connected to', wsUrl)
      
      // Subscribe to topics
      topics.forEach(topic => {
        client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            console.error(`Failed to subscribe to ${topic}:`, err)
          } else {
            console.log(`Subscribed to ${topic}`)
          }
        })
      })
    })

    client.on('message', handleMessage)

    client.on('reconnect', () => {
      console.log('MQTT Reconnecting...')
    })

    client.on('error', (error) => {
      console.error('MQTT Connection error:', error)
    })

    client.on('close', () => {
      console.log('MQTT Connection closed')
    })

    client.on('offline', () => {
      console.log('MQTT Client offline')
    })

    clientRef.current = client

    return () => {
      console.log('Cleaning up MQTT connection')
      if (clientRef.current) {
        clientRef.current.end(true)
        clientRef.current = null
      }
    }
  }, [wsUrl, keepalive, reconnectPeriod, handleMessage]) // Stable dependencies only

  return {
    connected: clientRef.current?.connected ?? false,
    client: clientRef.current
  }
}