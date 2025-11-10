import React, { useState, useEffect, useCallback } from 'react'
import { useConfigurationStore } from '../store/configurationStore'
import { useMqtt, type ConfigurationMessage } from '../hooks/useMqtt'
import type { ModuleTemplate } from '../types'
import {
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  AlertCircle,
  Construction
} from 'lucide-react'
import { getIconByType } from '../utils/moduleIcons'

interface PlantConfigurationProps {
  siteId: string
}

interface ModuleInstanceProps {
  moduleId: string
  moduleData: {
    template_id: string
    position: { x: number; y: number }
    parameters: Record<string, any>
    connections: string[]
  }
  template: ModuleTemplate | null
  onUpdate: (moduleId: string, updates: any) => void
  onRemove: (moduleId: string) => void
}

const ModuleInstance: React.FC<ModuleInstanceProps> = ({
  moduleId,
  moduleData,
  template,
  onUpdate,
  onRemove
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localParameters, setLocalParameters] = useState(moduleData.parameters)

  // Sync local state when props change
  useEffect(() => {
    setLocalParameters(moduleData.parameters)
  }, [moduleData.parameters])

  const handleParameterChange = (paramKey: string, value: any) => {
    const updatedParameters = {
      ...localParameters,
      [paramKey]: value
    }
    setLocalParameters(updatedParameters)
    onUpdate(moduleId, { parameters: updatedParameters })
  }

  // Get icon component for the module type
  const ModuleIconComponent = getIconByType(template?.type || 'other')

  if (!template) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-300">{moduleId}</h4>
              <p className="text-sm text-red-600 dark:text-red-400">Template not found: {moduleData.template_id}</p>
            </div>
          </div>
          <button
            onClick={() => onRemove(moduleId)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ModuleIconComponent className="w-6 h-6 text-primary" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{template.description || moduleId}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {template.type.replace('_', ' ')} • Position: ({moduleData.position.x}, {moduleData.position.y})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(moduleId)}
              className="text-red-600 hover:text-red-800 p-1 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Position Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">X</label>
                  <input
                    type="number"
                    value={moduleData.position.x}
                    onChange={(e) => onUpdate(moduleId, {
                      position: { ...moduleData.position, x: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Y</label>
                  <input
                    type="number"
                    value={moduleData.position.y}
                    onChange={(e) => onUpdate(moduleId, {
                      position: { ...moduleData.position, y: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Parameters */}
            {template.required_sensors && template.required_sensors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Required Sensors</label>
                <div className="space-y-2">
                  {template.required_sensors.map(sensor => (
                    <div key={sensor}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{sensor}</label>
                      <input
                        type="text"
                        value={localParameters[sensor] || ''}
                        onChange={(e) => handleParameterChange(sensor, e.target.value)}
                        placeholder={`Configure ${sensor}`}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Sensors */}
            {template.optional_sensors && template.optional_sensors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Optional Sensors</label>
                <div className="space-y-2">
                  {template.optional_sensors.map(sensor => (
                    <div key={sensor}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{sensor} (optional)</label>
                      <input
                        type="text"
                        value={localParameters[sensor] || ''}
                        onChange={(e) => handleParameterChange(sensor, e.target.value)}
                        placeholder={`Configure ${sensor}`}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Info */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded text-xs border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Template Information</div>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <div>Type: {template.type}</div>
                {template.actuators && template.actuators.length > 0 && (
                  <div>Actuators: {template.actuators.join(', ')}</div>
                )}
                {template.alarms && template.alarms.length > 0 && (
                  <div>Alarms: {template.alarms.join(', ')}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function PlantConfiguration({ siteId }: PlantConfigurationProps) {
  const {
    plantConfigurations,
    moduleTemplates,
    setCurrentSite,
    setUnsavedChanges,
    unsavedChanges,
    isLoading,
    error,
    requestTemplates,
    handleConfigurationMessage,
    updateModulePosition,
    updateModuleParameters,
    removeModuleFromPlant
  } = useConfigurationStore()

  const [isSaving, setIsSaving] = useState(false)

  // Handle MQTT configuration messages
  const handleConfigMessage = useCallback((topic: string, config: ConfigurationMessage) => {
    console.log('Plant Configuration - Received config message:', topic, config)
    handleConfigurationMessage(config)
  }, [handleConfigurationMessage])

  // Setup MQTT connection
  useMqtt({
    topics: ['wtp/+/configuration/+'],
    onConfiguration: handleConfigMessage
  })

  // Set current site when component mounts
  useEffect(() => {
    setCurrentSite(siteId)
  }, [siteId, setCurrentSite])

  const currentPlantConfig = plantConfigurations[siteId]
  const availableTemplates = Object.keys(moduleTemplates).length
  const currentModules = currentPlantConfig ? Object.keys(currentPlantConfig.modules).length : 0

  const handleModuleUpdate = useCallback((moduleId: string, updates: any) => {
    if (updates.position) {
      updateModulePosition(siteId, moduleId, updates.position)
    }
    if (updates.parameters) {
      updateModuleParameters(siteId, moduleId, updates.parameters)
    }
  }, [siteId, updateModulePosition, updateModuleParameters])

  const handleModuleRemove = useCallback((moduleId: string) => {
    removeModuleFromPlant(siteId, moduleId)
  }, [siteId, removeModuleFromPlant])

  const handleSaveConfiguration = useCallback(async () => {
    setIsSaving(true)
    try {
      // TODO: Implement actual save to backend via MQTT
      console.log('Saving configuration for site:', siteId, currentPlantConfig)

      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      setUnsavedChanges(false)
      console.log('Configuration saved successfully')
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setIsSaving(false)
    }
  }, [siteId, currentPlantConfig, setUnsavedChanges])

  const handleRefreshConfiguration = useCallback(() => {
    // TODO: Request fresh configuration from backend
    console.log('Refreshing configuration for site:', siteId)
    requestTemplates()
  }, [siteId, requestTemplates])

  return (
    <div className="p-6 space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {unsavedChanges && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Unsaved changes</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshConfiguration}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            onClick={handleSaveConfiguration}
            disabled={!unsavedChanges || isSaving}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              unsavedChanges
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading configuration...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-3" />
              <p className="font-medium">Configuration Error</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && availableTemplates === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-3" />
              <p className="font-medium">No Module Templates Available</p>
              <p className="text-sm mt-1">Waiting for MQTT configuration data...</p>
            </div>
          </div>
        )}

        {!isLoading && !error && availableTemplates > 0 && (
          <div className="space-y-6">
            {/* Plant Overview */}
            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Plant Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border border-primary/20">
                  <div className="text-2xl font-bold text-primary">{currentModules}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">Configured Modules</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{availableTemplates}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">Available Templates</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {currentPlantConfig?.layout.width || 2000}×{currentPlantConfig?.layout.height || 1200}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">Layout Size (px)</div>
                </div>
                <div className={`rounded-lg p-4 border ${
                  availableTemplates > 0 && currentModules > 0
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      availableTemplates > 0 && currentModules > 0 ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {availableTemplates > 0 && currentModules > 0 ? 'Ready' : 'Incomplete'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Configuration Status</div>
                </div>
              </div>
            </div>

            {/* Configured Modules */}
            <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configured Modules</h3>
                <button
                  onClick={() => {
                    // TODO: Add new module functionality
                    console.log('Add new module clicked')
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Module
                </button>
              </div>

              {currentPlantConfig && Object.keys(currentPlantConfig.modules).length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {Object.entries(currentPlantConfig.modules).map(([moduleId, moduleData]) => (
                    <ModuleInstance
                      key={moduleId}
                      moduleId={moduleId}
                      moduleData={moduleData}
                      template={moduleTemplates[moduleData.template_id] || null}
                      onUpdate={handleModuleUpdate}
                      onRemove={handleModuleRemove}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Construction className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                  <p className="font-medium">No modules configured</p>
                  <p className="text-sm mt-1">Add modules to start building your plant layout</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}