import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { AlertRule, AlertSeverity, AlertCondition } from '../../store/alertStore'
import { useDashboardStore } from '../../store/dashboardStore'

interface AlertRuleEditorProps {
  rule?: AlertRule
  onSave: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

const AlertRuleEditor: React.FC<AlertRuleEditorProps> = ({ rule, onSave, onCancel }) => {
  const { sites } = useDashboardStore()

  // Form state
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    siteId: rule?.siteId || '',
    assetId: rule?.assetId || '',
    measurement: rule?.measurement || '',
    condition: (rule?.condition || 'above') as AlertCondition,
    threshold: rule?.threshold || 0,
    thresholdMin: Array.isArray(rule?.threshold) ? rule.threshold[0] : 0,
    thresholdMax: Array.isArray(rule?.threshold) ? rule.threshold[1] : 0,
    severity: (rule?.severity || 'warning') as AlertSeverity,
    notificationChannels: rule?.notificationChannels || ['email'],
    enabled: rule?.enabled ?? true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Common measurements for water treatment
  const commonMeasurements = [
    'turbidity',
    'pH',
    'chlorine_residual',
    'temperature',
    'pressure',
    'flow_rate',
    'dissolved_oxygen',
    'conductivity',
    'tds'
  ]

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Rule name is required'
    }

    if (!formData.siteId) {
      newErrors.siteId = 'Site selection is required'
    }

    if (!formData.assetId.trim()) {
      newErrors.assetId = 'Asset ID is required'
    }

    if (!formData.measurement.trim()) {
      newErrors.measurement = 'Measurement is required'
    }

    if (formData.condition === 'between') {
      if (formData.thresholdMin >= formData.thresholdMax) {
        newErrors.threshold = 'Minimum threshold must be less than maximum'
      }
    }

    if (formData.notificationChannels.length === 0) {
      newErrors.notificationChannels = 'At least one notification channel is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const selectedSite = sites[formData.siteId]

    const ruleData: Omit<AlertRule, 'id' | 'createdAt'> = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      siteId: formData.siteId,
      siteName: selectedSite?.name,
      assetId: formData.assetId.trim(),
      assetName: formData.assetId.trim(), // TODO: Get actual asset name from configuration
      measurement: formData.measurement.trim(),
      condition: formData.condition,
      threshold:
        formData.condition === 'between'
          ? [formData.thresholdMin, formData.thresholdMax]
          : formData.threshold,
      severity: formData.severity,
      notificationChannels: formData.notificationChannels,
      enabled: formData.enabled,
      createdBy: 'current-user', // TODO: Replace with actual user ID
      updatedAt: rule ? new Date().toISOString() : undefined
    }

    onSave(ruleData)
  }

  const handleChannelToggle = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      notificationChannels: prev.notificationChannels.includes(channel)
        ? prev.notificationChannels.filter(c => c !== channel)
        : [...prev.notificationChannels, channel]
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rule Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
              placeholder="e.g., High Turbidity Alert"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="Optional description for this alert rule"
            />
          </div>

          {/* Site Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site *
            </label>
            <select
              value={formData.siteId}
              onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
              className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border ${
                errors.siteId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">Select a site</option>
              {Object.entries(sites).map(([siteId, site]) => (
                <option key={siteId} value={siteId}>
                  {site.name}
                </option>
              ))}
            </select>
            {errors.siteId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.siteId}</p>}
          </div>

          {/* Asset ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Asset ID *
            </label>
            <input
              type="text"
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border ${
                errors.assetId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
              placeholder="e.g., raw-water-intake"
            />
            {errors.assetId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.assetId}</p>}
          </div>

          {/* Measurement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Measurement *
            </label>
            <select
              value={formData.measurement}
              onChange={(e) => setFormData({ ...formData, measurement: e.target.value })}
              className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border ${
                errors.measurement ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">Select a measurement</option>
              {commonMeasurements.map((measurement) => (
                <option key={measurement} value={measurement}>
                  {measurement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            {errors.measurement && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.measurement}</p>
            )}
          </div>

          {/* Condition and Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Condition *
              </label>
              <select
                value={formData.condition}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value as AlertCondition })
                }
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
                <option value="equal">Equal to</option>
                <option value="between">Between</option>
              </select>
            </div>

            {formData.condition === 'between' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Threshold *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.thresholdMin}
                    onChange={(e) =>
                      setFormData({ ...formData, thresholdMin: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Threshold *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.thresholdMax}
                    onChange={(e) =>
                      setFormData({ ...formData, thresholdMax: parseFloat(e.target.value) })
                    }
                    className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border ${
                      errors.threshold ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`}
                  />
                  {errors.threshold && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.threshold}</p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Threshold *
                </label>
                <input
                  type="number"
                  step="any"
                  value={typeof formData.threshold === 'number' ? formData.threshold : ''}
                  onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity *
            </label>
            <div className="flex gap-4">
              {(['critical', 'warning', 'info'] as AlertSeverity[]).map((severity) => (
                <label key={severity} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value={severity}
                    checked={formData.severity === severity}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: e.target.value as AlertSeverity })
                    }
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {severity}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Channels *
            </label>
            <div className="space-y-2">
              {['email', 'sms', 'push'].map((channel) => (
                <label key={channel} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificationChannels.includes(channel)}
                    onChange={() => handleChannelToggle(channel)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {channel}
                  </span>
                </label>
              ))}
            </div>
            {errors.notificationChannels && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.notificationChannels}
              </p>
            )}
          </div>

          {/* Enabled */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enable this rule immediately
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Save size={18} />
              {rule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AlertRuleEditor
