import React, { useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, List, Settings as SettingsIcon, Network, Activity } from 'lucide-react'
import { useDashboardStore } from '../../store/dashboardStore'
import { TabNavigation, type Tab } from '../../components/shared/TabNavigation'
import { SiteOverview } from './SiteOverview'
import { SiteAnalytics } from './SiteAnalytics'
import { SiteEvents } from './SiteEvents'
import { SiteConfiguration } from './SiteConfiguration'
import { SitePlantLayout } from './SitePlantLayout'
import { SiteTelemetry } from './SiteTelemetry'

export function SiteDetail() {
  const { siteId, tab } = useParams<{ siteId: string; tab?: string }>()
  const { sites } = useDashboardStore()
  const [activeTab, setActiveTab] = useState(tab || 'overview')

  const site = siteId ? sites[siteId] : null

  // Update active tab when URL changes
  useEffect(() => {
    if (tab) {
      setActiveTab(tab)
    }
  }, [tab])

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    // Update URL without reload
    window.history.pushState(null, '', `/sites/${siteId}/${tabId}`)
  }

  if (!site) {
    return <Navigate to="/sites" replace />
  }

  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'layout',
      label: 'Plant Layout',
      icon: <Network className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: 'Performance Analytics',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 'telemetry',
      label: 'Telemetry',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      id: 'events',
      label: 'Event Logs',
      icon: <List className="w-5 h-5" />,
    },
    {
      id: 'configuration',
      label: 'Configuration',
      icon: <SettingsIcon className="w-5 h-5" />,
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <TabNavigation tabs={tabs} activeTab={activeTab} onChange={handleTabChange} className="mb-6" />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <SiteOverview site={site} />}
        {activeTab === 'layout' && <SitePlantLayout site={site} />}
        {activeTab === 'analytics' && <SiteAnalytics site={site} />}
        {activeTab === 'telemetry' && <SiteTelemetry site={site} />}
        {activeTab === 'events' && <SiteEvents site={site} />}
        {activeTab === 'configuration' && <SiteConfiguration site={site} />}
      </div>
    </div>
  )
}
