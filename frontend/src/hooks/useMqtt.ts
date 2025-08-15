import { useEffect, useRef, useCallback } from 'react'
import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import type { Observation, PlantConfig, ModuleTemplate } from '../types'

export interface ConfigurationMessage {
  type: 'plant' | 'modules' | 'templates' | 'parameters'
  site_id: string
  timestamp: string
  data: PlantConfig | Record<string, any> | Record<string, ModuleTemplate>
}

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
          const siteId = topicParts[1]
          const configType = topicParts[3] // plant, modules, or templates
          
          const backendMessage = JSON.parse(message)
          console.log('MQTT parsing config message:', { topic, configType, backendMessage })
          
          const configMessage: ConfigurationMessage = {
            type: configType as 'plant' | 'modules' | 'templates' | 'parameters',
            site_id: siteId,
            timestamp: backendMessage.timestamp || new Date().toISOString(),
            data: backendMessage.data || backendMessage // Use backend's data field, fallback to entire message
          }
          
          onConfiguration?.(topic, configMessage)
        } catch (parseError) {
          console.warn('Failed to parse configuration:', parseError)
        }
      }
      // Parse observation if it's a telemetry topic
      else if (topic.startsWith('wtp/') && topic.endsWith('/observation')) {
        try {
          const observation: Observation = JSON.parse(message)
          onMessage?.(topic, message, observation)
        } catch (parseError) {
          console.warn('Failed to parse observation:', parseError)
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