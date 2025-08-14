import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Node, Edge } from '@xyflow/react'
import type { Observation } from '../types'

interface PlantLayoutData {
  nodes: Node[]
  edges: Edge[]
  realTimeData: Record<string, Observation>
  selectedNode: string | null
  isConfigMode: boolean
}

interface PlantLayoutStore extends PlantLayoutData {
  // Node management
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  updateNodeData: (nodeId: string, data: any) => void
  
  // Real-time data integration
  updateRealTimeData: (observations: Record<string, Observation>) => void
  getNodeObservations: (assetId: string) => Record<string, Observation>
  
  // UI state
  setSelectedNode: (nodeId: string | null) => void
  setConfigMode: (enabled: boolean) => void
  
  // Plant generation
  generatePlantLayout: (siteId: string, availableAssets: string[]) => void
}

// Default water treatment plant layout
const createDefaultPlantNodes = (availableAssets: string[]): Node[] => {
  const modulePositions: Record<string, { x: number; y: number }> = {
    raw_intake: { x: 100, y: 200 },
    intake_pump_1: { x: 300, y: 200 },
    intake_pump_2: { x: 300, y: 300 },
    coagulation_tank: { x: 500, y: 200 },
    coagulant_dosing: { x: 500, y: 100 },
    flocculation_tank: { x: 700, y: 200 },
    clarifier_1: { x: 900, y: 200 },
    clarifier_2: { x: 900, y: 300 },
    filter_bed_1: { x: 1100, y: 200 },
    filter_bed_2: { x: 1100, y: 300 },
    chlorination: { x: 1300, y: 200 },
    finished_water_pump_1: { x: 1500, y: 200 },
    finished_water_pump_2: { x: 1500, y: 300 },
    finished_water_tank: { x: 1700, y: 200 },
  }

  const moduleConfigs: Record<string, { 
    label: string; 
    type: string; 
    icon: string;
    category: string;
  }> = {
    raw_intake: { 
      label: 'Raw Water Intake', 
      type: 'intake', 
      icon: '🌊', 
      category: 'intake' 
    },
    intake_pump_1: { 
      label: 'Intake Pump 1', 
      type: 'pump', 
      icon: '⚡', 
      category: 'pumps' 
    },
    intake_pump_2: { 
      label: 'Intake Pump 2', 
      type: 'pump', 
      icon: '⚡', 
      category: 'pumps' 
    },
    coagulation_tank: { 
      label: 'Coagulation Tank', 
      type: 'treatment', 
      icon: '🧪', 
      category: 'treatment' 
    },
    coagulant_dosing: { 
      label: 'Coagulant Dosing', 
      type: 'chemical', 
      icon: '💧', 
      category: 'chemical' 
    },
    flocculation_tank: { 
      label: 'Flocculation Tank', 
      type: 'treatment', 
      icon: '🌀', 
      category: 'treatment' 
    },
    clarifier_1: { 
      label: 'Clarifier 1', 
      type: 'sedimentation', 
      icon: '⭕', 
      category: 'treatment' 
    },
    clarifier_2: { 
      label: 'Clarifier 2', 
      type: 'sedimentation', 
      icon: '⭕', 
      category: 'treatment' 
    },
    filter_bed_1: { 
      label: 'Filter Bed 1', 
      type: 'filtration', 
      icon: '🔍', 
      category: 'filtration' 
    },
    filter_bed_2: { 
      label: 'Filter Bed 2', 
      type: 'filtration', 
      icon: '🔍', 
      category: 'filtration' 
    },
    chlorination: { 
      label: 'Chlorination', 
      type: 'disinfection', 
      icon: '🛡️', 
      category: 'disinfection' 
    },
    finished_water_pump_1: { 
      label: 'Finished Water Pump 1', 
      type: 'pump', 
      icon: '⚡', 
      category: 'pumps' 
    },
    finished_water_pump_2: { 
      label: 'Finished Water Pump 2', 
      type: 'pump', 
      icon: '⚡', 
      category: 'pumps' 
    },
    finished_water_tank: { 
      label: 'Finished Water Tank', 
      type: 'storage', 
      icon: '🏛️', 
      category: 'storage' 
    },
  }

  const filteredAssets = availableAssets.filter(assetId => modulePositions[assetId] && moduleConfigs[assetId])
  console.log('Filtered assets for plant layout:', filteredAssets)
  console.log('Available module positions keys:', Object.keys(modulePositions))
  console.log('Available module configs keys:', Object.keys(moduleConfigs))
  
  return filteredAssets.map(assetId => {
      const position = modulePositions[assetId]
      const config = moduleConfigs[assetId]
      
      return {
        id: assetId,
        type: 'plantModule',
        position,
        data: {
          ...config,
          assetId,
          status: 'normal' as const,
          realTimeData: {},
        },
      }
    })
}

