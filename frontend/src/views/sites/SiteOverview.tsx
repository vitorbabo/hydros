import React from 'react'
import { Droplets, Filter, Beaker, Database, ChevronRight } from 'lucide-react'
import { ModuleStatusCard } from '../../components/plant/ModuleStatusCard'
import type { PlantSite, ComponentStatus } from '../../types'
import { useTelemetryStore } from '../../store/telemetryStore'

interface SiteOverviewProps {
  site: PlantSite
}

export function SiteOverview({ site }: SiteOverviewProps) {
  const { getLatestByAsset } = useTelemetryStore()

  // Map module types to display information
  const getModuleInfo = (moduleId: string) => {
    const moduleTypeMap: Record<string, { name: string; icon: React.ReactNode; type: string }> = {
      raw_intake: { name: 'Intake', icon: <Droplets className="w-6 h-6" />, type: 'intake' },
      intake_pump_1: { name: 'Intake Pump 1', icon: <Droplets className="w-6 h-6" />, type: 'pump' },
      intake_pump_2: { name: 'Intake Pump 2', icon: <Droplets className="w-6 h-6" />, type: 'pump' },
      coagulation_tank: { name: 'Coagulation', icon: <Beaker className="w-6 h-6" />, type: 'chemical_treatment' },
      clarifier_1: { name: 'Clarifier 1', icon: <Filter className="w-6 h-6" />, type: 'sedimentation' },
      clarifier_2: { name: 'Clarifier 2', icon: <Filter className="w-6 h-6" />, type: 'sedimentation' },
      filter_bed_1: { name: 'Filter 1', icon: <Filter className="w-6 h-6" />, type: 'filtration' },
      filter_bed_2: { name: 'Filter 2', icon: <Filter className="w-6 h-6" />, type: 'filtration' },
      chlorination: { name: 'Disinfection', icon: <Beaker className="w-6 h-6" />, type: 'disinfection' },
      finished_water_tank: { name: 'Reservoir', icon: <Database className="w-6 h-6" />, type: 'storage' },
    }

    return moduleTypeMap[moduleId] || { name: moduleId, icon: <Droplets className="w-6 h-6" />, type: 'unknown' }
  }

  // Get module status and metrics from telemetry
  const getModuleStatus = (moduleId: string): { status: ComponentStatus; metrics: Array<{ label: string; value: string }> } => {
    // Get latest observations for this module
    const flowObs = getLatestByAsset(site.id, moduleId, 'flow_rate')
    const pressureObs = getLatestByAsset(site.id, moduleId, 'pressure')
    const levelObs = getLatestByAsset(site.id, moduleId, 'level')
    const turbidityObs = getLatestByAsset(site.id, moduleId, 'turbidity')
    const chlorineObs = getLatestByAsset(site.id, moduleId, 'chlorine_residual')

    const metrics: Array<{ label: string; value: string }> = []

    // Add relevant metrics based on available data
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

    // Determine status based on data quality and thresholds
    let status: ComponentStatus = 'normal'

    if (!flowObs && !pressureObs && !levelObs) {
      status = 'offline'
    } else if (flowObs?.quality === 'bad' || pressureObs?.quality === 'bad') {
      status = 'alarm'
    } else if (flowObs?.quality === 'uncertain' || pressureObs?.quality === 'uncertain') {
      status = 'warning'
    }

    // Special case for reservoir level (from design example)
    if (moduleId === 'finished_water_tank' && levelObs && typeof levelObs.value === 'number' && levelObs.value > 95) {
      status = 'alarm'
    }

    // Special case for chlorine (from design example)
    if (moduleId === 'chlorination' && chlorineObs && typeof chlorineObs.value === 'number' && chlorineObs.value < 2.0) {
      status = 'warning'
    }

    return { status, metrics }
  }

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {site.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${site.status === 'connected' ? 'bg-green-500' : site.status === 'maintenance' ? 'bg-blue-500' : 'bg-red-500'}`} />
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Overall Status: {site.status === 'connected' ? 'Online & Nominal' : site.status === 'maintenance' ? 'Maintenance Mode' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Plant Schematic Section */}
      <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Plant Schematic
        </h3>

        {/* Module Flow */}
        <div className="flex items-center justify-between space-x-2 text-sm text-center overflow-x-auto pb-4">
          {site.modules.map((moduleId, index) => {
            const moduleInfo = getModuleInfo(moduleId)
            const { status, metrics } = getModuleStatus(moduleId)

            return (
              <React.Fragment key={moduleId}>
                <ModuleStatusCard
                  name={moduleInfo.name}
                  icon={moduleInfo.icon}
                  status={status}
                  metrics={metrics}
                  className="flex-1 min-w-[140px]"
                />
                {index < site.modules.length - 1 && (
                  <ChevronRight className="flex-shrink-0 w-6 h-6 text-gray-300 dark:text-gray-600" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Design Capacity */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Design Capacity
          </h4>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {site.design_capacity.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            m³/day
          </p>
        </div>

        {/* Treatment Train */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Treatment Type
          </h4>
          <p className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
            {site.treatment_train}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {site.modules.length} modules
          </p>
        </div>

        {/* Normal Flow Rate */}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Normal Flow Rate
          </h4>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {site.operational_parameters?.normal_flow_rate || 'N/A'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            m³/h
          </p>
        </div>
      </div>
    </div>
  )
}
