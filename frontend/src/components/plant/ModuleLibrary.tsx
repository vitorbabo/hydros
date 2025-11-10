import React, { useState, useMemo } from 'react'
import { useConfigurationStore } from '../../store/configurationStore'
import type { ModuleTemplate } from '../../types'
import {
  Search,
  Package,
  ChevronDown,
  ChevronRight,
  Waves,
  Wrench,
  Zap,
  TestTube,
  Droplet,
  Disc,
  Filter,
  ShieldCheck,
  Sparkles,
  Hospital,
  Building,
  Settings,
  Lightbulb,
  X,
  type LucideIcon
} from 'lucide-react'

interface ModuleLibraryProps {
  isVisible: boolean
  onClose: () => void
  onModuleSelect: (template: ModuleTemplate) => void
  onDragStart?: (template: ModuleTemplate, event: React.DragEvent) => void
}

interface ModuleCardProps {
  template: ModuleTemplate
  templateId: string
  onSelect: () => void
  onDragStart?: (event: React.DragEvent) => void
  isDraggable?: boolean
}

const ModuleCard: React.FC<ModuleCardProps> = ({ 
  template, 
  templateId, 
  onSelect, 
  onDragStart, 
  isDraggable = false 
}) => {
  // Get visual representation based on module type and category
  const getModuleIcon = (type?: string, category?: string): LucideIcon => {
    if (!type && !category) return Settings

    // Category-based icons for better organization
    const categoryIconMap: Record<string, LucideIcon> = {
      source_water: Waves,
      physical_treatment: Wrench,
      fluid_handling: Zap,
      primary_treatment: TestTube,
      chemical_feed: Droplet,
      solids_separation: Disc,
      tertiary_treatment: Filter,
      advanced_treatment: ShieldCheck,
      final_treatment: Sparkles,
      public_health: Hospital,
      distribution: Building
    }

    // Fallback to type-based icons
    const typeIconMap: Record<string, LucideIcon> = {
      intake: Waves,
      pretreatment: Wrench,
      pump: Zap,
      chemical_treatment: TestTube,
      chemical_dosing: Droplet,
      sedimentation: Disc,
      filtration: Filter,
      disinfection: ShieldCheck,
      storage: Building
    }

    return categoryIconMap[category || ''] || typeIconMap[type || ''] || Settings
  }

  const handleDragStart = (event: React.DragEvent) => {
    // Set drag data for React Flow
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'module',
      templateId,
      template
    }))
    event.dataTransfer.effectAllowed = 'copy'
    
    onDragStart?.(event)
  }

  const IconComponent = getModuleIcon(template.type, template.category)

  return (
    <div
      className={`
        bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-pointer
        transition-all hover:border-primary dark:hover:border-primary hover:shadow-md
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      onClick={onSelect}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      title={`${template.description}\nType: ${template.type}\nRequired sensors: ${template.required_sensors?.join(', ') || 'None'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <IconComponent className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {template.description || templateId}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
            {template.type ? template.type.replace('_', ' ') : 'Unknown'}
          </p>
          {template.required_sensors && template.required_sensors.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {template.required_sensors.length} sensors required
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface CategorySectionProps {
  category: string
  templates: Array<{ id: string; template: ModuleTemplate }>
  isExpanded: boolean
  onToggleExpanded: () => void
  onModuleSelect: (template: ModuleTemplate) => void
  onDragStart?: (template: ModuleTemplate, event: React.DragEvent) => void
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  templates,
  isExpanded,
  onToggleExpanded,
  onModuleSelect,
  onDragStart
}) => {
  const categoryDisplayNames: Record<string, string> = {
    intake: 'Water Intake',
    pump: 'Pumping Systems',
    chemical_treatment: 'Chemical Treatment',
    chemical_dosing: 'Chemical Dosing',
    sedimentation: 'Sedimentation',
    filtration: 'Filtration',
    disinfection: 'Disinfection',
    storage: 'Storage & Distribution',
    other: 'Other Equipment'
  }

  const displayName = categoryDisplayNames[category] || category.replace('_', ' ').toUpperCase()

  return (
    <div className="mb-4">
      <button
        onClick={onToggleExpanded}
        className="flex items-center w-full p-2 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
        )}
        <span className="font-medium text-gray-900 dark:text-white text-sm">{displayName}</span>
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
          {templates.length}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {templates.map(({ id, template }) => {
            // Skip invalid templates
            if (!template || typeof template !== 'object') {
              console.warn(`Skipping invalid template ${id}:`, template)
              return null
            }

            return (
              <ModuleCard
                key={id}
                templateId={id}
                template={template}
                onSelect={() => onModuleSelect(template)}
                onDragStart={(event) => onDragStart?.(template, event)}
                isDraggable={true}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export const ModuleLibrary: React.FC<ModuleLibraryProps> = ({
  isVisible,
  onClose,
  onModuleSelect,
  onDragStart
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['intake', 'pump']) // Expand common categories by default
  )

  const { moduleTemplates, templateCategories, isLoading, error } = useConfigurationStore()

  // Filter and organize templates
  const { filteredTemplates, totalCount } = useMemo(() => {
    const allTemplates = Object.entries(moduleTemplates)
    
    // Apply search filter
    const filtered = allTemplates.filter(([id, template]) => {
      // Skip invalid templates
      if (!template || typeof template !== 'object') {
        return false
      }
      
      if (!searchQuery) return true
      
      const query = searchQuery.toLowerCase()
      return (
        id.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        (template.type && template.type.toLowerCase().includes(query)) ||
        template.required_sensors?.some(sensor => sensor.toLowerCase().includes(query))
      )
    })

    // Group by category
    const grouped: Record<string, Array<{ id: string; template: ModuleTemplate }>> = {}
    filtered.forEach(([id, template]) => {
      // Additional safety check
      if (!template || typeof template !== 'object') {
        console.warn(`Skipping invalid template in grouping: ${id}`, template)
        return
      }
      
      const category = template.type || 'other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push({ id, template })
    })

    return {
      filteredTemplates: grouped,
      totalCount: filtered.length
    }
  }, [moduleTemplates, searchQuery])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const handleExpandAll = () => {
    setExpandedCategories(new Set(Object.keys(filteredTemplates)))
  }

  const handleCollapseAll = () => {
    setExpandedCategories(new Set())
  }

  if (!isVisible) return null

  return (
    <div className="w-72 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Package className="w-5 h-5 mr-2 text-primary" />
            Module Library
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {totalCount} module{totalCount !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleExpandAll}
              className="text-xs text-primary hover:text-primary/80"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="text-xs text-primary hover:text-primary/80"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Loading module templates...
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 dark:text-red-400 py-8">
            <p className="text-sm">Failed to load module templates</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error}</p>
          </div>
        )}

        {!isLoading && !error && totalCount === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {searchQuery ? (
              <>
                <p className="text-sm">No modules match your search</p>
                <p className="text-xs mt-1">Try different keywords</p>
              </>
            ) : (
              <>
                <p className="text-sm">No module templates available</p>
                <p className="text-xs mt-1">Check MQTT configuration</p>
              </>
            )}
          </div>
        )}

        {!isLoading && !error && totalCount > 0 && (
          <div className="space-y-2">
            {Object.entries(filteredTemplates)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, templates]) => (
                <CategorySection
                  key={category}
                  category={category}
                  templates={templates}
                  isExpanded={expandedCategories.has(category)}
                  onToggleExpanded={() => toggleCategory(category)}
                  onModuleSelect={onModuleSelect}
                  onDragStart={onDragStart}
                />
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          Drag modules onto the plant layout to add them
        </p>
      </div>
    </div>
  )
}