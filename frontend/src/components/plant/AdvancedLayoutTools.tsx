import React, { useState, useCallback } from 'react'
import { useConfigurationStore } from '../../store/configurationStore'
import { usePlantLayoutStore } from '../../store/plantLayoutStore'
import type { Node, Edge } from '@xyflow/react'
import {
  Zap,
  RefreshCw,
  Grid3X3,
  Layers,
  Download,
  Upload,
  Settings,
  Eye,
  EyeOff,
  ArrowUpDown,
  ArrowLeftRight,
  Maximize2,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'

interface AdvancedLayoutToolsProps {
  isVisible: boolean
  onClose: () => void
  siteId: string
}

interface LayoutLayer {
  id: string
  name: string
  visible: boolean
  color: string
  description: string
}

interface ConnectionRule {
  from: string
  to: string
  type: 'process' | 'electrical' | 'control'
  required: boolean
  description: string
}

export const AdvancedLayoutTools: React.FC<AdvancedLayoutToolsProps> = ({
  isVisible,
  onClose,
  siteId
}) => {
  const [activeTab, setActiveTab] = useState<'autolayout' | 'connections' | 'layers' | 'validation'>('autolayout')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { plantConfigurations, moduleTemplates } = useConfigurationStore()
  const { nodes, setNodes, edges, setEdges, generatePlantFromConfig } = usePlantLayoutStore()
  
  const [layers, setLayers] = useState<LayoutLayer[]>([
    { id: 'process', name: 'Process Flow', visible: true, color: '#3b82f6', description: 'Main process connections' },
    { id: 'electrical', name: 'Electrical', visible: true, color: '#f59e0b', description: 'Power and control circuits' },
    { id: 'instrumentation', name: 'Instrumentation', visible: true, color: '#10b981', description: 'Sensors and measurement devices' },
    { id: 'control', name: 'Control', visible: false, color: '#8b5cf6', description: 'Control system connections' }
  ])

  const currentPlantConfig = plantConfigurations[siteId]

  // Auto-layout algorithms
  const applyGridLayout = useCallback(() => {
    if (!currentPlantConfig) return

    setIsProcessing(true)
    setTimeout(() => {
      const moduleEntries = Object.entries(currentPlantConfig.modules)
      const cols = Math.ceil(Math.sqrt(moduleEntries.length))
      const spacing = { x: 200, y: 150 }
      const startPos = { x: 100, y: 100 }

      const updatedNodes = nodes.map((node, index) => {
        const row = Math.floor(index / cols)
        const col = index % cols
        
        return {
          ...node,
          position: {
            x: startPos.x + col * spacing.x,
            y: startPos.y + row * spacing.y
          }
        }
      })

      setNodes(updatedNodes)
      setIsProcessing(false)
    }, 500)
  }, [currentPlantConfig, nodes, setNodes])

  const applyProcessFlowLayout = useCallback(() => {
    if (!currentPlantConfig || !moduleTemplates) return

    setIsProcessing(true)
    setTimeout(() => {
      // Organize modules by process flow sequence
      const modulesByType: Record<string, any[]> = {}
      Object.entries(currentPlantConfig.modules).forEach(([id, module]) => {
        const template = moduleTemplates[module.template_id]
        if (template) {
          const type = template.type
          if (!modulesByType[type]) modulesByType[type] = []
          modulesByType[type].push({ id, module, template })
        }
      })

      // Process flow sequence
      const flowSequence = [
        'intake',
        'pump',
        'chemical_dosing',
        'chemical_treatment',
        'sedimentation',
        'filtration',
        'disinfection',
        'storage'
      ]

      let currentY = 100
      const levelHeight = 200
      const moduleSpacing = 180

      const updatedNodes = nodes.map(node => {
        const moduleData = Object.entries(currentPlantConfig.modules).find(([id]) => id === node.id)
        if (!moduleData) return node

        const [, module] = moduleData
        const template = moduleTemplates[module.template_id]
        if (!template) return node

        const typeIndex = flowSequence.indexOf(template.type)
        const levelY = currentY + (typeIndex >= 0 ? typeIndex * levelHeight : flowSequence.length * levelHeight)
        
        // Spread modules of same type horizontally
        const sameTypeModules = modulesByType[template.type] || []
        const moduleIndex = sameTypeModules.findIndex(m => m.id === node.id)
        const totalWidth = (sameTypeModules.length - 1) * moduleSpacing
        const startX = 400 - totalWidth / 2

        return {
          ...node,
          position: {
            x: startX + moduleIndex * moduleSpacing,
            y: levelY
          }
        }
      })

      setNodes(updatedNodes)
      setIsProcessing(false)
    }, 500)
  }, [currentPlantConfig, moduleTemplates, nodes, setNodes])

  const applyCircularLayout = useCallback(() => {
    if (!nodes.length) return

    setIsProcessing(true)
    setTimeout(() => {
      const center = { x: 400, y: 300 }
      const radius = Math.max(150, nodes.length * 20)
      const angleStep = (2 * Math.PI) / nodes.length

      const updatedNodes = nodes.map((node, index) => {
        const angle = index * angleStep
        return {
          ...node,
          position: {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
          }
        }
      })

      setNodes(updatedNodes)
      setIsProcessing(false)
    }, 500)
  }, [nodes, setNodes])

  // Connection validation
  const validateConnections = useCallback(() => {
    if (!currentPlantConfig || !moduleTemplates) return []

    const issues: string[] = []
    const modules = currentPlantConfig.modules

    // Define basic connection rules
    const connectionRules: ConnectionRule[] = [
      { from: 'intake', to: 'pump', type: 'process', required: true, description: 'Raw water must flow to pumps' },
      { from: 'pump', to: 'chemical_treatment', type: 'process', required: true, description: 'Pumped water flows to treatment' },
      { from: 'chemical_dosing', to: 'chemical_treatment', type: 'process', required: true, description: 'Chemicals must be dosed into treatment' },
      { from: 'chemical_treatment', to: 'sedimentation', type: 'process', required: false, description: 'Treated water flows to sedimentation' },
      { from: 'sedimentation', to: 'filtration', type: 'process', required: false, description: 'Clarified water flows to filters' },
      { from: 'filtration', to: 'disinfection', type: 'process', required: true, description: 'Filtered water must be disinfected' },
      { from: 'disinfection', to: 'storage', type: 'process', required: true, description: 'Disinfected water flows to storage' }
    ]

    // Check for missing required connections
    connectionRules.forEach(rule => {
      if (!rule.required) return

      const fromModules = Object.entries(modules).filter(([, m]) => {
        const template = moduleTemplates[m.template_id]
        return template?.type === rule.from
      })

      const toModules = Object.entries(modules).filter(([, m]) => {
        const template = moduleTemplates[m.template_id]
        return template?.type === rule.to
      })

      if (fromModules.length > 0 && toModules.length > 0) {
        // Check if any connections exist
        const hasConnection = edges.some(edge => {
          const sourceModule = modules[edge.source]
          const targetModule = modules[edge.target]
          if (!sourceModule || !targetModule) return false

          const sourceTemplate = moduleTemplates[sourceModule.template_id]
          const targetTemplate = moduleTemplates[targetModule.template_id]
          
          return sourceTemplate?.type === rule.from && targetTemplate?.type === rule.to
        })

        if (!hasConnection) {
          issues.push(`Missing required connection: ${rule.from} → ${rule.to}`)
        }
      }
    })

    // Check for isolated modules
    const connectedModules = new Set<string>()
    edges.forEach(edge => {
      connectedModules.add(edge.source)
      connectedModules.add(edge.target)
    })

    Object.keys(modules).forEach(moduleId => {
      if (!connectedModules.has(moduleId)) {
        issues.push(`Module ${moduleId} is not connected to any other module`)
      }
    })

    return issues
  }, [currentPlantConfig, moduleTemplates, edges])

  // Layer management
  const toggleLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ))
  }, [])

  // Export layout
  const exportLayout = useCallback(() => {
    const layoutData = {
      site_id: siteId,
      timestamp: new Date().toISOString(),
      nodes: nodes.map(node => ({
        id: node.id,
        position: node.position,
        data: {
          label: node.data.label,
          type: node.data.type,
          category: node.data.category
        }
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type
      })),
      layers: layers,
      layout_version: '1.0'
    }

    const dataStr = JSON.stringify(layoutData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const filename = `plant_layout_${siteId}_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', filename)
    linkElement.click()
  }, [siteId, nodes, edges, layers])

  const connectionIssues = validateConnections()

  if (!isVisible) return null

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Layout Tools
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mt-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { id: 'autolayout', label: 'Auto-Layout', icon: Grid3X3 },
            { id: 'connections', label: 'Connections', icon: GitBranch },
            { id: 'layers', label: 'Layers', icon: Layers },
            { id: 'validation', label: 'Validation', icon: CheckCircle }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Auto-Layout Tab */}
        {activeTab === 'autolayout' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Auto-Layout Algorithms</h4>
              <div className="space-y-3">
                <button
                  onClick={applyProcessFlowLayout}
                  disabled={isProcessing}
                  className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-100">Process Flow Layout</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">Arrange modules in process sequence</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={applyGridLayout}
                  disabled={isProcessing}
                  className="w-full p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Grid3X3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <div className="font-medium text-green-900 dark:text-green-100">Grid Layout</div>
                      <div className="text-sm text-green-700 dark:text-green-300">Organize modules in a grid pattern</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={applyCircularLayout}
                  disabled={isProcessing}
                  className="w-full p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <div className="font-medium text-purple-900 dark:text-purple-100">Circular Layout</div>
                      <div className="text-sm text-purple-700 dark:text-purple-300">Arrange modules in a circle</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {isProcessing && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <span className="text-sm text-blue-800 dark:text-blue-300">Applying layout...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Connection Management</h4>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Connections:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{edges.length}</span>
                </div>
              </div>

              {connectionIssues.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-800 dark:text-red-300">Connection Issues</span>
                  </div>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                    {connectionIssues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  // TODO: Implement auto-connect based on process flow
                  console.log('Auto-connecting modules...')
                }}
                className="w-full p-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Auto-Connect Modules
              </button>
            </div>
          </div>
        )}

        {/* Layers Tab */}
        {activeTab === 'layers' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">View Layers</h4>
              <div className="space-y-2">
                {layers.map(layer => (
                  <div key={layer.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: layer.color }}
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{layer.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{layer.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLayer(layer.id)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Validation Tab */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Layout Validation</h4>

              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Modules Configured</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{nodes.length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Connections</span>
                    <div className="flex items-center gap-1">
                      {connectionIssues.length > 0 ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
                          <span className="font-medium text-red-600 dark:text-red-400">{connectionIssues.length} issues</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                          <span className="font-medium text-gray-900 dark:text-white">Valid</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {connectionIssues.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Issues Found:</div>
                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
                      {connectionIssues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          <button
            onClick={exportLayout}
            className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {
              // TODO: Implement import functionality
              console.log('Import layout...')
            }}
            className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>
    </div>
  )
}