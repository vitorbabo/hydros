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
  CheckCircle, 
  Info,
  Factory,
  Cog
} from 'lucide-react'

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

  const getModuleIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      intake: '🌊',
      pump: '⚡',
      chemical_treatment: '🧪',
      chemical_dosing: '💧',
      sedimentation: '⭕',
      filtration: '🔍',
      disinfection: '🛡️',
      storage: '🏛️'
    }
    return iconMap[type] || '⚙️'
  }

  if (!template) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-900">{moduleId}</h4>
              <p className="text-sm text-red-600">Template not found: {moduleData.template_id}</p>
            </div>
          </div>
          <button
            onClick={() => onRemove(moduleId)}
            className="text-red-600 hover:text-red-800 p-1 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{getModuleIcon(template.type)}</div>
            <div>
              <h4 className="font-medium text-gray-900">{template.description || moduleId}</h4>
              <p className="text-sm text-gray-600 capitalize">
                {template.type.replace('_', ' ')} • Position: ({moduleData.position.x}, {moduleData.position.y})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 hover:text-gray-800 p-1 rounded"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">X</label>
                  <input
                    type="number"
                    value={moduleData.position.x}
                    onChange={(e) => onUpdate(moduleId, { 
                      position: { ...moduleData.position, x: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Y</label>
                  <input
                    type="number"
                    value={moduleData.position.y}
                    onChange={(e) => onUpdate(moduleId, { 
                      position: { ...moduleData.position, y: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Parameters */}
            {template.required_sensors && template.required_sensors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Sensors</label>
                <div className="space-y-2">
                  {template.required_sensors.map(sensor => (
                    <div key={sensor}>
                      <label className="block text-xs text-gray-500 mb-1">{sensor}</label>
                      <input
                        type="text"
                        value={localParameters[sensor] || ''}
                        onChange={(e) => handleParameterChange(sensor, e.target.value)}
                        placeholder={`Configure ${sensor}`}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Sensors */}
            {template.optional_sensors && template.optional_sensors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Optional Sensors</label>
                <div className="space-y-2">
                  {template.optional_sensors.map(sensor => (
                    <div key={sensor}>
                      <label className="block text-xs text-gray-500 mb-1">{sensor} (optional)</label>
                      <input
                        type="text"
                        value={localParameters[sensor] || ''}
                        onChange={(e) => handleParameterChange(sensor, e.target.value)}
                        placeholder={`Configure ${sensor}`}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Info */}
            <div className="bg-gray-50 p-3 rounded text-xs">
              <div className="font-medium text-gray-700 mb-1">Template Information</div>
              <div className="space-y-1 text-gray-600">
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

export function PlantConfiguration() {
  const {
    plantConfigurations,
    moduleTemplates,
    currentSiteId,
    setCurrentSite,
    setPlantConfiguration,
    updatePlantConfiguration,
    getCurrentPlantConfig,
    setConfigurationMode,
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
  
  const [selectedSiteId, setSelectedSiteId] = useState(currentSiteId || Object.keys(plantConfigurations)[0] || 'wtp-porto-01')
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
    setCurrentSite(selectedSiteId)
  }, [selectedSiteId, setCurrentSite])

  const currentPlantConfig = plantConfigurations[selectedSiteId]
  const availableTemplates = Object.keys(moduleTemplates).length
  const currentModules = currentPlantConfig ? Object.keys(currentPlantConfig.modules).length : 0

  const handleModuleUpdate = useCallback((moduleId: string, updates: any) => {
    if (updates.position) {
      updateModulePosition(selectedSiteId, moduleId, updates.position)
    }
    if (updates.parameters) {
      updateModuleParameters(selectedSiteId, moduleId, updates.parameters)
    }
  }, [selectedSiteId, updateModulePosition, updateModuleParameters])

  const handleModuleRemove = useCallback((moduleId: string) => {
    removeModuleFromPlant(selectedSiteId, moduleId)
  }, [selectedSiteId, removeModuleFromPlant])

  const handleSaveConfiguration = useCallback(async () => {
    setIsSaving(true)
    try {
      // TODO: Implement actual save to backend via MQTT
      console.log('Saving configuration for site:', selectedSiteId, currentPlantConfig)
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setUnsavedChanges(false)
      console.log('Configuration saved successfully')
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setIsSaving(false)
    }
  }, [selectedSiteId, currentPlantConfig, setUnsavedChanges])

  const handleRefreshConfiguration = useCallback(() => {
    // TODO: Request fresh configuration from backend
    console.log('Refreshing configuration for site:', selectedSiteId)
  }, [selectedSiteId])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Factory className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Plant Configuration</h1>
              <p className="text-sm text-gray-600">Manage plant modules and parameters</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(plantConfigurations).map(([siteId, config]) => (
                <option key={siteId} value={siteId}>
                  {config.name || `${siteId}`}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleRefreshConfiguration}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            
            <button
              onClick={handleSaveConfiguration}
              disabled={!unsavedChanges || isSaving}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                unsavedChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                availableTemplates > 0 ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {availableTemplates} template{availableTemplates !== 1 ? 's' : ''} available
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Cog className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {currentModules} module{currentModules !== 1 ? 's' : ''} configured
              </span>
            </div>
            
            {unsavedChanges && (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Unsaved changes</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading configuration...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-3" />
              <p className="font-medium">Configuration Error</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && availableTemplates === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-3" />
              <p className="font-medium">No Module Templates Available</p>
              <p className="text-sm mt-1">Check MQTT connection for template data</p>
            </div>
          </div>
        )}

        {!isLoading && !error && availableTemplates > 0 && (
          <div className="h-full overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Plant Overview */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Plant Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{currentModules}</div>
                    <div className="text-sm text-blue-800">Configured Modules</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{availableTemplates}</div>
                    <div className="text-sm text-green-800">Available Templates</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentPlantConfig?.layout.width || 2000}×{currentPlantConfig?.layout.height || 1200}
                    </div>
                    <div className="text-sm text-purple-800">Layout Size</div>
                  </div>
                </div>
              </div>

              {/* Configured Modules */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Configured Modules</h3>
                  <button
                    onClick={() => {
                      // TODO: Add new module functionality
                      console.log('Add new module clicked')
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Module
                  </button>
                </div>

                {currentPlantConfig && Object.keys(currentPlantConfig.modules).length > 0 ? (
                  <div className="overflow-y-auto max-h-96 space-y-4 pr-2">
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
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏗️</div>
                    <p className="font-medium">No modules configured</p>
                    <p className="text-sm mt-1">Add modules to start building your plant layout</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}