import React, { useEffect, useCallback, useState } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  Controls,
  Background,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { StatusIndicator } from '../components/shared/StatusIndicator'
import { PlantModuleNode } from '../components/plant/PlantModuleNode'
import { NodePropertiesPanel } from '../components/plant/NodePropertiesPanel'
import { ModuleLibrary } from '../components/plant/ModuleLibrary'
import { AdvancedLayoutTools } from '../components/plant/AdvancedLayoutTools'
import { usePlantLayoutStore } from '../store/plantLayoutStore'
import { useTelemetryStore } from '../store/telemetryStore'
import { useConfigurationStore } from '../store/configurationStore'
import { useMqtt, type ConfigurationMessage } from '../hooks/useMqtt'
import { Settings, Layers, Grid, Maximize2, Package, Zap } from 'lucide-react'

const nodeTypes = {
  plantModule: PlantModuleNode,
}

export default function PlantLayout() {
  const [isModuleLibraryVisible, setIsModuleLibraryVisible] = useState(false)
  const [isAdvancedToolsVisible, setIsAdvancedToolsVisible] = useState(false)
  
  const {
    nodes,
    edges,
    selectedNode,
    isConfigMode,
    setNodes,
    setEdges,
    setSelectedNode,
    setConfigMode,
    generatePlantLayout,
    generatePlantFromConfig,
    updateNodeData,
  } = usePlantLayoutStore()
  
  const { assetGroups, latest } = useTelemetryStore()
  
  const {
    currentSiteId,
    setCurrentSite,
    handleConfigurationMessage,
    moduleTemplates,
    plantConfigurations,
    addModuleToPlant,
    requestTemplates
  } = useConfigurationStore()
  
  // Handle MQTT configuration messages
  const handleConfigMessage = useCallback((topic: string, config: ConfigurationMessage) => {
    console.log('Received configuration message:', topic, config)
    handleConfigurationMessage(config)
    
    // If we received plant configuration for current site, regenerate layout
    if (config.type === 'plant' && config.site_id === currentSiteId) {
      console.log('Regenerating plant layout from updated configuration')
      generatePlantFromConfig(config.site_id)
    }
  }, [handleConfigurationMessage, currentSiteId, generatePlantFromConfig])
  
  // Setup MQTT connection with configuration topics
  useMqtt({
    topics: [
      'wtp/+/+/+/observation', 
      'wtp/+/configuration/+',
      'wtp/global/configuration/+',
    ],
    onConfiguration: handleConfigMessage
  })

  // Request templates when component mounts
  useEffect(() => {
    // Check if we have real templates loaded from backend (not just mock data)
    const hasRealTemplates = Object.keys(moduleTemplates).length > 8 &&
      Object.values(moduleTemplates).some(t => t.category && t.required_sensors?.length > 3)

    if (!hasRealTemplates) {
      console.log('Requesting module templates from backend - current count:', Object.keys(moduleTemplates).length)
      requestTemplates()
    } else {
      console.log('Backend templates already loaded:', Object.keys(moduleTemplates).length, 'templates')
    }
  }, [moduleTemplates, requestTemplates])
  
  // Initialize plant layout and set current site
  useEffect(() => {
    const siteId = 'wtp-porto-01' // Default site ID
    
    // Set current site if not already set
    if (!currentSiteId) {
      console.log('Setting current site to:', siteId)
      setCurrentSite(siteId)
    }
    
    // Try to generate from configuration first, fallback to assets
    if (nodes.length === 0) {
      const plantConfig = plantConfigurations[siteId]
      const hasTemplates = Object.keys(moduleTemplates).length > 0
      
      if (plantConfig && plantConfig.modules && Object.keys(plantConfig.modules).length > 0 && hasTemplates) {
        console.log('Generating plant layout from configuration store')
        generatePlantFromConfig(siteId)
      } else {
        const allAssets = Object.values(assetGroups).flat()
        if (allAssets.length > 0) {
          console.log('Falling back to asset-based layout generation')
          generatePlantLayout(siteId, allAssets)
        } else {
          console.log('No configuration or assets available yet, waiting for data...')
        }
      }
    }
  }, [
    currentSiteId, 
    setCurrentSite, 
    nodes.length, 
    plantConfigurations, 
    moduleTemplates, 
    assetGroups, 
    generatePlantFromConfig, 
    generatePlantLayout
  ])
  
  // Update plant layout with real-time telemetry data
  useEffect(() => {
    if (latest && Object.keys(latest).length > 0) {
      usePlantLayoutStore.getState().updateRealTimeData(latest)
    }
  }, [latest])

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges(addEdge(params, edges))
    },
    [edges, setEdges],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Use ReactFlow's built-in applyNodeChanges for proper handling
      const updatedNodes = applyNodeChanges(changes, nodes)
      setNodes(updatedNodes)
    },
    [nodes, setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Use ReactFlow's built-in applyEdgeChanges for proper handling
      const updatedEdges = applyEdgeChanges(changes, edges)
      setEdges(updatedEdges)
    },
    [edges, setEdges]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
  }, [setSelectedNode])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  // Handle dropping modules from library onto the plant layout
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    
    const reactFlowBounds = event.currentTarget.getBoundingClientRect()
    const data = event.dataTransfer.getData('application/reactflow')
    
    if (!data || !currentSiteId) return
    
    try {
      const { type, templateId, template } = JSON.parse(data)
      
      if (type === 'module') {
        // Calculate position relative to the React Flow canvas
        const position = {
          x: event.clientX - reactFlowBounds.left - 50,
          y: event.clientY - reactFlowBounds.top - 25
        }
        
        // Generate unique module ID
        const moduleId = `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        
        // Add module to configuration store
        addModuleToPlant(currentSiteId, moduleId, templateId, position)
        
        // Regenerate plant layout to include the new module
        generatePlantFromConfig(currentSiteId)
        
        console.log('Added module to plant:', moduleId, templateId, position)
      }
    } catch (error) {
      console.error('Error handling module drop:', error)
    }
  }, [currentSiteId, addModuleToPlant, generatePlantFromConfig])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  // Handle module selection from library
  const handleModuleSelect = useCallback((template: any) => {
    console.log('Selected module template:', template)
    // Could show template details in a modal or panel
  }, [])

  // Handle module drag start from library
  const handleModuleDragStart = useCallback((template: any, event: React.DragEvent) => {
    console.log('Started dragging module:', template)
  }, [])
  
  // Get current plant configuration for dynamic site info
  const currentPlantConfig = useConfigurationStore(state => 
    state.currentSiteId ? state.plantConfigurations[state.currentSiteId] : null
  )
  
  // Derived values for display
  const siteName = currentPlantConfig?.name || (currentSiteId ? `${currentSiteId}` : 'Unknown Site')
  const siteDisplayId = currentSiteId || 'no-site'
  
  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) ?? null : null

  return (
    <div className="h-full w-full relative overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Module Library (Overlay) */}
      {isModuleLibraryVisible && (
        <div className="absolute left-0 top-0 bottom-0 z-20">
          <ModuleLibrary
            isVisible={isModuleLibraryVisible}
            onClose={() => setIsModuleLibraryVisible(false)}
            onModuleSelect={handleModuleSelect}
            onDragStart={handleModuleDragStart}
          />
        </div>
      )}

      {/* Main Flow Diagram */}
      <div className="h-full w-full">
        {/* Compact Header Controls */}
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModuleLibraryVisible(!isModuleLibraryVisible)}
                className={`p-1.5 rounded transition-colors ${
                  isModuleLibraryVisible
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Toggle Module Library"
              >
                <Package className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsAdvancedToolsVisible(!isAdvancedToolsVisible)}
                className={`p-1.5 rounded transition-colors ${
                  isAdvancedToolsVisible
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Advanced Tools"
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConfigMode(!isConfigMode)}
                className={`p-1.5 rounded transition-colors ${
                  isConfigMode
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={isConfigMode ? "View Mode" : "Edit Mode"}
              >
                <Settings className="w-4 h-4" />
              </button>
              <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-1" />
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">{nodes.length}</span>
                <span>modules</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            nodesDraggable={isConfigMode}
            nodesConnectable={isConfigMode}
            elementsSelectable={true}
            fitView
            style={{ width: '100%', height: '100%' }}
            className="bg-gray-50 dark:bg-gray-900"
          >
            <Controls
              showInteractive={false}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              className="dark:opacity-30"
              color="#9ca3af"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar - Advanced Layout Tools (Overlay) */}
      {isAdvancedToolsVisible && (
        <div className="absolute right-0 top-0 bottom-0 z-20">
          <AdvancedLayoutTools
            isVisible={isAdvancedToolsVisible}
            onClose={() => setIsAdvancedToolsVisible(false)}
            siteId={currentSiteId || 'wtp-porto-01'}
          />
        </div>
      )}

      {/* Right Sidebar - Module Details (Overlay) */}
      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 z-20">
          <NodePropertiesPanel
            node={selectedNodeData}
            onClose={() => setSelectedNode(null)}
            onConfigChange={updateNodeData}
          />
        </div>
      )}
    </div>
  )
}