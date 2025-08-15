import { useState, useCallback, useEffect } from 'react'
import { useConfigurationStore } from '../store/configurationStore'
import type { ConfigurationMessage } from './useMqtt'

interface ConfigurationVersion {
  id: string
  timestamp: string
  description: string
  siteId: string
  configuration: any
  author?: string
}

interface PersistenceState {
  isSaving: boolean
  isLoading: boolean
  lastSaved: string | null
  error: string | null
  pendingChanges: number
  versions: ConfigurationVersion[]
}

interface SaveOptions {
  description?: string
  skipValidation?: boolean
  createVersion?: boolean
}

export function useConfigurationPersistence(siteId: string) {
  const [state, setState] = useState<PersistenceState>({
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null,
    pendingChanges: 0,
    versions: []
  })

  const {
    plantConfigurations,
    moduleTemplates,
    unsavedChanges,
    setUnsavedChanges,
    getCurrentPlantConfig
  } = useConfigurationStore()

  // Track pending changes
  useEffect(() => {
    const currentConfig = plantConfigurations[siteId]
    if (currentConfig) {
      const moduleCount = Object.keys(currentConfig.modules).length
      setState(prev => ({ ...prev, pendingChanges: unsavedChanges ? moduleCount : 0 }))
    }
  }, [plantConfigurations, siteId, unsavedChanges])

  // Save configuration to backend via MQTT
  const saveConfiguration = useCallback(async (options: SaveOptions = {}) => {
    const { description = 'Configuration update', skipValidation = false, createVersion = true } = options

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const currentConfig = getCurrentPlantConfig()
      
      if (!currentConfig) {
        throw new Error('No configuration to save')
      }

      // Validate configuration if not skipped
      if (!skipValidation) {
        const validationErrors = validateConfiguration(currentConfig)
        if (validationErrors.length > 0) {
          throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`)
        }
      }

      // Create version if requested
      if (createVersion) {
        const version: ConfigurationVersion = {
          id: `v${Date.now()}`,
          timestamp: new Date().toISOString(),
          description,
          siteId,
          configuration: JSON.parse(JSON.stringify(currentConfig)), // Deep clone
          author: 'Dashboard User' // TODO: Get from user context
        }

        setState(prev => ({ 
          ...prev, 
          versions: [version, ...prev.versions.slice(0, 9)] // Keep last 10 versions
        }))
      }

      // Simulate MQTT publish to backend
      // In a real implementation, this would publish to MQTT topic like:
      // `wtp/${siteId}/configuration/plant/update`
      const publishMessage = {
        type: 'plant_update' as const,
        site_id: siteId,
        timestamp: new Date().toISOString(),
        data: {
          ...currentConfig,
          version: createVersion ? `v${Date.now()}` : undefined,
          description
        }
      }

      console.log('Publishing configuration update:', publishMessage)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
      
      // TODO: Replace with actual MQTT publish
      // await mqttClient.publish(`wtp/${siteId}/configuration/plant/update`, JSON.stringify(publishMessage))
      
      // Mark as saved
      setUnsavedChanges(false)
      setState(prev => ({ 
        ...prev, 
        lastSaved: new Date().toISOString(),
        pendingChanges: 0
      }))

      console.log('Configuration saved successfully')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration'
      setState(prev => ({ ...prev, error: errorMessage }))
      console.error('Configuration save failed:', error)
      throw error
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [siteId, getCurrentPlantConfig, setUnsavedChanges])

  // Load configuration from backend
  const loadConfiguration = useCallback(async (versionId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // TODO: Implement actual MQTT request for configuration
      // In a real implementation, this would request configuration from:
      // `wtp/${siteId}/configuration/plant/request`
      
      console.log('Requesting configuration load for site:', siteId, versionId ? `version: ${versionId}` : 'latest')
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // For now, just log the request
      console.log('Configuration load completed')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load configuration'
      setState(prev => ({ ...prev, error: errorMessage }))
      console.error('Configuration load failed:', error)
      throw error
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [siteId])

  // Validate configuration
  const validateConfiguration = useCallback((config: any): string[] => {
    const errors: string[] = []

    if (!config) {
      errors.push('Configuration is empty')
      return errors
    }

    if (!config.modules || Object.keys(config.modules).length === 0) {
      errors.push('No modules configured')
      return errors
    }

    // Validate each module
    Object.entries(config.modules).forEach(([moduleId, moduleData]: [string, any]) => {
      if (!moduleData.template_id) {
        errors.push(`Module ${moduleId} is missing template ID`)
        return
      }

      const template = moduleTemplates[moduleData.template_id]
      if (!template) {
        errors.push(`Template ${moduleData.template_id} not found for module ${moduleId}`)
        return
      }

      // Check required sensors are configured
      if (template.required_sensors) {
        template.required_sensors.forEach(sensor => {
          if (!moduleData.parameters || !moduleData.parameters[sensor]) {
            errors.push(`Required sensor ${sensor} not configured for module ${moduleId}`)
          }
        })
      }

      // Validate position
      if (!moduleData.position || typeof moduleData.position.x !== 'number' || typeof moduleData.position.y !== 'number') {
        errors.push(`Invalid position for module ${moduleId}`)
      }
    })

    return errors
  }, [moduleTemplates])

  // Rollback to previous version
  const rollbackToVersion = useCallback(async (versionId: string) => {
    const version = state.versions.find(v => v.id === versionId)
    if (!version) {
      throw new Error(`Version ${versionId} not found`)
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      // TODO: Implement rollback via MQTT
      console.log('Rolling back to version:', version)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Update local state with version data
      useConfigurationStore.getState().setPlantConfiguration(siteId, version.configuration)
      
      setState(prev => ({ 
        ...prev, 
        lastSaved: new Date().toISOString(),
        pendingChanges: 0
      }))
      
      setUnsavedChanges(false)
      console.log('Rollback completed successfully')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rollback configuration'
      setState(prev => ({ ...prev, error: errorMessage }))
      console.error('Rollback failed:', error)
      throw error
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [state.versions, siteId, setUnsavedChanges])

  // Export configuration
  const exportConfiguration = useCallback(() => {
    const currentConfig = getCurrentPlantConfig()
    if (!currentConfig) {
      throw new Error('No configuration to export')
    }

    const exportData = {
      site_id: siteId,
      exported_at: new Date().toISOString(),
      configuration: currentConfig,
      templates: moduleTemplates,
      version: `export_${Date.now()}`
    }

    // Create download link
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const filename = `plant_config_${siteId}_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', filename)
    linkElement.click()
    
    console.log('Configuration exported:', filename)
  }, [siteId, getCurrentPlantConfig, moduleTemplates])

  // Import configuration
  const importConfiguration = useCallback((configData: any) => {
    return new Promise<void>((resolve, reject) => {
      try {
        if (!configData.configuration) {
          throw new Error('Invalid configuration file')
        }

        // Validate imported configuration
        const validationErrors = validateConfiguration(configData.configuration)
        if (validationErrors.length > 0) {
          throw new Error(`Imported configuration is invalid: ${validationErrors.join(', ')}`)
        }

        // Update configuration store
        useConfigurationStore.getState().setPlantConfiguration(siteId, configData.configuration)
        setUnsavedChanges(true)

        console.log('Configuration imported successfully')
        resolve()
      } catch (error) {
        console.error('Import failed:', error)
        reject(error)
      }
    })
  }, [siteId, validateConfiguration, setUnsavedChanges])

  // Auto-save functionality
  const enableAutoSave = useCallback((intervalMs: number = 30000) => {
    const autoSaveInterval = setInterval(() => {
      if (unsavedChanges && !state.isSaving) {
        console.log('Auto-saving configuration...')
        saveConfiguration({ 
          description: 'Auto-save', 
          createVersion: false 
        }).catch(error => {
          console.error('Auto-save failed:', error)
        })
      }
    }, intervalMs)

    return () => clearInterval(autoSaveInterval)
  }, [unsavedChanges, state.isSaving, saveConfiguration])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    ...state,
    hasUnsavedChanges: unsavedChanges,
    canSave: unsavedChanges && !state.isSaving,
    canLoad: !state.isLoading && !state.isSaving,
    
    // Actions
    saveConfiguration,
    loadConfiguration,
    validateConfiguration,
    rollbackToVersion,
    exportConfiguration,
    importConfiguration,
    enableAutoSave,
    clearError,
    
    // Utilities
    getValidationErrors: () => {
      const currentConfig = getCurrentPlantConfig()
      return currentConfig ? validateConfiguration(currentConfig) : []
    },
    
    getPendingChanges: () => {
      const currentConfig = getCurrentPlantConfig()
      return currentConfig ? Object.keys(currentConfig.modules) : []
    }
  }
}