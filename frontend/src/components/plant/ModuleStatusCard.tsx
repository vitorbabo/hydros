import React from 'react'
import { clsx } from 'clsx'
import { StatusIndicator } from '../shared/StatusIndicator'
import type { ComponentStatus } from '../../types'

interface ModuleStatusCardProps {
  name: string
  icon: React.ReactNode
  status: ComponentStatus
  metrics?: {
    label: string
    value: string
  }[]
  onClick?: () => void
  className?: string
}

export function ModuleStatusCard({
  name,
  icon,
  status,
  metrics = [],
  onClick,
  className,
}: ModuleStatusCardProps) {
  const statusColors = {
    normal: 'border-gray-200 dark:border-gray-700',
    warning: 'border-yellow-400/50',
    alarm: 'border-red-500/50',
    offline: 'border-gray-400',
    maintenance: 'border-blue-400/50',
  }

  const statusBgColors = {
    normal: 'bg-gray-50 dark:bg-gray-800/50',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20',
    alarm: 'bg-red-50 dark:bg-red-900/20',
    offline: 'bg-gray-100 dark:bg-gray-800',
    maintenance: 'bg-blue-50 dark:bg-blue-900/20',
  }

  const statusTextColors = {
    normal: 'text-gray-700 dark:text-gray-300',
    warning: 'text-yellow-700 dark:text-yellow-400',
    alarm: 'text-red-700 dark:text-red-400',
    offline: 'text-gray-500 dark:text-gray-400',
    maintenance: 'text-blue-700 dark:text-blue-400',
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all',
        statusBgColors[status],
        statusColors[status],
        onClick && 'cursor-pointer hover:shadow-lg hover:border-primary/50',
        className
      )}
    >
      {/* Icon */}
      <div
        className={clsx(
          'flex items-center justify-center w-12 h-12 rounded-full',
          status === 'normal' && 'bg-primary/10 text-primary',
          status === 'warning' && 'bg-yellow-400/10 text-yellow-500',
          status === 'alarm' && 'bg-red-500/10 text-red-500',
          status === 'offline' && 'bg-gray-400/10 text-gray-500',
          status === 'maintenance' && 'bg-blue-400/10 text-blue-500'
        )}
      >
        {icon}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-center">
        {name}
      </h3>

      {/* Status */}
      <div className="flex items-center gap-2">
        <StatusIndicator status={status} />
        <span className={clsx('text-sm', statusTextColors[status])}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Metrics */}
      {metrics.map((metric, index) => (
        <div key={index} className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {metric.label}: <span className="font-medium">{metric.value}</span>
        </div>
      ))}
    </div>
  )
}
