import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ModuleTemplate, PlantConfig, PlantSite, ProtocolClient, ControlStrategy, AlarmDefinitions } from '../types'
import type { ConfigurationMessage } from '../hooks/useMqtt'

interface ModulePosition {
  x: number
  y: number
}

interface PlantConfiguration {
  site_id: string
  name: string
  // Enhanced site information from MQTT
  site_info?: {
    site_id: string
    name: string
    design_capacity: number
    treatment_train: string
    location?: {
      region: string
      country: string
      coordinates: [number, number]
    }
  }
  // Module layout for UI
  modules: Record<string, {
    template_id: string
    position: ModulePosition
    parameters: Record<string, any>
    connections: string[]
  }>
  layout: {
    width: number
    height: number
    background?: string
  }
  // Enhanced operational data from MQTT
  operational_parameters?: {
    normal_flow_rate: number
    design_flow_rate: number
    raw_water_quality: {
      turbidity_range: [number, number]
      ph_range: [number, number]
      temperature_range: [number, number]
    }
    treatment_targets: {
      finished_turbidity: number
      finished_ph: [number, number]
      chlorine_residual: [number, number]
    }
  }
  protocol_clients?: ProtocolClient[]
  control_strategies?: Record<string, ControlStrategy>
  alarm_definitions?: AlarmDefinitions
  mqtt_config?: {
    topic_prefix: string
    publish_interval: number
    retain_messages: boolean
    qos: number
  }
  last_updated: string
}

interface ConfigurationState {
  // Template library from backend
  moduleTemplates: Record<string, ModuleTemplate>
  templateCategories: Record<string, string[]> // category -> template_ids
  
  // Plant configurations per site
  plantConfigurations: Record<string, PlantConfiguration>
  
  // Current editing state
  currentSiteId: string | null
  isConfigurationMode: boolean
  unsavedChanges: boolean
  
  // Loading and error states
  isLoading: boolean
  error: string | null
  lastSync: string | null
}

interface ConfigurationStore extends ConfigurationState {
  // Template management
  setModuleTemplates: (templates: Record<string, ModuleTemplate>) => void
  getTemplatesByCategory: (category: string) => ModuleTemplate[]
  getTemplateById: (templateId: string) => ModuleTemplate | null
  
  // Plant configuration management
  setPlantConfiguration: (siteId: string, config: PlantConfiguration) => void
  updatePlantConfiguration: (siteId: string, updates: Partial<PlantConfiguration>) => void
  getCurrentPlantConfig: () => PlantConfiguration | null
  
  // Module instance management
  addModuleToPlant: (siteId: string, moduleId: string, templateId: string, position: ModulePosition) => void
  removeModuleFromPlant: (siteId: string, moduleId: string) => void
  updateModulePosition: (siteId: string, moduleId: string, position: ModulePosition) => void
  updateModuleParameters: (siteId: string, moduleId: string, parameters: Record<string, any>) => void
  
  // Configuration mode management
  setCurrentSite: (siteId: string | null) => void
  setConfigurationMode: (enabled: boolean) => void
  setUnsavedChanges: (hasChanges: boolean) => void
  
  // MQTT message handling
  handleConfigurationMessage: (message: ConfigurationMessage) => void
  requestTemplates: () => void
  
  // State management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetConfiguration: () => void
}

// Helper function to categorize templates
const categorizeTemplates = (templates: Record<string, ModuleTemplate>): Record<string, string[]> => {
  const categories: Record<string, string[]> = {}
  
  Object.entries(templates).forEach(([id, template]) => {
    // Ensure template has required properties
    if (!template || typeof template !== 'object') {
      console.warn(`Invalid template data for ${id}:`, template)
      return
    }
    
    const category = template.type || 'other'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(id)
  })
  
  return categories
}

// Helper function to create default plant configuration
const createDefaultPlantConfig = (siteId: string): PlantConfiguration => ({
  site_id: siteId,
  name: `${siteId}`,
  modules: {},
  layout: {
    width: 2000,
    height: 1200,
    background: 'dots'
  },
  last_updated: new Date().toISOString()
})


