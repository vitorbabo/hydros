import React from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { 
  LayoutDashboard, 
  Network, 
  Activity, 
  Settings,
  Bell,
  Wifi,
  WifiOff
} from 'lucide-react'
import { StatusIndicator } from '../shared/StatusIndicator'
import { useDashboardStore } from '../../store/dashboardStore'

const navItems = [
  {
    name: 'System Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Plant Layout',
    href: '/layout',
    icon: Network,
  },
  {
    name: 'Telemetry',
    href: '/telemetry',
    icon: Activity,
  },
]

export function Navigation() {
  const { 
    connectionStatus, 
    connectionError, 
    alarms, 
    currentSite,
    lastUpdate 
  } = useDashboardStore()

  const activeAlarms = alarms.filter(alarm => 
    alarm.status === 'active' && !alarm.acknowledged
  ).length

  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">
                Hydros Dashboard
              </h1>
            </div>
            
            {/* Current Site Indicator */}
            {currentSite && (
              <div className="hidden sm:block">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Site:</span> {currentSite}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      clsx(
                        'nav-link flex items-center gap-2',
                        isActive ? 'nav-link-active' : 'nav-link-inactive'
                      )
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:block">{item.name}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* Status and Actions */}
          <div className="flex items-center gap-4">
            {/* Alarms */}
            {activeAlarms > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeAlarms}
                </span>
              </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <StatusIndicator status={connectionStatus} />
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <div className="hidden sm:block text-xs text-gray-500">
                {connectionError ? (
                  <span className="text-red-600">Error</span>
                ) : (
                  <span>Last update: {formatLastUpdate(lastUpdate)}</span>
                )}
              </div>
            </div>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'nav-link flex items-center gap-2 w-full',
                    isActive ? 'nav-link-active' : 'nav-link-inactive'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Connection Error: {connectionError}
              </p>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}