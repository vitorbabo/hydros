/**
 * Selectors for configurationStore.
 *
 * Optimized selectors for plant configuration management.
 */
import { useConfigurationStore } from '../configurationStore'
import type { ModuleTemplate } from '../../types'
import { useShallow } from 'zustand/react/shallow'

// ============================================================================
// Plant Configuration Selectors
// ============================================================================

/**
 * Get all plant configurations
 */
export const usePlantConfigurations = () =>
  useConfigurationStore((state) => state.plantConfigurations)

/**
 * Get a specific plant configuration by site ID
 */
export const usePlantConfiguration = (siteId: string) =>
  useConfigurationStore((state) => state.plantConfigurations[siteId])

/**
 * Get current plant configuration
 */
export const useCurrentPlantConfiguration = () =>
  useConfigurationStore((state) => state.getCurrentPlantConfig())

/**
 * Get configured sites
 */
export const useConfiguredSites = () =>
  useConfigurationStore((state) => Object.keys(state.plantConfigurations))

// ============================================================================
// Module Template Selectors
// ============================================================================

/**
 * Get all module templates
 */
export const useModuleTemplates = () =>
  useConfigurationStore((state) => state.moduleTemplates)

/**
 * Get a specific module template by ID
 */
export const useModuleTemplate = (templateId: string) =>
  useConfigurationStore((state) => state.moduleTemplates[templateId])

/**
 * Get module templates by type
 */
export const useModuleTemplatesByType = (type: string) =>
  useConfigurationStore((state) => {
    const templates: Record<string, ModuleTemplate> = {}

    Object.entries(state.moduleTemplates).forEach(([id, template]) => {
      if (template.type === type) {
        templates[id] = template
      }
    })

    return templates
  })

// ============================================================================
// Module Instance Selectors
// ============================================================================

/**
 * Get all module instances for a site
 */
export const useSiteModules = (siteId: string) =>
  useConfigurationStore(useShallow((state) => state.plantConfigurations[siteId]?.modules || {}))

/**
 * Get module instances by type for a site
 */
export const useSiteModulesByType = (siteId: string, type: string) =>
  useConfigurationStore(useShallow((state) => {
    const config = state.plantConfigurations[siteId]
    if (!config) return []

    return Object.entries(config.modules || {})
      .filter(([, module]) => {
        const template = state.moduleTemplates[module.template_id]
        return template?.type === type
      })
      .map(([moduleId]) => moduleId)
  }))

// ============================================================================
// Configuration Mode Selectors
// ============================================================================

/**
 * Get configuration mode
 */
export const useConfigurationMode = () =>
  useConfigurationStore((state) => state.isConfigurationMode)

/**
 * Check if in edit mode
 */
export const useIsEditMode = () =>
  useConfigurationStore((state) => state.isConfigurationMode)

// ============================================================================
// Statistics Selectors
// ============================================================================

/**
 * Get configuration statistics
 */
export const useConfigurationStatistics = () =>
  useConfigurationStore(useShallow((state) => {
    const siteCount = Object.keys(state.plantConfigurations).length
    const templateCount = Object.keys(state.moduleTemplates).length

    let totalModules = 0
    Object.values(state.plantConfigurations).forEach(config => {
      totalModules += Object.keys(config.modules || {}).length
    })

    return {
      siteCount,
      templateCount,
      totalModules,
    }
  }))

/**
 * Get site module count
 */
export const useSiteModuleCount = (siteId: string) =>
  useConfigurationStore((state) =>
    Object.keys(state.plantConfigurations[siteId]?.modules || {}).length
  )

// ============================================================================
// Combined Selectors
// ============================================================================

/**
 * Get site configuration with templates
 */
export const useSiteWithTemplates = (siteId: string) =>
  useConfigurationStore(useShallow((state) => {
    const config = state.plantConfigurations[siteId]
    if (!config) return null

    const modulesWithTemplates = Object.entries(config.modules || {}).map(([moduleId, module]) => ({
      id: moduleId,
      template: state.moduleTemplates[module.template_id],
    }))

    return {
      config,
      modules: modulesWithTemplates,
    }
  }))

/**
 * Get available module types with counts
 */
export const useModuleTypeCounts = () =>
  useConfigurationStore((state) => {
    const counts: Record<string, number> = {}

    Object.values(state.moduleTemplates).forEach(template => {
      counts[template.type] = (counts[template.type] || 0) + 1
    })

    return counts
  })
