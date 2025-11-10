import React from 'react'
import { PlantConfiguration } from '../PlantConfiguration'
import type { PlantSite } from '../../types'

interface SiteConfigurationProps {
  site: PlantSite
}

export function SiteConfiguration({ site }: SiteConfigurationProps) {
  return <PlantConfiguration siteId={site.id} />
}
