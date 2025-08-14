import React, { useEffect, useCallback } from 'react'
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
import { usePlantLayoutStore } from '../store/plantLayoutStore'
import { useTelemetryStore } from '../store/telemetryStore'
import { Settings, Layers, Grid, Maximize2 } from 'lucide-react'

const nodeTypes = {
  plantModule: PlantModuleNode,
}

export function PlantLayout() {
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
    updateNodeData,
  } = usePlantLayoutStore()
  
  const { assetGroups, latest } = useTelemetryStore()
  
  // Initialize plant layout with available assets
  useEffect(() => {
    const allAssets = Object.values(assetGroups).flat()
    console.log('Available assets for plant layout:', allAssets)
    
    // If we have no real assets yet, generate with default layout for demo
    if (allAssets.length === 0 && nodes.length === 0) {
      console.log('No assets available, generating default layout')
      // const defaultAssets = [
      //   'raw_intake', 'intake_pump_1', 'intake_pump_2', 'coagulation_tank', 
      //   'coagulant_dosing', 'flocculation_tank', 'clarifier_1', 'clarifier_2',
      //   'filter_bed_1', 'filter_bed_2', 'chlorination', 'finished_water_pump_1',
      //   'finished_water_pump_2', 'finished_water_tank'
      // ]
      // generatePlantLayout('wtp-porto-01', defaultAssets)
    } else if (allAssets.length > 0 && nodes.length === 0) {
      console.log('Using real assets:', allAssets)
      generatePlantLayout('wtp-porto-01', allAssets)
    }
  }, [assetGroups, generatePlantLayout, nodes.length])
  
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
  
  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) ?? null : null

  return (
    <div className="h-screen flex">
      {/* Main Flow Diagram */}
      <div className="flex-1 relative h-full">
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Plant Layout</h2>
                <p className="text-sm text-gray-600">Porto Municipal WTP</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfigMode(!isConfigMode)}
                  className={`p-2 rounded-lg transition-colors ${
                    isConfigMode 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Toggle Configuration Mode"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Modules:</span>
                <span className="font-medium">{nodes.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <div className="flex items-center gap-2">
                  <StatusIndicator status="normal" size="sm" />
                  <span className="text-gray-700">Normal</span>
                </div>
              </div>
              {isConfigMode && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  Configuration mode enabled. Click and drag modules to reposition.
                </div>
              )}
            </div>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          nodesDraggable={isConfigMode}
          nodesConnectable={isConfigMode}
          elementsSelectable={true}
          fitView
          className="bg-gray-50"
        >
          <Controls showInteractive={false} />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      <NodePropertiesPanel 
        node={selectedNodeData}
        onClose={() => setSelectedNode(null)}
        onConfigChange={updateNodeData}
      />
    </div>
  )
}