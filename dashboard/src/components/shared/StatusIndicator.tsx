import React from 'react'
import { clsx } from 'clsx'
import type { ConnectionStatus, ComponentStatus } from '../../types'

interface StatusIndicatorProps {
  status: ConnectionStatus | ComponentStatus
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const statusConfig = {
  // Connection statuses
  connected: { label: 'Connected', class: 'status-normal' },
  connecting: { label: 'Connecting', class: 'status-warning' },
  disconnected: { label: 'Disconnected', class: 'status-offline' },
  error: { label: 'Error', class: 'status-alarm' },
  maintenance: { label: 'Maintenance', class: 'status-maintenance' },
  
  // Component statuses
  normal: { label: 'Normal', class: 'status-normal' },
  warning: { label: 'Warning', class: 'status-warning' },
  alarm: { label: 'Alarm', class: 'status-alarm' },
  offline: { label: 'Offline', class: 'status-offline' },
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}

export function StatusIndicator({ 
  status, 
  size = 'md', 
  showLabel = false, 
  className 
}: StatusIndicatorProps) {
  const config = statusConfig[status]
  const sizeClass = sizeClasses[size]

  if (!config) {
    console.warn(`Unknown status: ${status}`)
    return null
  }

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div 
        className={clsx(
          'status-indicator',
          config.class,
          sizeClass
        )}
        title={config.label}
      />
      {showLabel && (
        <span className="text-sm text-gray-700 font-medium">
          {config.label}
        </span>
      )}
    </div>
  )
}