const createDefaultPlantEdges = (availableAssets: string[]): Edge[] => {
  const connections = [
    { from: 'raw_intake', to: 'intake_pump_1' },
    { from: 'raw_intake', to: 'intake_pump_2' },
    { from: 'intake_pump_1', to: 'coagulation_tank' },
    { from: 'intake_pump_2', to: 'coagulation_tank' },
    { from: 'coagulant_dosing', to: 'coagulation_tank' },
    { from: 'coagulation_tank', to: 'flocculation_tank' },
    { from: 'flocculation_tank', to: 'clarifier_1' },
    { from: 'flocculation_tank', to: 'clarifier_2' },
    { from: 'clarifier_1', to: 'filter_bed_1' },
    { from: 'clarifier_2', to: 'filter_bed_2' },
    { from: 'filter_bed_1', to: 'chlorination' },
    { from: 'filter_bed_2', to: 'chlorination' },
    { from: 'chlorination', to: 'finished_water_pump_1' },
    { from: 'chlorination', to: 'finished_water_pump_2' },
    { from: 'finished_water_pump_1', to: 'finished_water_tank' },
    { from: 'finished_water_pump_2', to: 'finished_water_tank' },
  ]

  return connections
    .filter(conn => availableAssets.includes(conn.from) && availableAssets.includes(conn.to))
    .map((conn, index) => ({
      id: `edge-${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      type: 'smoothstep',
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      animated: false,
    }))
}

export const usePlantLayoutStore = create<PlantLayoutStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: [],
    edges: [],
    realTimeData: {},
    selectedNode: null,
    isConfigMode: false,

    // Node management
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    
    updateNodeData: (nodeId, data) => set((state) => ({
      nodes: state.nodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    })),

    // Real-time data integration
    updateRealTimeData: (observations) => set((state) => {
      const newRealTimeData = { ...state.realTimeData, ...observations }
      
      // Update nodes with real-time data
      const updatedNodes = state.nodes.map(node => {
        const assetObservations = get().getNodeObservations(node.id)
        const hasData = Object.keys(assetObservations).length > 0
        
        // Determine status based on data availability and values
        let status: 'normal' | 'warning' | 'alarm' | 'offline' = hasData ? 'normal' : 'offline'
        
        // Check for warning/alarm conditions
        Object.values(assetObservations).forEach(obs => {
          if (obs.quality !== 'good') {
            status = 'warning'
          }
          // Add specific alarm conditions based on measurement types
          if (obs.measurement === 'run_status' && obs.value === 0) {
            status = node.data.type === 'pump' ? 'warning' : 'normal'
          }
        })

        return {
          ...node,
          data: {
            ...node.data,
            status,
            realTimeData: assetObservations,
            lastUpdate: new Date().toISOString(),
          }
        }
      })

      return {
        realTimeData: newRealTimeData,
        nodes: updatedNodes,
      }
    }),

    getNodeObservations: (assetId) => {
      const state = get()
      const result: Record<string, Observation> = {}
      
      Object.entries(state.realTimeData).forEach(([key, observation]) => {
        if (observation.asset_id === assetId) {
          result[key] = observation
        }
      })
      
      return result
    },

    // UI state
    setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),
    setConfigMode: (enabled) => set({ isConfigMode: enabled }),

    // Plant generation
    generatePlantLayout: (siteId, availableAssets) => set(() => ({
      nodes: createDefaultPlantNodes(availableAssets),
      //edges: createDefaultPlantEdges(availableAssets),
    })),
  }))
)