export const useConfigurationStore = create<ConfigurationStore>()( 
  subscribeWithSelector((set, get) => ({
    // Initial state - start with empty templates to force backend loading
    moduleTemplates: {},
    templateCategories: {},
    plantConfigurations: {},
    currentSiteId: null,
    isConfigurationMode: false,
    unsavedChanges: false,
    isLoading: true, // Start loading to indicate we're waiting for backend data
    error: null,
    lastSync: null,

    // Template management
    setModuleTemplates: (templates) => set((state) => {
      const categories = categorizeTemplates(templates)
      return {
        moduleTemplates: templates,
        templateCategories: categories,
        lastSync: new Date().toISOString(),
        error: null
      }
    }),

    getTemplatesByCategory: (category) => {
      const state = get()
      const templateIds = state.templateCategories[category] || []
      return templateIds
        .map(id => state.moduleTemplates[id])
        .filter(Boolean)
    },

    getTemplateById: (templateId) => {
      const state = get()
      return state.moduleTemplates[templateId] || null
    },

    // Plant configuration management
    setPlantConfiguration: (siteId, config) => set((state) => ({
      plantConfigurations: {
        ...state.plantConfigurations,
        [siteId]: config
      }
    })),

    updatePlantConfiguration: (siteId, updates) => set((state) => {
      const currentConfig = state.plantConfigurations[siteId] || createDefaultPlantConfig(siteId)
      return {
        plantConfigurations: {
          ...state.plantConfigurations,
          [siteId]: {
            ...currentConfig,
            ...updates,
            last_updated: new Date().toISOString()
          }
        },
        unsavedChanges: true
      }
    }),

    getCurrentPlantConfig: () => {
      const state = get()
      if (!state.currentSiteId) return null
      return state.plantConfigurations[state.currentSiteId] || null
    },

    // Module instance management
    addModuleToPlant: (siteId, moduleId, templateId, position) => set((state) => {
      const currentConfig = state.plantConfigurations[siteId] || createDefaultPlantConfig(siteId)
      const template = state.moduleTemplates[templateId]
      
      if (!template) {
        console.warn(`Template ${templateId} not found`)
        return state
      }

      // Create default parameters based on template
      const defaultParameters: Record<string, any> = {}
      template.required_sensors?.forEach(sensor => {
        defaultParameters[sensor] = null
      })

      return {
        plantConfigurations: {
          ...state.plantConfigurations,
          [siteId]: {
            ...currentConfig,
            modules: {
              ...currentConfig.modules,
              [moduleId]: {
                template_id: templateId,
                position,
                parameters: defaultParameters,
                connections: []
              }
            },
            last_updated: new Date().toISOString()
          }
        },
        unsavedChanges: true
      }
    }),

    removeModuleFromPlant: (siteId, moduleId) => set((state) => {
      const currentConfig = state.plantConfigurations[siteId]
      if (!currentConfig) return state

      const { [moduleId]: removed, ...remainingModules } = currentConfig.modules
      
      return {
        plantConfigurations: {
          ...state.plantConfigurations,
          [siteId]: {
            ...currentConfig,
            modules: remainingModules,
            last_updated: new Date().toISOString()
          }
        },
        unsavedChanges: true
      }
    }),

    updateModulePosition: (siteId, moduleId, position) => set((state) => {
      const currentConfig = state.plantConfigurations[siteId]
      if (!currentConfig || !currentConfig.modules[moduleId]) return state

      return {
        plantConfigurations: {
          ...state.plantConfigurations,
          [siteId]: {
            ...currentConfig,
            modules: {
              ...currentConfig.modules,
              [moduleId]: {
                ...currentConfig.modules[moduleId],
                position
              }
            },
            last_updated: new Date().toISOString()
          }
        },
        unsavedChanges: true
      }
    }),

    updateModuleParameters: (siteId, moduleId, parameters) => set((state) => {
      const currentConfig = state.plantConfigurations[siteId]
      if (!currentConfig || !currentConfig.modules[moduleId]) return state

      return {
        plantConfigurations: {
          ...state.plantConfigurations,
          [siteId]: {
            ...currentConfig,
            modules: {
              ...currentConfig.modules,
              [moduleId]: {
                ...currentConfig.modules[moduleId],
                parameters: {
                  ...currentConfig.modules[moduleId].parameters,
                  ...parameters
                }
              }
            },
            last_updated: new Date().toISOString()
          }
        },
        unsavedChanges: true
      }
    }),

    // Configuration mode management
    setCurrentSite: (siteId) => set({ currentSiteId: siteId }),

    setConfigurationMode: (enabled) => set({ isConfigurationMode: enabled }),

    setUnsavedChanges: (hasChanges) => set({ unsavedChanges: hasChanges }),

    // MQTT message handling
    handleConfigurationMessage: (message) => {
      const { type, site_id, data } = message
      console.log('Processing configuration message:', type, site_id, data)
      
      switch (type) {
        case 'templates':
          // Handle module templates update from wtp/global/configuration/templates
          if (typeof data === 'object' && data) {
            console.log('Processing templates message:', data)
            console.log('Data keys:', Object.keys(data))
            console.log('Has module_templates?', 'module_templates' in data)
            console.log('module_templates type:', typeof data.module_templates)
            
            // The backend sends templates in data.module_templates
            if (data.module_templates) {
              const templates = data.module_templates as Record<string, ModuleTemplate>
              console.log('Received module templates from backend:', Object.keys(templates))
              console.log('Sample template:', Object.values(templates)[0])
              
              get().setModuleTemplates(templates)
              set({ isLoading: false, error: null })
            } else {
              console.warn('Templates message missing module_templates field:', data)
              console.warn('Available fields:', Object.keys(data))
            }
          }
          break
          
        case 'plant':
          // Handle plant configuration update
          if (typeof data === 'object' && data) {
            const plantData = data as any
            console.log('Processing plant configuration:', plantData)
            
            // Check if plant data contains module templates
            if (plantData.module_templates) {
              console.log('Found module templates in plant config:', Object.keys(plantData.module_templates))
              get().setModuleTemplates(plantData.module_templates as Record<string, ModuleTemplate>)
            }
            
            // Process modules - convert array to module instances if needed
            let modules: Record<string, any> = {}
            if (plantData.modules) {
              if (Array.isArray(plantData.modules)) {
                // Backend sends modules as array, convert to module instances
                console.log('Converting module array to instances:', plantData.modules)
                plantData.modules.forEach((moduleId: string, index: number) => {
                  // Map module instance names to template names (remove numbering)
                  // e.g., "finished_water_pump_1" -> "finished_water_pump"
                  const templateId = moduleId.replace(/_\d+$/, '') || moduleId
                  
                  modules[moduleId] = {
                    template_id: templateId, // Use mapped template ID
                    position: {
                      x: 200 + (index % 4) * 300, // Arrange in grid
                      y: 200 + Math.floor(index / 4) * 200
                    },
                    parameters: {},
                    connections: []
                  }
                })
                console.log('Created module instances:', modules)
              } else {
                // Already in object format
                modules = plantData.modules
              }
            } else if (plantData.module_instances) {
              modules = plantData.module_instances
            } else if (plantData.site_configurations && plantData.site_configurations[site_id]) {
              modules = plantData.site_configurations[site_id].modules || {}
            }
            
            const plantConfig: PlantConfiguration = {
              site_id,
              name: plantData.name || plantData.site_name || `Plant ${site_id}`,
              modules,
              layout: plantData.layout || {
                width: 2000,
                height: 1200,
                background: 'dots'
              },
              last_updated: message.timestamp
            }
            
            console.log('Created plant config:', plantConfig)
            get().setPlantConfiguration(site_id, plantConfig)
          }
          break
          
        case 'modules':
          // Handle global module templates (from backend messages like wtp/global/configuration/templates)
          console.log('Received modules/templates configuration:', data)
          if (typeof data === 'object' && data) {
            // Check for module_templates in the data
            const moduleTemplates = (data as any).module_templates
            if (moduleTemplates && typeof moduleTemplates === 'object') {
              console.log('Loading', Object.keys(moduleTemplates).length, 'module templates from backend')
              console.log('Sample template:', Object.values(moduleTemplates)[0])
              get().setModuleTemplates(moduleTemplates as Record<string, ModuleTemplate>)
              set({ isLoading: false, error: null })
            } else {
              console.warn('No module_templates found in modules configuration:', data)
            }
          }
          break
          
        case 'parameters':
          // Handle global parameters configuration (sensor parameter specs)
          console.log('Received global parameters configuration:', data)
          // This contains sensor parameter definitions - could be used for validation
          // For now, we'll acknowledge receipt but not process further
          set({ lastSync: new Date().toISOString() })
          break
          
        default:
          console.warn('Unknown configuration message type:', type)
      }
    },

    // Request templates from backend
    requestTemplates: () => {
      // TODO: Implement MQTT request for templates
      // This could publish to a request topic like 'hydros/templates/request'
      console.log('Requesting module templates from backend...')
      set({ isLoading: true, error: null })
    },

    // State management
    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    resetConfiguration: () => set({
      moduleTemplates: {},
      templateCategories: {},
      plantConfigurations: {},
      currentSiteId: null,
      isConfigurationMode: false,
      unsavedChanges: false,
      isLoading: false,
      error: null,
      lastSync: null
    })
  }))
)

// Selector hooks for specific data
export const useModuleTemplates = () => useConfigurationStore(state => state.moduleTemplates)
export const useTemplateCategories = () => useConfigurationStore(state => state.templateCategories)
export const useCurrentPlantConfig = () => useConfigurationStore(state => state.getCurrentPlantConfig())
export const useConfigurationMode = () => useConfigurationStore(state => state.isConfigurationMode)
export const useUnsavedChanges = () => useConfigurationStore(state => state.unsavedChanges)