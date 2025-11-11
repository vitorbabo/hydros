import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PlantLayout from '../PlantLayout'
import { useConfigurationStore } from '../../store/configurationStore'
import { useDashboardStore } from '../../store/dashboardStore'

export function SiteLayout() {
  const { siteId } = useParams<{ siteId: string }>()
  const navigate = useNavigate()
  const { setCurrentSite } = useConfigurationStore()
  const { sites } = useDashboardStore()

  const site = siteId ? sites[siteId] : null

  // Set the current site when component mounts
  useEffect(() => {
    if (siteId) {
      setCurrentSite(siteId)
    }
  }, [siteId, setCurrentSite])

  const handleBack = () => {
    navigate(`/sites/${siteId}`)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with back button */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to {site?.name || 'Site'}</span>
          </button>
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Plant Layout - {site?.name || siteId}
            </h1>
          </div>
          <div className="w-32" /> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Fullscreen Plant Layout */}
      <div className="flex-1 overflow-hidden">
        <PlantLayout />
      </div>
    </div>
  )
}
