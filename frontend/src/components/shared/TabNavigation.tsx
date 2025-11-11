import React from 'react'
import { clsx } from 'clsx'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function TabNavigation({ tabs, activeTab, onChange, className }: TabNavigationProps) {
  return (
    <div className={clsx('border-b border-gray-200 dark:border-gray-700', className)}>
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
