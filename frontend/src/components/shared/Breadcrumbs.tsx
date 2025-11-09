import React from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useDashboardStore } from '../../store/dashboardStore'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs() {
  const location = useLocation()
  const params = useParams()
  const { sites, currentSite } = useDashboardStore()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    if (pathSegments.length === 0) {
      // Home page
      return [{ label: 'Dashboard' }]
    }

    // Handle different routes
    switch (pathSegments[0]) {
      case 'sites':
        breadcrumbs.push({ label: 'Sites', href: '/sites' })

        if (pathSegments[1]) {
          // Site detail page
          const siteId = pathSegments[1]
          const site = sites[siteId]
          const siteName = site?.name || siteId

          breadcrumbs.push({ label: siteName, href: `/sites/${siteId}` })

          // Sub-pages within site
          if (pathSegments[2]) {
            const subPage = pathSegments[2]
            const subPageLabel = subPage.charAt(0).toUpperCase() + subPage.slice(1)
            breadcrumbs.push({ label: subPageLabel })
          }
        }
        break

      case 'alerts':
        breadcrumbs.push({ label: 'Alerts', href: '/alerts' })
        if (pathSegments[1]) {
          const subPage = pathSegments[1]
          const subPageLabel = subPage.charAt(0).toUpperCase() + subPage.slice(1)
          breadcrumbs.push({ label: subPageLabel })
        }
        break

      case 'reports':
        breadcrumbs.push({ label: 'Reports', href: '/reports' })
        if (pathSegments[1]) {
          const subPage = pathSegments[1]
          const subPageLabel = subPage === 'builder' ? 'Report Builder' :
                              subPage === 'templates' ? 'Templates' :
                              subPage.charAt(0).toUpperCase() + subPage.slice(1)
          breadcrumbs.push({ label: subPageLabel })
        }
        break

      case 'analytics':
        breadcrumbs.push({ label: 'Analytics', href: '/analytics' })
        if (pathSegments[1]) {
          const subPage = pathSegments[1]
          const subPageLabel = subPage === 'comparison' ? 'Site Comparison' :
                              subPage === 'efficiency' ? 'Efficiency Metrics' :
                              subPage === 'trends' ? 'Trend Analysis' :
                              subPage.charAt(0).toUpperCase() + subPage.slice(1)
          breadcrumbs.push({ label: subPageLabel })
        }
        break

      case 'settings':
        breadcrumbs.push({ label: 'Settings' })
        break

      case 'admin':
        breadcrumbs.push({ label: 'Admin', href: '/admin' })
        if (pathSegments[1]) {
          const subPage = pathSegments[1]
          const subPageLabel = subPage === 'users' ? 'User Management' :
                              subPage === 'roles' ? 'Roles & Permissions' :
                              subPage === 'access' ? 'Site Access Control' :
                              subPage === 'audit' ? 'Audit Logs' :
                              subPage.charAt(0).toUpperCase() + subPage.slice(1)
          breadcrumbs.push({ label: subPageLabel })
        }
        break

      // Legacy routes (for backward compatibility)
      case 'layout':
        breadcrumbs.push({ label: 'Plant Layout' })
        break

      case 'configuration':
        breadcrumbs.push({ label: 'Configuration' })
        break

      case 'telemetry':
        breadcrumbs.push({ label: 'Telemetry' })
        break

      default:
        // Fallback: capitalize first segment
        const label = pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)
        breadcrumbs.push({ label })
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't show breadcrumbs if only one item and it's Dashboard
  if (breadcrumbs.length === 1 && breadcrumbs[0].label === 'Dashboard') {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
            {crumb.href && !isLast ? (
              <Link
                to={crumb.href}
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
