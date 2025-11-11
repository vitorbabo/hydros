import React, { useEffect } from 'react'
import PlantLayout from '../PlantLayout'
import type { PlantSite } from '../../types'
import { useDashboardStore } from '../../store/dashboardStore'

interface SitePlantLayoutProps {
  site: PlantSite
}

export function SitePlantLayout({ site }: SitePlantLayoutProps) {
  const { setCurrentSite } = useDashboardStore()

  // Set the current site when this component mounts
  useEffect(() => {
    setCurrentSite(site.id)
  }, [site.id, setCurrentSite])

  return (
    <div className="h-[calc(100vh-12rem)] w-full">
      <PlantLayout />
    </div>
  )
}
