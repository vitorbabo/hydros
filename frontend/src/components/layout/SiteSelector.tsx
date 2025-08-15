import { useState } from 'react'
import { ChevronDown, MapPin, Check } from 'lucide-react'
import { useConfigurationStore } from '../../store/configurationStore'
import { useDashboardStore } from '../../store/dashboardStore'

export function SiteSelector() {
  const [isOpen, setIsOpen] = useState(false)
  
  const { 
    currentSiteId, 
    plantConfigurations, 
    setCurrentSite 
  } = useConfigurationStore()
  
  const { currentSite } = useDashboardStore()
  
  // Get available sites from plant configurations
  const availableSites = Object.entries(plantConfigurations).map(([siteId, config]) => ({
    id: siteId,
    name: config.name || `${siteId}`,
    displayName: config.name || siteId
  }))
  
  // Fallback to hardcoded sites if no configurations available
  const fallbackSites = [
    { id: 'wtp-porto-01', name: 'Porto Municipal WTP', displayName: 'Porto Municipal WTP' },
    { id: 'wtp-regional-02', name: 'Regional WTP #2', displayName: 'Regional WTP #2' },
  ]
  
  const sites = availableSites.length > 0 ? availableSites : fallbackSites
  const currentSiteName = sites.find(site => site.id === (currentSiteId || currentSite))?.displayName || currentSite || 'No Site Selected'
  
  const handleSiteSelect = (siteId: string) => {
    setCurrentSite(siteId)
    setIsOpen(false)
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MapPin className="w-4 h-4" />
        <span className="font-medium">Site:</span>
        <span className="max-w-40 truncate">{currentSiteName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
              Available Sites
            </div>
            
            {sites.map((site) => (
              <button
                key={site.id}
                onClick={() => handleSiteSelect(site.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{site.displayName}</span>
                  <span className="text-xs text-gray-500">{site.id}</span>
                </div>
                
                {(currentSiteId || currentSite) === site.id && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
              </button>
            ))}
            
            {sites.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No sites available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
