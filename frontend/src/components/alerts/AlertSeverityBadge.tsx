import React from 'react'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { AlertSeverity } from '../../store/alertStore'

interface AlertSeverityBadgeProps {
  severity: AlertSeverity
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const AlertSeverityBadge: React.FC<AlertSeverityBadgeProps> = ({
  severity,
  showIcon = true,
  size = 'md'
}) => {
  const severityConfig = {
    critical: {
      label: 'Critical',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-800 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: AlertCircle
    },
    warning: {
      label: 'Warning',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-800 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle
    },
    info: {
      label: 'Info',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-800 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
      icon: Info
    }
  }

  const config = severityConfig[severity]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  )
}

export default AlertSeverityBadge
