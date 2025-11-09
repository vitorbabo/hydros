import React from 'react'
import { SystemOverview } from './SystemOverview'

/**
 * Dashboard page - Main landing page showing overview of all sites
 * Currently wraps the existing SystemOverview component
 * TODO: Enhance to show multi-site overview
 */
export function Dashboard() {
  return (
    <div className="h-full">
      <SystemOverview />
    </div>
  )
}
