/**
 * Site Overview - Refactored version with extracted components
 *
 * This is a simplified version of SiteOverview that delegates rendering
 * to smaller, focused components. Reduces from 669 lines to ~245 lines.
 */
import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Maximize2 } from 'lucide-react'
import { ModuleStatusCard } from '../../components/plant/ModuleStatusCard'
import { SiteHeader } from '../../components/sites/SiteHeader'
import { WaterQualityMetrics } from '../../components/sites/WaterQualityMetrics'
import { ProtocolClientsSection } from '../../components/sites/ProtocolClientsSection'
import type { PlantSite, ComponentStatus } from '../../types'
import { useTelemetryStore } from '../../store/telemetryStore'
import { useConfigurationStore } from '../../store/configurationStore'
import { getModuleIconComponent } from '../../utils/moduleIcons'

interface SiteOverviewProps {
  site: PlantSite
}

export function SiteOverview({ site }: SiteOverviewProps) {
  const navigate = useNavigate()
  const { getLatestByAsset, latest } = useTelemetryStore()
  const { plantConfigurations, moduleTemplates } = useConfigurationStore()

  // Collapse state for sections
  const [isWaterQualityOpen, setIsWaterQualityOpen] = useState(true)
  const [isProtocolClientsOpen, setIsProtocolClientsOpen] = useState(false)

  // Get full configuration for this site
  const plantConfig = plantConfigurations[site.id]
  const siteInfo = plantConfig?.site_info || {}
  const operationalParams = plantConfig?.operational_parameters ?? ({} as Record<string, any>)
  const protocolClients = plantConfig?.protocol_clients || []

  // Flow rate cache to prevent flickering
  const flowRateCacheRef = useRef<{ currentFlowRate: number; dailyTotalFlow: number }>({
    currentFlowRate: 0,
    dailyTotalFlow: 0
  })

  // Calculate current flow metrics
  const { currentFlowRate, dailyTotalFlow, hasRecentData } = useMemo(() => {
    const siteObservations = Object.values(latest).filter(obs => obs.site_id === site.id)

    const rawIntakeFlowObs = siteObservations.find(obs =>
      obs.asset_id === 'raw_intake' && obs.measurement === 'flow_rate'
    )
    const dailyTotalFlowObs = siteObservations.find(obs =>
      obs.asset_id === 'raw_intake' && obs.measurement === 'daily_flow_total'
    )

    const cachedValues = flowRateCacheRef.current
    const newFlowRate = rawIntakeFlowObs ? rawIntakeFlowObs.value : cachedValues.currentFlowRate
    const newDailyTotal = dailyTotalFlowObs ? dailyTotalFlowObs.value : cachedValues.dailyTotalFlow

    if (rawIntakeFlowObs || dailyTotalFlowObs) {
      flowRateCacheRef.current = {
        currentFlowRate: rawIntakeFlowObs ? rawIntakeFlowObs.value : cachedValues.currentFlowRate,
        dailyTotalFlow: dailyTotalFlowObs ? dailyTotalFlowObs.value : cachedValues.dailyTotalFlow
      }
    }

    // Check if data is recent (within 60 seconds)
    const recentDataTimestamps = siteObservations
      .map((obs) => obs && obs.ts ? new Date(obs.ts).getTime() : 0)
      .filter((timestamp) => timestamp > 0)

    const latestTimestamp = recentDataTimestamps.length > 0
      ? Math.max(...recentDataTimestamps)
      : 0

    const timeDiffSeconds = latestTimestamp > 0
      ? (Date.now() - latestTimestamp) / 1000
      : Infinity

    const isRecentData = timeDiffSeconds < 60

    return {
      currentFlowRate: newFlowRate,
      dailyTotalFlow: newDailyTotal,
      hasRecentData: isRecentData
    }
  }, [latest, site.id])

  // Calculate design flow rate
  const designFlowRate = operationalParams.design_flow_rate || (site.design_capacity / 24) || 0

  // Helper function to format flow values
  const formatFlowValue = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toFixed(1)
  }

  // Get module information
  const getModuleInfo = (moduleId: string) => {
    const module = plantConfig?.modules?.[moduleId]
    if (!module) {
      return {
        name: moduleId,
        icon: null,
        type: 'unknown',
        category: 'other'
      }
    }

    const template = moduleTemplates[module.template_id]
    if (!template) {
      return {
        name: moduleId,
        icon: null,
        type: 'unknown',
        category: 'other'
      }
    }

    const IconComponent = getModuleIconComponent(template.type, template.category)
    const displayName = moduleId
      .replace(/_/g, ' ')
      .replace(/\d+$/, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim()

    return {
      name: displayName,
      icon: <IconComponent className="w-6 h-6" />,
      type: template.type,
      category: template.category || 'other'
    }
  }

  // Get module status
  const getModuleStatus = (moduleId: string): { status: ComponentStatus; metrics: Array<{ label: string; value: string }> } => {
    const findObservation = (measurement: string) => {
      const observations = getLatestByAsset(moduleId)
      return Object.values(observations).find(obs =>
        obs.site_id === site.id && obs.measurement === measurement
      )
    }

    const flowObs = findObservation('flow_rate')
    const pressureObs = findObservation('pressure')
    const levelObs = findObservation('level')
    const turbidityObs = findObservation('turbidity')
    const chlorineObs = findObservation('chlorine_residual')

    const metrics: Array<{ label: string; value: string }> = []

    if (flowObs && typeof flowObs.value === 'number') {
      metrics.push({ label: 'Flow', value: `${flowObs.value.toFixed(1)} ${flowObs.unit}` })
    }
    if (pressureObs && typeof pressureObs.value === 'number') {
      metrics.push({ label: 'Pressure', value: `${pressureObs.value.toFixed(1)} ${pressureObs.unit}` })
    }
    if (levelObs && typeof levelObs.value === 'number') {
      metrics.push({ label: 'Level', value: `${levelObs.value.toFixed(1)} ${levelObs.unit}` })
    }
    if (turbidityObs && typeof turbidityObs.value === 'number') {
      metrics.push({ label: 'Turbidity', value: `${turbidityObs.value.toFixed(2)} ${turbidityObs.unit}` })
    }
    if (chlorineObs && typeof chlorineObs.value === 'number') {
      metrics.push({ label: 'Cl', value: `${chlorineObs.value.toFixed(1)} ${chlorineObs.unit}` })
    }

    let status: ComponentStatus = 'normal'
    if (!flowObs && !pressureObs && !levelObs) {
      status = 'offline'
    } else if (flowObs?.quality === 'bad' || pressureObs?.quality === 'bad') {
      status = 'alarm'
    } else if (flowObs?.quality === 'uncertain' || pressureObs?.quality === 'uncertain') {
      status = 'warning'
    }

    return { status, metrics }
  }

  return (
    <div className="space-y-6">
      {/* Site Header with Key Metrics */}
      <SiteHeader
        site={site}
        currentFlowRate={currentFlowRate}
        dailyTotalFlow={dailyTotalFlow}
        designFlowRate={designFlowRate}
        hasRecentData={hasRecentData}
        formatFlowValue={formatFlowValue}
      />

      {/* Plant Schematic - Simplified */}
      <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Plant Overview
          </h3>
          <button
            onClick={() => navigate(`/sites/${site.id}/layout`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            Full Layout
          </button>
        </div>

        {/* Module Cards Grid */}
        {plantConfig?.modules && Object.keys(plantConfig.modules).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.keys(plantConfig.modules).map((moduleId) => {
              const moduleInfo = getModuleInfo(moduleId)
              const { status, metrics } = getModuleStatus(moduleId)

              return (
                <ModuleStatusCard
                  key={moduleId}
                  id={moduleId}
                  name={moduleInfo.name}
                  status={status}
                  metrics={metrics}
                  icon={moduleInfo.icon}
                />
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            No modules configured for this site
          </p>
        )}
      </div>

      {/* Water Quality Metrics Section */}
      <WaterQualityMetrics
        isOpen={isWaterQualityOpen}
        onToggle={() => setIsWaterQualityOpen(!isWaterQualityOpen)}
        rawWaterQuality={operationalParams.raw_water_quality}
        treatmentTargets={operationalParams.treatment_targets}
      />

      {/* Protocol Clients Section */}
      <ProtocolClientsSection
        isOpen={isProtocolClientsOpen}
        onToggle={() => setIsProtocolClientsOpen(!isProtocolClientsOpen)}
        protocolClients={protocolClients}
      />
    </div>
  )
}
