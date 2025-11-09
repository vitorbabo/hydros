import React, { useState } from 'react'
import {
  Menu,
  Bell,
  User,
  ChevronDown,
  Calendar,
  Wifi,
  WifiOff,
  Sun,
  Moon,
} from 'lucide-react'
import { Breadcrumbs } from '../shared/Breadcrumbs'
import { StatusIndicator } from '../shared/StatusIndicator'
import { useDashboardStore } from '../../store/dashboardStore'
import { useThemeStore } from '../../store/themeStore'
import { clsx } from 'clsx'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const {
    connectionStatus,
    connectionError,
    alarms,
    lastUpdate,
  } = useDashboardStore()

  const { theme, toggleTheme } = useThemeStore()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false)

  const activeAlarms = alarms.filter(
    (alarm) => alarm.status === 'active' && !alarm.acknowledged
  ).length

  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <header className="sticky top-0 z-30 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm h-16 px-4 md:px-6 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-full">
        {/* Left: Mobile menu + Breadcrumbs */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs */}
          <div className="min-w-0">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right: Actions and Status */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Time Range Selector */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
              className="flex items-center gap-2 h-10 px-3 md:px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden md:inline">Last 24 Hours</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Dropdown menu - TODO: Implement time range selector */}
            {isTimeRangeOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="py-1">
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Last Hour
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Last 24 Hours
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Last 7 Days
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Last 30 Days
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Connection Status (desktop only) */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <StatusIndicator status={connectionStatus} />
            {connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {connectionError ? (
                <span className="text-red-600">Error</span>
              ) : (
                <span>{formatLastUpdate(lastUpdate)}</span>
              )}
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-10 w-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* Notifications Bell */}
          <button className="relative flex items-center justify-center h-10 w-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Bell className="w-5 h-5" />
            {activeAlarms > 0 && (
              <>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeAlarms}
                </span>
                <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 animate-ping opacity-75" />
              </>
            )}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center justify-center h-10 w-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <User className="w-5 h-5" />
            </button>

            {/* Dropdown menu - TODO: Implement user menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="py-1">
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Profile
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Settings
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="absolute left-0 right-0 top-16 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">
            Connection Error: {connectionError}
          </p>
        </div>
      )}
    </header>
  )
}
