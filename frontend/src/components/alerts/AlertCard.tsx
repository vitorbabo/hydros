import React from 'react'
import { CheckCircle2, X, MapPin, Package, Activity, Clock } from 'lucide-react'
import { Alert } from '../../store/alertStore'
import AlertSeverityBadge from './AlertSeverityBadge'
import { formatDistanceToNow } from 'date-fns'

interface AlertCardProps {
  alert: Alert
  onAcknowledge?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (alertId: string) => void
  showActions?: boolean
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onDismiss,
  selectable = false,
  selected = false,
  onSelect,
  showActions = true
}) => {
  const handleAcknowledge = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAcknowledge && !alert.acknowledgedBy) {
      onAcknowledge(alert.id)
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDismiss) {
      onDismiss(alert.id)
    }
  }

  const handleSelect = () => {
    if (selectable && onSelect) {
      onSelect(alert.id)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return timestamp
    }
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border ${
        selected
          ? 'border-primary-500 dark:border-primary-400'
          : 'border-gray-200 dark:border-gray-700'
      } p-4 hover:shadow-md transition-all ${
        selectable ? 'cursor-pointer' : ''
      }`}
      onClick={handleSelect}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={handleSelect}
            className="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500 dark:focus:ring-primary-400"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Alert content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertSeverityBadge severity={alert.severity} size="sm" />
                {alert.acknowledgedBy && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 size={12} />
                    Acknowledged
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {alert.title}
              </h3>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-1">
                {!alert.acknowledgedBy && onAcknowledge && (
                  <button
                    onClick={handleAcknowledge}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                    title="Acknowledge alert"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Dismiss alert"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {alert.description}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600 dark:text-gray-400">
            {/* Site */}
            {alert.siteName && (
              <div className="flex items-center gap-1">
                <MapPin size={12} />
                <span>{alert.siteName}</span>
              </div>
            )}

            {/* Module */}
            {alert.moduleName && (
              <div className="flex items-center gap-1">
                <Package size={12} />
                <span>{alert.moduleName}</span>
              </div>
            )}

            {/* Measurement */}
            {alert.measurement && alert.value !== undefined && (
              <div className="flex items-center gap-1">
                <Activity size={12} />
                <span>
                  {alert.measurement}: {alert.value}
                  {alert.threshold !== undefined && ` (threshold: ${alert.threshold})`}
                </span>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formatTimestamp(alert.timestamp)}</span>
            </div>
          </div>

          {/* Acknowledged info */}
          {alert.acknowledgedBy && alert.acknowledgedByName && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Acknowledged by {alert.acknowledgedByName}{' '}
                {alert.acknowledgedAt && formatTimestamp(alert.acknowledgedAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AlertCard
