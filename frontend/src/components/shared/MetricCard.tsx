import React from 'react'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
  status?: 'normal' | 'warning' | 'critical'
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}

const statusColors = {
  normal: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
  warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
  critical: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus
}

const trendColors = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  stable: 'text-gray-500 dark:text-gray-400'
}

export function MetricCard({
  title,
  value,
  unit,
  trend,
  trendValue,
  status = 'normal',
  icon,
  className,
  onClick
}: MetricCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null
  const isClickable = !!onClick

  return (
    <div
      className={clsx(
        'metric-card',
        statusColors[status],
        isClickable && 'cursor-pointer hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {unit && (
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{unit}</p>
            )}
          </div>
        </div>
        {icon && (
          <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(trend && TrendIcon) && (
        <div className={clsx('flex items-center gap-1 mt-2', trendColors[trend])}>
          <TrendIcon className="w-4 h-4" />
          {trendValue !== undefined && (
            <span className="text-sm font-medium">
              {trendValue > 0 ? '+' : ''}{trendValue}%
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  )
}